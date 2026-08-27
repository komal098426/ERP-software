# ERP & Business Dashboard — Software Requirements & Design Document (v2)

**Status:** Draft for build — pending source data files
**Supersedes:** original requirements outline
**Owner:** TBD
**Last updated:** 2026-08-26

> This version keeps every requirement from the original spec and makes it *buildable*: concrete tech stack, a real relational schema (not just "the database should have relationships"), API contracts, an RBAC matrix, an import/merge algorithm, and acceptance criteria per module. Anywhere the original spec said "possible fields" or "examples," this version commits to a specific field list so engineering doesn't have to guess mid-build.

---

## 1. Summary & Scope

A single-tenant, multi-user ERP web application that unifies party (customer/vendor) management, financial transactions, reconciliation, HR/attendance/HRMS, analytics, and reporting behind one global party filter and one audit trail. Two legacy data sources are merged into the new schema at import time; nothing from either source is discarded — unmapped or conflicting fields are preserved in an `import_raw` column and flagged for manual review rather than dropped.

**Out of scope for v1** (explicitly, to keep the build shippable): multi-currency, multi-tenant/org-switching, payroll tax calculation, mobile native apps (responsive web only), offline mode.

---

## 2. Technology Stack (as originally specced)

The original spec called for a Next.js-only stack (Next.js API routes + Prisma + NextAuth). That
was superseded during scaffolding: the backend is FastAPI (Python) instead of Next.js API routes,
with the Next.js frontend kept and calling the Python API over HTTP. See the repo root `README.md`
for the stack actually implemented.

| Layer | Original spec | As built |
|---|---|---|
| Frontend framework | Next.js 14+ (App Router), TypeScript | Next.js (App Router), TypeScript — kept |
| UI components | Tailwind CSS + shadcn/ui (Radix primitives) | Tailwind + hand-rolled shadcn-style primitives (`components/ui/*`) |
| Charts | Recharts | Recharts (not yet wired — lands with Analytics module) |
| State/data fetching | TanStack Query + Zustand | TanStack Query + Zustand — kept |
| Database | PostgreSQL 15+ | SQLite for local dev, Postgres-compatible for prod (see README) |
| ORM | Prisma | SQLAlchemy 2.0 + Alembic |
| Auth | NextAuth (credentials + session JWT) | FastAPI + python-jose JWT + bcrypt |
| Background jobs | Node worker queue (BullMQ + Redis) | Deferred — no Redis dependency yet, see Open Items |
| Testing | Vitest (unit), Playwright (E2E) | pytest (backend), Vitest configured (frontend, not yet populated) |
| Deployment | Docker Compose | Deferred until a module set is stable enough to containerize |

---

## 3. Data Model (ERD in prose + field-level schema)

### 3.1 Entity relationship overview

```
Party 1───* Transaction *───1 Party (self, for transfers — optional)
Party 1───* ReconciliationRecord
Party 1───* Document
Transaction 1───* AuditLogEntry (polymorphic, see 3.9)

Employee 1───* AttendanceRecord
Employee 1───* SalaryHistoryEntry
Employee 1───* Document
Employee 1───1 HRMSProfile (lifecycle state + candidate origin)

User 1───* AuditLogEntry (actor)
User *───* Role (via UserRole)
Role 1───* PermissionGrant
```

### 3.2 `parties`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| party_code | text UNIQUE | human-friendly ID, e.g. `PTY-0001`, auto-generated |
| name | text NOT NULL | |
| normalized_name | text NOT NULL | lowercased, punctuation-stripped, used for duplicate detection (§9) |
| type | enum(`customer`,`vendor`,`both`) | |
| contact_person | text | |
| phone | text | |
| email | text | validated format |
| address | text | |
| status | enum(`active`,`inactive`) DEFAULT `active` | soft state, never deleted |
| opening_balance | numeric(14,2) DEFAULT 0 | |
| created_by | uuid FK→users | |
| created_at / updated_at | timestamptz | |
| source | enum(`file_a`,`file_b`,`merged`,`manual`) | provenance from import |
| import_raw | jsonb NULL | original row(s) that produced this record, for audit |

Indexes: `normalized_name` (trigram, for fuzzy search), `status`, `type`.

### 3.3 `transactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| transaction_code | text UNIQUE | e.g. `TXN-000123` |
| party_id | uuid FK→parties NOT NULL | |
| entry_type | enum(`receivable`,`payable`,`payment_in`,`payment_out`,`adjustment`) | |
| date | date NOT NULL | |
| reference_number | text | |
| amount | numeric(14,2) NOT NULL | always positive; sign implied by `entry_type` |
| description | text | |
| category | text | FK to a lightweight `categories` lookup table |
| payment_status | enum(`pending`,`partial`,`paid`,`overdue`,`cancelled`) | |
| document_id | uuid FK→documents NULL | |
| notes | text | |
| created_by / updated_by | uuid FK→users | |
| created_at / updated_at | timestamptz | |
| is_archived | boolean DEFAULT false | soft delete only |

Indexes: `party_id`, `date`, `payment_status`, composite `(party_id, date)` for party detail pages.

### 3.4 `reconciliation_records`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reconciliation_code | text UNIQUE | |
| party_id | uuid FK→parties NOT NULL | |
| transaction_id | uuid FK→transactions NULL | linked source transaction if applicable |
| expected_amount | numeric(14,2) | |
| actual_amount | numeric(14,2) | |
| difference | numeric(14,2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED | |
| status | enum(`matched`,`partially_matched`,`unmatched`,`pending`,`reviewed`) | |
| reconciliation_date | date | |
| reviewed_by | uuid FK→users NULL | |
| created_at / updated_at | timestamptz | |

### 3.5 `employees`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| employee_code | text UNIQUE | e.g. `EMP-0045` |
| full_name | text NOT NULL | |
| guardian_name | text | father/husband name where required |
| national_id | text UNIQUE NULL | CNIC or local equivalent; unique when present |
| phone | text | |
| email | text | |
| department | text | FK to `departments` lookup |
| designation | text | |
| joining_date | date | |
| employment_type | enum(`full_time`,`part_time`,`contract`,`intern`) | |
| status | enum(`candidate`,`active`,`inactive`,`resigned`,`terminated`) DEFAULT `candidate` | matches lifecycle in §19 |
| created_at / updated_at | timestamptz | |

**Uniqueness enforcement (prevents duplicate/fake employees, §18):** a partial unique index on `national_id WHERE national_id IS NOT NULL`, plus an application-level pre-save check across `national_id`, `email`, and `phone` combined — if any one matches an existing active-or-inactive employee, the API returns `409 Conflict` with the matching record's `employee_code` instead of creating a new row. The UI turns this into: *"Employee already exists (EMP-0045 — Ali Khan). Update the existing record instead?"* with a direct link to that record's edit page.

### 3.6 `attendance_records`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| employee_id | uuid FK→employees NOT NULL | |
| date | date NOT NULL | |
| check_in | time NULL | |
| check_out | time NULL | |
| status | enum(`present`,`absent`,`late`,`half_day`,`leave`,`holiday`,`weekend`) | |
| working_hours | numeric(4,2) GENERATED from check_in/check_out where both present | |
| remarks | text | |

Unique constraint: `(employee_id, date)` — one record per employee per day.

### 3.7 `salary_history`
| id, employee_id FK, effective_date, amount, currency, reason, created_by, created_at |

### 3.8 `documents`
| id, owner_type (`party`\|`employee`\|`transaction`), owner_id, file_name, file_url, uploaded_by, uploaded_at |

### 3.9 `audit_log`
| id, user_id FK, action (`created`\|`updated`\|`deactivated`\|`reactivated`\|`reconciled`\|`exported`), module, record_type, record_id, old_value jsonb, new_value jsonb, created_at |

Polymorphic on `(record_type, record_id)` so any editable entity can be audited with one table rather than one log table per module.

### 3.10 `users`, `roles`, `permissions`
Standard RBAC join: `users` ↔ `user_roles` ↔ `roles` ↔ `role_permissions` ↔ `permissions`, where a permission is `(module, action)` e.g. `(employees, write)`. See §12 for the concrete matrix.

> **As-built note:** the schema above is implemented as specced in `backend/app/models/`, with one
> portability change: `difference` (§3.4) and `working_hours` (§3.6) are computed in the service
> layer at write time rather than as DB `GENERATED` columns, so behavior is identical on SQLite
> (dev) and Postgres (prod) rather than requiring a Postgres-only migration branch.

---

## 4. Global Party Filter — implementation contract

- Client-side state: Zustand store `usePartyFilter()` holding `selectedPartyIds: string[] | 'ALL'`.
- Persisted to `localStorage` so a refresh doesn't reset context, and mirrored into the URL as `?party=<id>` so filtered views are shareable/bookmarkable.
- Every data-fetching hook (transactions, reconciliation, analytics, reports) takes `partyIds` as a required parameter — there is no code path that queries "everything" by accident when a filter is active.
- Search behavior: debounced 200ms, server-side `ILIKE '%term%'` OR trigram similarity on `normalized_name`, case-insensitive, ordered by best match then alphabetically. Keyboard: `↑/↓` to move selection, `Enter` to select, `Esc` to clear.

---

## 5. API Surface (representative — full contract lives in `/docs/api`)

REST under `/api/v1`, JSON, cursor-based pagination (`?cursor=&limit=`), consistent envelope:
```json
{ "data": [...], "meta": { "nextCursor": "...", "total": 123 } }
```

Key endpoints:
- `GET/POST /api/v1/parties`, `GET/PATCH /api/v1/parties/:id`, `POST /api/v1/parties/:id/deactivate`
- `GET/POST /api/v1/transactions?partyId=`
- `GET/POST /api/v1/reconciliation?partyId=&status=`
- `GET /api/v1/analytics/summary?partyId=&from=&to=`
- `GET/POST /api/v1/employees`, `POST /api/v1/employees/check-duplicate` (called on blur of national_id/email/phone before allowing submit)
- `GET/POST /api/v1/attendance?employeeId=&month=`
- `GET /api/v1/reports/:type?format=csv|xlsx|pdf&partyId=&from=&to=`
- `GET /api/v1/audit-log?recordType=&recordId=`
- `POST /api/v1/import` (multipart, the two source files) → returns an `importJobId`; progress polled at `GET /api/v1/import/:id`

All write endpoints require an authenticated session + role check middleware; all writes to audited entities emit an `audit_log` row in the same DB transaction as the write (never fire-and-forget) so audit history can't silently drop entries.

---

## 6. Role-Based Access Control Matrix

| Module | Admin | Manager | HR | Finance | Viewer |
|---|---|---|---|---|---|
| Dashboard | RW | R | R | R | R |
| Parties | RW | RW | R | RW | R |
| Transactions | RW | RW | – | RW | R |
| Reconciliation | RW | R | – | RW | R |
| Analytics | RW | R | R (HR-scoped) | R | R |
| Reports | RW | R | R (HR reports) | RW | R |
| Employees | RW | R | RW | – | R |
| Attendance | RW | R | RW | – | R |
| HRMS | RW | – | RW | – | – |
| Users & Roles | RW | – | – | – | – |
| Settings | RW | – | – | – | – |
| Audit Logs | R | R | – | – | – |

Enforced server-side in API middleware, not just hidden in the UI — a Viewer hitting `POST /api/v1/employees` directly gets `403`, not just a hidden button.

---

## 7. Employee Deactivation & Lifecycle (§16, §19 made concrete)

State machine: `candidate → active → (inactive | resigned | terminated)`, with `active → inactive` reversible (`reactivate`) and `resigned`/`terminated` terminal but still reversible by an Admin only, logged as an explicit audit event either way.

Deactivation never deletes rows. It flips `employees.status` and stamps `deactivated_at`/`deactivated_by`. Every query that lists "active employees" filters `WHERE status = 'active'`; every query that needs history (attendance report, salary history, audit log) is status-agnostic by default and only filters when the user explicitly asks for "active only."

Confirmation dialog copy (verbatim, per §31):
> **Deactivate Employee?**
> This employee will be marked inactive. Historical attendance, HRMS, and other records will remain available.
> `[Cancel]` `[Deactivate]`

---

## 8. HRMS Duplicate Prevention — algorithm

On every HRMS "Add Employee" submit:
1. Normalize `national_id` (strip spaces/dashes), `email` (lowercase), `phone` (strip formatting).
2. Query for any employee (any status, including inactive/resigned) where `national_id` matches exactly, OR `email` matches exactly, OR `phone` matches exactly.
3. If a match is found → block creation, return the existing record's `employee_code` + status, and offer "Edit existing record" as the primary CTA.
4. If no exact match but `name` similarity (Levenshtein/trigram) > 0.85 against an existing record → allow creation but flag it in a `possible_duplicates` review queue (mirrors the party duplicate-detection pattern in §9) rather than blocking outright, since two people can legitimately share a name.

---

## 9. Duplicate Detection (Parties) — algorithm

Same normalization approach as employees: strip punctuation/whitespace, lowercase, then similarity-score against existing active parties' normalized names. Threshold ≥ 0.6 surfaces a "possible duplicate" banner on the Add Party form (non-blocking); a nightly job also re-scans the full party table and populates a `duplicate_candidates` table for the Parties module's "Review Duplicates" screen, where an Admin/Manager can merge two parties (merge = reassign all child transactions/reconciliation/documents to the surviving party, then set the losing party's status to `inactive` with a `merged_into` pointer — never a hard delete).

> **As-built note:** the original spec called for Postgres `pg_trgm` for this similarity score.
> As built, it's computed in Python (`rapidfuzz`, see `backend/app/services/duplicate_detection.py`)
> instead, so it behaves identically on SQLite (dev) and Postgres (prod) without a database
> extension. The nightly re-scan job and the `duplicate_candidates` review screen are not yet built.

---

## 10. Data Import & Merge Pipeline (§37 made concrete)

**Pending the two source files.** Once uploaded, the pipeline is:

1. Parse both files (format-agnostic reader: CSV/XLSX/JSON handled by the same normalizer).
2. Field mapping: build a mapping table from each source's raw column names to the canonical schema in §3. Ambiguous/unmapped columns are kept, not dropped — they go into `import_raw` (jsonb) on the created record.
3. Normalize: trim whitespace, standardize phone/email casing, standardize date formats.
4. Duplicate identification across the two files using the §9 algorithm before insert, so the same party from both source files becomes one row with `source = 'merged'`.
5. Conflict flagging: if the two sources disagree on a field for what looks like the same party (e.g. different phone numbers), do not silently pick one — create the record with source A's value and log a `conflicts` entry listing both values for manual resolution in a review screen.
6. Insert clean/unambiguous records directly.
7. Produce an **import summary** report: rows read per file, records created, records merged, duplicates flagged, conflicts flagged, rows skipped and why (with the offending raw row attached so nothing is silently lost).

This step is blocked until the two files are available — the schema above is deliberately generic enough to absorb whatever fields they actually contain; exact field mapping will be finalized against the real files rather than guessed. (Not yet built.)

---

## 11. Analytics Formulas (§39, kept as committed formulas, not just examples)

```
Outstanding(party)      = SUM(receivable amounts) - SUM(payment_in amounts, matched to that party)
Total Transactions      = COUNT(transactions) [filtered by party/date range]
Average Transaction     = SUM(amount) / COUNT(transactions)
Reconciliation Rate     = COUNT(status = 'matched') / COUNT(all reconciliation records) × 100
Attendance Rate         = COUNT(status = 'present' OR 'late') / COUNT(working days in period) × 100
Monthly Revenue         = SUM(payment_in.amount) grouped by month
Monthly Expenses        = SUM(payment_out.amount) grouped by month
Growth (MoM)            = (This month revenue - Last month revenue) / Last month revenue × 100
```

All computed via SQL aggregate queries at request time (with a materialized view refreshed every 15 min for the dashboard cards specifically, to keep the dashboard fast under load) — never hard-coded, never precomputed once and left stale. (Only party/transaction counts are wired so far; the full formula set lands with the Analytics module.)

---

## 12. Validation Rules (concrete, per field type)

- Email: RFC 5322-lite regex + MX-free format check (no live SMTP check).
- Phone: E.164-normalizable; reject if fewer than 7 digits after stripping formatting.
- Dates: must parse to a valid calendar date; `joining_date` cannot be in the future; `date` on a transaction cannot be more than 1 day in the future without a Manager override flag.
- Amounts: numeric, > 0, max 2 decimal places, hard ceiling configurable in Settings (default 100,000,000) to catch fat-finger entry.
- Required fields enforced both client-side (immediate feedback) and server-side (source of truth — client validation is UX only, never trusted alone).
- Duplicate checks: see §8/§9.
- All validation errors returned as `{ field, message }[]` so the form can highlight the exact field, not just a toast.

---

## 13. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load (dashboard, cached) | < 1.5s TTI on broadband |
| Table pagination | Server-side beyond 200 rows |
| Search debounce | 200ms |
| Concurrent users (v1) | 50 |
| Audit log retention | Indefinite (append-only, no purge job in v1) |
| Backup | Nightly Postgres dump, 30-day retention |
| Uptime target | Best-effort self-hosted; no formal SLA in v1 |

---

## 14. Folder Structure (as built)

See the repo root — `backend/app/` (FastAPI: `core/`, `db/`, `models/`, `schemas/`, `api/v1/`,
`services/`) and `frontend/` (Next.js App Router: `app/`, `components/`, `lib/`, `hooks/`,
`types/`). The original spec's proposed structure assumed a Next.js-only backend and is superseded
by this layout.

---

## 15. Setup, Environment & Migrations

See the repo root `README.md` for the actual setup steps (backend venv + Alembic + seed, frontend
npm install), and `docs/runbook.md` for operational tasks (adding a role, resetting the dev DB,
switching to Postgres).

---

## 16. Acceptance Criteria (per module, sample)

- **Parties:** creating a party with a name matching an existing active party (≥0.6 similarity) shows a non-blocking duplicate warning; submitting anyway creates the record and surfaces the candidates in the response. *(Implemented and verified.)*
- **Employees:** submitting an HRMS form with a `national_id` matching an existing record (any status) is blocked with a `409` and a link to the existing record; no new row is created. *(Not yet built.)*
- **Deactivation:** deactivating an employee/party changes only `status`/`deactivated_at`; a subsequent query for that employee's attendance/transactions still returns full history. *(Implemented for Parties and verified; Employees not yet built.)*
- **Party filter:** selecting a party on the Dashboard and navigating to Reconciliation shows only that party's records without re-selecting. *(Party filter implemented and wired to Dashboard/Parties; Reconciliation not yet built.)*
- **Audit log:** editing a transaction's amount produces exactly one `audit_log` row with old and new value, in the same DB transaction as the update (verified by forcing a post-update failure in a test and confirming the audit row is also rolled back). *(Implemented and verified for Parties; Transactions not yet built.)*
- **Import:** running the import twice with the same files does not create duplicate parties (idempotent on `normalized_name` + source). *(Not yet built — blocked on source files.)*

---

## 17. Open Items Blocking the Full Build

1. **The two source data files** — needed to finalize the field-mapping table in §10 and confirm the schema in §3 actually fits real data (e.g., does the source use CNIC, or a different national ID format; is there a multi-currency need hiding in the data).
2. Confirmation on deployment target (self-hosted Docker vs. managed hosting) — affects environment docs once Docker Compose is added back.
3. Initial role assignments beyond the seeded default Admin / who the first real Admin user is.

---

*Scaffolding proceeds module by module — see `docs/runbook.md` for what's built vs. deferred and
how to pick up the next module.*

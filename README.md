# ERP & Business Dashboard

Single-tenant ERP app: party management, a yarn/fabric ledger, general transactions, employees,
attendance, a Users/Roles admin screen, and CSV reports/import — all behind one global party
filter, server-enforced RBAC, and one audit trail. See `docs/erp-srd.md` (the original requirements
doc) for full original scope and `docs/erp-guide.html` for a plain-language walkthrough of what the
app does today.

## Stack

- **Backend:** FastAPI (Python) + SQLAlchemy 2.0 + Alembic, SQLite for local dev / Postgres for prod
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind + TanStack Query + Zustand

## Prerequisites

- Python 3.11+ (tested on 3.14)
- Node.js 18+ (tested on 24)

## Backend setup

```bash
cd backend
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt   # Windows; use .venv/bin/pip on macOS/Linux
cp .env.example .env
./.venv/Scripts/python -m alembic upgrade head
./.venv/Scripts/python -m app.seed                 # creates roles + one demo login per role
./.venv/Scripts/python -m uvicorn app.main:app --port 8000
```

API docs at `http://localhost:8000/docs`.

**On `--reload`:** it's convenient during development but has spawned its watcher subprocess under
the system Python instead of the venv on this machine at least once, silently serving stale code
with no error — routes just 404 as if they were never added. If endpoints you just added don't
show up in `/openapi.json`, stop every python process and restart plain (no `--reload`) before
assuming the code is wrong; see `docs/runbook.md`.

Default admin login: `admin@erp-dashboard.app` / `ChangeMe123!` (`must_change_password` is set —
enforcing a forced reset in the UI is a follow-up, not yet wired).

## Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

App at `http://localhost:3000`.

## Switching to Postgres

Set `DATABASE_URL` in `backend/.env` to a Postgres connection string (e.g.
`postgresql+psycopg://user:pass@host:5432/erp`), install a Postgres driver
(`pip install psycopg[binary]`), and re-run `alembic upgrade head` against it. No code changes are
required — duplicate detection is implemented in Python (`rapidfuzz`), not a Postgres-only
extension, so it behaves identically on both engines.

## Tests

```bash
cd backend
./.venv/Scripts/python -m pytest
```

Covers duplicate detection (exact + fuzzy match), the audit-log-in-same-transaction guarantee
(forces a commit failure and asserts both the record change and its audit row roll back together),
and RBAC enforcement (a read-only role gets 403 on a write endpoint).

## What's built vs. what's next

**Built:**
- Auth (JWT) + RBAC (Role/Permission model, `require_permission` dependency, enforced server-side)
- Parties — list/search/create/update/deactivate, non-blocking duplicate warning
- Yarn & Fabric Ledger — bags/kg tracking, auto-computed 2% loss and billed amount, running
  balance, yarn-count breakdown, date-wise reconciliation (see `services/yarn_ledger_service.py`)
- Transactions — general receivable/payable/payment ledger per party
- Employees — create with duplicate prevention (exact match on national_id/email/phone blocks with
  409; near-duplicate name warns but doesn't block), lifecycle status (candidate → active →
  inactive/resigned/terminated), never hard-deleted
- Attendance — per-employee daily records with auto-computed working hours
- Users & Roles admin screen — create a login and assign a role without touching the seed script
- Reports — CSV export for parties/transactions/yarn-ledger; CSV re-import for the yarn ledger
  (round-trips with the export)
- Global party filter (persisted + URL-synced), dashboard shell with live counts

**Not built:** Reconciliation against expected amounts as a distinct module (the yarn ledger's
running balance covers the real use case this was meant for), an Audit Log viewer UI (entries are
written, just not browsable yet), PDF export, a background job queue, and the two-source-file
import pipeline from the original SRD (still blocked on those files — the CSV import above is a
narrower, working substitute scoped to the yarn ledger).

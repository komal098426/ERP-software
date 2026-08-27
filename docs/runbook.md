# Runbook

## Reset the local dev database

```bash
cd backend
rm dev.db
./.venv/Scripts/python -m alembic upgrade head
./.venv/Scripts/python -m app.seed
```

## Add a new role

Edit `ROLE_PERMISSIONS` in `backend/app/seed.py` (add the role name and its `(module, action)`
grants, mirroring the matrix in `docs/erp-srd.md` §6), then re-run:

```bash
./.venv/Scripts/python -m app.seed
```

`seed_roles_and_permissions` is idempotent — it upserts roles/permissions/grants, so re-running it
against an existing database is safe and won't duplicate rows.

To assign the new role to a user, use the Users &amp; Roles admin screen (`/users` in the app, Admin
only) — it lists roles from `GET /api/v1/users/roles` in the create-user dropdown, so a role added
via `ROLE_PERMISSIONS` above is immediately assignable without touching the database directly.

## Generate a new migration after changing a model

```bash
cd backend
./.venv/Scripts/python -m alembic revision --autogenerate -m "describe the change"
```

**Known gotcha:** the custom `GUID` column type (`backend/app/db/base.py`) needs
`import app.db.base` in the generated migration file. `alembic/script.py.mako` already includes
this import for every future migration, but if you ever hand-write a migration instead of
autogenerating it, add that import yourself or you'll hit `NameError: name 'app' is not defined`
when running `alembic upgrade`.

Then apply it:

```bash
./.venv/Scripts/python -m alembic upgrade head
```

## `uvicorn --reload` served stale code with no error

Hit twice during development: `uvicorn app.main:app --reload` spawns its file-watcher as a
supervisor process that, at least once on this machine, launched the actual server subprocess under
the *system* Python rather than the project's `.venv` — even though it was started via
`./.venv/Scripts/python.exe -m uvicorn ...`. The server ran and answered requests normally, so
nothing crashed or logged an error; newly added routes just weren't there (`404` as if the code had
never been written), because the subprocess never re-imported the updated app.

**Symptom:** you add/change a router, restart with `--reload`, and `curl .../openapi.json` still
doesn't list the new path — even though a fresh `pytest` run (which imports the app directly, no
subprocess) exercises that exact route successfully.

**Fix:** stop trusting `--reload` when this happens. Kill every python process
(`Get-Process python | Stop-Process -Force` in PowerShell) and start one plain instance:

```bash
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

Restart it manually after each backend change during a session like this. Slower, but it never
lies about what code is actually running.

## Switch to Postgres

1. `pip install psycopg[binary]`
2. Set `DATABASE_URL=postgresql+psycopg://user:pass@host:5432/erp` in `backend/.env`
3. `alembic upgrade head` against the new URL

No application code changes needed — duplicate detection uses `rapidfuzz` in Python rather than
Postgres's `pg_trgm` extension, so behavior is identical on both engines.

## Adding the next module (e.g. an Audit Log viewer, PDF export, or the full analytics formula set)

Follow the pattern established by the Parties, Yarn Ledger, Employees, Attendance, Users, and
Reports modules — all already built this way:

1. **Model** — already exists in `backend/app/models/` for every SRD §3 table; no migration needed
   unless you're adding a field.
2. **Schema** — add Pydantic request/response models in `backend/app/schemas/`.
3. **Service** — business logic in `backend/app/services/`, reusing `write_audit()` (from
   `services/audit.py`) for every mutation and committing in the same transaction as the write.
4. **Router** — add `backend/app/api/v1/<module>.py`, guard every write with
   `Depends(require_permission("<module>", "write"))` and every read with `"read"`, then register
   it in `backend/app/api/v1/router.py`.
5. **Frontend** — add the page under `frontend/app/<module>/`, a data-fetching call in
   `frontend/lib/api-client.ts`, and reuse `usePartyFilter()` if the module is party-scoped so it
   respects the global filter automatically.
6. **Tests** — mirror `backend/tests/test_rbac.py` and `test_audit_transaction.py` for the new
   module's write endpoints.

## Known deviations from the original SRD (see `docs/erp-srd.md` for the full list)

- Backend is FastAPI (Python), not Next.js API routes — changed per explicit request during
  scaffolding.
- Duplicate detection uses `rapidfuzz` (Python) instead of Postgres `pg_trgm`, for SQLite/Postgres
  portability.
- `attendance_records.working_hours` and `yarn_ledger_entries.loss_kg`/`amount` are computed in the
  service layer at write time instead of as DB `GENERATED` columns, for the same portability
  reason.
- The generic `reconciliation_records` table from the original SRD §3.4 was never built out into a
  module — the real business need turned out to be the Yarn & Fabric Ledger's bags/kg tracking,
  2% loss allowance, and running balance instead, so that's what got built (see
  `services/yarn_ledger_service.py`).
- Background jobs (BullMQ+Redis in the original spec) are deferred — no job queue is wired up.
  The two-source-file import pipeline from the original SRD is still blocked on those files; the
  CSV import under Reports is a narrower, working substitute scoped to the yarn ledger, not a
  replacement for it.

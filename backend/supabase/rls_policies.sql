-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query) after the
-- Alembic migrations have been applied.
--
-- Architecture this enforces: the FastAPI backend is the ONLY thing that talks to this database,
-- and it connects using the DATABASE_URL service-role/postgres connection string (never the anon
-- or authenticated Postgres roles). Supabase's `service_role` Postgres role bypasses RLS by
-- design, so FastAPI keeps working unmodified. Enabling RLS here with no permissive policies for
-- `anon`/`authenticated` means that if the anon/publishable key (or a stolen JWT) is ever used to
-- hit this database directly -- e.g. via PostgREST/Supabase's auto-generated REST API, or a
-- future feature that adds a client-side Supabase SDK -- every read and write is denied by
-- default instead of silently working. This is defense-in-depth, not something the app currently
-- depends on for its own request handling (that's enforced today in FastAPI's
-- `require_permission()`, see app/core/deps.py).

alter table public.parties enable row level security;
alter table public.transactions enable row level security;
alter table public.reconciliation_records enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.salary_history enable row level security;
alter table public.documents enable row level security;
alter table public.audit_log enable row level security;
alter table public.gate_passes enable row level security;
alter table public.yarn_ledger_entries enable row level security;
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;

-- No CREATE POLICY statements follow on purpose: with RLS enabled and zero policies, every role
-- other than the table owner / service_role is denied all access by default. Nothing here grants
-- `anon` or `authenticated` any access -- if the app ever needs the frontend to call Supabase
-- directly for some table, add an explicit, narrowly-scoped policy for that table then, rather
-- than opening all of them up now.

-- Verify afterwards:
--   select schemaname, tablename, rowsecurity from pg_tables
--   where schemaname = 'public' order by tablename;
--   (rowsecurity should be true for every table listed above)
--
--   select * from pg_policies where schemaname = 'public';
--   (should return zero rows -- confirms default-deny)

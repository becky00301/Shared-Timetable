-- Money on a timetable: one budget per project, an optional amount on each
-- schedule item, and free-standing expenses for spending that never had a
-- schedule of its own. Spent is always derived (schedule amounts + expenses),
-- never stored, so it cannot drift from the rows it summarises.

alter table public.projects
  add column if not exists budget_total numeric(14, 2);

alter table public.projects
  drop constraint if exists projects_budget_total_check;

alter table public.projects
  add constraint projects_budget_total_check
  check (budget_total is null or budget_total >= 0);

-- Amounts are meaningless without a unit, and the unit belongs to the trip
-- rather than to the reader's language: a Tokyo plan stays in JPY whether it
-- is read in Korean or English.
alter table public.projects
  add column if not exists budget_currency text not null default 'KRW';

alter table public.projects
  drop constraint if exists projects_budget_currency_check;

alter table public.projects
  add constraint projects_budget_currency_check
  check (budget_currency ~ '^[A-Z]{3}$');

alter table public.schedule_items
  add column if not exists amount numeric(14, 2);

alter table public.schedule_items
  drop constraint if exists schedule_items_amount_check;

alter table public.schedule_items
  add constraint schedule_items_amount_check
  check (amount is null or amount >= 0);

create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  creator_id uuid references public.users(id) on delete set null,
  label text not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  spent_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_expenses_project_idx
on public.project_expenses(project_id, created_at);

drop trigger if exists project_expenses_set_updated_at on public.project_expenses;
create trigger project_expenses_set_updated_at
before update on public.project_expenses
for each row execute function public.set_updated_at();

alter table public.project_expenses enable row level security;

drop policy if exists "members read project expenses" on public.project_expenses;
create policy "members read project expenses"
on public.project_expenses for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "editors manage project expenses" on public.project_expenses;
create policy "editors manage project expenses"
on public.project_expenses for all
to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

grant select, insert, update, delete on public.project_expenses to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_expenses'
  ) then
    alter publication supabase_realtime add table public.project_expenses;
  end if;
end $$;

-- Deletes replicate only the primary key unless replica identity is FULL, so a
-- subscription filtered on project_id would never match a DELETE event.
alter table public.project_expenses replica identity full;

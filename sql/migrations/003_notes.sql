-- Google-Calendar-style all-day note for each selected date.
alter table public.project_days
  add column if not exists note text;

-- Free-standing notes that aren't tied to a schedule item.
create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  creator_id uuid references public.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_notes_project_idx on public.project_notes(project_id, created_at);

alter table public.project_notes enable row level security;

drop trigger if exists project_notes_set_updated_at on public.project_notes;
create trigger project_notes_set_updated_at
before update on public.project_notes
for each row execute function public.set_updated_at();

drop policy if exists "members read project notes" on public.project_notes;
create policy "members read project notes"
on public.project_notes for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "editors manage project notes" on public.project_notes;
create policy "editors manage project notes"
on public.project_notes for all
to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

grant select, insert, update, delete on table public.project_notes to authenticated;

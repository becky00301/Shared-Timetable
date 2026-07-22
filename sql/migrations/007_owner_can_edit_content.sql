-- 005 taught the projects table to trust projects.owner_id, but every content
-- table (schedule_items, project_days, project_notes, attachments) still goes
-- through can_edit_project, which only ever consulted project_members. An owner
-- whose membership row is missing can open a timetable and edit it optimistically,
-- yet the delete silently matches zero rows.
--
-- Trust the owner column here too, so anyone who is the owner OR carries an
-- owner/editor membership row can manage the project's contents.
create or replace function public.can_edit_project(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1
      from public.projects p
      where p.id = project_uuid
        and p.owner_id = auth.uid()
    )
    or public.project_role(project_uuid) in ('owner', 'editor')
$$;

-- Re-run the 005 backfill: harmless if it already ran, and it repairs any
-- project created between then and now without a membership row.
insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'owner'
from public.projects p
where not exists (
  select 1 from public.project_members m
  where m.project_id = p.id and m.user_id = p.owner_id
)
on conflict (project_id, user_id) do nothing;

-- The select policy already trusts projects.owner_id, but update/delete only
-- trusted a project_members row. A project whose membership row is missing was
-- therefore visible yet impossible to rename or delete. Accept either.
drop policy if exists "owners can update projects" on public.projects;
create policy "owners can update projects"
on public.projects for update
to authenticated
using (owner_id = auth.uid() or public.can_manage_project(id))
with check (owner_id = auth.uid() or public.can_manage_project(id));

drop policy if exists "owners can delete projects" on public.projects;
create policy "owners can delete projects"
on public.projects for delete
to authenticated
using (owner_id = auth.uid() or public.can_manage_project(id));

-- Backfill owner memberships for any project that lost (or never got) one.
insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'owner'
from public.projects p
where not exists (
  select 1 from public.project_members m
  where m.project_id = p.id and m.user_id = p.owner_id
)
on conflict (project_id, user_id) do nothing;

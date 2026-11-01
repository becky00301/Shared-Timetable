-- Lets a project's owner hand ownership to someone already in the project.
-- The new owner's membership becomes 'owner', projects.owner_id follows it,
-- and the previous owner stays on as an editor. Both writes happen together,
-- so the project is never left with zero or two owners.
create or replace function public.transfer_project_ownership(project_uuid uuid, new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target_project public.projects;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into target_project
  from public.projects
  where id = project_uuid
  for update;

  if target_project.id is null or target_project.owner_id <> caller then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;

  if new_owner_id = caller then
    raise exception 'Already the owner' using errcode = '22023';
  end if;

  update public.project_members
  set role = 'owner'
  where project_id = project_uuid
    and user_id = new_owner_id;

  if not found then
    raise exception 'The new owner must already be in the project' using errcode = '22023';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (project_uuid, caller, 'editor')
  on conflict (project_id, user_id) do update set role = 'editor';

  update public.projects
  set owner_id = new_owner_id
  where id = project_uuid;
end;
$$;

revoke execute on function public.transfer_project_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_project_ownership(uuid, uuid) to authenticated;

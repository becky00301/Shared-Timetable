-- New invitees join as editors. Existing memberships keep their assigned roles.
create or replace function public.join_project_by_invite(token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into target_project
  from public.projects
  where invite_token = token;

  if target_project.id is null then
    raise exception 'Invalid invite token';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (target_project.id, auth.uid(), 'editor')
  on conflict (project_id, user_id) do nothing;

  return target_project.id;
end;
$$;

revoke execute on function public.join_project_by_invite(text) from public, anon;
grant execute on function public.join_project_by_invite(text) to authenticated;

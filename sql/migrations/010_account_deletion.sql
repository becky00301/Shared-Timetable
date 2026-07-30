-- Prepare public data for permanent account deletion in one transaction.
-- Auth deletion remains a separate server-only Admin API call, so this function
-- is idempotent and can be safely retried if that final call fails.
create or replace function public.prepare_account_deletion(target_user_id uuid)
returns table(transferred integer, deleted integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_project record;
  heir_user_id uuid;
begin
  transferred := 0;
  deleted := 0;

  for owned_project in
    select p.id
    from public.projects p
    where p.owner_id = target_user_id
    order by p.created_at, p.id
    for update
  loop
    select pm.user_id
    into heir_user_id
    from public.project_members pm
    where pm.project_id = owned_project.id
      and pm.user_id <> target_user_id
    order by
      case pm.role
        when 'editor' then 0
        when 'viewer' then 1
        else 2
      end,
      pm.created_at,
      pm.user_id
    limit 1
    for update;

    if heir_user_id is null then
      delete from public.projects
      where id = owned_project.id;

      deleted := deleted + 1;
    else
      update public.project_members
      set role = 'owner'
      where project_id = owned_project.id
        and user_id = heir_user_id;

      update public.projects
      set owner_id = heir_user_id
      where id = owned_project.id;

      delete from public.project_members
      where project_id = owned_project.id
        and user_id = target_user_id;

      transferred := transferred + 1;
    end if;
  end loop;

  return next;
end;
$$;

revoke execute on function public.prepare_account_deletion(uuid)
from public, anon, authenticated;

grant execute on function public.prepare_account_deletion(uuid) to service_role;

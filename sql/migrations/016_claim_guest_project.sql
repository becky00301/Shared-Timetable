-- Guest mode (anonymous sign-ins) is being retired. Timetables created that
-- way still exist, owned by a throwaway anonymous account, and their only
-- handle is the /plans/<slug> link the guest was told to save. This lets a
-- real account hand that link in and take the timetable over.
--
-- The transfer is deliberately narrow: only a timetable whose owner is still
-- an anonymous account can be claimed. One that already belongs to a real
-- account is never transferable by link, so a shared link can't be turned
-- into a takeover.
create or replace function public.claim_guest_project(project_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.projects;
  previous_owner uuid;
  claimer uuid := auth.uid();
  claimer_is_anonymous boolean;
  owner_is_anonymous boolean;
begin
  if claimer is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- An anonymous session claiming a timetable would only move it sideways
  -- into another throwaway account, which is the problem being removed.
  select coalesce(u.is_anonymous, false)
  into claimer_is_anonymous
  from auth.users u
  where u.id = claimer;

  if claimer_is_anonymous then
    raise exception 'Account required' using errcode = '28000';
  end if;

  select * into target
  from public.projects
  where slug = project_slug
  for update;

  if target.id is null then
    raise exception 'Timetable not found' using errcode = 'P0002';
  end if;

  -- Claiming twice is a no-op rather than an error: the second tab, or a
  -- retried request, should land on the same timetable.
  if target.owner_id = claimer then
    return target.slug;
  end if;

  select coalesce(u.is_anonymous, false)
  into owner_is_anonymous
  from auth.users u
  where u.id = target.owner_id;

  if not owner_is_anonymous then
    raise exception 'Timetable already belongs to an account' using errcode = '42501';
  end if;

  previous_owner := target.owner_id;

  update public.projects
  set owner_id = claimer,
      updated_at = now()
  where id = target.id;

  delete from public.project_members
  where project_id = target.id
    and user_id = previous_owner;

  insert into public.project_members (project_id, user_id, role)
  values (target.id, claimer, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';

  -- The guest's own availability belongs to the person, not to the discarded
  -- account, so it follows them across.
  update public.availability
  set user_id = claimer
  where project_id = target.id
    and user_id = previous_owner;

  return target.slug;
end;
$$;

revoke execute on function public.claim_guest_project(text) from public, anon;
grant execute on function public.claim_guest_project(text) to authenticated;

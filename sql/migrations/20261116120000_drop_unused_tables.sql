-- Drop tables no feature uses any more.
--   availability: the retired "free time" mode; nothing in the app reads or
--                 writes it.
--   attachments:  per-event files/links from an early version; there is no
--                 UI for them.
--   shared_timetables: the pre-account timetable store. Migration 011 was
--                 meant to drop it but production still has it.
-- Ship the app build that stops loading availability and attachments before
-- running this. Dropping a table also drops its policies, indexes and its
-- place in the realtime publication. This cannot be undone.

-- redeem_guest_claim_ticket moved a guest's availability rows to the new
-- account; without the table that step would fail, so it is redefined first.
create or replace function public.redeem_guest_claim_ticket(claim_ticket text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  claimer uuid := auth.uid();
  guest uuid;
  target record;
  first_slug text;
begin
  if claimer is null
    or exists (select 1 from auth.users u where u.id = claimer and u.is_anonymous) then
    raise exception 'Account required' using errcode = '28000';
  end if;

  delete from public.guest_claim_tickets t
  where t.ticket = claim_ticket
    and t.created_at > now() - interval '1 day'
  returning t.guest_id into guest;

  if guest is null
    or guest = claimer
    or not exists (select 1 from auth.users u where u.id = guest and u.is_anonymous) then
    raise exception 'Claim not available' using errcode = '42501';
  end if;

  for target in
    select p.id, p.slug
    from public.projects p
    where p.owner_id = guest
    order by p.created_at, p.id
    for update
  loop
    first_slug := coalesce(first_slug, target.slug);

    update public.projects
    set owner_id = claimer,
        updated_at = now()
    where id = target.id;

    delete from public.project_members
    where project_id = target.id
      and user_id = guest;

    insert into public.project_members (project_id, user_id, role)
    values (target.id, claimer, 'owner')
    on conflict (project_id, user_id) do update set role = 'owner';
  end loop;

  if first_slug is null then
    raise exception 'Claim not available' using errcode = '42501';
  end if;

  return first_slug;
end;
$$;

revoke execute on function public.redeem_guest_claim_ticket(text) from public, anon;
grant execute on function public.redeem_guest_claim_ticket(text) to authenticated;

drop function if exists public.get_shared_timetable(text);
drop function if exists public.save_shared_timetable(text, jsonb);

drop table if exists public.availability;
drop table if exists public.attachments;
drop table if exists public.shared_timetables;

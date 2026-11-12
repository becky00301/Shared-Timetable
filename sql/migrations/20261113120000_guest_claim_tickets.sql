-- Claiming a timetable from the retired guest mode used to need nothing but
-- its /plans/<slug> link. Slugs are not secret (they appear in shared and
-- embedded links, and a Korean title leaves only a 4-character suffix), so
-- any account could take over a guest's timetable. A claim now needs a
-- ticket that only the guest's own anonymous session can issue.

-- Tickets are read and written only by the two functions below.
create table if not exists public.guest_claim_tickets (
  ticket text primary key default encode(gen_random_bytes(24), 'hex'),
  guest_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.guest_claim_tickets enable row level security;
revoke all on table public.guest_claim_tickets from public, anon, authenticated;

-- Called by the guest, still signed in anonymously, right before signing in
-- to an account. The ticket travels through the login to the redeem call.
create or replace function public.issue_guest_claim_ticket()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  guest uuid := auth.uid();
  issued text;
begin
  if guest is null
    or not exists (select 1 from auth.users u where u.id = guest and u.is_anonymous)
    or not exists (select 1 from public.projects p where p.owner_id = guest) then
    raise exception 'Claim not available' using errcode = '42501';
  end if;

  delete from public.guest_claim_tickets
  where guest_id = guest or created_at < now() - interval '1 day';

  insert into public.guest_claim_tickets (guest_id)
  values (guest)
  returning ticket into issued;

  return issued;
end;
$$;

revoke execute on function public.issue_guest_claim_ticket() from public, anon;
grant execute on function public.issue_guest_claim_ticket() to authenticated;

-- Moves every timetable the ticket's guest still owns into the caller's
-- account. Every refusal about the ticket or its timetables gives the same
-- error, so the call reveals nothing about what exists.
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

    -- The guest's own availability belongs to the person, not to the
    -- discarded account, so it follows them across.
    update public.availability
    set user_id = claimer
    where project_id = target.id
      and user_id = guest;
  end loop;

  if first_slug is null then
    raise exception 'Claim not available' using errcode = '42501';
  end if;

  return first_slug;
end;
$$;

revoke execute on function public.redeem_guest_claim_ticket(text) from public, anon;
grant execute on function public.redeem_guest_claim_ticket(text) to authenticated;

-- The slug-only claim is the hole being closed.
drop function if exists public.claim_guest_project(text);

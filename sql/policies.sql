alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_days enable row level security;
alter table public.schedule_items enable row level security;
alter table public.availability enable row level security;
alter table public.attachments enable row level security;

create or replace function public.project_role(project_uuid uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select pm.role
  from public.project_members pm
  where pm.project_id = project_uuid
    and pm.user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_project_member(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_uuid
      and pm.user_id = auth.uid()
  )
$$;

-- The owner column is trusted alongside membership so a project's contents can
-- always be edited by its owner, even if the project_members row is missing.
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

create or replace function public.can_manage_project(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.project_role(project_uuid) = 'owner'
$$;

drop policy if exists "users can read project peers" on public.users;
create policy "users can read project peers"
on public.users for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.project_members own
    join public.project_members peer on peer.project_id = own.project_id
    where own.user_id = auth.uid()
      and peer.user_id = public.users.id
  )
);

drop policy if exists "users can update self" on public.users;
create policy "users can update self"
on public.users for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "members can read projects" on public.projects;
create policy "members can read projects"
on public.projects for select
to authenticated
using (owner_id = auth.uid() or public.is_project_member(id));

drop policy if exists "authenticated can create projects" on public.projects;
create policy "authenticated can create projects"
on public.projects for insert
to authenticated
with check (owner_id = auth.uid());

-- owner_id is accepted alongside membership so a project can always be managed
-- by its owner, even if the project_members row is missing.
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

drop policy if exists "members can read memberships" on public.project_members;
create policy "members can read memberships"
on public.project_members for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "owners manage memberships" on public.project_members;
create policy "owners manage memberships"
on public.project_members for all
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

drop policy if exists "owners can create own membership during project create" on public.project_members;
create policy "owners can create own membership during project create"
on public.project_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "members read project days" on public.project_days;
create policy "members read project days"
on public.project_days for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "editors manage project days" on public.project_days;
create policy "editors manage project days"
on public.project_days for all
to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

drop policy if exists "members read schedule items" on public.schedule_items;
create policy "members read schedule items"
on public.schedule_items for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "editors manage schedule items" on public.schedule_items;
create policy "editors manage schedule items"
on public.schedule_items for all
to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

drop policy if exists "members read availability" on public.availability;
create policy "members read availability"
on public.availability for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "editors manage own availability" on public.availability;
create policy "editors manage own availability"
on public.availability for all
to authenticated
using (public.can_edit_project(project_id) and user_id = auth.uid())
with check (public.can_edit_project(project_id) and user_id = auth.uid());

alter table public.project_notes enable row level security;

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

drop policy if exists "members read attachments" on public.attachments;
create policy "members read attachments"
on public.attachments for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "editors manage attachments" on public.attachments;
create policy "editors manage attachments"
on public.attachments for all
to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

-- Serialize appends and reorders within a project so new notes stay at the end.
create or replace function public.append_project_note_order()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.project_id::text, 0));
  select coalesce(max(sort_order), -1) + 1 into new.sort_order
  from public.project_notes where project_id = new.project_id;
  return new;
end;
$$;

revoke execute on function public.append_project_note_order() from public, anon, authenticated;

drop trigger if exists project_notes_append_order on public.project_notes;
create trigger project_notes_append_order
before insert on public.project_notes
for each row execute function public.append_project_note_order();

create or replace function public.reorder_project_notes(project_uuid uuid, note_ids uuid[])
returns setof public.project_notes
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_edit_project(project_uuid) then
    raise exception 'Editing permission required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(project_uuid::text, 0));

  -- Reject stale, duplicate and cross-project lists before updating any row.
  if note_ids is null
    or cardinality(note_ids) <> (select count(*) from public.project_notes where project_id = project_uuid)
    or cardinality(note_ids) <> (select count(distinct id) from unnest(note_ids) as ids(id))
    or exists (
      select 1 from unnest(note_ids) as ids(id)
      where not exists (
        select 1 from public.project_notes n where n.id = ids.id and n.project_id = project_uuid
      )
    ) then
    raise exception 'Note list changed; reload before reordering' using errcode = '22023';
  end if;

  update public.project_notes n
  set sort_order = (ordered.position - 1)::integer
  from unnest(note_ids) with ordinality as ordered(id, position)
  where n.id = ordered.id and n.project_id = project_uuid;

  return query select * from public.project_notes
  where project_id = project_uuid order by sort_order, created_at, id;
end;
$$;

revoke execute on function public.reorder_project_notes(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_project_notes(uuid, uuid[]) to authenticated;

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

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.users,
  public.projects,
  public.project_members,
  public.project_days,
  public.project_notes,
  public.project_expenses,
  public.schedule_items,
  public.availability,
  public.attachments
to authenticated;

revoke execute on function public.project_role(uuid) from public, anon;
revoke execute on function public.is_project_member(uuid) from public, anon;
revoke execute on function public.can_edit_project(uuid) from public, anon;
revoke execute on function public.can_manage_project(uuid) from public, anon;
revoke execute on function public.join_project_by_invite(text) from public, anon;

grant execute on function public.project_role(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
grant execute on function public.can_manage_project(uuid) to authenticated;
grant execute on function public.join_project_by_invite(text) to authenticated;

-- Hands ownership to an existing member; the previous owner stays as an editor.
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

create or replace function public.get_embedded_timetable(embed_token_value text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  if embed_token_value !~ '^[A-Fa-f0-9]{32}$' then
    return null;
  end if;

  select jsonb_build_object(
    'project', jsonb_build_object(
      'title', p.title,
      'slug', p.slug,
      'kind', p.kind
    ),
    'days', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'date', d.date,
          'sort_order', d.sort_order
        )
        order by d.sort_order, d.date
      )
      from public.project_days d
      where d.project_id = p.id
    ), '[]'::jsonb),
    'schedules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'day_id', s.day_id,
          'end_day_id', s.end_day_id,
          'title', s.title,
          'location', s.location,
          'start_time', s.start_time,
          'end_time', s.end_time,
          'color', s.color,
          'all_day', s.all_day
        )
        order by s.day_id, s.start_time, s.id
      )
      from public.schedule_items s
      where s.project_id = p.id
    ), '[]'::jsonb)
  )
  into result
  from public.projects p
  where p.embed_token = embed_token_value;

  return result;
end;
$$;

revoke execute on function public.get_embedded_timetable(text) from public;
grant usage on schema public to anon, authenticated;
grant execute on function public.get_embedded_timetable(text) to anon, authenticated;

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

-- The project row itself stays owner-only. Editors get a narrowly scoped
-- budget operation; its privileged implementation is outside exposed schemas.
create schema if not exists budget_private;
revoke all on schema budget_private from public, anon, authenticated;
grant usage on schema budget_private to authenticated;

create or replace function budget_private.update_project_budget(project_uuid uuid, budget_patch jsonb)
returns setof public.projects
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not coalesce(public.can_edit_project(project_uuid), false) then
    raise exception 'Editing permission required' using errcode = '42501';
  end if;

  if budget_patch is null or jsonb_typeof(budget_patch) <> 'object' then
    raise exception 'Budget patch must be an object' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(budget_patch) as fields(name)
    where name not in ('budget_total', 'budget_currency')
  ) then
    raise exception 'Only budget fields may be changed' using errcode = '22023';
  end if;
  if budget_patch ? 'budget_total'
    and jsonb_typeof(budget_patch->'budget_total') not in ('number', 'null') then
    raise exception 'Budget total must be a number or null' using errcode = '22023';
  end if;
  if budget_patch ? 'budget_currency'
    and jsonb_typeof(budget_patch->'budget_currency') <> 'string' then
    raise exception 'Budget currency must be a string' using errcode = '22023';
  end if;

  return query
  update public.projects p
  set budget_total = case when budget_patch ? 'budget_total'
        then (budget_patch->>'budget_total')::numeric else p.budget_total end,
      budget_currency = case when budget_patch ? 'budget_currency'
        then budget_patch->>'budget_currency' else p.budget_currency end
  where p.id = project_uuid
  returning p.*;
end;
$$;

revoke all on function budget_private.update_project_budget(uuid, jsonb) from public, anon, authenticated;
grant execute on function budget_private.update_project_budget(uuid, jsonb) to authenticated;

-- PostgREST exposes this invoker wrapper, not the privileged implementation.
create or replace function public.update_project_budget(project_uuid uuid, budget_patch jsonb)
returns setof public.projects
language sql
security invoker
set search_path = ''
as $$
  select * from budget_private.update_project_budget(project_uuid, budget_patch);
$$;

revoke all on function public.update_project_budget(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_project_budget(uuid, jsonb) to authenticated;

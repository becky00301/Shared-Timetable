alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_days enable row level security;
alter table public.schedule_items enable row level security;
alter table public.availability enable row level security;
alter table public.attachments enable row level security;

-- Google OAuth tokens: RLS on with no policies at all, so only the service role
-- (server routes) can touch this table. Never expose it to the browser.
alter table public.google_accounts enable row level security;
revoke all on table public.google_accounts from anon, authenticated;

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

create or replace function public.can_edit_project(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.project_role(project_uuid) in ('owner', 'editor')
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

drop policy if exists "owners can update projects" on public.projects;
create policy "owners can update projects"
on public.projects for update
to authenticated
using (public.can_manage_project(id))
with check (public.can_manage_project(id));

drop policy if exists "owners can delete projects" on public.projects;
create policy "owners can delete projects"
on public.projects for delete
to authenticated
using (public.can_manage_project(id));

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
  values (target_project.id, auth.uid(), 'viewer')
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

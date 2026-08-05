create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  slug text unique not null,
  kind text not null default 'daterange' check (kind in ('weekly', 'daterange')),
  invite_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  embed_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- For projects created before the kind column existed.
alter table public.projects
  add column if not exists kind text not null default 'daterange'
  check (kind in ('weekly', 'daterange'));

alter table public.projects
  add column if not exists embed_token text;

update public.projects
set embed_token = encode(gen_random_bytes(16), 'hex')
where embed_token is null;

alter table public.projects
  alter column embed_token set default encode(gen_random_bytes(16), 'hex'),
  alter column embed_token set not null;

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.project_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  sort_order integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (project_id, date)
);

alter table public.project_days
  add column if not exists note text;

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  creator_id uuid references public.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_notes_project_idx on public.project_notes(project_id, created_at);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  day_id uuid not null references public.project_days(id) on delete cascade,
  creator_id uuid references public.users(id) on delete set null,
  title text not null,
  description text,
  location text,
  start_time time not null,
  end_time time not null,
  color text default '#1972F7',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table public.schedule_items
  add column if not exists all_day boolean not null default false;

-- Inclusive end day for multi-day all-day items; null means a single day.
alter table public.schedule_items
  add column if not exists end_day_id uuid references public.project_days(id) on delete set null;

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  day_id uuid not null references public.project_days(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  schedule_item_id uuid not null references public.schedule_items(id) on delete cascade,
  type text not null check (type in ('link', 'image', 'pdf', 'map')),
  url text not null,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects(owner_id);
create index if not exists projects_slug_idx on public.projects(slug);
create index if not exists projects_invite_token_idx on public.projects(invite_token);
create unique index if not exists projects_embed_token_idx on public.projects(embed_token);
create index if not exists project_members_project_idx on public.project_members(project_id);
create index if not exists project_days_project_idx on public.project_days(project_id, sort_order);
create index if not exists schedule_items_project_day_idx on public.schedule_items(project_id, day_id);
create index if not exists availability_project_day_idx on public.availability(project_id, day_id);
create index if not exists attachments_schedule_idx on public.attachments(schedule_item_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists schedule_items_set_updated_at on public.schedule_items;
create trigger schedule_items_set_updated_at
before update on public.schedule_items
for each row execute function public.set_updated_at();

drop trigger if exists project_notes_set_updated_at on public.project_notes;
create trigger project_notes_set_updated_at
before update on public.project_notes
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), '게스트'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    avatar = excluded.avatar;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.handle_new_user();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_days'
  ) then
    alter publication supabase_realtime add table public.project_days;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_items'
  ) then
    alter publication supabase_realtime add table public.schedule_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'availability'
  ) then
    alter publication supabase_realtime add table public.availability;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_members'
  ) then
    alter publication supabase_realtime add table public.project_members;
  end if;
end $$;

-- Deletes replicate only the primary key unless replica identity is FULL, so a
-- subscription filtered on project_id would never match a DELETE event.
alter table public.schedule_items replica identity full;
alter table public.project_days replica identity full;
alter table public.availability replica identity full;
alter table public.project_members replica identity full;
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
  public.project_notes,
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

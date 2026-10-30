-- Preserve the existing creation order when adding persistent note positions.
alter table public.project_notes add column if not exists sort_order integer;
with positions as (
  select id, (row_number() over (partition by project_id order by created_at, id) - 1)::integer as position
  from public.project_notes
)
update public.project_notes n set sort_order = positions.position
from positions where positions.id = n.id and n.sort_order is null;
alter table public.project_notes alter column sort_order set default 0;
alter table public.project_notes alter column sort_order set not null;
create index if not exists project_notes_order_idx on public.project_notes(project_id, sort_order, created_at, id);

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

-- Note edits and ordering changes should reach all participants.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_notes'
  ) then
    alter publication supabase_realtime add table public.project_notes;
  end if;
end $$;

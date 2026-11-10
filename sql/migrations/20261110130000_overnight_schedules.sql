-- Timed schedule items that run past midnight, e.g. 23:00 to 01:00 the next
-- day. Such an item keeps its start day in day_id and its end day in
-- end_day_id (the column all-day spans already use), so its end_time may be
-- earlier than its start_time.

-- The table's original, unnamed check required end_time > start_time on every
-- row. Drop it by definition, whatever name Postgres gave it.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.schedule_items'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%end_time > start_time%'
      and c.conname <> 'schedule_items_time_order_check'
  loop
    execute format('alter table public.schedule_items drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table public.schedule_items
  drop constraint if exists schedule_items_time_order_check;

alter table public.schedule_items
  add constraint schedule_items_time_order_check
  check (end_time > start_time or (end_day_id is not null and end_day_id <> day_id));

-- Removing a timetable date sets end_day_id to null on items that ended on it.
-- An overnight item would then break the check above, and the date could not
-- be removed; instead it is cut back to end at midnight on its start day.
create or replace function public.clip_orphaned_overnight_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.end_day_id is null and new.end_time <= new.start_time then
    new.end_time := '24:00';
  end if;
  return new;
end;
$$;

revoke execute on function public.clip_orphaned_overnight_schedule() from public, anon, authenticated;

drop trigger if exists clip_orphaned_overnight_schedule on public.schedule_items;
create trigger clip_orphaned_overnight_schedule
before insert or update on public.schedule_items
for each row execute function public.clip_orphaned_overnight_schedule();

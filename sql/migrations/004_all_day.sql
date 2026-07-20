-- All-day schedules live in the 종일 row instead of the time grid.
-- Times stay NOT NULL (and satisfy end_time > start_time); they're just ignored
-- for display when all_day is true.
alter table public.schedule_items
  add column if not exists all_day boolean not null default false;

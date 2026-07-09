-- Distinguishes weekly (요일만 표시) timetables from date-range ones.
alter table public.projects
  add column if not exists kind text not null default 'daterange'
  check (kind in ('weekly', 'daterange'));

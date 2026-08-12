-- Each project day keeps its own sleep duration. Existing rows retain the
-- original seven-hour behavior through the 420-minute default.
alter table public.project_days
  add column if not exists sleep_duration_minutes integer not null default 420;

alter table public.project_days
  drop constraint if exists project_days_sleep_duration_minutes_check;

alter table public.project_days
  add constraint project_days_sleep_duration_minutes_check
  check (sleep_duration_minutes between 60 and 720);

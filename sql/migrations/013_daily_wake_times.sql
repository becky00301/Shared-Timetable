-- Per-day wake times are visible to project members and editable under the
-- existing project_days RLS policies. Public embed RPCs intentionally omit
-- this field because wake times can reveal personal routines.
alter table public.project_days
  add column if not exists wake_time time;

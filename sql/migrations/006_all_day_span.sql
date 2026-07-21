-- All-day schedules can span a date range (e.g. 17~20 로마).
-- null end_day_id means the item covers only its start day.
alter table public.schedule_items
  add column if not exists end_day_id uuid references public.project_days(id) on delete set null;

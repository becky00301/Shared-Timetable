-- Remove retired Google Calendar sync data and the unauthenticated legacy timetable store.
drop function if exists public.get_shared_timetable(text);
drop function if exists public.save_shared_timetable(text, jsonb);
drop table if exists public.shared_timetables;

drop table if exists public.google_accounts;
alter table public.projects drop column if exists google_calendar_id;
alter table public.schedule_items drop column if exists google_event_id;

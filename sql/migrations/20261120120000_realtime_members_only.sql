-- The app no longer listens to the database change feed for schedules, days,
-- notes or expenses: whoever saves broadcasts which tables changed and the
-- others read those back (lib/supabase/realtime.ts). Only project_members is
-- still watched. Taking the other tables out of the publication stops the
-- database decoding their writes for realtime, and dropping FULL replica
-- identity stops it writing whole old rows into the WAL on every update.
-- Run after the build that switched to broadcast is live.

do $$
declare
  t text;
begin
  foreach t in array array['schedule_items', 'project_days', 'project_notes', 'project_expenses'] loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.schedule_items replica identity default;
alter table public.project_days replica identity default;
alter table public.project_expenses replica identity default;

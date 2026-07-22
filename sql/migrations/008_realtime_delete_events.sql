-- Deletes never reached other members' screens while inserts and updates did.
--
-- The client subscribes with `filter: project_id=eq.<id>`. On DELETE, Postgres
-- only puts the primary key in the replicated old row unless the table's
-- replica identity is FULL — so project_id is absent, the filter cannot match,
-- and Supabase drops the event. INSERT/UPDATE carry the full new row, which is
-- why only deletes went missing.
--
-- FULL makes Postgres log every column of the old row. It costs a little WAL
-- volume per delete/update, which is nothing at this scale.
alter table public.schedule_items replica identity full;
alter table public.project_days replica identity full;
alter table public.availability replica identity full;
alter table public.project_members replica identity full;

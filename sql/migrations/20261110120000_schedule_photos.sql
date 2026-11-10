-- A photo on a schedule item, shown as the background of its timetable box.
--
-- The file lives in the private "schedule-photos" Storage bucket at
-- <project_id>/<schedule_item_id>/<random>.webp. The row keeps only that path.
-- Members of the project can read it; editors can add, replace and remove it.

alter table public.schedule_items
  add column if not exists image_path text;

-- A path must sit inside the item's own project folder. The read-only embed
-- signs these paths with the service key, so a path pointing at another
-- project's photo must never be storable.
alter table public.schedule_items
  drop constraint if exists schedule_items_image_path_check;

alter table public.schedule_items
  add constraint schedule_items_image_path_check
  check (
    image_path is null
    or (
      split_part(image_path, '/', 1) = project_id::text
      and image_path !~ '\.\.'
      and length(image_path) <= 300
    )
  );

-- Private bucket: 2 MB per file, images only. The app resizes to WebP before
-- uploading, so a normal photo lands around 150-300 KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('schedule-photos', 'schedule-photos', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- The project a storage path belongs to, or null when the first folder is not
-- a uuid (so a malformed name is refused instead of raising a cast error).
create or replace function public.schedule_photo_project(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  folder text := split_part(object_name, '/', 1);
begin
  if folder ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return folder::uuid;
  end if;
  return null;
end;
$$;

revoke execute on function public.schedule_photo_project(text) from public, anon;
grant execute on function public.schedule_photo_project(text) to authenticated;

drop policy if exists "members read schedule photos" on storage.objects;
create policy "members read schedule photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'schedule-photos'
  and coalesce(public.is_project_member(public.schedule_photo_project(name)), false)
);

drop policy if exists "editors add schedule photos" on storage.objects;
create policy "editors add schedule photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'schedule-photos'
  and coalesce(public.can_edit_project(public.schedule_photo_project(name)), false)
);

drop policy if exists "editors update schedule photos" on storage.objects;
create policy "editors update schedule photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'schedule-photos'
  and coalesce(public.can_edit_project(public.schedule_photo_project(name)), false)
)
with check (
  bucket_id = 'schedule-photos'
  and coalesce(public.can_edit_project(public.schedule_photo_project(name)), false)
);

drop policy if exists "editors remove schedule photos" on storage.objects;
create policy "editors remove schedule photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'schedule-photos'
  and coalesce(public.can_edit_project(public.schedule_photo_project(name)), false)
);

-- The read-only embed now also returns each item's photo path. The embed page
-- turns it into a short-lived signed URL on the server.
create or replace function public.get_embedded_timetable(embed_token_value text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  if embed_token_value !~ '^[A-Fa-f0-9]{32}$' then
    return null;
  end if;

  select jsonb_build_object(
    'project', jsonb_build_object(
      'title', p.title,
      'slug', p.slug,
      'kind', p.kind
    ),
    'days', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'date', d.date,
          'sort_order', d.sort_order
        )
        order by d.sort_order, d.date
      )
      from public.project_days d
      where d.project_id = p.id
    ), '[]'::jsonb),
    'schedules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'day_id', s.day_id,
          'end_day_id', s.end_day_id,
          'title', s.title,
          'location', s.location,
          'start_time', s.start_time,
          'end_time', s.end_time,
          'color', s.color,
          'all_day', s.all_day,
          'image_path', s.image_path
        )
        order by s.day_id, s.start_time, s.id
      )
      from public.schedule_items s
      where s.project_id = p.id
    ), '[]'::jsonb)
  )
  into result
  from public.projects p
  where p.embed_token = embed_token_value;

  return result;
end;
$$;

revoke execute on function public.get_embedded_timetable(text) from public;
grant execute on function public.get_embedded_timetable(text) to anon, authenticated;

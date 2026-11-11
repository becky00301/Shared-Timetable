-- The focal point of a schedule item's photo: where in the picture, as
-- percentages from its left and top edges, a box should keep in view when it
-- crops the photo. Both null means centred, as photos were before.

alter table public.schedule_items
  add column if not exists image_focus_x real,
  add column if not exists image_focus_y real;

alter table public.schedule_items
  drop constraint if exists schedule_items_image_focus_check;

alter table public.schedule_items
  add constraint schedule_items_image_focus_check
  check (
    (image_focus_x is null and image_focus_y is null)
    or (
      image_focus_x between 0 and 100
      and image_focus_y between 0 and 100
    )
  );

-- The read-only embed returns the focal point with the photo path.
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
          'image_path', s.image_path,
          'image_focus_x', s.image_focus_x,
          'image_focus_y', s.image_focus_y
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

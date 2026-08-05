-- Separate public read capability from the member invitation token.
alter table public.projects
  add column if not exists embed_token text;

update public.projects
set embed_token = encode(gen_random_bytes(16), 'hex')
where embed_token is null;

alter table public.projects
  alter column embed_token set default encode(gen_random_bytes(16), 'hex'),
  alter column embed_token set not null;

create unique index if not exists projects_embed_token_idx
on public.projects(embed_token);

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
          'all_day', s.all_day
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
grant usage on schema public to anon, authenticated;
grant execute on function public.get_embedded_timetable(text) to anon, authenticated;

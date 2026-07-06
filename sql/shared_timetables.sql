create table if not exists public.shared_timetables (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shared_timetables enable row level security;

revoke all on table public.shared_timetables from anon, authenticated;
grant usage on schema public to anon, authenticated;

create or replace function public.get_shared_timetable(timetable_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if timetable_id !~ '^[A-Za-z0-9_-]{8,80}$' then
    raise exception 'Invalid timetable id';
  end if;

  return (
    select st.data
    from public.shared_timetables st
    where st.id = timetable_id
    limit 1
  );
end;
$$;

create or replace function public.save_shared_timetable(
  timetable_id text,
  timetable_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if timetable_id !~ '^[A-Za-z0-9_-]{8,80}$' then
    raise exception 'Invalid timetable id';
  end if;

  if jsonb_typeof(timetable_data) <> 'object' then
    raise exception 'Invalid timetable data';
  end if;

  if timetable_data->>'id' is distinct from timetable_id then
    raise exception 'Timetable id mismatch';
  end if;

  if pg_column_size(timetable_data) > 200000 then
    raise exception 'Timetable data is too large';
  end if;

  insert into public.shared_timetables (id, data)
  values (timetable_id, timetable_data)
  on conflict (id) do update set
    data = excluded.data,
    updated_at = now();
end;
$$;

revoke execute on function public.get_shared_timetable(text) from public;
revoke execute on function public.save_shared_timetable(text, jsonb) from public;

grant execute on function public.get_shared_timetable(text) to anon, authenticated;
grant execute on function public.save_shared_timetable(text, jsonb) to anon, authenticated;

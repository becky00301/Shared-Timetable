-- Anonymous sign-ins (Supabase Auth "Anonymous Sign-ins") create a real
-- auth.users row with no email, so handle_new_user's name fallback
-- (split_part(new.email, '@', 1)) resolves to null for guests. Give them a
-- friendly display name instead of a blank one in participant lists, avatars,
-- etc.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), '게스트'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    avatar = excluded.avatar;
  return new;
end;
$$;

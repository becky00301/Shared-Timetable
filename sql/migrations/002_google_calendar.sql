-- Google Calendar sync.
-- Tokens live in a table with RLS enabled and NO policies, so anon/authenticated
-- clients can never read them; only server routes using the service role key can.
create table if not exists public.google_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_accounts enable row level security;
revoke all on table public.google_accounts from anon, authenticated;

drop trigger if exists google_accounts_set_updated_at on public.google_accounts;
create trigger google_accounts_set_updated_at
before update on public.google_accounts
for each row execute function public.set_updated_at();

-- Each project syncs into its own Google calendar.
alter table public.projects
  add column if not exists google_calendar_id text;

-- Maps a schedule row to the event it created, so re-syncs update instead of duplicate.
alter table public.schedule_items
  add column if not exists google_event_id text;

# Planner Together

Planner Together is a collaborative schedule document built with Next.js 15, TypeScript, Tailwind CSS, Zustand, dnd-kit, and Supabase.

The product is intentionally not a normal monthly calendar. Users create a project, add only the dates they need, then build a shareable timetable across those selected dates.

## MVP Included

- Landing page, login page, dashboard, project page, and invite page
- Project creation with local MVP state
- Selected date management
- Google Calendar-style timetable grid from `00:00` to `23:00`
- Drag empty grid cells to create schedule items
- dnd-kit schedule block movement
- Top/bottom resize handles for duration edits
- Schedule creation/edit modal with validation
- Detail panel with attachments
- Role-aware edit gating for owner/editor/viewer
- Share modal with project and invite links
- Supabase Realtime hook for project tables
- PNG export through `html-to-image`
- PDF export utility through `jspdf`
- Mobile timeline view instead of the dense grid
- Supabase SQL schema and RLS policies

## Setup

Install dependencies:

```bash
npm ci
```

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_GTM_ID=your-gtm-container-id
```

`NEXT_PUBLIC_GTM_ID` is optional. When set, Google Tag Manager loads via `@next/third-parties`; when unset, it is skipped entirely. Configure Google Analytics 4 (or any other tag) inside the GTM container itself.

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Release Checks

Run the full local release gate before deploying:

```bash
npm run predeploy
```

This runs TypeScript, ESLint, the Next.js production build, and a production dependency audit.

For quick iteration, the checks can also be run separately:

```bash
npm run typecheck
npm run lint
npm run build
npm run audit:prod
```

After deploying, verify the runtime health endpoint:

```bash
curl https://your-domain.example/api/health
```

The endpoint returns `status: "ok"` only when the app is running and the required Supabase public environment variables are configured.

## Supabase

Run the SQL files in order:

1. `sql/schema.sql`
2. `sql/policies.sql`
3. `sql/shared_timetables.sql`

Sign-in uses email + password. Turn **Confirm email** off under Authentication → Sign In / Providers → Email so sign-up completes without a confirmation mail.

### Guest mode

"로그인 없이 체험하기" on the login page uses Supabase anonymous sign-ins, which are **off by default**. Enable **Allow anonymous sign-ins** under Authentication → Sign In / Providers, or the button fails with `Anonymous sign-ins are disabled`.

Guest mode is a trial, not a full account: signing in immediately creates **one** timetable and drops the guest straight into it. There is no dashboard — `/dashboard` redirects guests back to their timetable, and the links that lead there are hidden for them.

A guest gets a real `auth.users` row with `is_anonymous: true` and the `authenticated` role, so every existing RLS policy applies to them unchanged. The session lives only in that browser's storage — there is no email to recover it with, so the timetable warns guests to save its link.

Incremental migrations live in `sql/migrations/` and are already folded into `sql/schema.sql`; run them on an existing database:

- `001_project_kind.sql` — weekly vs date-range timetables
- `002_google_calendar.sql` — Google Calendar sync tables/columns
- `009_anonymous_guest_name.sql` — display name for guests (they have no email)

The standalone shared timetable at `/shared-timetable.html` does not require login. It stores timetable JSON through the RPC functions in `sql/shared_timetables.sql`; the random `tt` URL parameter acts as the share/edit capability token.

## Google Calendar sync

Each project syncs into its own Google calendar named `Planner Together · {title}`. Schedules are pushed one way (app → Google) and re-syncs update existing events rather than duplicating them.

Setup:

1. In [Google Cloud Console](https://console.cloud.google.com), create a project and enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External). While the app is in Testing, add each Google account that will connect under **Test users**.
3. Create an **OAuth client ID** of type *Web application* with these authorized redirect URIs:
   - `https://your-domain.example/api/google/callback`
   - `http://localhost:3000/api/google/callback`
4. Set the server-only environment variables (Vercel → Settings → Environment Variables, and `.env.local` for development):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → `service_role`)
5. Run `sql/migrations/002_google_calendar.sql`.

OAuth tokens are stored in `public.google_accounts`, which has RLS enabled and no policies, so only server routes using the service role can read them.

## Deployment

The app is ready for a standard Vercel Next.js deployment.

1. Set the project root to this directory.
2. Use the default install/build settings:
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output: Next.js default
3. Add environment variables from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_GTM_ID` (optional, enables Google Tag Manager)
4. In Supabase Auth, add the deployed domain to allowed redirect URLs for OAuth and email login.
5. Run `sql/schema.sql`, `sql/policies.sql`, and `sql/shared_timetables.sql` before connecting production data.
6. Open `/api/health` on the deployed domain and confirm it returns `status: "ok"`.

## App Routes

- `/` redirects to the standalone shared timetable
- `/shared-timetable.html` shareable timetable tool
- `/login` auth page
- `/dashboard` project dashboard
- `/plans/[slug]` selected-date timetable document
- `/invite/[token]` invite join page

## Architecture

```text
app/
  page.tsx
  login/page.tsx
  dashboard/page.tsx
  plans/[slug]/page.tsx
  invite/[token]/page.tsx
components/
  availability/
  export/
  layout/
  mobile/
  project/
  timetable/
  ui/
lib/
  db/
  export/
  permissions/
  supabase/
  utils/
stores/
  project-store.ts
  ui-store.ts
types/
  database.ts
  project.ts
  schedule.ts
sql/
  schema.sql
  policies.sql
```

## Production Notes

The MVP currently uses a local Zustand-backed sample store for immediate UI behavior. Supabase schema, RLS, Auth client, and Realtime hooks are included so the data layer can be connected without changing component ownership.

Recommended next steps:

- Replace local store mutations with Supabase queries and RPC calls
- Add route handlers/server actions for project creation and invite joins
- Add persistent invite role settings
- Add attachment upload through Supabase Storage
- Expand Availability Mode with common-slot ranking across all days
- Add Playwright coverage for schedule creation, move, resize, and export

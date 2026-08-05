# Planner Together

Planner Together is a collaborative schedule document built with Next.js 15, TypeScript, Tailwind CSS, Zustand, dnd-kit, and Supabase.

The product is intentionally not a normal monthly calendar. Users create a project, add only the dates they need, then build a shareable timetable across those selected dates.

## MVP Included

- Landing page, login page, dashboard, project page, and invite page
- Project creation with local MVP state
- Selected date management
- 24-hour timetable grid from `00:00` to `23:00`
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
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
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

Sign-in uses email + password. Turn **Confirm email** off under Authentication → Sign In / Providers → Email so sign-up completes without a confirmation mail.

### Guest mode

"로그인 없이 체험하기" on the login page uses Supabase anonymous sign-ins, which are **off by default**. Enable **Allow anonymous sign-ins** under Authentication → Sign In / Providers, or the button fails with `Anonymous sign-ins are disabled`.

Guest mode is a trial, not a full account: signing in immediately creates **one** timetable and drops the guest straight into it. There is no dashboard — `/dashboard` redirects guests back to their timetable, and the links that lead there are hidden for them.

A guest gets a real `auth.users` row with `is_anonymous: true` and the `authenticated` role, so every existing RLS policy applies to them unchanged. The session lives only in that browser's storage — there is no email to recover it with, so the timetable warns guests to save its link.

Incremental migrations live in `sql/migrations/` and are already folded into `sql/schema.sql`; run them on an existing database:

- `001_project_kind.sql` — weekly vs date-range timetables
- `009_anonymous_guest_name.sql` — display name for guests (they have no email)
- `011_remove_google_and_legacy.sql` — remove retired Google sync data and legacy anonymous timetable storage
- `012_read_only_embeds.sql` — add separate read-only embed tokens

For an existing database that previously enabled Google Calendar sync or the legacy standalone timetable, run `sql/migrations/011_remove_google_and_legacy.sql`. This permanently deletes the retired integration tokens and legacy timetable data.

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
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, required for account deletion)
4. In Supabase Auth, add the deployed domain to the allowed redirect URLs for email authentication.
5. Run `sql/schema.sql` and `sql/policies.sql` before connecting production data.
6. Open `/api/health` on the deployed domain and confirm it returns `status: "ok"`.

## App Routes

- `/` landing page
- `/login` auth page
- `/dashboard` project dashboard
- `/plans/[slug]` selected-date timetable document
- `/embed/[token]` login-free read-only timetable for Notion embeds
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

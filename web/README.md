# School Buddy — Web

The Next.js (App Router) companion to the root Expo app. Same Supabase project, same product, same admin-provisioned accounts — teachers and students sign in here from a browser instead of the mobile app.

## Included

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 (CSS-based theme in `app/globals.css`, tokens mirror the mobile app's `constants/theme.ts`)
- Supabase auth via `@supabase/ssr` — cookie-based sessions shared between Server Components, Client Components, and `proxy.ts`
- `proxy.ts` (Next 16's renamed `middleware.ts`) protects `/dashboard` and `/settings`, and refreshes the session cookie on every request
- Same basic pages as mobile: home, sign in, forgot password, dashboard, settings — no sign-up screen

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the same Supabase project URL/anon key used by the root app
npm run dev
```

Runs on http://localhost:3000.

## Environment variables

Next.js requires the `NEXT_PUBLIC_` prefix (not Expo's `EXPO_PUBLIC_`), so this app has its own `.env.local` even though it points at the same Supabase project as the root app:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Project structure

```text
web/
  app/
    page.tsx              Single-page marketing home, sign-in link in the header
    login/                Sign in
    forgot-password/      Password reset request
    dashboard/            Protected — dispatches to a role-specific dashboard component
    settings/             Protected — signed-in email, role, sign out
  components/
    dashboard/             Admin/Teacher/StudentDashboard — role-specific dashboard content
    ConfigNotice.tsx, SignOutButton.tsx
  constants/                Product configuration
  lib/
    errors.ts               Shared error-message helper
    supabase/
      client.ts             Browser Supabase client
      server.ts              Server Component / Server Action Supabase client
      profile.ts             getUserAndProfile() — user + role, used by dashboard/settings
      proxy.ts               Session refresh + route protection, used by proxy.ts
  proxy.ts                   Next.js Proxy entry point (runs on every request)
```

## Commands

```bash
npm run dev         # Start the dev server
npm run build        # Production build
npm run start         # Run the production build
npm run lint            # ESLint
npm run typecheck        # Strict TypeScript checks
```

## Roles

Every account has one of three roles — `admin`, `teacher`, or `student` — stored in the shared `public.profiles` table (see `../supabase/migrations/0001_roles.sql`), not in Supabase's `user_metadata` (which the signed-in user can edit themselves, so it isn't trustworthy for authorization). `/dashboard` renders a different component (`components/dashboard/{Admin,Teacher,Student}Dashboard.tsx`) based on `profile.role`, fetched via `getUserAndProfile()`.

To change a role, run SQL directly against the Supabase project (an in-app admin UI is planned but not built yet):

```sql
update public.profiles set role = 'admin' where email = 'someone@school.edu';
```

## Notes

- Accounts are created by an administrator (Supabase Dashboard → Authentication → Users, for now) — there is no sign-up flow here, matching the mobile app. Set the role at creation time via that dialog's User Metadata, e.g. `{"role": "teacher"}`.
- Class/assignment data on the Teacher and Student dashboards is static placeholder data; the Admin dashboard's account counts are real, queried from `profiles`. Wiring classes/assignments to real Supabase tables is planned but not implemented yet.
- Replace `app/favicon.ico` with a real icon when branding assets are ready.

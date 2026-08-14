# School Buddy

An internal learning tool for teachers and students. Teachers and students sign in with accounts provisioned by an administrator; there is no self-service account creation in the app.

This repo has two apps sharing one Supabase project:

- **This directory** — the Expo/React Native mobile app (iOS, Android, and Expo's own web target).
- **[`web/`](web/README.md)** — a separate Next.js web app with the same pages (home, sign in, dashboard, settings).

## Included

- Expo SDK 54, React Native, TypeScript, and Expo Router
- Public, authentication, and protected route groups
- Supabase email/password authentication and session restoration
- NativeWind setup plus reusable theme tokens for inline styles
- Reusable screen, button, input, auth-layout, and configuration components
- Android, iOS, and web configuration
- Type checking in local scripts and GitHub Actions
- EAS development, preview, and production build profiles

## Quick start

Requirements: Node.js 22+, npm, and the platform tooling required by Expo.

```bash
npm install
cp .env.example .env
npm start
```

Press `i` for the iOS simulator, `a` for Android, or `w` for web. Expo's local CLI is used through npm; a global Expo CLI installation is not required.

## Environment variables

Create `.env` from `.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these values in your Supabase project's API settings. Only put public client values in `EXPO_PUBLIC_*` variables. Never place service-role keys or private API secrets in the app bundle.

Enable email authentication in Supabase Authentication. The app supports:

- Email and password sign in
- Persisted sessions
- Password reset email requests
- Sign out

Accounts for teachers and students are created by an administrator (in the Supabase dashboard, or a future admin tool) — the app itself has no sign-up screen. Password-reset deep linking and OAuth providers are intentionally left as product-specific extensions because their callback URLs and native credentials depend on your app identifiers.

## Project structure

```text
app/
  (app)/             Authenticated screens (dashboard, settings)
  auth/              Sign in, password reset
components/
  auth/              Shared authentication layouts
  shared/            Reusable UI primitives
constants/           Product configuration and design tokens
lib/                 External clients and helpers
stores/              Global auth state
scripts/             Template configuration utilities
```

## Commands

```bash
npm start             # Start Expo
npm run start:clear   # Start with Metro cache cleared
npm run ios           # Open iOS
npm run android       # Open Android
npm run web           # Open web
npm run typecheck     # Run strict TypeScript checks
```

## Architecture choices

- Keep product configuration in `constants/config.ts`; avoid scattering the app name and support details through screens.
- Keep design tokens in `constants/theme.ts`. If using NativeWind classes, mirror brand-token changes in `tailwind.config.js`.
- Put authenticated routes inside `app/(app)`. The group layout redirects signed-out users.
- The root `app/index.tsx` sends signed-out users to `/auth/login` and signed-in users to `/(app)` — there is no onboarding flow.
- Keep secrets on a server. Mobile app code and `EXPO_PUBLIC_*` values are visible to end users.
- Supabase is pinned to `2.105.4` because newer tracing code currently fails Expo SDK 54's Hermes production export. Retest Android and iOS bundles before upgrading it.
- Add server-state tooling only when the app needs it. TanStack Query, analytics, crash reporting, payments, and push notifications are intentionally not preinstalled.

## Roles

Every account has one of three roles — `admin`, `teacher`, or `student` — stored in a `public.profiles` table (see `supabase/migrations/0001_roles.sql`), not in Supabase's `user_metadata`. `user_metadata` is editable by the signed-in user themselves, so it can't be trusted for authorization; `profiles.role` has no client update policy, so once set it only changes via direct SQL or (in a future phase) an admin panel using a service-role key.

A database trigger creates the matching profile row whenever an admin provisions a new account. Setting `{"role": "teacher", "full_name": "Jane Doe"}` in that account's User Metadata (Supabase Dashboard → Authentication → Users → Add user) sets the role at creation time; it defaults to `student` otherwise. To change a role later, run SQL directly, e.g.:

```sql
update public.profiles set role = 'admin' where email = 'someone@school.edu';
```

`app/(app)/index.tsx` renders a different dashboard component (`components/dashboard/{Admin,Teacher,Student}Dashboard.tsx`) based on `profile.role`. Building an in-app admin UI for creating accounts and assigning roles is the next phase, not implemented yet.

### Seeding accounts

`scripts/seed-users.sql` creates a batch of accounts (with role/name metadata) in one paste, faster than clicking through the dashboard one at a time: edit the emails/passwords/names inside it, then run it in Supabase Dashboard → SQL Editor. It writes directly to Supabase's internal `auth` schema rather than an API, so treat it as a dev/seeding convenience, not a documented interface — see the comment at the top of the file for details.

## Recommended additions by project

- TanStack Query for server-state caching
- Sentry for production crash reporting
- React Hook Form and Zod for large or complex forms
- Expo Notifications for push notifications
- Maestro or Detox for end-to-end testing

These are not included by default because unused infrastructure makes the app harder to understand and maintain.

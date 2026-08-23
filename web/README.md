# School Buddy — Web

The Next.js (App Router) companion to the root Expo app. Same Supabase project, same product, same admin-provisioned accounts — teachers and students sign in here from a browser instead of the mobile app.

## Included

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 (CSS-based theme in `app/globals.css`, tokens mirror the mobile app's `constants/theme.ts`)
- Supabase auth via `@supabase/ssr` — cookie-based sessions shared between Server Components, Client Components, and `proxy.ts`
- `proxy.ts` (Next 16's renamed `middleware.ts`) protects all authenticated routes and refreshes the session cookie on every request
- A persistent left sidebar (`components/Sidebar.tsx`) with role-specific nav — Classes/Students/Assignments for teachers, Subjects/Assignments for students, Teachers/Students account management for admins
- Live admin account management — create teacher/student accounts, restrict/unrestrict, reset passwords — via protected Route Handlers using the Supabase service-role key
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

# Server-only — required for admin account management (create/restrict/reset-password).
# Find it in Supabase Dashboard -> Project Settings -> API -> service_role secret.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Project structure

```text
web/
  app/
    page.tsx              Single-page marketing home, sign-in link in the header
    login/                Sign in
    forgot-password/      Password reset request
    (app)/                 Authenticated route group, shares the Sidebar layout
      layout.tsx            Fetches user+profile, renders Sidebar + children
      dashboard/            Dispatches to a role-specific dashboard component
      classes/               Teacher-only — real classes, "New class" form
      classes/[id]/           Class detail — roster + assignments for one class
      students/               Teacher-only — real aggregate roster (read-only)
      subjects/               Student-only — real enrolled classes
      assignments/            Real assignments, teacher (all classes + create) or student (read-only)
      admin/teachers/, admin/students/   Admin-only — live account management
      exams/, curriculum/, performance/, timetable/, learning-videos/   Placeholder pages (ComingSoon)
      settings/              Signed-in email, role, sign out
    api/admin/
      create-user/route.ts    POST — create a teacher/student account
      set-restricted/route.ts POST — ban/unban via Supabase admin API
      set-password/route.ts   POST — set a new password directly
  components/
    Sidebar.tsx              Role-specific left nav (placeholders included in the nav shape)
    ComingSoon.tsx            Shared placeholder page content
    dashboard/               Admin/Teacher/StudentDashboard — real data
    classes/                 ClassesList, RosterManager, ClassAssignments
    assignments/              NewAssignmentForm, AssignmentListItem, AssignmentsPageClient
    admin/AccountsTable.tsx   Create/restrict/reset-password UI, used by admin/teachers|students
    ConfigNotice.tsx, SignOutButton.tsx
  constants/                Product configuration
  lib/
    errors.ts               Shared error-message helper
    supabase/
      client.ts             Browser Supabase client
      server.ts              Server Component / Server Action Supabase client (cookie-based, RLS-respecting)
      admin.ts                Service-role client — server-only, bypasses RLS, used only by api/admin/*
      require-admin.ts        Route Handler guard — verifies caller's own session has role='admin'
      profile.ts             getUserAndProfile() — user + role, used across (app) pages
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

To promote someone to `admin`, still run SQL directly (the in-app account creation flow only issues `teacher`/`student` accounts, deliberately — granting admin rights isn't a button click):

```sql
update public.profiles set role = 'admin' where email = 'someone@school.edu';
```

### Admin account management

`/admin/teachers` and `/admin/students` list accounts by role (via the existing "admins view all profiles" RLS policy — no elevated access needed just to read) and let an admin:

- **Create** a teacher or student account — calls `POST /api/admin/create-user`, which uses `auth.admin.createUser(...)` server-side. The existing `handle_new_user` trigger creates the matching `profiles` row.
- **Restrict / unrestrict** — `POST /api/admin/set-restricted` bans/unbans via `auth.admin.updateUserById(..., { ban_duration })`, and mirrors the flag onto `profiles.restricted` (added in `supabase/migrations/0002_account_management.sql`) so the list can display it without another privileged call.
- **Set password** — `POST /api/admin/set-password` sets a new password directly (shown once in the UI, handed off out-of-band) — no email flow, matching how accounts are created.

All three routes call `requireAdmin()` (`lib/supabase/require-admin.ts`) first, which checks the *caller's own* cookie-based session has `profiles.role === 'admin'`, before using the service-role client (`lib/supabase/admin.ts`) to act on someone else's account. This is web-only for now — the mobile app has no server to hold the service-role key, so it shows the admin dashboard but no live account-management screens yet.

## Classes, roster, and assignments

Real data, backed by `../supabase/migrations/0003_schools_classes.sql` (`schools`, `classes`, `enrollments`, `assignments`, plus RLS and helper functions `is_teacher()`/`current_school_id()` mirroring `is_admin()`). A teacher creates classes (`/classes`), manages a class's roster and assignments from `/classes/[id]` (add/remove students from existing accounts in the same school; create assignments with title/description/assessment type/difficulty/due date), or creates an assignment from `/assignments` with a class picker. Students see their real enrolled classes (`/subjects`) and assignments — RLS scopes both automatically, no extra query filtering needed.

Also added a lightweight multi-tenant foundation: every `profiles` row now has a `school_id`, backfilled to one default school (`School Buddy Academy`). There's no "manage schools" UI yet — single-tenant behavior today, correct shape for later.

**Deliberately out of scope this pass**: assigning to an individual student or a group (assignments always target the whole class), and any submission/grading subsystem — an assignment is a record with a due date, not yet tracked per student.

## Notes

- Accounts are created by an administrator — either through `/admin/teachers` / `/admin/students` above, or via Supabase Dashboard → Authentication → Users (set the role at creation time via that dialog's User Metadata, e.g. `{"role": "teacher"}`). There is no self-serve sign-up flow, matching the mobile app.
- Exams, Curriculum, Performance, and Learning Videos are placeholder pages (`components/ComingSoon.tsx`) — shown in the sidebar to match the target product shape, not implemented yet.

### Timetable

Real now, backed by `../supabase/migrations/0006_class_schedule.sql` (`class_schedule`: `class_id`, `day_of_week` 1–7, `start_time`, `end_time`; RLS reuses the `owns_class()`/`is_enrolled()` helpers from `0003_schools_classes.sql`). A teacher sets a class's meeting times from its detail page (`components/classes/ClassSchedule.tsx`, a "Schedule" section alongside Roster/Assignments); `/timetable` renders a weekly grid built from whatever days/times actually exist in the data — teachers see their own classes, students see their enrolled ones, each class colored consistently via the same `TILE_PALETTE` used on dashboards.
- Replace `app/favicon.ico` with a real icon when branding assets are ready.

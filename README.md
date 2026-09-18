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

# Base URL of the web app (see web/README.md), used only to reach the AI
# Chat proxy at /api/chat. Point it at wherever that server is reachable
# from your phone/simulator — not "localhost", which resolves to the device
# itself, not your machine.
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Find the Supabase values in your Supabase project's API settings. Only put public client values in `EXPO_PUBLIC_*` variables. Never place service-role keys, the Gemini key, or any other private API secret in the app bundle.

Enable email authentication in Supabase Authentication. The app supports:

- Email and password sign in
- Persisted sessions
- Password reset email requests
- Sign out

Accounts for teachers and students are created by an administrator (in the Supabase dashboard, or a future admin tool) — the app itself has no sign-up screen. Password-reset deep linking and OAuth providers are intentionally left as product-specific extensions because their callback URLs and native credentials depend on your app identifiers.

## Project structure

```text
app/
  (app)/             Authenticated tabs: dashboard, ai-chat, classes/students (teacher),
                      subjects (student), assignments, settings
  class/[id].tsx     One subject offering — assignments + read-only roster (top-level route)
  auth/              Sign in, password reset
components/
  auth/              Shared authentication layouts
  dashboard/          Admin/Teacher/StudentDashboard — role-specific dashboard content
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

Every account has one of four roles — `admin`, `vice_principal`, `teacher`, or `student` — stored in a `public.profiles` table (see `supabase/migrations/0001_roles.sql`, roles widened by `0013_vice_principal.sql`), not in Supabase's `user_metadata`. `user_metadata` is editable by the signed-in user themselves, so it can't be trusted for authorization; `profiles.role` has no client update policy, so once set it only changes via direct SQL or the admin panel's account-creation flow (service-role key, teacher/student only — never admin/vice_principal, see below).

`vice_principal` is "admin-lite": same account-management powers as admin (create/restrict teacher & student accounts, reset their passwords) and the same school-wide read access (all classes, rosters, grades), but it can't act on an admin account and doesn't get the more destructive admin-only powers (like deleting a whole Class) — see `web/README.md`'s Roles section for the exact mechanism (`is_staff()` helper + a per-route check).

A database trigger creates the matching profile row whenever an admin provisions a new account. Setting `{"role": "teacher", "full_name": "Jane Doe"}` in that account's User Metadata (Supabase Dashboard → Authentication → Users → Add user) sets the role at creation time; it defaults to `student` otherwise. `admin`/`vice_principal` accounts are always provisioned this way (Supabase Dashboard, or `scripts/seed-users.sql` for dev seeding) — there's no in-app flow for either, only for teacher/student. To change a role later, run SQL directly, e.g.:

```sql
update public.profiles set role = 'admin' where email = 'someone@school.edu';
```

`app/(app)/index.tsx` renders a different dashboard component (`components/dashboard/{Admin,Teacher,Student}Dashboard.tsx`) based on `profile.role` — `vice_principal` renders the same `AdminDashboard` as `admin`. Teacher and student roles also get their own bottom tabs — Classes/Students/Assignments for teachers, Subjects/Assignments for students (`app/(app)/classes.tsx`, `students.tsx`, `subjects.tsx`, `assignments.tsx`); the tab layout (`app/(app)/_layout.tsx`) hides tabs that don't apply to the signed-in role via expo-router's `href: null` option. AI Chat (`app/(app)/ai-chat.tsx`) is always visible, including for admin/vice_principal.

Admin/VP account management (create teacher/student accounts, restrict/unrestrict, reset passwords) is **web-only for now** — see `web/README.md`'s Roles section. Mobile shows the same oversight dashboard (account counts + school-wide Classes/Subjects/Assignments counts) but no admin-specific tabs yet, since those actions need a server holding Supabase's service-role key, which only the web app has.

## Classes, roster, and assignments

Two levels: a **Class** (`class_groups`, e.g. "Class 9") holds the shared student roster, and each **subject offering** within it (`classes`, e.g. "Class 9 · Maths") has its own teacher, period, room, assignments, and materials — added by `supabase/migrations/0009_class_groups.sql` on top of the base schema in `0003_schools_classes.sql` (`schools`, `classes`, `enrollments`, `assignments`, plus RLS and helper functions like `is_teacher()`/`current_school_id()` mirroring `is_admin()` from `0001_roles.sql`). This replaced the earlier one-level model where each class had its own roster — two subjects for the same physical group of students used to show up as duplicate, confusingly-named rows with separate rosters.

A subject has exactly one teacher, school-wide (`supabase/migrations/0012_subject_teacher.sql`) — matches how a real school works: one Maths teacher teaches Maths across several classes, not several teachers per class. A DB trigger keeps `classes.teacher_id` synced from `subjects.teacher_id` automatically.

**Class structure — creating a Class, assigning a subject to it, managing the roster, deleting a Class — is admin/VP-only** (`supabase/migrations/0015_admin_controls_classes.sql`), since a teacher has exactly one subject and nothing to structurally manage. A teacher's `app/(app)/classes.tsx` list is read-only and taps straight through to their own subject's screen (`app/class/[id].tsx`) — which now also shows a read-only roster — skipping class management entirely. Web has the equivalent (and the actual admin/VP management UI) at `/classes` — see `web/README.md`'s Classes section for the full mechanism. Assignments (title, description, assessment type, difficulty, due date) stay a teacher's job, created from their subject's own screen or the Assignments tab. Students see their real enrolled subjects (Subjects tab) and assignments, scoped automatically by RLS — `is_enrolled()` resolves through a subject offering's `class_group_id` so it keeps working unchanged everywhere it's already used (assignments, schedule).

**Deliberately out of scope this pass**: individual/group assignment targeting (assignments always go to the whole class). Submissions + grading are now real, but **web-only** — a student submits an assignment and a teacher grades it from `/assignments/[id]` on the web app; mobile's Assignments tab still just shows the read-only list, no submit/grade UI yet (see `web/README.md`'s "Submissions & grading" section, including rubric-based grading for freeform assignments and the assignment status lifecycle — active/ended/cancelled, with a teacher able to end early, reopen, cancel, or hard-delete). Performance (graded-submission history + summary stats) is real now too, web only, teacher/student only — see that README's Performance section; a teacher can also drill into one student's own assignments/grades/stats from a Students-list row. Exams and Learning Videos remain placeholder screens on web only (see `web/README.md`); Timetable is real now, web only — see that README's Timetable section. Materials (upload/manage, now supporting multi-file batches like several photos of one notebook) and AI-generated tests (with an editable per-generation difficulty/guidance prompt and a teacher-only "Show answers" explanation view) live inside each subject offering's own page, web only — see that README's Materials and "AI-generated tests" sections (there's no standalone `/curriculum` page anymore). Mobile doesn't have tabs for any of these; its dashboards and Classes list do share the same banner/colorful-tile treatment as web now (`components/dashboard/DashboardBanner.tsx`, `TILE_PALETTE`) — and since a teacher only ever has one subject, mobile's Classes list/dashboard also drop the redundant per-row subject name now, same as web.

## AI Chat

`app/(app)/ai-chat.tsx` — a real bottom tab now (previously a floating bubble), on both platforms, every role. Plain Gemini conversation via `POST /api/chat` on the web app (mobile has no server of its own, so it calls the web app's route at `EXPO_PUBLIC_API_URL`, authenticating with its own Supabase access token as a Bearer header since it can't share the web app's session cookie). Set `GEMINI_API_KEY` in `web/.env.local` to enable it — see `web/README.md`'s AI Chat section.

Every assistant reply has a **Listen** button (`expo-speech`, native device TTS — no API key, no network round-trip) that reads it aloud in the current language. It's a client-side layer over the plain text reply; Gemini isn't involved in the audio at all, and there's no live voice conversation (that's Gemini's separate Live API — a different integration, not implemented).

Replies render as Markdown (`react-native-markdown-display`, since Gemini often formats longer answers with headings/bold/lists) instead of showing raw `**`/`#`/`---` as literal text. Before a reply is spoken, `lib/markdown.ts`'s `stripMarkdownForSpeech()` strips that same formatting first, so **Listen** doesn't read out symbols like "asterisk asterisk" — `/api/chat`'s system prompt also nudges Gemini toward lighter formatting suited to a chat bubble in the first place.

Conversations are persisted server-side now (`supabase/migrations/0019_ai_chat_history.sql`) — a **New chat** button, a **History** list (tap to reopen, swipe-adjacent delete icon per row, via a bottom sheet modal here since there's less screen width than web), and delete, all RLS-scoped to the signed-in user. `POST /api/chat` (web's route, called by both platforms) writes each turn's user message + reply to the DB as a side effect, creating a session on a new chat's first message; listing/loading/deleting a session happens as a plain RLS-protected Supabase read/delete directly from the app, same as web.

**Not built yet**: this chat has no access to the class materials teachers upload from each subject's Materials section (web) — no retrieval/RAG, no guardrails scoping answers to the school's own content.

## Multi-language support

English, Hindi, and Telugu, UI chrome only — nav tabs, dashboards, auth screens, Settings, AI Chat, and now every tab screen (Classes, Students, Subjects, Assignments, and the subject-offering detail screen with its inline roster/assignment form) — `constants/i18n/` (kept in sync with `web/lib/i18n/` — same dictionary shape, copied over any time a key changes), `stores/languageStore.ts` (Zustand + `AsyncStorage`, mirrors the pattern in `stores/authStore.ts`). Teacher-authored content (names, subjects, materials) and AI-generated output are never dictionary-translated — they're real data, not app chrome; AI replies instead get a language directive passed to Gemini directly (see AI Chat section in `web/README.md`). Switched from a picker in Settings; persists across app restarts.

### Seeding accounts

`scripts/seed-users.sql` creates a batch of accounts (with role/name metadata) in one paste, faster than clicking through the dashboard one at a time: edit the emails/passwords/names inside it, then run it in Supabase Dashboard → SQL Editor. It writes directly to Supabase's internal `auth` schema rather than an API, so treat it as a dev/seeding convenience, not a documented interface — see the comment at the top of the file for details.

## Recommended additions by project

- TanStack Query for server-state caching
- Sentry for production crash reporting
- React Hook Form and Zod for large or complex forms
- Expo Notifications for push notifications
- Maestro or Detox for end-to-end testing

These are not included by default because unused infrastructure makes the app harder to understand and maintain.

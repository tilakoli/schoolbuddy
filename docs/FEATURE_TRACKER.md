# Web-first delivery and mobile parity tracker

Updated: 26 September 2026.

Live role verification on 26 September 2026 confirmed that the full-dataset teacher account can authenticate and read 2 classes, 1 assignment, 3 submissions and 1 timetable row; the full-dataset student account can authenticate and read 5 classes, 3 assignments and 3 own submissions. The student seed currently has no timetable rows. This verifies Supabase Auth/RLS data access, not every browser interaction.

The configured Supabase project was updated on 26 September 2026 with migration `0002` and migrations `0020`–`0025`. Post-migration checks confirmed the restricted-account, grounding and feedback columns, secure submission, confidential result-release and grounded-context RPCs, chat ownership foreign key, material-path constraint, exam schedules, learning videos, and video progress policies. Live teacher and student accounts both retrieved role-scoped class, assignment, submission and grounded-chat context successfully.

Next.js remains the primary feature-development surface. Native screens can follow later. Business rules and API contracts belong in `shared/`; authorization and privileged writes belong on the backend. Existing mobile behavior must stay correct when shared features change.

## Foundation implemented in this change

| Work | Repository status | Deployment/verification |
| --- | --- | --- |
| Shared assignment types, lifecycle rules, profile types | Implemented in `shared/domain/` | Consumed by web and mobile; unit/type checks |
| Native ended/cancelled assignment labels | Implemented in assignment list and subject detail | Native bundles checked; device interaction remains to verify |
| Shared submission request validation and API client | Implemented; web consumes client | Native submission UI deferred; transport tests cover cookies/bearer |
| Common API authentication | All existing API routes support cookies or bearer tokens | Live web/native authenticated smoke tests pending |
| Secure atomic submission and scoring | Migration 0020 + RPC-based endpoint | Live migration applied; isolated regression tests passed |
| Confidential student result release | Migration 0024 + masked student-read RPC | Live migration applied, policy/function verified and regression-covered |
| Chat ownership, material extraction, trusted provisioning | Migration 0021 + route changes | Live migration applied; isolated policy tests passed |
| Grounded read-only AI chat and saved source evidence | Migration 0022 + role-aware retrieval/API/UI | Live migration and role-scoped context checks passed |
| Three-mode AI roadmap (chat, live-transcript voice, avatar) | Shared session/retrieval design documented | Chat and turn-based Voice Beta implemented; avatar phased |
| Chat answer actions and feedback | Migration 0023 + authenticated feedback API | Copy, retry, helpful/not-helpful and structured reasons implemented | Planned | Next |
| Chat voice transcription and attachments | Existing grounded chat API; transient multimodal extraction | Live interim transcript, microphone controls, drag/drop PDF/image/text evidence implemented | Planned | Next |
| Exams and learning videos | Migration 0025; shared video URL helpers | Teacher create/publish, student view/progress, staff oversight | Planned | Next |
| Staff account target validation | Same-school teacher/student targets only | Source/type checked; live Admin API smoke tests pending |
| CI coverage | Both apps, web lint/build, native export, translations, unit and database tests | Workflow added; hosted CI run pending |

## Feature parity backlog

| Feature | Shared/backend status | Web | Native | Native priority |
| --- | --- | --- | --- | --- |
| Authentication and role dashboards | Existing shared backend | Implemented | Implemented | Maintain |
| Dashboard KPIs, charts and attention panels | Existing role-scoped queries; no new schema | Implemented on web for admin, teacher and student | Existing summary dashboards; visual parity planned | Next |
| Auth layout, progress loading and join guidance | Admin-provisioned account model | Implemented | Existing sign-in; visual parity planned | Next |
| Shared application shell and visual theme | Web-wide navigation/header and design tokens | Indigo navigation rail, desktop top bar, layered canvas and elevated surfaces implemented | Previous mobile theme retained | Next |
| Basic assignments and lifecycle labels | Shared lifecycle module | Implemented | Implemented | Maintain |
| Assignment submissions | Secure RPC/API added; deploy migrations | Implemented | Planned | First |
| Grade viewing and feedback | Existing backend; result-release work pending | Implemented | Planned | First |
| Manual/rubric grading | Existing backend; validation review pending | Implemented | Planned | First |
| End/reopen/cancel/delete assignments | Existing backend | Implemented | Planned | First |
| Timetable | Existing backend | Implemented | Planned | Next |
| Materials and AI extraction | API accepts native tokens | Implemented | Planned | Next |
| AI assignment generation | API accepts native tokens | Implemented | Planned | Next |
| Student detail and performance | Existing backend | Implemented | Planned | Next |
| Account administration | API accepts native tokens | Implemented | Planned | Later |
| Class/subject/roster administration | Existing backend | Implemented | Planned | Later |
| AI chat/history/read-aloud | Shared backend and authentication | Implemented; per-user restore, search, grouping, rename and delete | Implemented | Maintain |
| School-aware chat sources | Read-only role/school retrieval; deploy migration 0022 | Source cards and evidence snapshots | Source labels and limitations | Maintain |
| Voice transcription/conversation | Authenticated transcription API; browser recognition fallback | Dictation and turn-based Voice Beta implemented | Planned | After grounded chat rollout |
| Lip-synced avatar | Not implemented | Future | Future | Product research |
| Password recovery completion | Callback/new-password workflow needed | Planned | Planned | Before rollout |
| Exams and learning videos | Shared schema/RLS and URL helpers | Implemented | Planned | Next |

## Open issues retained from the audit

These are not claimed as fixed by the foundation work:

- **Multi-school isolation:** staff account targets are now school-scoped; global staff database policies still require a full tenant-isolation pass.
- Atomic publishing of an assignment together with its answer key.
- Atomic/fail-closed AI rate limiting and operational error handling.
- Replace the obsolete default Gemini model after verifying the deployment's supported model and configuration.
- Complete password recovery and native deep linking.
- Subject reassignment UI and the one-teacher/one-subject assumptions.
- Generated database types and consolidation of translations/design tokens into common packages.
- Complete live integration, accessibility, and real-device tests.

## Rules for new features

1. Record web and native status in this table when the feature is introduced.
2. Define shared request/response types and validation before building the screen.
3. Keep private keys, answer keys and privileged actions server-side.
4. Support cookie and bearer-token callers through the common authentication adapter.
5. Test authorization at the database/API boundary, not just button visibility.
6. Keep installed native versions compatible with additive API/schema changes.
7. Mark native UI as planned explicitly; shared backend availability is not native feature completion.

See [deployment and verification](IMPLEMENTATION_NOTES.md) before deploying the foundation changes. The [original analysis](APP_ANALYSIS.md) remains the historical baseline.

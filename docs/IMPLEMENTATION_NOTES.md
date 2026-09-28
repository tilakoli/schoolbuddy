# Foundation rollout and verification

Implemented: 26 September 2026. No live Supabase changes were applied by this work.

## Deployment order

The new submission endpoint requires migration 0020. Trusted account provisioning requires 0021. Grounded chat requires 0022. Coordinate a short maintenance window: the updated chat route selects and writes the new `grounding` column and calls the new retrieval function.

1. Back up and rehearse against a staging copy of Supabase.
2. Apply `0020_secure_submissions.sql`, `0021_ownership_and_provisioning.sql`, then `0022_grounded_chat.sql`, after existing migrations 0001–0019.
3. Deploy the updated Next.js app. Native lifecycle labels require distribution of the updated native bundle/build.
4. Verify student freeform/MCQ submissions, teacher grading, grounded chat create/reopen/delete, source cards, material extraction, and staff account creation with real test accounts.
5. Verify bearer-token calls from native and cookies from web, including rejected expired/invalid tokens and restricted accounts.
6. Confirm public signup remains disabled for this administrator-provisioned product.

Do not restore the old direct-submission insert policy as a workaround. If deployment fails, keep submission writes disabled until the compatible endpoint is available.

## Account provisioning change

The profile trigger now trusts **app metadata**, writable through privileged provisioning, for `role` and `school_id`. User metadata is used only for display information such as `full_name`. Existing profiles are unchanged.

The in-app account-creation API supplies trusted app metadata. Development SQL seeds have been updated accordingly. For manual dashboard provisioning, an account without trusted role metadata defaults to student. A trusted administrator must assign the intended `profiles.role` and `profiles.school_id` directly using SQL or use the Admin API with app metadata. Putting `role` in ordinary user metadata no longer promotes an account.

Staff password/restriction endpoints now manage only teacher/student accounts in the caller's school, matching their UI purpose. Admin/VP account changes require a separate trusted administrative process.

## Historical ownership constraints

Migration 0021 uses `NOT VALID` for ownership/path foreign-key and check constraints so historical bad rows do not prevent protection of new writes. Existing inconsistent rows must be reviewed; they are not silently deleted.

Audit in a trusted database session:

```sql
select count(*) as inconsistent_chat_messages
from public.ai_chat_messages m
join public.ai_chat_sessions s on s.id = m.session_id
where m.user_id <> s.user_id;

select count(*) as inconsistent_material_paths
from public.material_files
where split_part(file_path, '/', 2) <> material_id::text;
```

After investigating and correcting any inconsistent rows, validate:

```sql
alter table public.ai_chat_messages validate constraint ai_chat_messages_session_owner_fkey;
alter table public.material_files validate constraint material_files_path_matches_material;
```

## Local checks

```bash
npm run typecheck
npm run i18n:check
npm test
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run build
npx expo export --platform ios --platform android --output-dir /tmp/schoolbuddy-native
```

The unit tests cover shared lifecycle boundaries, malformed and duplicate submission requests, chat input limits, material path ownership, and web/native submission transport.

Database tests require **an empty disposable PostgreSQL database** and `psql`:

```bash
DATABASE_TEST_URL=postgresql://postgres:postgres@localhost:5432/schoolbuddy_test npm run test:db
```

Never point this at production or a database with application data. The runner creates minimal Supabase auth/storage interfaces, applies all checked-in migrations, and exercises actual PostgreSQL RLS and RPC behavior. It tests forged grading fields, duplicate/unknown/out-of-range answers, deadlines/cancellation, repeat submissions, non-student and unenrolled/restricted callers, trusted provisioning, material paths, and chat ownership/read/delete behavior. It does not replace full Supabase Auth/Storage HTTP integration tests.

## Verification results

- Both application TypeScript checks, web lint, translation checks and seven unit tests passed.
- All migrations and security regressions passed on isolated local PostgreSQL 14.
- Next.js production build passed with `npm run build -- --webpack`.
- The default Turbopack build was blocked by this execution environment's internal port-binding restriction; its initial font downloads also required network access. The default build command remains unchanged, and CI will check it on the hosted runner.
- iOS and Android production JavaScript/Hermes bundles exported successfully. This is not an App Store/Play Store native binary build; live deployment and real-device workflow tests remain pending.

## Remaining work

[FEATURE_TRACKER.md](FEATURE_TRACKER.md) distinguishes implemented foundation work from deferred mobile interfaces and unresolved audit findings. In particular, full tenant isolation and early-grade confidentiality are still open; do not interpret this change as completion of the entire audit.

#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_TEST_URL:?Set DATABASE_TEST_URL to an EMPTY disposable PostgreSQL database. Never use production.}"
psql "$DATABASE_TEST_URL" -X -v ON_ERROR_STOP=1 -f tests/database/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  psql "$DATABASE_TEST_URL" -X -v ON_ERROR_STOP=1 -f "$migration"
done
psql "$DATABASE_TEST_URL" -X -v ON_ERROR_STOP=1 -f tests/database/security.sql
psql "$DATABASE_TEST_URL" -X -v ON_ERROR_STOP=1 -f tests/database/chat.sql

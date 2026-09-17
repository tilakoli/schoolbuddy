-- School Buddy: per-user rate limiting for AI-calling routes.
--
-- /api/chat, /api/materials/extract, and /api/assignments/generate each call
-- Gemini with no server-side throttle before this — the UI disables its
-- trigger button while a request is in flight, but that's a client-side
-- nicety, not a real boundary: a direct API call with a valid session
-- (curl, a buggy retry loop, a leaked token) sails straight through with
-- nothing to stop it firing as fast as the network allows.
--
-- This table logs one row per AI call attempt; each route checks + logs
-- against it (via lib/aiRateLimit.ts) before calling Gemini. Only ever
-- touched by the service-role client from server routes — no client-facing
-- policies, so RLS default-denies everyone else (including the owning user
-- reading their own rows directly).
--
-- Run in Supabase Dashboard -> SQL Editor, after 0013_vice_principal.sql.

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  route text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_requests_user_route_created_idx
  on public.ai_requests (user_id, route, created_at desc);

alter table public.ai_requests enable row level security;

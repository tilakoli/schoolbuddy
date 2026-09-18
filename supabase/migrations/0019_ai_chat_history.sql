-- Persisted AI Chat history — sessions (one per conversation) and their
-- messages, so "New chat" / chat history / delete chat can work across
-- devices and page reloads instead of living only in client state.
--
-- Writes to ai_chat_messages happen server-side only (POST /api/chat, via
-- the service-role client, right after a successful Gemini call) — the
-- client never inserts a message directly, only reads/deletes its own via
-- RLS. Sessions can be deleted by the client directly (RLS-protected),
-- which cascades their messages.

create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_chat_sessions_user_id_updated_at_idx
  on public.ai_chat_sessions (user_id, updated_at desc);

alter table public.ai_chat_sessions enable row level security;

drop policy if exists "Users manage own chat sessions" on public.ai_chat_sessions;
create policy "Users manage own chat sessions"
  on public.ai_chat_sessions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_messages_session_id_created_at_idx
  on public.ai_chat_messages (session_id, created_at);

alter table public.ai_chat_messages enable row level security;

drop policy if exists "Users manage own chat messages" on public.ai_chat_messages;
create policy "Users manage own chat messages"
  on public.ai_chat_messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

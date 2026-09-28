begin;

alter table public.ai_chat_messages
  add column if not exists feedback smallint,
  add column if not exists feedback_reason text,
  add column if not exists feedback_at timestamptz;

alter table public.ai_chat_messages
  drop constraint if exists ai_chat_messages_feedback_check,
  add constraint ai_chat_messages_feedback_check
    check (feedback is null or (role = 'assistant' and feedback in (-1, 1))),
  drop constraint if exists ai_chat_messages_feedback_reason_check,
  add constraint ai_chat_messages_feedback_reason_check
    check (feedback_reason is null or (feedback = -1 and feedback_reason in ('incorrect', 'missing_sources', 'not_helpful', 'unsafe')));

create index if not exists ai_chat_messages_feedback_idx
  on public.ai_chat_messages (feedback, feedback_at)
  where feedback is not null;

-- Feedback is written by the authenticated API after it confirms that the
-- assistant message belongs to the caller's session. Direct client updates
-- remain revoked by migration 0021.

commit;

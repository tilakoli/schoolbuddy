-- School Buddy: Discussions — status lifecycle (end date, end/reopen/
-- cancel/reactivate/delete, mirroring assignments), plus a fix for a
-- student's own chat history silently disappearing on reload.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0029_fix_discussion_target_recursion.sql.

begin;

-- 1. Status lifecycle: due_at + 'ended'/'cancelled' replacing the unused
-- 'archived' value, mirroring assignments.status/due_at exactly
-- (0018_assignment_status.sql) — 'ended' is both a literal value a teacher
-- can set directly (End now) and a value getEffectiveDiscussionStatus()
-- computes once due_at passes, even if the stored status still says
-- 'published' (same two-layer pattern as assignments).
update public.discussions set status = 'ended' where status = 'archived';
alter table public.discussions drop constraint if exists discussions_status_check;
alter table public.discussions
  add column if not exists due_at timestamptz,
  add constraint discussions_status_check check (status in ('draft', 'published', 'ended', 'cancelled'));

-- Students keep seeing an ended discussion (read-only — the API route
-- blocks new messages once effectively ended) but lose it once cancelled,
-- matching how a cancelled assignment drops out of a student's active work.
drop policy if exists "Students view published discussions targeted to them" on public.discussions;
create policy "Students view published discussions targeted to them" on public.discussions for select
  using (
    status in ('published', 'ended')
    and public.is_enrolled(class_id, auth.uid())
    and (target_type = 'class' or public.is_discussion_target(id, auth.uid()))
  );

-- 2. Fix: a student's own chat history disappeared on reload. Cause: like
-- 0029's recursion trap, discussion_threads deliberately has no direct
-- student select policy (so `report` can never reach them) — but
-- discussion_messages' student policy inline-subqueried discussion_threads
-- directly, which RLS evaluates as the student's own role and therefore
-- denies entirely, making the exists(...) check always false. Same fix as
-- 0029: route the check through a security definer function instead, whose
-- internal query runs as the function owner and isn't subject to RLS.
create or replace function public.owns_discussion_thread(tid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.discussion_threads t where t.id = tid and t.student_id = uid);
$$;
revoke all on function public.owns_discussion_thread(uuid, uuid) from public, anon;
grant execute on function public.owns_discussion_thread(uuid, uuid) to authenticated;

drop policy if exists "Students read messages in own discussion threads" on public.discussion_messages;
create policy "Students read messages in own discussion threads" on public.discussion_messages for select
  using (public.owns_discussion_thread(thread_id, auth.uid()));

commit;

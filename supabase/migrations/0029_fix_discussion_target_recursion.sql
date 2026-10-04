-- School Buddy: fix "infinite recursion detected in policy for relation
-- discussions" (42P17) when a teacher creates a discussion targeted at
-- specific students.
--
-- Cause: discussions' student select policy subqueries discussion_targets
-- directly, and discussion_targets' policies subquery discussions directly
-- right back — a bidirectional inline reference Postgres can't expand.
-- owns_class()/is_enrolled() (0003/0009) already avoid this exact trap by
-- being security definer functions: a security definer function's internal
-- queries run as the function's owner, which (without FORCE ROW LEVEL
-- SECURITY, not used anywhere in this app) is RLS-exempt — so wrapping each
-- cross-table check in its own such function, instead of inlining the
-- subquery straight into the other table's policy, breaks the cycle.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0028_discussions.sql.

begin;

create or replace function public.owns_discussion(did uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.discussions d
    where d.id = did and public.owns_class(d.class_id, uid)
  );
$$;
revoke all on function public.owns_discussion(uuid, uuid) from public, anon;
grant execute on function public.owns_discussion(uuid, uuid) to authenticated;

create or replace function public.is_discussion_target(did uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.discussion_targets dt
    where dt.discussion_id = did and dt.student_id = uid
  );
$$;
revoke all on function public.is_discussion_target(uuid, uuid) from public, anon;
grant execute on function public.is_discussion_target(uuid, uuid) to authenticated;

drop policy if exists "Teachers manage discussion targets for own classes" on public.discussion_targets;
create policy "Teachers manage discussion targets for own classes" on public.discussion_targets for all
  using (public.owns_discussion(discussion_id, auth.uid()))
  with check (public.owns_discussion(discussion_id, auth.uid()));

drop policy if exists "Students view published discussions targeted to them" on public.discussions;
create policy "Students view published discussions targeted to them" on public.discussions for select
  using (
    status = 'published'
    and public.is_enrolled(class_id, auth.uid())
    and (target_type = 'class' or public.is_discussion_target(id, auth.uid()))
  );

commit;

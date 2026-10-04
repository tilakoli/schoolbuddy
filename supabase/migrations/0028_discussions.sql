-- School Buddy: Discussions — a teacher pushes a curriculum topic (subject +
-- existing materials + reference links + instructions) to the whole class or
-- specific hand-picked students (the first per-student-targeted feature in
-- this app — Assignments/Exams/Learning Videos are all whole-class only).
-- The student has a Socratic AI chat about the topic, then submits; AI then
-- analyzes the full transcript into a teacher-only report (readiness,
-- curiosity, strengths/gaps). Deliberately separate from assignments/
-- submissions end to end — see web/README.md's Discussions section.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0027_material_video_links.sql.

begin;

create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  chapter text,
  instructions text check (instructions is null or length(instructions) <= 4000),
  source_material_ids uuid[] not null default '{}',
  links jsonb not null default '[]',
  target_type text not null default 'class' check (target_type in ('class', 'students')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index discussions_class_idx on public.discussions(class_id, created_at desc);
alter table public.discussions enable row level security;

-- Created before the discussions policies below, since one of them
-- (students' select policy) references this table.
create table public.discussion_targets (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (discussion_id, student_id)
);
alter table public.discussion_targets enable row level security;

create policy "Teachers manage discussion targets for own classes" on public.discussion_targets for all
  using (exists (select 1 from public.discussions d where d.id = discussion_id and public.owns_class(d.class_id, auth.uid())))
  with check (exists (select 1 from public.discussions d where d.id = discussion_id and public.owns_class(d.class_id, auth.uid())));
create policy "Students view own discussion targets" on public.discussion_targets for select
  using (student_id = auth.uid());

create policy "Teachers manage discussions for own classes" on public.discussions for all
  using (public.owns_class(class_id, auth.uid()))
  with check (public.owns_class(class_id, auth.uid()) and teacher_id = auth.uid());
create policy "Staff view discussions in own school" on public.discussions for select
  using (exists (
    select 1 from public.classes c
    where c.id = class_id and c.school_id = public.current_school_id(auth.uid()) and public.is_staff(auth.uid())
  ));
create policy "Students view published discussions targeted to them" on public.discussions for select
  using (
    status = 'published'
    and public.is_enrolled(class_id, auth.uid())
    and (
      target_type = 'class'
      or exists (
        select 1 from public.discussion_targets dt
        where dt.discussion_id = id and dt.student_id = auth.uid()
      )
    )
  );

create table public.discussion_threads (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  report jsonb,
  unique (discussion_id, student_id)
);
create index discussion_threads_discussion_idx on public.discussion_threads(discussion_id);
alter table public.discussion_threads enable row level security;

-- No direct student select policy — report must never reach the student and
-- RLS can't mask columns. Students read their own thread only through
-- get_my_discussion_thread() below, whose return type simply omits report.
-- All writes (insert on first message, update on submit) go through the
-- service-role client in the new API routes, same as ai_chat_messages.
create policy "Teachers view discussion threads for own classes" on public.discussion_threads for select
  using (exists (
    select 1 from public.discussions d where d.id = discussion_id and public.owns_class(d.class_id, auth.uid())
  ));
create policy "Staff view discussion threads in own school" on public.discussion_threads for select
  using (exists (
    select 1 from public.discussions d join public.classes c on c.id = d.class_id
    where d.id = discussion_id and c.school_id = public.current_school_id(auth.uid()) and public.is_staff(auth.uid())
  ));
revoke insert, update, delete on public.discussion_threads from anon, authenticated;

create or replace function public.get_my_discussion_thread(p_discussion_id uuid)
returns table (
  id uuid,
  discussion_id uuid,
  student_id uuid,
  status text,
  started_at timestamptz,
  submitted_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.discussion_id, t.student_id, t.status, t.started_at, t.submitted_at
  from public.discussion_threads t
  join public.profiles me on me.id = auth.uid()
  where t.discussion_id = p_discussion_id
    and t.student_id = auth.uid()
    and me.role = 'student'
    and not me.restricted;
$$;
revoke all on function public.get_my_discussion_thread(uuid) from public, anon;
grant execute on function public.get_my_discussion_thread(uuid) to authenticated;

create table public.discussion_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamptz not null default now()
);
create index discussion_messages_thread_idx on public.discussion_messages(thread_id, created_at);
alter table public.discussion_messages enable row level security;

create policy "Students read messages in own discussion threads" on public.discussion_messages for select
  using (exists (
    select 1 from public.discussion_threads t where t.id = thread_id and t.student_id = auth.uid()
  ));
create policy "Teachers read messages in own classes' discussion threads" on public.discussion_messages for select
  using (exists (
    select 1 from public.discussion_threads t join public.discussions d on d.id = t.discussion_id
    where t.id = thread_id and public.owns_class(d.class_id, auth.uid())
  ));
revoke insert, update, delete on public.discussion_messages from anon, authenticated;

commit;

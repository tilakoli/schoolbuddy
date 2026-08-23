-- School Buddy: structured class schedule, backing a real Timetable page.
--
-- classes.period was always a free-text label (e.g. "Period 2 · 9:10 AM"),
-- with no day-of-week and no comparable start/end time — not enough to draw
-- a weekly grid. This adds that.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0005_class_school_id_trigger.sql.

create table if not exists public.class_schedule (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7), -- 1 = Monday ... 7 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

alter table public.class_schedule enable row level security;

drop policy if exists "Teachers manage schedule for own classes" on public.class_schedule;
create policy "Teachers manage schedule for own classes"
  on public.class_schedule for all
  using (public.owns_class(class_id, auth.uid()))
  with check (public.owns_class(class_id, auth.uid()));

drop policy if exists "Students view schedule for enrolled classes" on public.class_schedule;
create policy "Students view schedule for enrolled classes"
  on public.class_schedule for select
  using (public.is_enrolled(class_id, auth.uid()));

drop policy if exists "Admins view all schedule" on public.class_schedule;
create policy "Admins view all schedule"
  on public.class_schedule for select
  using (public.is_admin(auth.uid()));

begin;

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  title text not null check (length(btrim(title)) between 1 and 160),
  description text check (description is null or length(description) <= 4000),
  instructions text check (instructions is null or length(instructions) <= 10000),
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  room text check (room is null or length(room) <= 120),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exams_class_start_idx on public.exams(class_id, starts_at);
alter table public.exams enable row level security;

create or replace function public.check_exam_assignment_class()
returns trigger
language plpgsql
as $$
begin
  if new.assignment_id is not null and not exists (
    select 1 from public.assignments a
    where a.id = new.assignment_id and a.class_id = new.class_id
  ) then
    raise exception 'Linked assignment must belong to the same class as the exam' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger exams_assignment_class_check
before insert or update of class_id, assignment_id on public.exams
for each row execute function public.check_exam_assignment_class();

create policy "Teachers manage exams for own classes" on public.exams for all
  using (public.owns_class(class_id, auth.uid()))
  with check (public.owns_class(class_id, auth.uid()) and created_by = auth.uid());
create policy "Students view published exams for enrolled classes" on public.exams for select
  using (status = 'published' and public.is_enrolled(class_id, auth.uid()));
create policy "Staff view exams in own school" on public.exams for select
  using (exists (
    select 1 from public.classes c
    where c.id = class_id and c.school_id = public.current_school_id(auth.uid()) and public.is_staff(auth.uid())
  ));

create table public.learning_videos (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null check (length(btrim(title)) between 1 and 160),
  description text check (description is null or length(description) <= 4000),
  video_url text not null check (video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/'),
  duration_minutes integer check (duration_minutes between 1 and 1440),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learning_videos_class_created_idx on public.learning_videos(class_id, created_at desc);
alter table public.learning_videos enable row level security;

create policy "Teachers manage videos for own classes" on public.learning_videos for all
  using (public.owns_class(class_id, auth.uid()))
  with check (public.owns_class(class_id, auth.uid()) and created_by = auth.uid());
create policy "Students view published videos for enrolled classes" on public.learning_videos for select
  using (published and public.is_enrolled(class_id, auth.uid()));
create policy "Staff view videos in own school" on public.learning_videos for select
  using (exists (
    select 1 from public.classes c
    where c.id = class_id and c.school_id = public.current_school_id(auth.uid()) and public.is_staff(auth.uid())
  ));

create table public.video_progress (
  video_id uuid not null references public.learning_videos(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (video_id, student_id)
);
alter table public.video_progress enable row level security;
create index video_progress_student_idx on public.video_progress(student_id);

create policy "Students manage own video progress" on public.video_progress for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student' and coalesce(p.restricted, false) = false
  ) and exists (
    select 1 from public.learning_videos v where v.id = video_id and v.published and public.is_enrolled(v.class_id, auth.uid())
  ));
create policy "Teachers view progress for own videos" on public.video_progress for select
  using (exists (
    select 1 from public.learning_videos v where v.id = video_id and public.owns_class(v.class_id, auth.uid())
  ));
create policy "Staff view video progress in own school" on public.video_progress for select
  using (exists (
    select 1 from public.learning_videos v join public.classes c on c.id = v.class_id
    where v.id = video_id and c.school_id = public.current_school_id(auth.uid()) and public.is_staff(auth.uid())
  ));

commit;

-- School Buddy: teacher-uploaded class materials (Curriculum), with extracted
-- text/summary stored alongside the file. Files live in a private Storage
-- bucket; this table tracks metadata + extraction status/output.
--
-- Not built yet (tracked as TODOs, see README): the AI chat reading this
-- content when answering students (RAG) + any topic guardrails, and
-- AI-generated assignments/test questions from uploaded material.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0006_class_schedule.sql.

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  chapter text,
  file_path text not null, -- storage object path: {class_id}/{material_id}/{filename}
  mime_type text not null,
  status text not null default 'pending' check (status in ('pending', 'extracted', 'failed')),
  extracted_text text,
  summary text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.materials enable row level security;

drop policy if exists "Teachers manage materials for own classes" on public.materials;
create policy "Teachers manage materials for own classes"
  on public.materials for all
  using (public.owns_class(class_id, auth.uid()))
  with check (public.owns_class(class_id, auth.uid()));

drop policy if exists "Admins view all materials" on public.materials;
create policy "Admins view all materials"
  on public.materials for select
  using (public.is_admin(auth.uid()));

-- storage -------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

-- Objects are stored at {class_id}/{material_id}/{filename}, so the first
-- path segment is always a class id — reuse owns_class() the same way the
-- table policy above does. Assumes every object under this bucket follows
-- that convention (true for anything the app itself uploads).
drop policy if exists "Teachers manage own class materials in storage" on storage.objects;
create policy "Teachers manage own class materials in storage"
  on storage.objects for all
  using (
    bucket_id = 'materials'
    and public.owns_class((storage.foldername(name))[1]::uuid, auth.uid())
  )
  with check (
    bucket_id = 'materials'
    and public.owns_class((storage.foldername(name))[1]::uuid, auth.uid())
  );

drop policy if exists "Admins view all materials in storage" on storage.objects;
create policy "Admins view all materials in storage"
  on storage.objects for select
  using (
    bucket_id = 'materials'
    and public.is_admin(auth.uid())
  );

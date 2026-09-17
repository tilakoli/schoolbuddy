-- School Buddy: a material can be made of several files.
--
-- Until now a `materials` row held exactly one file, so a teacher
-- photographing 5-10 pages of a notebook had to create 5-10 separate,
-- disconnected material entries for what's really one set of notes. This
-- moves file storage into a new `material_files` table (one material, many
-- files, ordered) so several images can be combined into a single material
-- with one extracted_text covering all of them.
--
-- Existing single-file materials are backfilled into material_files as a
-- one-row batch, then materials.file_path/mime_type are dropped — every
-- material now always goes through material_files, no dual storage.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0015_admin_controls_classes.sql.

create table if not exists public.material_files (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  file_path text not null, -- storage object path: {class_id}/{material_id}/{position}-{filename}
  mime_type text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists material_files_material_id_idx on public.material_files (material_id);

alter table public.material_files enable row level security;

drop policy if exists "Teachers manage material files for own classes" on public.material_files;
create policy "Teachers manage material files for own classes"
  on public.material_files for all
  using (
    exists (
      select 1 from public.materials m
      where m.id = material_files.material_id and public.owns_class(m.class_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.materials m
      where m.id = material_files.material_id and public.owns_class(m.class_id, auth.uid())
    )
  );

drop policy if exists "Staff view all material files" on public.material_files;
create policy "Staff view all material files"
  on public.material_files for select
  using (public.is_staff(auth.uid()));

-- Backfill existing single-file materials, guarded so this is safe to
-- re-run even after materials.file_path has already been dropped below.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'materials' and column_name = 'file_path'
  ) then
    insert into public.material_files (material_id, file_path, mime_type, position)
    select id, file_path, mime_type, 0
    from public.materials
    where file_path is not null
      and not exists (select 1 from public.material_files mf where mf.material_id = public.materials.id);
  end if;
end $$;

alter table public.materials drop column if exists file_path;
alter table public.materials drop column if exists mime_type;

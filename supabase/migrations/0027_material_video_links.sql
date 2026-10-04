-- School Buddy: let a teacher attach a YouTube video URL to a material, so
-- students can watch it alongside (or instead of) the uploaded files for
-- that chapter. See 0007_materials.sql/0016_material_files.sql for the base
-- materials schema; the video_url regex mirrors learning_videos.video_url
-- in 0025_exams_and_learning_videos.sql, narrowed to YouTube only.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0026_guided_lessons.sql.

begin;

alter table public.materials
  add column if not exists video_url text
    check (video_url is null or video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be)/');

commit;

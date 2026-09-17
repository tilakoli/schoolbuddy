-- School Buddy: rubric-based grading for freeform assignments.
--
-- MCQ tests are already objectively auto-graded (0010/0011), so rubrics
-- only apply to freeform assignments a teacher grades manually. A rubric is
-- a list of criteria with their own point value, defined per-assignment (no
-- reusable templates for now); grading against one records a score per
-- criterion, with the submission's total score/max_score becoming the sum.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0016_material_files.sql.

alter table public.assignments add column if not exists rubric jsonb;
alter table public.submissions add column if not exists rubric_scores jsonb;

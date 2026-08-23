-- School Buddy: seed sample classes, roster, and assignments for testing.
--
-- Run in Supabase Dashboard -> SQL Editor, after scripts/seed-users.sql (uses
-- teacher.test@schoolbuddy.dev / student.test@schoolbuddy.dev) and after
-- 0004_fix_rls_recursion.sql. Safe to re-run — creates a fresh extra batch
-- each time rather than erroring, since these tables have no unique name
-- constraint; delete old rows first if you don't want duplicates.

do $$
declare
  v_teacher_id uuid;
  v_student_id uuid;
  v_school_id uuid;
  v_class1 uuid;
  v_class2 uuid;
  v_class3 uuid;
begin
  select id, school_id into v_teacher_id, v_school_id
  from public.profiles where email = 'teacher.test@schoolbuddy.dev';

  select id into v_student_id
  from public.profiles where email = 'student.test@schoolbuddy.dev';

  if v_teacher_id is null or v_student_id is null then
    raise exception 'Run scripts/seed-users.sql first to create the test teacher/student accounts.';
  end if;

  insert into public.classes (school_id, teacher_id, name, subject, period, room)
  values (v_school_id, v_teacher_id, 'Algebra I', 'Mathematics', 'Period 2 · 9:10 AM', 'Room 108')
  returning id into v_class1;

  insert into public.classes (school_id, teacher_id, name, subject, period, room)
  values (v_school_id, v_teacher_id, 'Geometry Honors', 'Mathematics', 'Period 5 · 1:00 PM', 'Room 108')
  returning id into v_class2;

  insert into public.classes (school_id, teacher_id, name, subject, period, room)
  values (v_school_id, v_teacher_id, 'AP Calculus', 'Mathematics', 'Period 6 · 2:05 PM', 'Room 108')
  returning id into v_class3;

  insert into public.enrollments (class_id, student_id) values
    (v_class1, v_student_id),
    (v_class2, v_student_id),
    (v_class3, v_student_id);

  insert into public.assignments (class_id, title, description, assessment_type, difficulty, due_at) values
    (v_class1, 'Chapter 4 Quiz', 'Covers factoring and quadratic equations.', 'homework', 'medium', now() + interval '1 day'),
    (v_class2, 'Proof Practice Set', 'Two-column proofs, chapter 3.', 'homework', 'easy', now() + interval '4 days'),
    (v_class3, 'Related Rates Homework', 'Problems 1-12 from the packet.', 'homework', 'expert', now() + interval '6 days'),
    (v_class1, 'Unit 3 Test', 'Covers all of unit 3.', 'test', 'medium', now() - interval '2 days');
end $$;

-- Verify:
-- select c.name, count(e.*) as students from public.classes c
-- left join public.enrollments e on e.class_id = c.id group by c.name;

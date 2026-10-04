-- School Buddy: Discussions test data + a couple of material video links,
-- layered on top of scripts/seed-full-dataset.sql — for testing every new
-- flow end to end: the teacher creation form (materials/links/draft-vs-
-- publish/whole-class-vs-specific-students), the student's Socratic AI chat
-- + submit flow, the AI readiness report, and the teacher's per-student
-- report view + "create a follow-up discussion" handoff. Also exercises the
-- AI Chat guided-lesson Videos pane via the two video_url updates below.
--
-- Deliberately spans every state so each UI branch has something to show:
--   - draft vs published (Anjali's English discussion is never published)
--   - whole-class vs specific-students targeting
--   - not_started / in_progress / submitted threads
--   - all four readiness levels and all three curiosity levels
--   - a discussion with no materials/links at all (empty-state panes)
--   - two discussions from the same teacher (list/filter testing), one of
--     them a "follow-up" targeted at a single student
--
-- Safe to re-run — deletes its own previously-seeded discussions (by title)
-- before recreating them, same as flush-data.sql would, just scoped to only
-- this script's rows.
--
-- Run in Supabase Dashboard -> SQL Editor, after scripts/seed-full-dataset.sql.

do $$
declare
  -- teachers
  t_maths   uuid;
  t_science uuid;
  t_history uuid;
  t_cs      uuid;

  -- students (see seed-full-dataset.sql for who's in which class)
  s1 uuid; -- Aarav Patel  (Class 9)
  s2 uuid; -- Diya Shah    (Class 9)
  s3 uuid; -- Kabir Mehta  (Class 9)
  s4 uuid; -- Isha Reddy   (Class 9)
  s5 uuid; -- Arjun Nair   (Class 10)
  s6 uuid; -- Meera Iyer   (Class 10)

  -- subject offerings
  off_maths9   uuid;
  off_science10 uuid;
  off_history10 uuid;
  off_cs9      uuid;

  -- materials, looked up by title
  mat_maths9    uuid;
  mat_science10 uuid;
  mat_cs9       uuid;

  -- discussions created below
  d_maths9   uuid := gen_random_uuid();
  d_science10 uuid := gen_random_uuid();
  d_english9 uuid := gen_random_uuid();
  d_history10 uuid := gen_random_uuid();
  d_cs9      uuid := gen_random_uuid();
  d_cs9_followup uuid := gen_random_uuid();

  -- threads created below
  th uuid;
begin
  select id into t_maths from public.profiles where email = 'priya.sharma.test@schoolbuddy.dev';
  select id into t_science from public.profiles where email = 'ravi.kumar.test@schoolbuddy.dev';
  select id into t_history from public.profiles where email = 'vikram.singh.test@schoolbuddy.dev';
  select id into t_cs from public.profiles where email = 'neha.gupta.test@schoolbuddy.dev';

  select id into s1 from public.profiles where email = 'aarav.patel.test@schoolbuddy.dev';
  select id into s2 from public.profiles where email = 'diya.shah.test@schoolbuddy.dev';
  select id into s3 from public.profiles where email = 'kabir.mehta.test@schoolbuddy.dev';
  select id into s4 from public.profiles where email = 'isha.reddy.test@schoolbuddy.dev';
  select id into s5 from public.profiles where email = 'arjun.nair.test@schoolbuddy.dev';
  select id into s6 from public.profiles where email = 'meera.iyer.test@schoolbuddy.dev';

  select id into off_maths9 from public.classes where id = (select class_id from public.materials where title = 'Linear Equations Notes');
  select id into off_science10 from public.classes where id = (select class_id from public.materials where title = 'Chemical Reactions');
  select id into off_history10 from public.classes where id = (select class_id from public.materials where title = 'World War I');
  select id into off_cs9 from public.classes where id = (select class_id from public.materials where title = 'Introduction to Algorithms');

  select id into mat_maths9 from public.materials where title = 'Linear Equations Notes';
  select id into mat_science10 from public.materials where title = 'Chemical Reactions';
  select id into mat_cs9 from public.materials where title = 'Introduction to Algorithms';

  if t_maths is null or s1 is null or mat_maths9 is null then
    raise exception 'Run scripts/seed-full-dataset.sql first.';
  end if;

  -- 0. A couple of video links on existing materials, to exercise the AI
  -- Chat guided-lesson Videos pane and the Materials "Edit video" control.
  update public.materials set video_url = 'https://www.youtube.com/watch?v=Qyd_v3DGzTM' where id = mat_maths9;
  update public.materials set video_url = 'https://www.youtube.com/watch?v=YkT5Oak6ryI' where id = mat_science10;

  -- Clear any previous run of this script (cascades to targets/threads/messages).
  delete from public.discussions where title in (
    'Linear Equations Practice Discussion', 'Chemical Reactions Check-in',
    'Parts of Speech Refresher', 'World War I Discussion',
    'Algorithms Warm-up', 'Algorithms Follow-up for Diya'
  );

  -- 1. Maths (Class 9) — whole class, published, one material + one link.
  -- Aarav submitted/on_track, Diya submitted/strong, Kabir in_progress
  -- (resumable), Isha not started at all.
  insert into public.discussions (id, class_id, teacher_id, title, chapter, instructions, source_material_ids, links, target_type, status)
  values (d_maths9, off_maths9, t_maths, 'Linear Equations Practice Discussion', 'Chapter 3',
    'Walk through solving a linear equation in your own words, then try one of your own. I''ll ask follow-up questions — explain your reasoning, not just the answer.',
    array[mat_maths9], '[{"label": "Khan Academy: Linear equations", "url": "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-functions"}]'::jsonb,
    'class', 'published');

  insert into public.discussion_threads (id, discussion_id, student_id, status, started_at, submitted_at, report) values
    (gen_random_uuid(), d_maths9, s1, 'submitted', now() - interval '2 days' - interval '18 minutes', now() - interval '2 days',
     jsonb_build_object('readiness', 'on_track', 'curiosity', 'moderate', 'durationMinutes', 18,
       'summary', 'Aarav correctly solved a two-step linear equation and explained the balance method clearly, though he needed a nudge to double-check his final substitution.',
       'strengths', jsonb_build_array('Isolates the variable using the correct order of operations', 'Explains each step out loud, not just the final answer'),
       'gaps', jsonb_build_array('Occasionally forgets to apply an operation to both sides of the equation'),
       'generatedAt', (now() - interval '2 days')::text))
  returning id into th;
  insert into public.discussion_messages (thread_id, role, text, created_at) values
    (th, 'user', 'Can you help me with 2x + 4 = 10?', now() - interval '2 days' - interval '18 minutes'),
    (th, 'assistant', 'Sure — before I give you the answer, what do you think the first step should be to get x by itself?', now() - interval '2 days' - interval '17 minutes'),
    (th, 'user', 'Subtract 4 from both sides?', now() - interval '2 days' - interval '15 minutes'),
    (th, 'assistant', 'Exactly. What does that leave you with, and what would you do next?', now() - interval '2 days' - interval '14 minutes'),
    (th, 'user', '2x = 6, then divide both sides by 2, so x = 3.', now() - interval '2 days' - interval '10 minutes'),
    (th, 'assistant', 'Nicely explained. Can you check that answer by substituting x = 3 back into the original equation?', now() - interval '2 days' - interval '9 minutes'),
    (th, 'user', '2(3) + 4 = 10, so 6 + 4 = 10. Yes that works!', now() - interval '2 days' - interval '6 minutes');

  insert into public.discussion_threads (id, discussion_id, student_id, status, started_at, submitted_at, report) values
    (gen_random_uuid(), d_maths9, s2, 'submitted', now() - interval '1 day' - interval '25 minutes', now() - interval '1 day',
     jsonb_build_object('readiness', 'strong', 'curiosity', 'high', 'durationMinutes', 25,
       'summary', 'Diya solved multiple equations confidently, explained the graphical meaning of a solution unprompted, and asked a follow-up question connecting the topic to quadratic equations.',
       'strengths', jsonb_build_array('Solves multi-step equations fluently', 'Connects the algebraic solution to its graphical representation', 'Asks extending questions beyond what was asked'),
       'gaps', jsonb_build_array(),
       'generatedAt', (now() - interval '1 day')::text))
  returning id into th;
  insert into public.discussion_messages (thread_id, role, text, created_at) values
    (th, 'user', 'I solved 5x - 3 = 12 and got x = 3. Is that one point on a graph?', now() - interval '1 day' - interval '25 minutes'),
    (th, 'assistant', 'Good question — what do you think the full graph of this equation would look like, not just that one solution?', now() - interval '1 day' - interval '23 minutes'),
    (th, 'user', 'It would be a straight line, and (3, 12) would be one point on it if we wrote it as y = 5x - 3?', now() - interval '1 day' - interval '20 minutes'),
    (th, 'assistant', 'Exactly right. What happens to the line if the coefficient of x gets bigger — say from 5 to 10?', now() - interval '1 day' - interval '18 minutes'),
    (th, 'user', 'The line would be steeper. Does this connect to quadratic equations too, since those also graph as curves?', now() - interval '1 day' - interval '14 minutes'),
    (th, 'assistant', 'Great connection — we will get to that soon. For now, can you make up your own equation and solve it?', now() - interval '1 day' - interval '12 minutes'),
    (th, 'user', '3x + 9 = 0, so x = -3.', now() - interval '1 day' - interval '8 minutes');

  insert into public.discussion_threads (id, discussion_id, student_id, status, started_at) values
    (gen_random_uuid(), d_maths9, s3, 'in_progress', now() - interval '3 hours')
  returning id into th;
  insert into public.discussion_messages (thread_id, role, text, created_at) values
    (th, 'user', 'I don''t really get where to start with these.', now() - interval '3 hours'),
    (th, 'assistant', 'No problem — let''s start simple. If you have x + 5 = 9, what operation would undo the +5?', now() - interval '3 hours' + interval '1 minute');
  -- Isha (s4): no thread at all — "not started" on her list.

  -- 2. Science (Class 10) — specific students only (Arjun + Meera), tests
  -- per-student targeting and that Rohan/Sneha (not targeted) can't see it.
  insert into public.discussions (id, class_id, teacher_id, title, chapter, instructions, source_material_ids, links, target_type, status)
  values (d_science10, off_science10, t_science, 'Chemical Reactions Check-in', 'Chapter 4',
    'Before our next test, let''s talk through how you''d recognize a chemical reaction and balance a simple equation.',
    array[mat_science10], '[]'::jsonb, 'students', 'published');
  insert into public.discussion_targets (discussion_id, student_id) values (d_science10, s5), (d_science10, s6);

  insert into public.discussion_threads (id, discussion_id, student_id, status, started_at, submitted_at, report) values
    (gen_random_uuid(), d_science10, s5, 'submitted', now() - interval '5 hours' - interval '9 minutes', now() - interval '5 hours',
     jsonb_build_object('readiness', 'needs_support', 'curiosity', 'low', 'durationMinutes', 9,
       'summary', 'Arjun gave only brief, uncertain answers and confused a physical change (melting) with a chemical reaction; he did not attempt to balance the example equation.',
       'strengths', jsonb_build_array('Knows that reactants turn into products'),
       'gaps', jsonb_build_array('Confuses physical changes with chemical reactions', 'Cannot yet balance a simple chemical equation', 'Gave minimal answers without elaborating'),
       'generatedAt', (now() - interval '5 hours')::text))
  returning id into th;
  insert into public.discussion_messages (thread_id, role, text, created_at) values
    (th, 'user', 'ok', now() - interval '5 hours' - interval '9 minutes'),
    (th, 'assistant', 'Let''s start with something concrete — if ice melts into water, is that a chemical reaction? Why or why not?', now() - interval '5 hours' - interval '8 minutes'),
    (th, 'user', 'yes because it changed', now() - interval '5 hours' - interval '6 minutes'),
    (th, 'assistant', 'It did change, but did any new substance form, or is it still H2O the whole time? What would tell you a NEW substance formed?', now() - interval '5 hours' - interval '4 minutes'),
    (th, 'user', 'not sure', now() - interval '5 hours' - interval '2 minutes');

  insert into public.discussion_threads (id, discussion_id, student_id, status, started_at, submitted_at, report) values
    (gen_random_uuid(), d_science10, s6, 'submitted', now() - interval '4 hours' - interval '14 minutes', now() - interval '4 hours',
     jsonb_build_object('readiness', 'developing', 'curiosity', 'moderate', 'durationMinutes', 14,
       'summary', 'Meera correctly identified two signs of a chemical reaction and attempted to balance the example equation, getting close but miscounting one element.',
       'strengths', jsonb_build_array('Identifies gas production and color change as signs of a reaction'),
       'gaps', jsonb_build_array('Small counting errors when balancing equations'),
       'generatedAt', (now() - interval '4 hours')::text))
  returning id into th;
  insert into public.discussion_messages (thread_id, role, text, created_at) values
    (th, 'user', 'A chemical reaction happens when you see bubbles or a color change, right?', now() - interval '4 hours' - interval '14 minutes'),
    (th, 'assistant', 'Good start — those are two signs. Can you think of a reason why mass has to stay balanced in the equation for a reaction?', now() - interval '4 hours' - interval '11 minutes'),
    (th, 'user', 'Because atoms don''t disappear, they just rearrange?', now() - interval '4 hours' - interval '8 minutes'),
    (th, 'assistant', 'Exactly — conservation of mass. Try balancing: H2 + O2 -> H2O.', now() - interval '4 hours' - interval '6 minutes'),
    (th, 'user', '2H2 + O2 -> H2O?', now() - interval '4 hours' - interval '3 minutes');

  -- 3. English (Class 9) — DRAFT only, never published. Teacher sees it in
  -- the "Draft" filter; students should never see it at all.
  insert into public.discussions (id, class_id, teacher_id, title, chapter, instructions, source_material_ids, links, target_type, status)
  select d_english9, c.id, p.id, 'Parts of Speech Refresher', 'Unit 1',
    'Still drafting this one — want to add a grammar video before publishing.',
    array[m.id], '[]'::jsonb, 'class', 'draft'
  from public.profiles p, public.materials m, public.classes c
  where p.email = 'anjali.verma.test@schoolbuddy.dev' and m.title = 'Grammar Basics — Parts of Speech' and c.id = m.class_id;

  -- 4. History (Class 10) — published, whole class, NO materials and NO
  -- links at all — exercises the empty-state panes on the student side.
  insert into public.discussions (id, class_id, teacher_id, title, chapter, instructions, source_material_ids, links, target_type, status)
  values (d_history10, off_history10, t_history, 'World War I Discussion', 'Chapter 9',
    'Let''s talk through the causes of World War I and why the Treaty of Versailles mattered, in your own words.',
    array[]::uuid[], '[]'::jsonb, 'class', 'published');
  insert into public.discussion_threads (id, discussion_id, student_id, status, started_at, submitted_at, report) values
    (gen_random_uuid(), d_history10, s5, 'submitted', now() - interval '6 hours' - interval '20 minutes', now() - interval '6 hours',
     jsonb_build_object('readiness', 'strong', 'curiosity', 'high', 'durationMinutes', 20,
       'summary', 'Arjun connected the assassination of Franz Ferdinand to the alliance system clearly and drew an unprompted link to the rise of WWII.',
       'strengths', jsonb_build_array('Explains cause-and-effect across the whole unit, not just isolated facts'),
       'gaps', jsonb_build_array(),
       'generatedAt', (now() - interval '6 hours')::text))
  returning id into th;
  insert into public.discussion_messages (thread_id, role, text, created_at) values
    (th, 'user', 'What actually started WWI?', now() - interval '6 hours' - interval '20 minutes'),
    (th, 'assistant', 'What do you already know about the assassination of Archduke Franz Ferdinand — why would one event pull in so many countries?', now() - interval '6 hours' - interval '17 minutes'),
    (th, 'user', 'Because of the alliance system, so when Austria-Hungary declared war, their allies had to join in too.', now() - interval '6 hours' - interval '13 minutes'),
    (th, 'assistant', 'Right. How did the war''s ending set up conditions for WWII?', now() - interval '6 hours' - interval '9 minutes'),
    (th, 'user', 'The Treaty of Versailles punished Germany really harshly, which caused resentment that later fed into WWII.', now() - interval '6 hours' - interval '5 minutes');

  -- 5. CS (Class 9) — two discussions from the same teacher, to test the
  -- teacher's list/filters: a whole-class one, and a single-student
  -- "follow-up" targeted at Diya (as if created from her report elsewhere).
  insert into public.discussions (id, class_id, teacher_id, title, chapter, instructions, source_material_ids, links, target_type, status)
  values (d_cs9, off_cs9, t_cs, 'Algorithms Warm-up', 'Unit 1',
    'Describe what an algorithm is and walk through one example step by step.',
    array[mat_cs9], '[]'::jsonb, 'class', 'published');
  insert into public.discussion_threads (id, discussion_id, student_id, status, started_at, submitted_at, report) values
    (gen_random_uuid(), d_cs9, s4, 'submitted', now() - interval '30 minutes' - interval '12 minutes', now() - interval '30 minutes',
     jsonb_build_object('readiness', 'on_track', 'curiosity', 'moderate', 'durationMinutes', 12,
       'summary', 'Isha described sequencing, selection, and iteration with a simple example for each, with minor hesitation on iteration.',
       'strengths', jsonb_build_array('Clear examples for sequencing and selection'),
       'gaps', jsonb_build_array('Less confident explaining iteration/loops'),
       'generatedAt', (now() - interval '30 minutes')::text))
  returning id into th;
  insert into public.discussion_messages (thread_id, role, text, created_at) values
    (th, 'user', 'An algorithm is just steps to solve a problem, right?', now() - interval '30 minutes' - interval '12 minutes'),
    (th, 'assistant', 'Right. Can you give me an example of a decision, or "selection", step in an everyday algorithm, like making tea?', now() - interval '30 minutes' - interval '9 minutes'),
    (th, 'user', 'If the water is hot enough, pour it, otherwise wait longer.', now() - interval '30 minutes' - interval '6 minutes'),
    (th, 'assistant', 'Perfect selection example. What about iteration — repeating a step? Where would that show up in making tea for 4 people?', now() - interval '30 minutes' - interval '4 minutes'),
    (th, 'user', 'Maybe... repeating the pouring step for each cup? I''m not 100% sure.', now() - interval '30 minutes' - interval '1 minutes');
  -- Aarav, Diya, Kabir: not started on this one.

  -- Follow-up, targeted at Diya only — in_progress, representing a teacher
  -- acting on an earlier (hypothetical) report by pushing more practice to
  -- just one student.
  insert into public.discussions (id, class_id, teacher_id, title, chapter, instructions, source_material_ids, links, target_type, status)
  values (d_cs9_followup, off_cs9, t_cs, 'Algorithms Follow-up for Diya', 'Unit 1',
    'A bit more practice on iteration specifically, building on our last discussion.',
    array[mat_cs9], '[]'::jsonb, 'students', 'published');
  insert into public.discussion_targets (discussion_id, student_id) values (d_cs9_followup, s2);
  insert into public.discussion_threads (id, discussion_id, student_id, status, started_at) values
    (gen_random_uuid(), d_cs9_followup, s2, 'in_progress', now() - interval '10 minutes')
  returning id into th;
  insert into public.discussion_messages (thread_id, role, text, created_at) values
    (th, 'user', 'Ready for more practice on loops.', now() - interval '10 minutes'),
    (th, 'assistant', 'Great — if you wanted to print "Hello" five times, how would you describe that as a loop rather than writing it five separate times?', now() - interval '9 minutes');
end $$;

-- Verify:
-- select d.title, d.status, d.target_type, p.full_name as teacher from public.discussions d join public.profiles p on p.id = d.teacher_id order by d.title;
-- select d.title, p.full_name as student, t.status, t.report ->> 'readiness' as readiness from public.discussion_threads t join public.discussions d on d.id = t.discussion_id join public.profiles p on p.id = t.student_id order by d.title, p.full_name;
-- select title, video_url from public.materials where video_url is not null;

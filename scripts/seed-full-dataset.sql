-- School Buddy: full realistic dataset for end-to-end testing of every flow
-- built so far — teachers (one subject each), students, two Classes each
-- teaching all five subjects, rosters, materials (already "extracted", so
-- "Generate with AI" can be tried immediately), and a few ready-to-use
-- assignments (both MCQ-with-answer-key and freeform) so submission +
-- grading can be tested without needing GEMINI_API_KEY configured.
--
-- Assumes scripts/flush-data.sql has already been run (or this is a fresh
-- database past supabase/migrations/0001..0017). Requires at least one row
-- in public.schools — 0003_schools_classes.sql creates a default one.
--
-- All accounts use the password: TestPass123!
--
-- Run in Supabase Dashboard -> SQL Editor.

do $$
declare
  v_school_id uuid;

  -- teachers (one subject each)
  t_maths   uuid := gen_random_uuid();
  t_science uuid := gen_random_uuid();
  t_english uuid := gen_random_uuid();
  t_history uuid := gen_random_uuid();
  t_cs      uuid := gen_random_uuid();

  -- students
  s1 uuid := gen_random_uuid(); -- Aarav Patel    -> Class 9
  s2 uuid := gen_random_uuid(); -- Diya Shah      -> Class 9
  s3 uuid := gen_random_uuid(); -- Kabir Mehta    -> Class 9
  s4 uuid := gen_random_uuid(); -- Isha Reddy     -> Class 9
  s5 uuid := gen_random_uuid(); -- Arjun Nair     -> Class 10
  s6 uuid := gen_random_uuid(); -- Meera Iyer     -> Class 10
  s7 uuid := gen_random_uuid(); -- Rohan Joshi    -> Class 10
  s8 uuid := gen_random_uuid(); -- Sneha Rao      -> Class 10

  -- subjects
  subj_maths   uuid := gen_random_uuid();
  subj_science uuid := gen_random_uuid();
  subj_english uuid := gen_random_uuid();
  subj_history uuid := gen_random_uuid();
  subj_cs      uuid := gen_random_uuid();

  -- classes (the shared-roster "Class 9" / "Class 10")
  cls9  uuid := gen_random_uuid();
  cls10 uuid := gen_random_uuid();

  -- subject offerings (classes rows) — one per subject, per class
  off_maths9   uuid := gen_random_uuid();
  off_maths10  uuid := gen_random_uuid();
  off_science9  uuid := gen_random_uuid();
  off_science10 uuid := gen_random_uuid();
  off_english9  uuid := gen_random_uuid();
  off_english10 uuid := gen_random_uuid();
  off_history9  uuid := gen_random_uuid();
  off_history10 uuid := gen_random_uuid();
  off_cs9  uuid := gen_random_uuid();
  off_cs10 uuid := gen_random_uuid();

  -- materials (one per offering, already extracted)
  mat_maths9   uuid := gen_random_uuid();
  mat_maths10  uuid := gen_random_uuid();
  mat_science9  uuid := gen_random_uuid();
  mat_science10 uuid := gen_random_uuid();
  mat_english9  uuid := gen_random_uuid();
  mat_english10 uuid := gen_random_uuid();
  mat_history9  uuid := gen_random_uuid();
  mat_history10 uuid := gen_random_uuid();
  mat_cs9  uuid := gen_random_uuid();
  mat_cs10 uuid := gen_random_uuid();

  -- a few ready-to-use assignments
  asg_maths9_quiz     uuid := gen_random_uuid();
  asg_english10_quiz  uuid := gen_random_uuid();
  asg_science9_essay  uuid := gen_random_uuid();
  asg_history10_essay uuid := gen_random_uuid();
begin
  select id into v_school_id from public.schools order by created_at limit 1;
  if v_school_id is null then
    raise exception 'No row in public.schools — run supabase/migrations/0003_schools_classes.sql first.';
  end if;

  -- 1. Auth accounts (teachers + students) -----------------------------
  -- Same direct-insert pattern as scripts/seed-users.sql — the
  -- handle_new_user trigger creates each matching public.profiles row.

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', t_maths, 'authenticated', 'authenticated', 'priya.sharma.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'teacher', 'full_name', 'Priya Sharma'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', t_science, 'authenticated', 'authenticated', 'ravi.kumar.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'teacher', 'full_name', 'Ravi Kumar'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', t_english, 'authenticated', 'authenticated', 'anjali.verma.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'teacher', 'full_name', 'Anjali Verma'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', t_history, 'authenticated', 'authenticated', 'vikram.singh.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'teacher', 'full_name', 'Vikram Singh'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', t_cs, 'authenticated', 'authenticated', 'neha.gupta.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'teacher', 'full_name', 'Neha Gupta'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', s1, 'authenticated', 'authenticated', 'aarav.patel.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'student', 'full_name', 'Aarav Patel'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', s2, 'authenticated', 'authenticated', 'diya.shah.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'student', 'full_name', 'Diya Shah'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', s3, 'authenticated', 'authenticated', 'kabir.mehta.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'student', 'full_name', 'Kabir Mehta'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', s4, 'authenticated', 'authenticated', 'isha.reddy.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'student', 'full_name', 'Isha Reddy'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', s5, 'authenticated', 'authenticated', 'arjun.nair.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'student', 'full_name', 'Arjun Nair'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', s6, 'authenticated', 'authenticated', 'meera.iyer.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'student', 'full_name', 'Meera Iyer'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', s7, 'authenticated', 'authenticated', 'rohan.joshi.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'student', 'full_name', 'Rohan Joshi'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', s8, 'authenticated', 'authenticated', 'sneha.rao.test@schoolbuddy.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'student', 'full_name', 'Sneha Rao'), now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
  from auth.users
  where id in (t_maths, t_science, t_english, t_history, t_cs, s1, s2, s3, s4, s5, s6, s7, s8);

  -- 2. Subjects (one teacher each) ---------------------------------------
  insert into public.subjects (id, school_id, name, teacher_id) values
    (subj_maths, v_school_id, 'Mathematics', t_maths),
    (subj_science, v_school_id, 'Science', t_science),
    (subj_english, v_school_id, 'English', t_english),
    (subj_history, v_school_id, 'History', t_history),
    (subj_cs, v_school_id, 'Computer Science', t_cs);

  -- 3. Classes (shared roster) --------------------------------------------
  insert into public.class_groups (id, school_id, name) values
    (cls9, v_school_id, 'Class 9'),
    (cls10, v_school_id, 'Class 10');

  -- 4. Subject offerings — teacher_id is auto-filled by the
  -- sync_class_teacher_from_subject trigger (0012_subject_teacher.sql).
  insert into public.classes (id, school_id, class_group_id, subject_id, name, period, room) values
    (off_maths9, v_school_id, cls9, subj_maths, 'Mathematics', 'Period 1', 'Room 101'),
    (off_maths10, v_school_id, cls10, subj_maths, 'Mathematics', 'Period 1', 'Room 101'),
    (off_science9, v_school_id, cls9, subj_science, 'Science', 'Period 2', 'Room 102'),
    (off_science10, v_school_id, cls10, subj_science, 'Science', 'Period 2', 'Room 102'),
    (off_english9, v_school_id, cls9, subj_english, 'English', 'Period 3', 'Room 103'),
    (off_english10, v_school_id, cls10, subj_english, 'English', 'Period 3', 'Room 103'),
    (off_history9, v_school_id, cls9, subj_history, 'History', 'Period 4', 'Room 104'),
    (off_history10, v_school_id, cls10, subj_history, 'History', 'Period 4', 'Room 104'),
    (off_cs9, v_school_id, cls9, subj_cs, 'Computer Science', 'Period 5', 'Room 105'),
    (off_cs10, v_school_id, cls10, subj_cs, 'Computer Science', 'Period 5', 'Room 105');

  -- 5. Roster — 4 students in each Class -----------------------------------
  insert into public.enrollments (class_group_id, student_id) values
    (cls9, s1), (cls9, s2), (cls9, s3), (cls9, s4),
    (cls10, s5), (cls10, s6), (cls10, s7), (cls10, s8);

  -- 6. Materials — already "extracted", ready for "Generate with AI". Files
  -- live in material_files (0016_material_files.sql), not on materials
  -- itself, so each material below is a plain metadata row + a matching
  -- one-row material_files entry (single "file" per material here, since
  -- there's no real upload behind this seed data anyway).
  insert into public.materials (id, class_id, teacher_id, title, chapter, status, extracted_text, summary) values
    (mat_maths9, off_maths9, t_maths, 'Linear Equations Notes', 'Chapter 3', 'extracted',
     'A linear equation in one variable is an equation that can be written in the form ax + b = c, where a, b, and c are constants and a is not zero. Solving a linear equation means finding the value of the variable that makes the equation true. To solve, isolate the variable by performing the same operation on both sides of the equation — for example, subtracting a constant from both sides, then dividing by the coefficient of the variable. Linear equations can also be represented graphically as a straight line on a coordinate plane, where every point on the line is a solution to the equation. Word problems involving unknown quantities, such as ages, distances, or costs, can often be translated into linear equations and solved using these same steps.',
     'Introduces linear equations in one variable, how to solve them algebraically, and their graphical representation.'),
    (mat_maths10, off_maths10, t_maths, 'Quadratic Equations Notes', 'Chapter 5', 'extracted',
     'A quadratic equation is a second-degree polynomial equation in a single variable, written in the standard form ax^2 + bx + c = 0, where a is not equal to zero. Quadratic equations can have zero, one, or two real solutions, found using factoring, completing the square, or the quadratic formula: x = (-b (+/-) sqrt(b^2 - 4ac)) / 2a. The discriminant, b^2 - 4ac, determines the nature of the roots: positive means two distinct real roots, zero means one repeated real root, and negative means no real roots. Graphically, a quadratic equation forms a parabola, and its roots are the points where the parabola crosses the x-axis.',
     'Covers the standard form of quadratic equations, methods of solving them, and the role of the discriminant.'),
    (mat_science9, off_science9, t_science, 'States of Matter', 'Chapter 1', 'extracted',
     'Matter exists in three common states: solid, liquid, and gas, distinguished by the arrangement and movement of their particles. In a solid, particles are tightly packed in a fixed pattern and vibrate in place, giving solids a definite shape and volume. In a liquid, particles are close together but can move past one another, so liquids have a definite volume but take the shape of their container. In a gas, particles are far apart and move freely and rapidly, so gases have neither a definite shape nor volume. Matter can change from one state to another through processes such as melting, freezing, evaporation, and condensation, which occur when energy (usually heat) is added or removed.',
     'Explains the three states of matter, their particle arrangements, and how substances change state.'),
    (mat_science10, off_science10, t_science, 'Chemical Reactions', 'Chapter 4', 'extracted',
     'A chemical reaction occurs when substances, called reactants, are transformed into new substances, called products, through the breaking and forming of chemical bonds. Signs that a chemical reaction has occurred include a color change, gas production, temperature change, or formation of a precipitate. Chemical reactions are represented using chemical equations, which must be balanced so that the number of atoms of each element is equal on both sides, in accordance with the law of conservation of mass. Common types of reactions include synthesis, decomposition, single displacement, and double displacement reactions.',
     'Describes what a chemical reaction is, how to recognize one, and the main types of chemical reactions.'),
    (mat_english9, off_english9, t_english, 'Grammar Basics — Parts of Speech', 'Unit 1', 'extracted',
     'The parts of speech are the basic categories of words in English grammar, based on their function in a sentence. Nouns name a person, place, thing, or idea, while pronouns take the place of nouns. Verbs express an action or state of being, and adjectives describe or modify nouns. Adverbs modify verbs, adjectives, or other adverbs, often answering how, when, or where. Prepositions show the relationship between a noun or pronoun and other words in the sentence, conjunctions connect words or groups of words, and interjections express strong emotion.',
     'Introduces the eight parts of speech in English and the role each plays in a sentence.'),
    (mat_english10, off_english10, t_english, 'Poetry Analysis', 'Unit 3', 'extracted',
     'Analyzing a poem involves examining its structure, language, and meaning. Structure includes elements such as stanza form, rhyme scheme, and meter, which shape how the poem sounds and flows. Language includes figurative devices such as metaphor, simile, personification, and imagery, which the poet uses to create vivid impressions and deeper meaning beyond the literal words. Tone reflects the poet''s attitude toward the subject, and theme is the central idea or message the poem conveys. Close reading — paying attention to word choice, sound devices like alliteration and assonance, and the poem''s structure — helps uncover layers of meaning that might not be obvious on a first read.',
     'Outlines key elements of poetry analysis: structure, figurative language, tone, and theme.'),
    (mat_history9, off_history9, t_history, 'The French Revolution', 'Chapter 7', 'extracted',
     'The French Revolution began in 1789, driven by widespread discontent with the absolute monarchy, social inequality between the estates, and a severe financial crisis facing the French state. The storming of the Bastille on July 14, 1789, became a symbol of the uprising against royal authority. The revolution led to the abolition of feudal privileges, the Declaration of the Rights of Man and of the Citizen, and eventually the execution of King Louis XVI in 1793. The period that followed, known as the Reign of Terror, saw mass executions of perceived enemies of the revolution before power eventually consolidated under Napoleon Bonaparte.',
     'Covers the causes, key events, and consequences of the French Revolution.'),
    (mat_history10, off_history10, t_history, 'World War I', 'Chapter 9', 'extracted',
     'World War I began in 1914 after the assassination of Archduke Franz Ferdinand of Austria-Hungary, triggering a system of alliances that drew major European powers into conflict. The war was characterized by trench warfare on the Western Front, resulting in enormous casualties for relatively small territorial gains. New military technologies, including machine guns, poison gas, tanks, and airplanes, changed the nature of warfare. The war ended in 1918 with the armistice, and the subsequent Treaty of Versailles imposed harsh terms on Germany, sowing resentment that contributed to the outbreak of World War II two decades later.',
     'Summarizes the causes, key features, and aftermath of World War I.'),
    (mat_cs9, off_cs9, t_cs, 'Introduction to Algorithms', 'Unit 1', 'extracted',
     'An algorithm is a step-by-step procedure for solving a problem or completing a task, and it forms the foundation of computer programming. A good algorithm should be well-defined, take some input, produce an output, and terminate after a finite number of steps. Algorithms can be represented using plain language, flowcharts, or pseudocode before being translated into an actual programming language. Common algorithmic concepts include sequencing (performing steps in order), selection (making decisions with conditions), and iteration (repeating steps with loops). Understanding these basic building blocks is essential before learning more advanced topics such as searching and sorting algorithms.',
     'Introduces what an algorithm is and the core concepts of sequencing, selection, and iteration.'),
    (mat_cs10, off_cs10, t_cs, 'Data Structures — Arrays and Lists', 'Unit 2', 'extracted',
     'A data structure is a way of organizing and storing data so it can be accessed and modified efficiently. An array is a fixed-size collection of elements of the same type, stored in contiguous memory, allowing fast access to any element using its index. A linked list, by contrast, stores elements as nodes that each point to the next node, allowing dynamic resizing but slower access to arbitrary elements since the list must be traversed from the start. Choosing between an array and a linked list depends on the operations needed most often: arrays are better for fast random access, while linked lists are better for frequent insertions and deletions.',
     'Compares arrays and linked lists as fundamental data structures and when to use each.');

  insert into public.material_files (material_id, file_path, mime_type, position) values
    (mat_maths9, off_maths9::text || '/' || mat_maths9::text || '/0-linear-equations.pdf', 'application/pdf', 0),
    (mat_maths10, off_maths10::text || '/' || mat_maths10::text || '/0-quadratic-equations.pdf', 'application/pdf', 0),
    (mat_science9, off_science9::text || '/' || mat_science9::text || '/0-states-of-matter.pdf', 'application/pdf', 0),
    (mat_science10, off_science10::text || '/' || mat_science10::text || '/0-chemical-reactions.pdf', 'application/pdf', 0),
    (mat_english9, off_english9::text || '/' || mat_english9::text || '/0-parts-of-speech.pdf', 'application/pdf', 0),
    (mat_english10, off_english10::text || '/' || mat_english10::text || '/0-poetry-analysis.pdf', 'application/pdf', 0),
    (mat_history9, off_history9::text || '/' || mat_history9::text || '/0-french-revolution.pdf', 'application/pdf', 0),
    (mat_history10, off_history10::text || '/' || mat_history10::text || '/0-world-war-1.pdf', 'application/pdf', 0),
    (mat_cs9, off_cs9::text || '/' || mat_cs9::text || '/0-intro-algorithms.pdf', 'application/pdf', 0),
    (mat_cs10, off_cs10::text || '/' || mat_cs10::text || '/0-arrays-and-lists.pdf', 'application/pdf', 0);

  -- 7. A few ready-to-use assignments, so submission + grading can be
  -- tested without needing GEMINI_API_KEY configured -----------------------

  -- MCQ test with answer key (auto-graded on submit)
  insert into public.assignments (id, class_id, title, description, assessment_type, difficulty, questions, pass_score, source_material_ids) values
    (asg_maths9_quiz, off_maths9, 'Linear Equations Quiz', 'Quick check on solving linear equations.', 'test', 'medium',
     '[
        {"id": "q1", "prompt": "What is the solution to 2x + 4 = 10?", "options": ["x = 2", "x = 3", "x = 4", "x = 6"]},
        {"id": "q2", "prompt": "Which of the following is a linear equation?", "options": ["y = x^2 + 1", "3x - 5 = 7", "x^2 + y^2 = 4", "y = 1/x"]},
        {"id": "q3", "prompt": "If 5x - 3 = 12, what is x?", "options": ["x = 1", "x = 2", "x = 3", "x = 4"]},
        {"id": "q4", "prompt": "On a graph, a linear equation in two variables is represented by a:", "options": ["Parabola", "Straight line", "Circle", "Curve"]}
      ]'::jsonb,
     3, array[mat_maths9]);
  insert into public.assignment_answer_keys (assignment_id, answers) values
    (asg_maths9_quiz, '[{"id": "q1", "correct_index": 1}, {"id": "q2", "correct_index": 1}, {"id": "q3", "correct_index": 2}, {"id": "q4", "correct_index": 1}]'::jsonb);

  insert into public.assignments (id, class_id, title, description, assessment_type, difficulty, questions, pass_score, source_material_ids) values
    (asg_english10_quiz, off_english10, 'Poetry Analysis Quiz', 'Check understanding of key poetry terms.', 'test', 'medium',
     '[
        {"id": "q1", "prompt": "A comparison between two unlike things using ''like'' or ''as'' is called a:", "options": ["Metaphor", "Simile", "Personification", "Alliteration"]},
        {"id": "q2", "prompt": "The repetition of initial consonant sounds in nearby words is called:", "options": ["Assonance", "Rhyme", "Alliteration", "Meter"]},
        {"id": "q3", "prompt": "The central message or idea of a poem is called its:", "options": ["Tone", "Theme", "Stanza", "Rhyme scheme"]}
      ]'::jsonb,
     2, array[mat_english10]);
  insert into public.assignment_answer_keys (assignment_id, answers) values
    (asg_english10_quiz, '[{"id": "q1", "correct_index": 1}, {"id": "q2", "correct_index": 2}, {"id": "q3", "correct_index": 1}]'::jsonb);

  -- Freeform assignments (no questions — plain text submission, graded manually)
  insert into public.assignments (id, class_id, title, description, assessment_type, difficulty, due_at) values
    (asg_science9_essay, off_science9, 'States of Matter — Short Answer', 'Describe the three states of matter and give one real-world example of each.', 'homework', 'easy', now() + interval '7 days'),
    (asg_history10_essay, off_history10, 'World War I Essay', 'In 300-500 words, explain the main causes of World War I and its lasting impact on Europe.', 'homework', 'medium', now() + interval '10 days');
end $$;

-- Verify:
-- select p.role, p.full_name, p.email from public.profiles p where p.email like '%.test@schoolbuddy.dev' order by p.role, p.full_name;
-- select cg.name as class, s.name as subject, p.full_name as teacher from public.classes c join public.class_groups cg on cg.id = c.class_group_id join public.subjects s on s.id = c.subject_id join public.profiles p on p.id = c.teacher_id order by cg.name, s.name;
-- select cg.name, count(*) from public.enrollments e join public.class_groups cg on cg.id = e.class_group_id group by cg.name;

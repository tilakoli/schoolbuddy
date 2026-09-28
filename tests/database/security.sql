\set ON_ERROR_STOP on
begin;
create function pg_temp.expect_error(statement text, expected_state text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'Expected %, received %: %', expected_state, sqlstate, sqlerrm;
  end;
  raise exception 'Expected rejection (%): %', expected_state, statement;
end;
$$;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Assertion failed: %', message; end if;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('00000000-0000-0000-0000-000000000001', 'student@test.invalid', '{"role":"admin"}', '{}'),
 ('00000000-0000-0000-0000-000000000002', 'teacher@test.invalid', '{}', '{"role":"teacher"}'),
 ('00000000-0000-0000-0000-000000000003', 'outsider@test.invalid', '{}', '{}'),
 ('00000000-0000-0000-0000-000000000004', 'staff@test.invalid', '{}', '{"role":"admin"}');
select pg_temp.assert_true((select role = 'student' from profiles where id = '00000000-0000-0000-0000-000000000001'), 'untrusted metadata cannot elevate role');
select pg_temp.assert_true((select role = 'teacher' from profiles where id = '00000000-0000-0000-0000-000000000002'), 'trusted provisioning retains role');
insert into class_groups (id, school_id, name) select '00000000-0000-0000-0000-000000000101', id, 'Test class' from schools limit 1;
insert into subjects (id, school_id, name, teacher_id) select '00000000-0000-0000-0000-000000000201', id, 'Test maths', '00000000-0000-0000-0000-000000000002' from schools limit 1;
insert into classes (id, school_id, teacher_id, name, class_group_id, subject_id)
 select '00000000-0000-0000-0000-000000000301', id, '00000000-0000-0000-0000-000000000002', 'Test maths', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201' from schools limit 1;
insert into enrollments (class_group_id, student_id) values ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001');
insert into assignments (id, class_id, title, questions, pass_score) values
 ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', 'MCQ', '[{"id":"q1","prompt":"One","options":["a","b"]},{"id":"q2","prompt":"Two","options":["a","b"]}]', 2);
insert into assignment_answer_keys (assignment_id, answers) values ('00000000-0000-0000-0000-000000000401', '[{"id":"q1","correct_index":0},{"id":"q2","correct_index":1}]');
insert into assignments (id, class_id, title, status, due_at) values
 ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000301', 'Text', 'active', null),
 ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000301', 'Cancelled', 'cancelled', null),
 ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000301', 'Expired', 'active', now() - interval '1 minute');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.expect_error($q$insert into submissions (assignment_id, student_id, score, max_score, status) values ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000001',999,2,'graded')$q$, '42501');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000401','[{"id":"q1","selected_index":0},{"id":"q1","selected_index":0}]')$q$, '22023');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000401','[{"id":"q1","selected_index":0},{"id":"unknown","selected_index":0}]')$q$, '22023');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000401','[{"id":"q1","selected_index":0},{"id":"q2","selected_index":99}]')$q$, '22023');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000401','[{"id":"q1","selected_index":0.5},{"id":"q2","selected_index":1}]')$q$, '22023');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000401','[{"id":"q1","selected_index":0}]')$q$, '22023');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000403','{"text":"late"}')$q$, '22023');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000404','{"text":"late"}')$q$, '22023');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000402','{"text":" "}')$q$, '22023');
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000402',null)$q$, '22023');
select pg_temp.assert_true((submit_assignment('00000000-0000-0000-0000-000000000401','[{"id":"q1","selected_index":0},{"id":"q2","selected_index":0}]')).score is null, 'submission response hides score');
select pg_temp.assert_true((select count(*) = 0 from submissions where assignment_id = '00000000-0000-0000-0000-000000000401'), 'active submission row is not directly readable by student');
select pg_temp.assert_true((select score is null and max_score is null and passed is null and status = 'submitted' from get_my_submissions('00000000-0000-0000-0000-000000000401')), 'student result function masks active assignment results');
reset role;
update assignments set status = 'ended' where id = '00000000-0000-0000-0000-000000000401';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true((select score = 1 and max_score = 2 and passed = false from submissions where assignment_id = '00000000-0000-0000-0000-000000000401'), 'ended assignment releases direct result read');
select pg_temp.assert_true((select score = 1 and max_score = 2 and passed = false and status = 'graded' from get_my_submissions('00000000-0000-0000-0000-000000000401')), 'student result function releases ended assignment results');
reset role;
update assignments set status = 'active' where id = '00000000-0000-0000-0000-000000000401';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000401','[{"id":"q1","selected_index":0},{"id":"q2","selected_index":1}]')$q$, '23505');
select pg_temp.assert_true((submit_assignment('00000000-0000-0000-0000-000000000402','{"text":"My answer", "score":999}')).status = 'submitted', 'freeform accepted without supplied grading');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000402','{"text":"teacher"}')$q$, '42501');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000402','{"text":"outsider"}')$q$, '42501');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000402','{"text":"staff"}')$q$, '42501');
reset role;
update profiles set restricted = true where id = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.expect_error($q$select submit_assignment('00000000-0000-0000-0000-000000000402','{"text":"restricted"}')$q$, '42501');
reset role;
update profiles set restricted = false where id = '00000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select score = 1 and max_score = 2 and passed = false from submissions where assignment_id = '00000000-0000-0000-0000-000000000401'), 'MCQ score stored accurately');
select pg_temp.assert_true((select score is null and answers = '{"text":"My answer"}'::jsonb from submissions where assignment_id = '00000000-0000-0000-0000-000000000402'), 'freeform grading fields ignored');

insert into materials (id, class_id, teacher_id, title) values
 ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000002','Notes');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_temp.expect_error($q$insert into material_files (material_id,file_path,mime_type) values ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000301/other/notes.pdf','application/pdf')$q$, '23514');
insert into material_files (material_id,file_path,mime_type) values ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000301/00000000-0000-0000-0000-000000000601/notes.pdf','application/pdf');
reset role;

insert into ai_chat_sessions (id, user_id) values ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000001');
set local role service_role;
select pg_temp.expect_error($q$insert into ai_chat_messages (session_id,user_id,role,text) values ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000003','user','injection')$q$, '23503');
insert into ai_chat_messages (session_id,user_id,role,text) values ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000001','user','Hello');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from ai_chat_messages), 'outsider cannot read history');
select pg_temp.expect_error($q$insert into ai_chat_messages (session_id,user_id,role,text) values ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000003','user','forged')$q$, '42501');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true((select count(*) = 1 from ai_chat_messages), 'owner can read history');
delete from ai_chat_sessions where id = '00000000-0000-0000-0000-000000000501';
select pg_temp.assert_true((select count(*) = 0 from ai_chat_messages), 'owner deletion cascades history');
reset role;
rollback;
\echo 'Database security regression tests passed.'

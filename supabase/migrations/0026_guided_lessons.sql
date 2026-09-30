-- School Buddy: guided, curriculum-scoped lessons — a student picks a
-- subject (one of their own enrolled class offerings) and a chapter their
-- teacher has published, then chats with the AI strictly grounded in that
-- chapter's material. Previously students had zero read access to
-- materials at all — chat_school_context hard-blocked the 'materials'
-- topic for them entirely (see the 'materialsNotShared' limitation added in
-- 0022_grounded_chat.sql). This opens a narrow, enrollment-scoped read path
-- instead of widening blanket access to all materials.
--
-- Run in Supabase Dashboard -> SQL Editor, after 0025_exams_and_learning_videos.sql.

begin;

-- 1. A lesson's curriculum scope, so reopening it restores the same guided
-- view instead of a plain chat. class_id (not subject_id) is what's
-- actually needed downstream — materials are scoped by class offering, not
-- by subject, and a student's picker already resolves straight to a
-- classes.id the same way every other "my subject" screen in this app does.
alter table public.ai_chat_sessions
  add column if not exists class_id uuid references public.classes(id) on delete set null,
  add column if not exists chapter text;

-- 2. Students can read extracted materials/files for their own enrolled
-- classes only — never pending/failed, never another class.
drop policy if exists "Students view extracted materials for enrolled classes" on public.materials;
create policy "Students view extracted materials for enrolled classes"
  on public.materials for select
  using (status = 'extracted' and public.is_enrolled(class_id, auth.uid()));

drop policy if exists "Students view material files for enrolled classes" on public.material_files;
create policy "Students view material files for enrolled classes"
  on public.material_files for select
  using (
    exists (
      select 1 from public.materials m
      where m.id = material_files.material_id
        and m.status = 'extracted'
        and public.is_enrolled(m.class_id, auth.uid())
    )
  );

-- Objects are stored at {class_id}/{material_id}/{position}-{filename}, same
-- convention the existing teacher storage policy in 0007_materials.sql relies on.
drop policy if exists "Students view materials in storage for enrolled classes" on storage.objects;
create policy "Students view materials in storage for enrolled classes"
  on storage.objects for select
  using (
    bucket_id = 'materials'
    and public.is_enrolled((storage.foldername(name))[1]::uuid, auth.uid())
  );

-- 3. chat_school_context: let students search their own enrolled classes'
-- materials (only the 'materials' branch changes), and add a deterministic
-- direct-filter path — when the caller already knows exactly which class/
-- chapter a guided lesson is scoped to, skip the free-text relevance search
-- entirely and just return that chapter's materials. A new parameter list
-- means this must be dropped first, not just replaced, or Postgres creates
-- a second overloaded function instead of replacing the original.
drop function if exists public.chat_school_context(text[], text);

create or replace function public.chat_school_context(
  p_topics text[], p_search text default '', p_class_id uuid default null, p_chapter text default null
)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  me public.profiles;
  topic text;
  sources jsonb := '[]';
  limitations jsonb := '[]';
  rows_json jsonb;
  total bigint;
  label text;
  href text;
  q tsquery;
  material record;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.restricted then raise exception 'Unauthorized.' using errcode = '42501'; end if;
  if p_topics is null or cardinality(p_topics) > 6 or length(coalesce(p_search, '')) > 200 then
    raise exception 'Invalid search.' using errcode = '22023';
  end if;
  foreach topic in array p_topics loop
    rows_json := '[]'; total := 0;
    if topic in ('teachers', 'students') then
      if (topic = 'teachers' and me.role not in ('admin', 'vice_principal')) or
         (topic = 'students' and me.role not in ('admin', 'vice_principal', 'teacher')) then
        limitations := limitations || jsonb_build_array('roleLimited'); continue;
      end if;
      with scoped as (
        select p.id, left(coalesce(p.full_name, 'Unnamed account'), 160) as name, p.restricted,
          case when topic = 'teachers' then (select coalesce(jsonb_agg(left(s.name, 160)), '[]') from public.subjects s
            where s.teacher_id = p.id and s.school_id = me.school_id) else null end as subjects
        from public.profiles p where p.school_id = me.school_id
          and p.role = case topic when 'teachers' then 'teacher' else 'student' end
          and (me.role in ('admin', 'vice_principal') or exists (
            select 1 from public.enrollments e join public.classes c on c.class_group_id = e.class_group_id
            where e.student_id = p.id and c.teacher_id = me.id and c.school_id = me.school_id
          ))
      ) select (select count(*) from scoped), (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from
        (select * from scoped order by name, id limit 50) r) into total, rows_json;
      label := case topic when 'teachers' then 'Teacher accounts and assigned subjects' else 'Student accounts' end;
      href := case when me.role in ('admin','vice_principal') then '/admin/' || topic else '/students' end;
    elsif topic = 'classes' then
      with scoped as (
        select c.id, left(g.name,160) as class_name, left(c.name,160) as subject,
          left(c.period,80) as period, left(c.room,80) as room
        from public.classes c join public.class_groups g on g.id = c.class_group_id
        where c.school_id = me.school_id and g.school_id = me.school_id
          and (me.role in ('admin','vice_principal') or c.teacher_id = me.id or public.is_enrolled(c.id, me.id))
      ) select (select count(*) from scoped), (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from
        (select * from scoped order by class_name, subject, id limit 50) r) into total, rows_json;
      label := 'Subject offerings (each class-subject combination is one offering)';
      href := case when me.role = 'student' then '/subjects' else '/classes' end;
    elsif topic = 'subjects' then
      with scoped as (
        select s.id, left(s.name,160) as name from public.subjects s
        where s.school_id = me.school_id and (me.role in ('admin','vice_principal') or s.teacher_id = me.id
          or exists (select 1 from public.classes c where c.subject_id = s.id and c.school_id = me.school_id and public.is_enrolled(c.id, me.id)))
      ) select (select count(*) from scoped), (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from
        (select * from scoped order by name, id limit 50) r) into total, rows_json;
      label := 'Subjects'; href := case when me.role = 'student' then '/subjects' else '/classes' end;
    elsif topic = 'assignments' then
      with scoped as (
        select a.id, left(a.title,160) as title, a.assessment_type, a.due_at,
          case when a.status = 'active' and a.due_at <= now() then 'ended' else a.status end as status,
          left(c.name,160) as subject, left(g.name,160) as class_name
        from public.assignments a join public.classes c on c.id = a.class_id
          join public.class_groups g on g.id = c.class_group_id
        where c.school_id = me.school_id and g.school_id = me.school_id
          and (me.role in ('admin','vice_principal') or c.teacher_id = me.id or public.is_enrolled(c.id, me.id))
      ) select (select count(*) from scoped), (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from
        (select * from scoped order by due_at asc nulls last, id limit 50) r) into total, rows_json;
      label := 'Assignment dates and status (no submissions or grades)';
      href := case when me.role in ('admin','vice_principal') then '/classes' else '/assignments' end;
    elsif topic = 'materials' then
      if p_class_id is not null then
        -- Guided-lesson path: the caller already knows exactly which class
        -- (and optionally chapter) to use — no keyword search, no ranking,
        -- just every extracted material in scope. Still enrollment/ownership
        -- gated below, same as the search path.
        for material in
          select m.id, m.title, m.chapter, c.id as class_id, c.class_group_id,
            left(coalesce(m.extracted_text, ''), 4000) as excerpt
          from public.materials m join public.classes c on c.id = m.class_id
          where c.school_id = me.school_id and m.status = 'extracted' and c.id = p_class_id
            and (me.role in ('admin','vice_principal') or c.teacher_id = me.id or public.is_enrolled(c.id, me.id))
            and (p_chapter is null or m.chapter = p_chapter)
          order by m.id
          limit 20
        loop
          sources := sources || jsonb_build_array(jsonb_build_object(
            'id', 'material:' || material.id, 'kind','material',
            'label', left(material.title,160) || coalesce(' · ' || left(material.chapter,80),''),
            'href', '/classes/' || material.class_group_id || '/subjects/' || material.class_id,
            'excerpt', material.excerpt));
          total := total + 1;
        end loop;
        if total = 0 then limitations := limitations || jsonb_build_array('noMaterials'); end if;
        continue;
      end if;
      if btrim(coalesce(p_search,'')) = '' then
        limitations := limitations || jsonb_build_array('searchNeeded'); continue;
      end if;
      q := websearch_to_tsquery('simple', p_search);
      for material in
        select m.id, m.title, m.chapter, c.id as class_id, c.class_group_id,
          ts_headline('simple', m.extracted_text, q,
            'MaxWords=150,MinWords=40,MaxFragments=2,StartSel=[[,StopSel=]]') as excerpt
        from public.materials m join public.classes c on c.id = m.class_id
        where c.school_id = me.school_id and m.status = 'extracted'
          and (me.role in ('admin','vice_principal') or c.teacher_id = me.id or public.is_enrolled(c.id, me.id))
          and to_tsvector('simple', coalesce(m.title,'') || ' ' || coalesce(m.chapter,'') || ' ' || coalesce(m.extracted_text,'')) @@ q
        order by ts_rank(to_tsvector('simple', coalesce(m.title,'') || ' ' || coalesce(m.chapter,'') || ' ' || coalesce(m.extracted_text,'')), q) desc, m.id
        limit 5
      loop
        sources := sources || jsonb_build_array(jsonb_build_object(
          'id', 'material:' || material.id, 'kind','material',
          'label', left(material.title,160) || coalesce(' · ' || left(material.chapter,80),''),
          'href', '/classes/' || material.class_group_id || '/subjects/' || material.class_id,
          'excerpt', left(coalesce(material.excerpt,''),4000)));
        total := total + 1;
      end loop;
      limitations := limitations || jsonb_build_array('textSearchOnly');
      if total = 0 then limitations := limitations || jsonb_build_array('noMaterials'); end if;
      continue;
    else
      raise exception 'Unsupported chat topic.' using errcode = '22023';
    end if;
    sources := sources || jsonb_build_array(jsonb_build_object('id', topic, 'kind','records','label',label,'href',href,
      'excerpt', jsonb_build_object('total_visible_records',total,'included_records',jsonb_array_length(rows_json),
        'complete_list',total <= 50,'records',rows_json)::text));
    if total > 50 then limitations := limitations || jsonb_build_array('partialRecords'); end if;
  end loop;
  return jsonb_build_object('sources',sources,'limitations',limitations,'retrievedAt',now());
end;
$$;
revoke all on function public.chat_school_context(text[],text,uuid,text) from public, anon;
grant execute on function public.chat_school_context(text[],text,uuid,text) to authenticated;

commit;

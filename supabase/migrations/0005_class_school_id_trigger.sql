-- School Buddy: auto-fill classes.school_id from the teacher's own profile.
--
-- Bug: the "New class" forms (web ClassesList.tsx, mobile classes.tsx) never
-- sent school_id, so creating a class as any teacher other than the one
-- seeded directly via SQL hit "null value in column school_id ... violates
-- not-null constraint". Fixing this in the database, not in every client
-- form, so it can't be missed on either platform (or a future one).
--
-- Run in Supabase Dashboard -> SQL Editor, after 0004_fix_rls_recursion.sql.

create or replace function public.set_class_school_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.school_id is null then
    new.school_id := (select school_id from public.profiles where id = new.teacher_id);
  end if;
  return new;
end;
$$;

drop trigger if exists set_class_school_id on public.classes;
create trigger set_class_school_id
  before insert on public.classes
  for each row execute function public.set_class_school_id();

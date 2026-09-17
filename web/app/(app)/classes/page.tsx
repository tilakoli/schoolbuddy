import { redirect } from 'next/navigation';
import ClassesList from '@/components/classes/ClassesList';
import { fetchSchoolClassGroups, fetchTeacherClassGroups } from '@/lib/classGroups';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function ClassesPage() {
  const { user, profile } = await getUserAndProfile();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin' && profile.role !== 'vice_principal')) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  const canManage = profile.role === 'admin' || profile.role === 'vice_principal';

  if (!canManage) {
    const classes = await fetchTeacherClassGroups(supabase, user!.id);
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <ClassesList initialClasses={classes} canManage={false} />
      </main>
    );
  }

  const [classes, { data: groupOptions }, { data: subjectRows }] = await Promise.all([
    fetchSchoolClassGroups(supabase, profile.school_id),
    supabase.from('class_groups').select('id, name').eq('school_id', profile.school_id).order('name'),
    supabase.from('subjects').select('id, name, profiles(full_name)').eq('school_id', profile.school_id).order('name'),
  ]);

  interface SubjectRow {
    id: string;
    name: string;
    profiles: { full_name: string | null } | null;
  }
  const subjectOptions = ((subjectRows ?? []) as unknown as SubjectRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    teacherName: row.profiles?.full_name ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <ClassesList
        initialClasses={classes}
        canManage
        groupOptions={groupOptions ?? []}
        subjectOptions={subjectOptions}
        schoolId={profile.school_id}
      />
    </main>
  );
}

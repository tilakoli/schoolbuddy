import { redirect } from 'next/navigation';
import ClassesList, { type ClassRow } from '@/components/classes/ClassesList';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function ClassesPage() {
  const { user, profile } = await getUserAndProfile();
  if (profile?.role !== 'teacher') redirect('/dashboard');

  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from('classes')
        .select('id, name, subject, period, room, enrollments(count)')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false })
    : { data: null };

  const classes: ClassRow[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    subject: row.subject,
    period: row.period,
    room: row.room,
    studentCount: row.enrollments?.[0]?.count ?? 0,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <ClassesList initialClasses={classes} teacherId={user!.id} />
    </main>
  );
}

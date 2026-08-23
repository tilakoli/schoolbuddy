import { redirect } from 'next/navigation';
import AssignmentsPageClient, { type AssignmentWithClass } from '@/components/assignments/AssignmentsPageClient';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function AssignmentsPage() {
  const { user, profile } = await getUserAndProfile();
  if (profile?.role !== 'teacher' && profile?.role !== 'student') redirect('/dashboard');

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  if (profile.role === 'teacher') {
    const { data: classes } = await supabase.from('classes').select('id, name').eq('teacher_id', user!.id).order('name');
    const classOptions = classes ?? [];

    const { data: assignmentRows } = classOptions.length
      ? await supabase
          .from('assignments')
          .select('*, classes!inner(name, teacher_id)')
          .eq('classes.teacher_id', user!.id)
          .order('due_at', { ascending: true, nullsFirst: false })
      : { data: [] };

    const assignments: AssignmentWithClass[] = (assignmentRows ?? []).map((row) => ({
      ...row,
      className: row.classes?.name ?? '',
    }));

    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <AssignmentsPageClient initialAssignments={assignments} classOptions={classOptions} />
      </main>
    );
  }

  // RLS ("Students view assignments in enrolled classes") already restricts this
  // to the student's own enrolled classes — no extra filter needed here.
  const { data: assignmentRows } = await supabase
    .from('assignments')
    .select('*, classes(name)')
    .order('due_at', { ascending: true, nullsFirst: false });

  const assignments: AssignmentWithClass[] = (assignmentRows ?? []).map((row) => ({
    ...row,
    className: row.classes?.name ?? '',
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <AssignmentsPageClient initialAssignments={assignments} />
    </main>
  );
}

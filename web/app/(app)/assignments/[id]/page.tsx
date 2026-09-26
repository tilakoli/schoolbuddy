import { notFound, redirect } from 'next/navigation';
import { StudentAssignmentView, TeacherAssignmentView } from '@/components/assignments/AssignmentDetail';
import type { AnswerKeyEntry, AssignmentRow, SubmissionRow } from '@/components/assignments/types';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await getUserAndProfile();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'student')) redirect('/dashboard');

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', id).single();
  if (!assignment) notFound();

  const { data: classRow } = await supabase
    .from('classes')
    .select('class_group_id, subjects(name), class_groups(name)')
    .eq('id', assignment.class_id)
    .single();
  const subjectName = (classRow as unknown as { subjects: { name: string } | null } | null)?.subjects?.name ?? '';
  const groupName = (classRow as unknown as { class_groups: { name: string } | null } | null)?.class_groups?.name ?? '';
  const contextLabel = [groupName, subjectName].filter(Boolean).join(' · ');

  if (profile.role === 'student') {
    const { data: submission } = await supabase
      .rpc('get_my_submissions', { p_assignment_id: id })
      .maybeSingle();

    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <StudentAssignmentView
          assignment={assignment as AssignmentRow}
          contextLabel={contextLabel}
          initialSubmission={submission as SubmissionRow | null}
        />
      </main>
    );
  }

  const groupId = classRow?.class_group_id;
  const [{ data: enrollmentRows }, { data: submissionRows }, { data: answerKeyRow }] = await Promise.all([
    groupId
      ? supabase.from('enrollments').select('profiles(id, full_name, email)').eq('class_group_id', groupId)
      : Promise.resolve({ data: [] }),
    supabase.from('submissions').select('*').eq('assignment_id', id),
    supabase.from('assignment_answer_keys').select('answers').eq('assignment_id', id).maybeSingle(),
  ]);

  interface RosterStudent {
    id: string;
    full_name: string | null;
    email: string | null;
  }
  const roster = ((enrollmentRows ?? []) as unknown as { profiles: RosterStudent }[]).map((r) => r.profiles).filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <TeacherAssignmentView
        assignment={assignment as AssignmentRow}
        contextLabel={contextLabel}
        roster={roster}
        initialSubmissions={(submissionRows as SubmissionRow[]) ?? []}
        answerKey={(answerKeyRow?.answers as AnswerKeyEntry[] | undefined) ?? null}
      />
    </main>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getEffectiveStatus, STATUS_BADGE_CLASS, STATUS_LABEL, type AssignmentRow } from '@/components/assignments/types';
import { getServerT } from '@/lib/i18n/server';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

function formatDue(dueAt: string | null) {
  if (!dueAt) return 'No due date';
  return new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface OfferingRow {
  id: string;
  class_group_id: string;
  class_groups: { name: string } | null;
  subjects: { name: string } | null;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  score: number | null;
  max_score: number | null;
  passed: boolean | null;
  status: string;
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await params;
  const { user, profile } = await getUserAndProfile();
  if (profile?.role !== 'teacher') redirect('/dashboard');
  const t = await getServerT();

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  // Which of this student's classes does this teacher actually teach? If
  // none, this student isn't theirs to see — 404 rather than leak anything.
  const { data: studentGroups } = await supabase.from('enrollments').select('class_group_id').eq('student_id', studentId);
  const studentGroupIds = [...new Set((studentGroups ?? []).map((r) => r.class_group_id))];
  if (studentGroupIds.length === 0) notFound();

  const { data: offeringRows } = await supabase
    .from('classes')
    .select('id, class_group_id, class_groups(name), subjects(name)')
    .eq('teacher_id', user!.id)
    .in('class_group_id', studentGroupIds);
  const offerings = (offeringRows ?? []) as unknown as OfferingRow[];
  if (offerings.length === 0) notFound();

  const classIds = offerings.map((o) => o.id);
  const classLabelByOffering = new Map(
    offerings.map((o) => [o.id, [o.class_groups?.name, o.subjects?.name].filter(Boolean).join(' · ')])
  );

  const [{ data: studentProfile }, { data: assignmentRows }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role').eq('id', studentId).single(),
    supabase.from('assignments').select('*').in('class_id', classIds).order('due_at', { ascending: true, nullsFirst: false }),
  ]);
  if (!studentProfile || studentProfile.role !== 'student') notFound();

  const assignments = (assignmentRows ?? []) as AssignmentRow[];
  const assignmentIds = assignments.map((a) => a.id);

  const { data: submissionRows } = assignmentIds.length
    ? await supabase
        .from('submissions')
        .select('id, assignment_id, score, max_score, passed, status')
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds)
    : { data: [] };
  const submissions = (submissionRows ?? []) as SubmissionRow[];
  const submissionByAssignment = new Map(submissions.map((s) => [s.assignment_id, s]));

  const graded = submissions.filter((s) => s.status === 'graded' && s.max_score);
  const avgPercent = graded.length
    ? Math.round((graded.reduce((sum, s) => sum + (s.score ?? 0) / (s.max_score ?? 1), 0) / graded.length) * 100)
    : null;
  const passCount = graded.filter((s) => s.passed === true).length;
  const passRate = graded.length ? Math.round((passCount / graded.length) * 100) : null;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link href="/students" className="text-sm text-muted-foreground hover:text-foreground">
        {t('students.backToStudents')}
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{studentProfile.full_name || studentProfile.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{studentProfile.email}</p>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">{[...new Set(offerings.map((o) => classLabelByOffering.get(o.id)))].join(' · ')}</p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card shadow-sm p-4">
          <p className="text-2xl font-bold text-foreground">{avgPercent != null ? `${avgPercent}%` : '—'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('students.averageScore')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4">
          <p className="text-2xl font-bold text-foreground">{passRate != null ? `${passRate}%` : '—'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('students.passRate')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4">
          <p className="text-2xl font-bold text-foreground">{graded.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('students.graded')}</p>
        </div>
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">{t('students.assignments')}</h2>
      <div className="space-y-2">
        {assignments.length === 0 && <p className="text-sm text-muted-foreground">{t('students.noAssignmentsYet')}</p>}
        {assignments.map((assignment) => {
          const submission = submissionByAssignment.get(assignment.id);
          const status = getEffectiveStatus(assignment);
          return (
            <Link
              key={assignment.id}
              href={`/assignments/${assignment.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{assignment.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {classLabelByOffering.get(assignment.class_id)} · {formatDue(assignment.due_at)}
                  {status !== 'active' && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASS[status]}`}>{t(STATUS_LABEL[status])}</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {!submission ? (
                  <p className="text-xs text-muted-foreground">{t('students.notSubmitted')}</p>
                ) : submission.status === 'graded' ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      {submission.score ?? '—'} / {submission.max_score ?? '—'}
                    </p>
                    {submission.passed !== null && (
                      <span className={`text-xs font-semibold ${submission.passed ? 'text-success' : 'text-danger'}`}>
                        {submission.passed ? t('assignment.pass') : t('assignment.fail')}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('students.awaitingGrade')}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

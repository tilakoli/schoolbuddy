import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getEffectiveStatus } from '@/components/assignments/types';
import { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { AnimatedBarChart, DashboardPanel, ProgressBreakdown } from '@/components/dashboard/DashboardWidgets';
import { CheckIcon, ClipboardIcon, TrendingUpIcon } from '@/components/icons';
import EmptyState from '@/components/shared/EmptyState';
import StatTile from '@/components/shared/StatTile';
import { getServerT } from '@/lib/i18n/server';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id?: string;
  score: number | null;
  max_score: number | null;
  passed: boolean | null;
  status: string;
  graded_at: string | null;
  assignments: { title: string; class_id: string; status: 'active' | 'ended' | 'cancelled'; due_at: string | null } | null;
}

interface ClassLabelRow {
  id: string;
  subjects: { name: string } | null;
  class_groups: { name: string } | null;
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function buildClassLabels(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, classIds: string[]) {
  if (classIds.length === 0) return new Map<string, string>();
  const { data } = await supabase.from('classes').select('id, subjects(name), class_groups(name)').in('id', classIds);
  const map = new Map<string, string>();
  ((data ?? []) as unknown as ClassLabelRow[]).forEach((row) => {
    map.set(row.id, [row.class_groups?.name, row.subjects?.name].filter(Boolean).join(' · '));
  });
  return map;
}

function computeStats(rows: SubmissionRow[]) {
  const graded = rows.filter((r) => r.status === 'graded' && r.max_score);
  const avgPercent = graded.length
    ? Math.round((graded.reduce((sum, r) => sum + (r.score ?? 0) / (r.max_score ?? 1), 0) / graded.length) * 100)
    : null;
  const passCount = graded.filter((r) => r.passed === true).length;
  const passRate = graded.length ? Math.round((passCount / graded.length) * 100) : null;
  return { gradedCount: graded.length, avgPercent, passRate };
}

export default async function PerformancePage() {
  const { profile } = await getUserAndProfile();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'student')) redirect('/dashboard');
  const t = await getServerT();

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  if (profile.role === 'student') {
    const { data } = await supabase.rpc('get_my_submissions', {});
    const submissionRows = (data ?? []) as Omit<SubmissionRow, 'assignments'>[];
    const assignmentIds = [...new Set(submissionRows.map((row) => row.assignment_id))];
    const { data: assignmentRows } = assignmentIds.length
      ? await supabase.from('assignments').select('id, title, class_id, status, due_at').in('id', assignmentIds)
      : { data: [] };
    const assignmentById = new Map((assignmentRows ?? []).map((assignment) => [assignment.id, assignment]));
    const submissions = submissionRows
      .map((submission) => ({ ...submission, assignments: assignmentById.get(submission.assignment_id) ?? null }))
      .filter((submission) => !submission.assignments || getEffectiveStatus(submission.assignments) !== 'cancelled')
      .sort((a, b) => (b.graded_at ? new Date(b.graded_at).getTime() : 0) - (a.graded_at ? new Date(a.graded_at).getTime() : 0));

    const classIds = [...new Set(submissions.map((s) => s.assignments?.class_id).filter((id): id is string => !!id))];
    const classLabels = await buildClassLabels(supabase, classIds);
    const { gradedCount, avgPercent, passRate } = computeStats(submissions);

    // Moved here from the dashboard — workload/scheduling stats, distinct
    // from the grade-based stats above.
    interface ClassRow {
      id: string;
      name: string;
      period: string | null;
      room: string | null;
      subjects: { name: string } | null;
      class_groups: { name: string } | null;
    }
    const { data: classRows } = await supabase.from('classes').select('id, name, period, room, subjects(name), class_groups(name)').order('name');
    const classes = ((classRows ?? []) as unknown as ClassRow[]).map((row) => ({
      ...row,
      subjectName: row.subjects?.name ?? row.name,
      groupName: row.class_groups?.name ?? null,
    }));

    interface WorkloadAssignmentRow {
      id: string;
      title: string;
      due_at: string | null;
      status: 'active' | 'ended' | 'cancelled';
      classes: { name: string } | null;
    }
    const { data: assignmentRowsForWorkload } = await supabase
      .from('assignments')
      .select('id, title, due_at, status, classes(name)')
      .order('due_at', { ascending: true, nullsFirst: false });
    const workloadAssignments = ((assignmentRowsForWorkload ?? []) as unknown as WorkloadAssignmentRow[]).filter(
      (a) => getEffectiveStatus(a) !== 'cancelled'
    );

    const now = new Date();
    const dueSoonCount = workloadAssignments.filter((a) => {
      if (!a.due_at) return false;
      const diffDays = (new Date(a.due_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays < 7;
    }).length;
    const overdueCount = workloadAssignments.filter((a) => a.due_at && new Date(a.due_at).getTime() < now.getTime()).length;
    const submittedIds = new Set(submissions.map((s) => s.assignment_id));

    const workloadStats = [
      { label: t('dashboard.statEnrolledClasses'), value: String(classes.length) },
      { label: t('dashboard.statDueThisWeek'), value: String(dueSoonCount) },
      { label: t('dashboard.statOverdue'), value: String(overdueCount) },
      { label: t('dashboard.statTotalAssignments'), value: String(workloadAssignments.length) },
    ];

    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground">{t('nav.performance')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('performance.studentSubtitle')}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatTile icon={TrendingUpIcon} tone="primary" value={avgPercent != null ? `${avgPercent}%` : '—'} label={t('students.averageScore')} />
          <StatTile icon={CheckIcon} tone="success" value={passRate != null ? `${passRate}%` : '—'} label={t('students.passRate')} style={{ animationDelay: '0.05s' }} />
          <StatTile icon={ClipboardIcon} tone="info" value={String(gradedCount)} label={t('students.graded')} style={{ animationDelay: '0.1s' }} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {workloadStats.map((stat, i) => {
            const tile = TILE_PALETTE[i % TILE_PALETTE.length];
            return (
              <div key={stat.label} className={`rounded-xl ${tile.bg} p-4`}>
                <p className={`text-2xl font-bold ${tile.text}`}>{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <DashboardPanel title="Workload by subject" subtitle="Assignments currently visible to you" action={{ href: '/assignments', label: t('dashboard.viewAssignments') }}>
            <AnimatedBarChart
              data={classes.map((item) => ({
                label: item.subjectName,
                value: workloadAssignments.filter((assignment) => assignment.classes?.name === item.subjectName).length,
              }))}
              valueLabel="Number of assignments by subject"
            />
          </DashboardPanel>
          <DashboardPanel title="Learning progress" subtitle="Your assignment activity">
            <ProgressBreakdown
              items={[
                { label: 'Submitted', value: submittedIds.size, total: workloadAssignments.length, tone: 'primary' },
                { label: 'Graded', value: gradedCount, total: workloadAssignments.length, tone: 'success' },
                { label: 'Still to submit', value: Math.max(0, workloadAssignments.length - submittedIds.size), total: workloadAssignments.length, tone: 'warning' },
              ]}
            />
          </DashboardPanel>
        </div>

        <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">{t('performance.history')}</h2>
        <div className="space-y-2">
          {submissions.length === 0 && (
            <EmptyState icon={ClipboardIcon} title={t('performance.noSubmissionsYet')} description={t('performance.noSubmissionsStudentDesc')} />
          )}
          {submissions.map((s) => (
            <Link
              key={s.id}
              href={`/assignments/${s.assignment_id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{s.assignments?.title ?? t('performance.assignmentFallback')}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[classLabels.get(s.assignments?.class_id ?? ''), formatDate(s.graded_at)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {s.status === 'graded' ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      {s.score ?? '—'} / {s.max_score ?? '—'}
                    </p>
                    {s.passed !== null && (
                      <span className={`text-xs font-semibold ${s.passed ? 'text-success' : 'text-danger'}`}>
                        {s.passed ? t('assignment.pass') : t('assignment.fail')}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('students.awaitingGrade')}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  // Teacher — RLS ("Teachers view submissions for own classes") already
  // scopes this to submissions for assignments in classes they own. Teachers
  // see grades as soon as they set them, unlike the gated student view above.
  const { data } = await supabase
    .from('submissions')
    .select('id, assignment_id, student_id, score, max_score, passed, status, graded_at, assignments(title, class_id, status, due_at)')
    .order('graded_at', { ascending: false, nullsFirst: false });
  const submissions = ((data ?? []) as unknown as SubmissionRow[]).filter(
    (s) => !s.assignments || getEffectiveStatus(s.assignments) !== 'cancelled'
  );

  const classIds = [...new Set(submissions.map((s) => s.assignments?.class_id).filter((id): id is string => !!id))];
  const classLabels = await buildClassLabels(supabase, classIds);

  const studentIds = [...new Set(submissions.map((s) => s.student_id).filter((id): id is string => !!id))];
  const { data: studentRows } = studentIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', studentIds)
    : { data: [] };
  const studentNameById = new Map((studentRows ?? []).map((s) => [s.id, s.full_name || s.email || 'Student']));

  const { gradedCount, avgPercent, passRate } = computeStats(submissions);

  const byClass = new Map<string, SubmissionRow[]>();
  submissions.forEach((s) => {
    const classId = s.assignments?.class_id;
    if (!classId) return;
    if (!byClass.has(classId)) byClass.set(classId, []);
    byClass.get(classId)!.push(s);
  });
  const perClass = [...byClass.entries()].map(([classId, rows]) => ({
    classId,
    label: classLabels.get(classId) ?? '',
    ...computeStats(rows),
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">{t('nav.performance')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('performance.teacherSubtitle')}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatTile icon={TrendingUpIcon} tone="primary" value={avgPercent != null ? `${avgPercent}%` : '—'} label={t('students.averageScore')} />
        <StatTile icon={CheckIcon} tone="success" value={passRate != null ? `${passRate}%` : '—'} label={t('students.passRate')} style={{ animationDelay: '0.05s' }} />
        <StatTile icon={ClipboardIcon} tone="info" value={String(gradedCount)} label={t('students.graded')} style={{ animationDelay: '0.1s' }} />
      </div>

      {perClass.length > 0 && (
        <>
          <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">{t('performance.byClass')}</h2>
          <div className="space-y-2">
            {perClass.map((c) => (
              <div key={c.classId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4">
                <p className="font-semibold text-foreground">{c.label}</p>
                <p className="text-sm text-muted-foreground">
                  {c.avgPercent != null ? t('performance.avgPercent', { percent: String(c.avgPercent) }) : t('performance.noGradesYet')}
                  {c.passRate != null ? ` · ${t('performance.passPercent', { percent: String(c.passRate) })}` : ''}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">{t('performance.recentSubmissions')}</h2>
      <div className="space-y-2">
        {submissions.length === 0 && (
          <EmptyState icon={ClipboardIcon} title={t('performance.noSubmissionsYet')} description={t('performance.noSubmissionsTeacherDesc')} />
        )}
        {submissions.slice(0, 30).map((s) => (
          <Link
            key={s.id}
            href={`/assignments/${s.assignment_id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{s.assignments?.title ?? t('performance.assignmentFallback')}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {studentNameById.get(s.student_id ?? '')} ·{' '}
                {[classLabels.get(s.assignments?.class_id ?? ''), formatDate(s.graded_at)].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {s.status === 'graded' ? (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    {s.score ?? '—'} / {s.max_score ?? '—'}
                  </p>
                  {s.passed !== null && (
                    <span className={`text-xs font-semibold ${s.passed ? 'text-success' : 'text-danger'}`}>
                      {s.passed ? t('assignment.pass') : t('assignment.fail')}
                    </span>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t('students.awaitingGrade')}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

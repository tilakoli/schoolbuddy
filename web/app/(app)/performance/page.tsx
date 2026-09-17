import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getEffectiveStatus } from '@/components/assignments/types';
import { CheckIcon, ClipboardIcon, TrendingUpIcon } from '@/components/icons';
import EmptyState from '@/components/shared/EmptyState';
import StatTile from '@/components/shared/StatTile';
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
  const { user, profile } = await getUserAndProfile();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'student')) redirect('/dashboard');

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  if (profile.role === 'student') {
    const { data } = await supabase
      .from('submissions')
      .select('id, assignment_id, score, max_score, passed, status, graded_at, assignments(title, class_id, status, due_at)')
      .eq('student_id', user!.id)
      .order('graded_at', { ascending: false, nullsFirst: false });
    const raw = (data ?? []) as unknown as SubmissionRow[];

    // A cancelled assignment doesn't count at all. A graded submission whose
    // assignment hasn't ended yet is shown as still "awaiting" — same gate
    // as the assignment detail page, so a score can't leak early through here.
    const submissions = raw
      .filter((s) => !s.assignments || getEffectiveStatus(s.assignments) !== 'cancelled')
      .map((s) => (s.assignments && getEffectiveStatus(s.assignments) !== 'ended' ? { ...s, status: 'submitted' } : s));

    const classIds = [...new Set(submissions.map((s) => s.assignments?.class_id).filter((id): id is string => !!id))];
    const classLabels = await buildClassLabels(supabase, classIds);
    const { gradedCount, avgPercent, passRate } = computeStats(submissions);

    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground">Performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your graded assignments and tests, across all subjects.</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatTile icon={TrendingUpIcon} tone="primary" value={avgPercent != null ? `${avgPercent}%` : '—'} label="Average score" />
          <StatTile icon={CheckIcon} tone="success" value={passRate != null ? `${passRate}%` : '—'} label="Pass rate" style={{ animationDelay: '0.05s' }} />
          <StatTile icon={ClipboardIcon} tone="info" value={String(gradedCount)} label="Graded" style={{ animationDelay: '0.1s' }} />
        </div>

        <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">History</h2>
        <div className="space-y-2">
          {submissions.length === 0 && (
            <EmptyState icon={ClipboardIcon} title="No submissions yet" description="Graded work will show up here once a teacher marks it." />
          )}
          {submissions.map((s) => (
            <Link
              key={s.id}
              href={`/assignments/${s.assignment_id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{s.assignments?.title ?? 'Assignment'}</p>
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
                        {s.passed ? 'Pass' : 'Fail'}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Awaiting grade</p>
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
      <h1 className="text-2xl font-bold text-foreground">Performance</h1>
      <p className="mt-1 text-sm text-muted-foreground">Graded assignments and tests, across your classes.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatTile icon={TrendingUpIcon} tone="primary" value={avgPercent != null ? `${avgPercent}%` : '—'} label="Average score" />
        <StatTile icon={CheckIcon} tone="success" value={passRate != null ? `${passRate}%` : '—'} label="Pass rate" style={{ animationDelay: '0.05s' }} />
        <StatTile icon={ClipboardIcon} tone="info" value={String(gradedCount)} label="Graded" style={{ animationDelay: '0.1s' }} />
      </div>

      {perClass.length > 0 && (
        <>
          <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">By class</h2>
          <div className="space-y-2">
            {perClass.map((c) => (
              <div key={c.classId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4">
                <p className="font-semibold text-foreground">{c.label}</p>
                <p className="text-sm text-muted-foreground">
                  {c.avgPercent != null ? `${c.avgPercent}% avg` : 'No grades yet'}
                  {c.passRate != null ? ` · ${c.passRate}% pass` : ''}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">Recent submissions</h2>
      <div className="space-y-2">
        {submissions.length === 0 && (
          <EmptyState icon={ClipboardIcon} title="No submissions yet" description="Once students submit and you grade their work, it'll show up here." />
        )}
        {submissions.slice(0, 30).map((s) => (
          <Link
            key={s.id}
            href={`/assignments/${s.assignment_id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{s.assignments?.title ?? 'Assignment'}</p>
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
                      {s.passed ? 'Pass' : 'Fail'}
                    </span>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Awaiting grade</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

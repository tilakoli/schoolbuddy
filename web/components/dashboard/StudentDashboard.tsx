import Link from 'next/link';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { getEffectiveStatus } from '@/components/assignments/types';
import { getServerT } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';

function formatDue(dueAt: string | null): { label: string; status: 'danger' | 'warning' | 'info' } {
  if (!dueAt) return { label: 'No due date', status: 'info' };
  const due = new Date(dueAt);
  const now = new Date();
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { label: 'Overdue', status: 'danger' };
  if (diffDays < 1) return { label: 'Due today', status: 'warning' };
  if (diffDays < 2) return { label: 'Due tomorrow', status: 'warning' };
  return { label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), status: 'info' };
}

const STATUS_COLOR = { danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' } as const;

export default async function StudentDashboard({ name }: { name: string }) {
  const supabase = await createClient();
  const t = await getServerT();

  // RLS already scopes both queries to this student's own enrolled classes.
  interface ClassRow {
    id: string;
    name: string;
    period: string | null;
    room: string | null;
    subjects: { name: string } | null;
    class_groups: { name: string } | null;
  }
  const { data: classRows } = supabase
    ? await supabase.from('classes').select('id, name, period, room, subjects(name), class_groups(name)').order('name')
    : { data: null };
  const classes = ((classRows ?? []) as unknown as ClassRow[]).map((row) => ({
    ...row,
    subjectName: row.subjects?.name ?? row.name,
    groupName: row.class_groups?.name ?? null,
  }));

  interface AssignmentRow {
    id: string;
    title: string;
    due_at: string | null;
    status: 'active' | 'ended' | 'cancelled';
    classes: { name: string } | null;
  }
  const { data: assignmentRows } = supabase
    ? await supabase
        .from('assignments')
        .select('id, title, due_at, status, classes(name)')
        .order('due_at', { ascending: true, nullsFirst: false })
    : { data: [] };
  // Cancelled assignments are voided — don't count them as overdue/upcoming.
  const assignments = ((assignmentRows ?? []) as unknown as AssignmentRow[]).filter((a) => getEffectiveStatus(a) !== 'cancelled');

  const now = new Date();
  const dueSoonCount = (assignments ?? []).filter((a) => {
    if (!a.due_at) return false;
    const diffDays = (new Date(a.due_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays < 7;
  }).length;
  const overdueCount = (assignments ?? []).filter((a) => a.due_at && new Date(a.due_at).getTime() < now.getTime()).length;

  const stats = [
    { label: t('dashboard.statEnrolledClasses'), value: String(classes?.length ?? 0) },
    { label: t('dashboard.statDueThisWeek'), value: String(dueSoonCount) },
    { label: t('dashboard.statOverdue'), value: String(overdueCount) },
    { label: t('dashboard.statTotalAssignments'), value: String(assignments?.length ?? 0) },
  ];

  const upcoming = (assignments ?? []).slice(0, 4);
  const classCount = classes?.length ?? 0;

  return (
    <>
      <DashboardBanner
        eyebrow={t('dashboard.welcomeBack')}
        name={name}
        summary={classCount > 0 ? t('dashboard.enrolledSummary', { count: String(classCount) }) : t('dashboard.enrolledClassesWillShowUp')}
        actions={
          <Link href="/assignments" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
            {t('dashboard.viewAssignments')}
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, i) => {
          const tile = TILE_PALETTE[i % TILE_PALETTE.length];
          return (
            <div key={stat.label} className={`rounded-xl ${tile.bg} p-4`}>
              <p className={`text-2xl font-bold ${tile.text}`}>{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">{t('dashboard.myClasses')}</h2>
      <div className="space-y-2">
        {(classes ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('dashboard.noClassesYetStudent')}</p>}
        {(classes ?? []).map((classItem, i) => {
          const tile = TILE_PALETTE[i % TILE_PALETTE.length];
          return (
            <div key={classItem.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tile.bg} ${tile.text}`}>
                  {classItem.subjectName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{classItem.subjectName}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{[classItem.groupName, classItem.period].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">{classItem.room}</p>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">{t('dashboard.upcomingAssignments')}</h2>
      <div className="space-y-2">
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground">{t('dashboard.noAssignmentsYet')}</p>}
        {upcoming.map((assignment) => {
          const due = formatDue(assignment.due_at);
          return (
            <div key={assignment.id} className="flex items-center gap-3 rounded-xl border border-border bg-card shadow-sm p-4">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLOR[due.status]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{assignment.title}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{assignment.classes?.name}</p>
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">{due.label}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}

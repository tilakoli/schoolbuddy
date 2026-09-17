import Link from 'next/link';
import { getEffectiveStatus } from '@/components/assignments/types';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { fetchTeacherClassGroups } from '@/lib/classGroups';
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

export default async function TeacherDashboard({ name, userId }: { name: string; userId: string }) {
  const supabase = await createClient();

  const classes = supabase ? await fetchTeacherClassGroups(supabase, userId) : [];

  const { data: subjectRow } = supabase
    ? await supabase.from('subjects').select('name').eq('teacher_id', userId).maybeSingle()
    : { data: null };

  const { data: offeringRows } = supabase
    ? await supabase.from('classes').select('id').eq('teacher_id', userId)
    : { data: null };
  const classIds = (offeringRows ?? []).map((c) => c.id);
  const studentCount = classes.reduce((sum, c) => sum + c.studentCount, 0);

  interface AssignmentRow {
    id: string;
    title: string;
    due_at: string | null;
    status: 'active' | 'ended' | 'cancelled';
    classes: { name: string } | null;
  }
  const { data: assignmentRows } = supabase && classIds.length
    ? await supabase
        .from('assignments')
        .select('id, title, due_at, status, classes(name)')
        .in('class_id', classIds)
        .order('due_at', { ascending: true, nullsFirst: false })
    : { data: [] };
  // Cancelled assignments are voided — don't count them as due/overdue.
  const assignments = ((assignmentRows ?? []) as unknown as AssignmentRow[]).filter((a) => getEffectiveStatus(a) !== 'cancelled');

  const now = new Date();
  const dueSoonCount = (assignments ?? []).filter((a) => {
    if (!a.due_at) return false;
    const diffDays = (new Date(a.due_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays < 7;
  }).length;

  const stats = [
    { label: 'Classes', value: String(classes?.length ?? 0) },
    { label: 'Students', value: String(studentCount) },
    { label: 'Due this week', value: String(dueSoonCount) },
    { label: 'Total assignments', value: String(assignments?.length ?? 0) },
  ];

  const upcoming = (assignments ?? []).slice(0, 4);
  const classCount = classes?.length ?? 0;

  return (
    <>
      <DashboardBanner
        eyebrow="Welcome back"
        name={name}
        subtitle={subjectRow?.name ? `${subjectRow.name} teacher` : undefined}
        summary={
          classCount > 0
            ? `Teaching ${studentCount} student${studentCount === 1 ? '' : 's'} across ${classCount} class${classCount === 1 ? '' : 'es'}.`
            : 'Your classes will show up here once admin assigns your subject to one.'
        }
        actions={
          <>
            <Link href="/classes" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
              View classes
            </Link>
            <Link href="/assignments" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-primary-foreground">
              View assignments
            </Link>
          </>
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

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">Your classes</h2>
      <div className="space-y-2">
        {(classes ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No classes yet — admin will assign your subject to one.</p>
        )}
        {classes.map((classItem, i) => {
          const tile = TILE_PALETTE[i % TILE_PALETTE.length];
          return (
            <Link
              key={classItem.id}
              href={classItem.offeringId ? `/classes/${classItem.id}/subjects/${classItem.offeringId}` : `/classes/${classItem.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tile.bg} ${tile.text}`}>
                  {classItem.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{classItem.name}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">{classItem.studentCount} students</p>
            </Link>
          );
        })}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">Upcoming assignments</h2>
      <div className="space-y-2">
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
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

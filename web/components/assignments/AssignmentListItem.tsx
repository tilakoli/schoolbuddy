import Link from 'next/link';
import { getEffectiveStatus, STATUS_BADGE_CLASS, STATUS_LABEL, type AssignmentRow } from './types';

function formatDue(dueAt: string | null) {
  if (!dueAt) return 'No due date';
  return new Date(dueAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AssignmentListItem({ assignment, className }: { assignment: AssignmentRow; className?: string }) {
  const status = getEffectiveStatus(assignment);
  return (
    <Link
      href={`/assignments/${assignment.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{assignment.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {className ? `${className} · ` : ''}
          <span className="capitalize">{assignment.assessment_type}</span> · <span className="capitalize">{assignment.difficulty}</span>
          {assignment.questions && assignment.questions.length > 0 ? ` · ${assignment.questions.length} questions` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status !== 'active' && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
        )}
        <p className="text-sm text-muted-foreground">{formatDue(assignment.due_at)}</p>
      </div>
    </Link>
  );
}

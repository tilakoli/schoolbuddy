import type { AssignmentRow } from './types';

function formatDue(dueAt: string | null) {
  if (!dueAt) return 'No due date';
  return new Date(dueAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AssignmentListItem({ assignment, className }: { assignment: AssignmentRow; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4">
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{assignment.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {className ? `${className} · ` : ''}
          <span className="capitalize">{assignment.assessment_type}</span> · <span className="capitalize">{assignment.difficulty}</span>
        </p>
      </div>
      <p className="shrink-0 text-sm text-muted-foreground">{formatDue(assignment.due_at)}</p>
    </div>
  );
}

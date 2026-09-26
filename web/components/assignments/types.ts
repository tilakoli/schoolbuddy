// Compatibility export: domain rules are shared with the native app.
export * from '@shared/domain/assignments';
import type { AssignmentStatus } from '@shared/domain/assignments';

export const STATUS_BADGE_CLASS: Record<AssignmentStatus, string> = {
  active: 'bg-success/10 text-success',
  ended: 'bg-secondary text-muted-foreground',
  cancelled: 'bg-danger/10 text-danger',
};

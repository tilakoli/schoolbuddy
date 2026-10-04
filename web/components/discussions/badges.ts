import type { Curiosity, DiscussionStatus, DiscussionThreadStatus, Readiness } from '@shared/domain/discussions';

export const READINESS_BADGE_CLASS: Record<Readiness, string> = {
  needs_support: 'bg-danger/10 text-danger',
  developing: 'bg-warning/10 text-warning',
  on_track: 'bg-primary-light text-primary',
  strong: 'bg-success/10 text-success',
};

export const CURIOSITY_BADGE_CLASS: Record<Curiosity, string> = {
  low: 'bg-secondary text-muted-foreground',
  moderate: 'bg-primary-light text-primary',
  high: 'bg-success/10 text-success',
};

export const DISCUSSION_STATUS_LABEL_KEY: Record<DiscussionStatus, string> = {
  draft: 'discussions.statusDraft',
  published: 'discussions.statusPublished',
  ended: 'discussions.statusEnded',
  cancelled: 'discussions.statusCancelled',
};

export const DISCUSSION_STATUS_BADGE_CLASS: Record<DiscussionStatus, string> = {
  draft: 'bg-secondary text-muted-foreground',
  published: 'bg-success/10 text-success',
  ended: 'bg-secondary text-muted-foreground',
  cancelled: 'bg-danger/10 text-danger',
};

export const THREAD_STATUS_LABEL_KEY: Record<DiscussionThreadStatus | 'not_started', string> = {
  not_started: 'discussions.threadNotStarted',
  in_progress: 'discussions.threadInProgress',
  submitted: 'discussions.threadSubmitted',
};

export const THREAD_STATUS_BADGE_CLASS: Record<DiscussionThreadStatus | 'not_started', string> = {
  not_started: 'bg-secondary text-muted-foreground',
  in_progress: 'bg-warning/10 text-warning',
  submitted: 'bg-success/10 text-success',
};

export type DiscussionStatus = 'draft' | 'published' | 'ended' | 'cancelled';
export type DiscussionTargetType = 'class' | 'students';
export type DiscussionThreadStatus = 'in_progress' | 'submitted';
export type Readiness = 'needs_support' | 'developing' | 'on_track' | 'strong';
export type Curiosity = 'low' | 'moderate' | 'high';

export interface DiscussionLink {
  label: string;
  url: string;
}

export interface Discussion {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  chapter: string | null;
  instructions: string | null;
  source_material_ids: string[];
  links: DiscussionLink[];
  target_type: DiscussionTargetType;
  status: DiscussionStatus;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

// A discussion left 'published' still auto-reads as 'ended' once its due
// date passes — same two-layer pattern as assignments'
// getEffectiveStatus() (shared/domain/assignments.ts). A teacher can also
// set 'ended'/'cancelled' directly regardless of due_at.
export function getEffectiveDiscussionStatus(discussion: Pick<Discussion, 'status' | 'due_at'>, now = Date.now()): DiscussionStatus {
  if (discussion.status !== 'published') return discussion.status;
  if (discussion.due_at && new Date(discussion.due_at).getTime() <= now) return 'ended';
  return 'published';
}

export interface DiscussionReport {
  readiness: Readiness;
  curiosity: Curiosity;
  durationMinutes: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  generatedAt: string;
}

// Teacher-facing — includes the AI report.
export interface DiscussionThread {
  id: string;
  discussion_id: string;
  student_id: string;
  status: DiscussionThreadStatus;
  started_at: string;
  submitted_at: string | null;
  report: DiscussionReport | null;
}

// Student-facing (from get_my_discussion_thread()) — report is structurally
// absent, not just null, so there is nothing to accidentally leak.
export interface MyDiscussionThread {
  id: string;
  discussion_id: string;
  student_id: string;
  status: DiscussionThreadStatus;
  started_at: string;
  submitted_at: string | null;
}

export interface DiscussionMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
}

// Values are i18n keys (lib/i18n), not literal text — render with t(READINESS_LABEL[readiness]).
export const READINESS_LABEL: Record<Readiness, string> = {
  needs_support: 'discussions.readinessNeedsSupport',
  developing: 'discussions.readinessDeveloping',
  on_track: 'discussions.readinessOnTrack',
  strong: 'discussions.readinessStrong',
};

export const CURIOSITY_LABEL: Record<Curiosity, string> = {
  low: 'discussions.curiosityLow',
  moderate: 'discussions.curiosityModerate',
  high: 'discussions.curiosityHigh',
};

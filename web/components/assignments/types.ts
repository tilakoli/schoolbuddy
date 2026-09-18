export type AssessmentType = 'homework' | 'test' | 'discussion' | 'revision';
export type Difficulty = 'easy' | 'medium' | 'expert';
export type AssignmentStatus = 'active' | 'ended' | 'cancelled';

export interface AssignmentQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface RubricCriterion {
  id: string;
  criterion: string;
  max_points: number;
}

export interface AssignmentRow {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  assessment_type: AssessmentType;
  difficulty: Difficulty;
  due_at: string | null;
  questions?: AssignmentQuestion[] | null;
  pass_score?: number | null;
  rubric?: RubricCriterion[] | null;
  status: AssignmentStatus;
}

// Values are i18n keys (lib/i18n), not literal text — render with t(STATUS_LABEL[status]).
export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  active: 'assignment.statusActive',
  ended: 'assignment.statusEnded',
  cancelled: 'assignment.statusCancelled',
};

export const STATUS_BADGE_CLASS: Record<AssignmentStatus, string> = {
  active: 'bg-success/10 text-success',
  ended: 'bg-secondary text-muted-foreground',
  cancelled: 'bg-danger/10 text-danger',
};

// An assignment left 'active' still auto-reads as 'ended' once its due date
// passes — no background job needed, just computed wherever status matters
// (submission blocking, badges, grade-visibility gating). A teacher can
// still override this explicitly (end early, or reopen — see AssignmentDetail).
export function getEffectiveStatus(assignment: Pick<AssignmentRow, 'status' | 'due_at'>): AssignmentStatus {
  if (assignment.status !== 'active') return assignment.status;
  if (assignment.due_at && new Date(assignment.due_at) < new Date()) return 'ended';
  return 'active';
}

export type SubmissionStatus = 'submitted' | 'graded';

export interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  answers: { id: string; selected_index: number }[] | { text: string } | null;
  score: number | null;
  max_score: number | null;
  passed: boolean | null;
  status: SubmissionStatus;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  rubric_scores?: { id: string; points: number }[] | null;
}

// label is an i18n key here too — render with t(type.label).
export const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: 'homework', label: 'assignment.homework' },
  { value: 'test', label: 'assignment.test' },
  { value: 'discussion', label: 'assignment.discussion' },
  { value: 'revision', label: 'assignment.revision' },
];

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'assignment.easy' },
  { value: 'medium', label: 'assignment.medium' },
  { value: 'expert', label: 'assignment.expert' },
];

// Starting point shown to a teacher when generating a test — editable per
// generation, not persisted anywhere, so it's fine to hardcode.
export const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  easy:
    'Focus on recall and basic understanding — straightforward, single-step questions using terminology and concepts directly from the material. Avoid multi-step reasoning, trick questions, or edge cases.',
  medium:
    'Require applying concepts, not just recalling them — questions may involve short multi-step reasoning, comparing ideas, or applying a concept from the material to a simple new example.',
  expert:
    'Require deeper reasoning — multi-step problems, synthesis of multiple concepts from the material, and application to less obvious or novel scenarios. Avoid pure recall questions.',
};

// Teacher-only (lives in assignment_answer_keys, never sent to students).
export interface AnswerKeyEntry {
  id: string;
  correct_index: number;
  explanation: string;
}

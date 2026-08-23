export type AssessmentType = 'homework' | 'test' | 'discussion' | 'revision';
export type Difficulty = 'easy' | 'medium' | 'expert';

export interface AssignmentRow {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  assessment_type: AssessmentType;
  difficulty: Difficulty;
  due_at: string | null;
}

export const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: 'homework', label: 'Homework' },
  { value: 'test', label: 'Test' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'revision', label: 'Revision' },
];

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'expert', label: 'Expert' },
];

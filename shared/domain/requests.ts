export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export interface SubmitAssignmentRequest {
  assignmentId: string;
  answers: { id: string; selected_index: number }[] | { text: string };
}
export function isSubmissionRequest(value: unknown): value is SubmitAssignmentRequest {
  if (!isRecord(value) || !isUuid(value.assignmentId)) return false;
  const answers = value.answers;
  if (Array.isArray(answers)) {
    return answers.length > 0 && answers.length <= 200 &&
      answers.every((answer) => isRecord(answer) && typeof answer.id === 'string' && answer.id.length > 0 &&
        Number.isInteger(answer.selected_index) && (answer.selected_index as number) >= 0) &&
      new Set(answers.map((answer) => answer.id)).size === answers.length;
  }
  return isRecord(answers) && typeof answers.text === 'string' &&
    answers.text.trim().length > 0 && answers.text.length <= 20000;
}

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; text: string }[];
  sessionId?: string | null;
  language?: string;
  attachments?: { name: string; mimeType: string; data: string }[];
  // A guided lesson's curriculum scope — a student's own enrolled class
  // offering, and optionally one of its teacher-published chapters. When
  // present, evidence retrieval skips free-text search and deterministically
  // uses this class/chapter's materials instead (see chat_school_context).
  classId?: string | null;
  chapter?: string | null;
}
export function isChatRequest(value: unknown): value is ChatRequest {
  if (!isRecord(value) || !Array.isArray(value.messages) || !value.messages.length || value.messages.length > 60) return false;
  if (value.sessionId != null && !isUuid(value.sessionId)) return false;
  if (value.language !== undefined && !['en', 'hi', 'te'].includes(value.language as string)) return false;
  if (value.classId != null && !isUuid(value.classId)) return false;
  if (value.chapter != null && (typeof value.chapter !== 'string' || value.chapter.length > 160)) return false;
  const attachments = value.attachments;
  if (attachments !== undefined && (!Array.isArray(attachments) || attachments.length > 3 ||
      !attachments.every((file) => isRecord(file) && typeof file.name === 'string' && file.name.length > 0 && file.name.length <= 180 &&
        typeof file.mimeType === 'string' && ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'].includes(file.mimeType) &&
        typeof file.data === 'string' && file.data.length > 0 && file.data.length <= 14_000_000 && /^[A-Za-z0-9+/=]+$/.test(file.data)) ||
      attachments.reduce((size, file) => size + ((file as { data: string }).data.length), 0) > 14_000_000)) return false;
  return value.messages.every((m) => isRecord(m) && ['user', 'assistant'].includes(m.role as string) &&
    typeof m.text === 'string' && m.text.trim().length > 0 && m.text.length <= 20000) &&
    value.messages.reduce((size, m) => size + m.text.length, 0) <= 100000 &&
    value.messages[value.messages.length - 1].role === 'user';
}

export interface DiscussionMessageRequest {
  text: string;
  language?: string;
}
export function isDiscussionMessageRequest(value: unknown): value is DiscussionMessageRequest {
  if (!isRecord(value) || typeof value.text !== 'string' || !value.text.trim().length || value.text.length > 20000) return false;
  if (value.language !== undefined && !['en', 'hi', 'te'].includes(value.language as string)) return false;
  return true;
}

export function isMaterialPath(path: string, classId: string, materialId: string): boolean {
  const parts = path.split('/');
  return parts.length === 3 && parts[0] === classId && parts[1] === materialId &&
    parts[2].length > 0 && parts[2] !== '.' && parts[2] !== '..' && !path.includes('\\');
}

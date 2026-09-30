// Hands a draft message (or a past session to reopen) from the student
// dashboard's Lessons landing over to the full /ai-chat page, without
// duplicating AI Chat's own send/session logic there. In-memory only — a
// client-side Next.js navigation keeps this module's state alive, and a
// File object can't survive serialization anyway (so this can't be
// localStorage/sessionStorage). A hard refresh on /ai-chat just falls
// through to its normal last-session restore, which is fine.
export interface ChatDraft {
  text: string;
  files: File[];
}

export interface ChatHandoff {
  draft?: ChatDraft;
  openSessionId?: string;
}

let pending: ChatHandoff | null = null;

export function setChatHandoff(payload: ChatHandoff) {
  pending = payload;
}

export function takeChatHandoff(): ChatHandoff | null {
  const value = pending;
  pending = null;
  return value;
}

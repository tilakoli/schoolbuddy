/** Evidence is assembled by the server, never accepted from client/model URLs. */
export interface ChatSource {
  id: string;
  kind: 'records' | 'material' | 'attachment';
  label: string;
  href: string;
  excerpt: string;
}
export interface ChatGrounding {
  basis: 'school' | 'mixed' | 'general' | 'insufficient';
  sources: ChatSource[];
  retrievedAt: string;
  limitations: string[];
}
export const CHAT_TOPICS = ['teachers', 'students', 'classes', 'subjects', 'assignments', 'materials'] as const;
export type ChatTopic = typeof CHAT_TOPICS[number];

export function parseChatPlan(value: unknown): { topics: ChatTopic[]; search: string } {
  const v = value as Record<string, unknown> | null;
  if (!v || !Array.isArray(v.topics) || !v.topics.every((t) => CHAT_TOPICS.includes(t as ChatTopic)) ||
      typeof v.search !== 'string' || v.search.length > 200) throw new Error('Invalid retrieval plan.');
  return { topics: [...new Set(v.topics)] as ChatTopic[], search: v.search };
}

export function resolveChatAnswer(value: unknown, available: ChatSource[], retrievedAt: string, limitations: string[], fallback: string) {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v.reply !== 'string' || !v.reply.trim() || v.reply.length > 20000 ||
      !Array.isArray(v.sourceIds) || !v.sourceIds.every((id) => typeof id === 'string') ||
      typeof v.usesGeneralKnowledge !== 'boolean' || typeof v.insufficientEvidence !== 'boolean') {
    throw new Error('Invalid assistant response.');
  }
  const ids = new Set(v.sourceIds);
  const sources = available.filter((source) => ids.has(source.id));
  const unknownCitation = v.sourceIds.some((id) => !available.some((source) => source.id === id));
  // Reject claimed school answers with no evidence rather than inventing provenance.
  const unsupported = unknownCitation || (!v.usesGeneralKnowledge && !v.insufficientEvidence && sources.length === 0);
  const basis: ChatGrounding['basis'] = unsupported || v.insufficientEvidence ? 'insufficient'
    : sources.length ? (v.usesGeneralKnowledge ? 'mixed' : 'school') : 'general';
  return {
    reply: unsupported ? fallback : v.reply,
    grounding: { basis, sources: unsupported ? [] : sources, retrievedAt, limitations } satisfies ChatGrounding,
  };
}

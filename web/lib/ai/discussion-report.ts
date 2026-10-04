import type { Curiosity, DiscussionMessage, Readiness } from '@shared/domain/discussions';
import { generateJson } from './gemini';

interface RawReport {
  readiness: Readiness;
  curiosity: Curiosity;
  summary: string;
  strengths: string[];
  gaps: string[];
}

// First qualitative-analysis AI call in this codebase — grading elsewhere is
// either deterministic (MCQ) or fully manual (rubric). Calls generateJson()
// the exact same way answerSchoolChat already does; no new AI-calling
// pattern. durationMinutes is intentionally NOT produced here — it's an
// objective elapsed-time value the caller computes and merges in separately.
export async function generateDiscussionReport(messages: DiscussionMessage[]): Promise<RawReport> {
  const transcript = messages.map((message) => `${message.role === 'user' ? 'Student' : 'AI'}: ${message.text}`).join('\n\n');

  const system = `You are assessing a student's understanding from a discussion transcript, for the student's teacher only — the student will never see this. Judge only what's evidenced in the conversation; never fabricate beyond it, and never penalize the student for the AI's own conversational style or question choices.
readiness: how ready the student seems for a formal assessment on this topic — "needs_support" (significant gaps or confusion), "developing" (partial understanding, several gaps), "on_track" (solid grasp with minor gaps), or "strong" (confident, accurate, thorough).
curiosity: their engagement level — "low" (minimal effort, one-word answers, no questions), "moderate" (participated reasonably), or "high" (asked follow-up questions, explored beyond the minimum, pushed back or probed).
summary: 2-3 sentences describing what the student demonstrated.
strengths: short bullet points of what the student got right or explained well. Empty array if none.
gaps: short bullet points of misconceptions or missing understanding. Empty array if none.`;

  return (await generateJson(
    system,
    [{ role: 'user', parts: [{ text: transcript }] }],
    {
      type: 'OBJECT',
      properties: {
        readiness: { type: 'STRING', enum: ['needs_support', 'developing', 'on_track', 'strong'] },
        curiosity: { type: 'STRING', enum: ['low', 'moderate', 'high'] },
        summary: { type: 'STRING' },
        strengths: { type: 'ARRAY', items: { type: 'STRING' } },
        gaps: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['readiness', 'curiosity', 'summary', 'strengths', 'gaps'],
    },
  )) as RawReport;
}

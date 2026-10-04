import { generateJson } from './gemini';

interface MaterialEvidence {
  title: string;
  chapter: string | null;
  extracted_text: string | null;
}

// The optional "Draft with AI" assist on the discussion creation form —
// teacher picks materials, this drafts a starting-point instructions
// paragraph they review/edit before publishing. Never auto-published itself.
export async function draftDiscussionInstructions(materials: MaterialEvidence[], chapter: string | null, language: string) {
  const evidence = materials
    .map((material) => `## ${material.title}${material.chapter ? ` (${material.chapter})` : ''}\n${(material.extracted_text ?? '').slice(0, 3000)}`)
    .join('\n\n');
  const languageLabel = language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English';
  const system = `Draft short instructions (2-4 sentences) in ${languageLabel} for a student-facing discussion a teacher is about to push as refresher/prep work before a formal assessment. The instructions should set the discussion's focus and invite the student to explain concepts in their own words, not just answer closed questions. Base them only on the material below.${chapter ? ` Chapter: ${chapter}.` : ''}
MATERIAL:
${evidence || 'No material text available — write general discussion instructions for this chapter/title alone.'}`;

  const value = (await generateJson(
    system,
    [{ role: 'user', parts: [{ text: 'Draft the instructions.' }] }],
    { type: 'OBJECT', properties: { instructions: { type: 'STRING' } }, required: ['instructions'] },
  )) as { instructions?: string };
  return value.instructions ?? '';
}

import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { authenticateRequest } from '@/lib/supabase/request';
import { isRecord, isUuid } from '@shared/domain/requests';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface GeneratedRubricCriterion {
  criterion: string;
  max_points: number;
}

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi', te: 'Telugu' };

function buildMcqPrompt(materials: { title: string; extracted_text: string }[], questionCount: number, guidance: string, language?: string) {
  const source = materials.map((m) => `### ${m.title}\n${m.extracted_text}`).join('\n\n');
  const languageName = LANGUAGE_NAMES[language ?? 'en'] ?? 'English';
  return (
    `You are writing a multiple-choice test for students, based only on the class material below. ` +
    `Write exactly ${questionCount} questions. Each question must have exactly 4 options with exactly one correct answer, ` +
    `plus a short one-sentence explanation of why that answer is correct (for the teacher's own review — students never see it). ` +
    `Do not invent facts outside the material. Also write a short test title and one-sentence description. ` +
    `Write the title, description, every question, its options, and its explanation in ${languageName} — translate any material excerpts you reference into ${languageName} too, rather than quoting the source language.\n\n` +
    `Difficulty guidance (follow this closely — it may include instructions from the teacher, not just a difficulty label):\n${guidance}\n\n` +
    `Respond with only a JSON object of this shape: ` +
    `{"title": string, "description": string, "questions": [{"prompt": string, "options": [string, string, string, string], "correct_index": number, "explanation": string}]}.\n\n` +
    `--- MATERIAL ---\n${source}`
  );
}

function buildFreeformPrompt(
  materials: { title: string; extracted_text: string; chapter: string | null }[],
  guidance: string,
  language?: string,
  classGroupName?: string | null
) {
  const source = materials
    .map((m) => `### ${m.title}${m.chapter ? ` (Chapter: ${m.chapter})` : ''}\n${m.extracted_text}`)
    .join('\n\n');
  const languageName = LANGUAGE_NAMES[language ?? 'en'] ?? 'English';
  const gradeContext = classGroupName ? ` for ${classGroupName}` : '';
  return (
    `You are writing a freeform, manually-graded assignment${gradeContext}, based only on the class material below — ` +
    `freeform meaning there's no single right answer to auto-check, not that it must be an essay. ` +
    `Pick whichever written-response format a teacher of this subject and chapter would actually assign: ` +
    `for mathematics or other problem-based material, that means a numbered set of 3 to 6 separate, self-contained ` +
    `problems in the style of real textbook chapter exercises — each one solvable entirely on its own. ` +
    `Do not chain problems together (never write something like "using your answer from problem 1" or build one ` +
    `problem's setup out of a previous problem's result) — each problem must stand alone. ` +
    `Pitch the problems at the grade level given above and scope them to the specific chapter the material is from, ` +
    `not generic concepts from the wider subject. ` +
    `For a subject like literature, history, or civics, a short-answer or essay response is usually the right fit instead — ` +
    `use your judgment on which shape actually matches this material. ` +
    `Write the title as a short chapter/topic label, and the description as either the numbered problems or the essay prompt. ` +
    `Then propose a grading rubric: if it's a problem set, one criterion per problem; otherwise 3 to 5 criteria covering ` +
    `distinct aspects of the response — each with a point value, where the point values sum to a clean total such as 10, 20, or 25. ` +
    `Do not invent facts outside the material. ` +
    `Write the title, description, and every rubric criterion in ${languageName} — translate any material excerpts you reference into ${languageName} too, rather than quoting the source language.\n\n` +
    `Difficulty guidance (follow this closely — it may include instructions from the teacher, not just a difficulty label):\n${guidance}\n\n` +
    `Respond with only a JSON object of this shape: ` +
    `{"title": string, "description": string, "rubric": [{"criterion": string, "max_points": number}]}.\n\n` +
    `--- MATERIAL ---\n${source}`
  );
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (auth.profile.role !== 'teacher') return NextResponse.json({ error: 'Teachers only.' }, { status: 403 });
  const { user, supabase } = auth;
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isUuid(body.classId) || !Array.isArray(body.materialIds) ||
      !body.materialIds.length || body.materialIds.length > 20 || !body.materialIds.every(isUuid) ||
      (body.guidance !== undefined && (typeof body.guidance !== 'string' || body.guidance.length > 5000)) ||
      (body.difficulty !== undefined && typeof body.difficulty !== 'string') ||
      (body.language !== undefined && typeof body.language !== 'string') ||
      (body.questionCount !== undefined && (typeof body.questionCount !== 'number' || !Number.isInteger(body.questionCount)))) {
    return NextResponse.json({ error: 'Invalid generation request.' }, { status: 400 });
  }
  const { classId, materialIds } = body;
  const mode = body.mode === 'freeform' ? 'freeform' : 'mcq';
  const questionCount = Math.min(Math.max((body.questionCount as number | undefined) ?? 5, 1), 20);
  const difficulty = body.difficulty ?? 'medium';
  const guidance = ((body.guidance as string | undefined) ?? '').trim() || `Write ${mode === 'mcq' ? 'questions' : 'this assignment'} at a ${difficulty} difficulty level.`;

  if (!classId || !materialIds || materialIds.length === 0) {
    return NextResponse.json({ error: 'Pick at least one material to generate from.' }, { status: 400 });
  }
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'AI generation is not configured yet — ask an admin to set GEMINI_API_KEY.' }, { status: 500 });
  }

  const rate = await checkAiRateLimit(user.id, 'assignments-generate');
  if (!rate.ok) {
    return NextResponse.json({ error: 'Too many generation requests — wait a bit and try again.' }, { status: 429 });
  }

  // The caller is a teacher; material reads are scoped by ownership RLS.
  const { data: materials } = await supabase
    .from('materials')
    .select('title, extracted_text, chapter')
    .in('id', materialIds)
    .eq('class_id', classId)
    .eq('status', 'extracted');

  const usable = (materials ?? []).filter(
    (m): m is { title: string; extracted_text: string; chapter: string | null } => !!m.extracted_text
  );
  if (usable.length === 0) {
    return NextResponse.json({ error: 'None of the selected materials have extracted text yet.' }, { status: 400 });
  }

  let classGroupName: string | null = null;
  if (mode === 'freeform') {
    // Same RLS-respecting select pattern already used elsewhere (e.g.
    // app/(app)/assignments/[id]/page.tsx) — no separate ownership check
    // needed, same as the materials query above.
    const { data: classRow } = await supabase.from('classes').select('class_groups(name)').eq('id', classId).single();
    classGroupName = (classRow as unknown as { class_groups: { name: string } | null } | null)?.class_groups?.name ?? null;
  }

  const prompt =
    mode === 'mcq'
      ? buildMcqPrompt(usable, questionCount, guidance, body.language as string | undefined)
      : buildFreeformPrompt(usable, guidance, body.language as string | undefined, classGroupName);

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) throw new Error(data.error?.message || 'Gemini request failed.');

    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    if (mode === 'freeform') {
      const parsed = JSON.parse(raw) as { title?: string; description?: string; rubric?: GeneratedRubricCriterion[] };
      const rubric = (parsed.rubric ?? [])
        .filter((c) => typeof c.criterion === 'string' && c.criterion.trim().length > 0 && c.max_points > 0)
        .map((c) => ({ criterion: c.criterion.trim(), max_points: c.max_points }));
      if (rubric.length === 0) throw new Error('Gemini did not return a usable rubric.');

      return NextResponse.json({
        title: parsed.title || 'Generated assignment',
        description: parsed.description || '',
        rubric,
      });
    }

    const parsed = JSON.parse(raw) as { title?: string; description?: string; questions?: GeneratedQuestion[] };
    if (!parsed.questions || parsed.questions.length === 0) throw new Error('Gemini did not return any questions.');

    const questions = parsed.questions
      .filter((q) => Array.isArray(q.options) && q.options.length === 4 && q.correct_index >= 0 && q.correct_index < 4)
      .map((q, i) => ({ id: `q${i + 1}`, prompt: q.prompt, options: q.options, correct_index: q.correct_index, explanation: q.explanation || '' }));
    if (questions.length === 0) throw new Error('Gemini did not return any usable questions.');

    return NextResponse.json({
      title: parsed.title || 'Generated test',
      description: parsed.description || '',
      questions,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Generation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

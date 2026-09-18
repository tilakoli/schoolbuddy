import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { createClient } from '@/lib/supabase/server';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi', te: 'Telugu' };

function buildPrompt(materials: { title: string; extracted_text: string }[], questionCount: number, guidance: string, language?: string) {
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

export async function POST(request: Request) {
  const body = (await request.json()) as {
    classId?: string;
    materialIds?: string[];
    questionCount?: number;
    difficulty?: string;
    guidance?: string;
    language?: string;
  };
  const { classId, materialIds } = body;
  const questionCount = Math.min(Math.max(body.questionCount ?? 5, 1), 20);
  const difficulty = body.difficulty ?? 'medium';
  const guidance = (body.guidance ?? '').trim() || `Write questions at a ${difficulty} difficulty level.`;

  if (!classId || !materialIds || materialIds.length === 0) {
    return NextResponse.json({ error: 'Pick at least one material to generate from.' }, { status: 400 });
  }
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'AI generation is not configured yet — ask an admin to set GEMINI_API_KEY.' }, { status: 500 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const rate = await checkAiRateLimit(user.id, 'assignments-generate');
  if (!rate.ok) {
    return NextResponse.json({ error: 'Too many generation requests — wait a bit and try again.' }, { status: 429 });
  }

  // The cookie-based client respects RLS ("Teachers manage materials for own
  // classes"), so this select alone confirms the caller owns the class the
  // materials belong to — no separate ownership check needed.
  const { data: materials } = await supabase
    .from('materials')
    .select('title, extracted_text')
    .in('id', materialIds)
    .eq('class_id', classId)
    .eq('status', 'extracted');

  const usable = (materials ?? []).filter((m): m is { title: string; extracted_text: string } => !!m.extracted_text);
  if (usable.length === 0) {
    return NextResponse.json({ error: 'None of the selected materials have extracted text yet.' }, { status: 400 });
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(usable, questionCount, guidance, body.language) }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) throw new Error(data.error?.message || 'Gemini request failed.');

    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
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

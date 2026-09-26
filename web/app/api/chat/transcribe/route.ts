import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { generateJson } from '@/lib/ai/gemini';
import { authenticateRequest } from '@/lib/supabase/request';

const AUDIO_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']);

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const rate = await checkAiRateLimit(auth.user.id, 'voice-transcription');
  if (!rate.ok) return NextResponse.json({ error: 'Too many voice requests. Wait a moment and try again.' }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get('audio');
  const language = form?.get('language');
  if (!(audio instanceof File) || !AUDIO_TYPES.has(audio.type) || audio.size === 0 || audio.size > 8 * 1024 * 1024 ||
      (language !== 'en' && language !== 'hi' && language !== 'te')) {
    return NextResponse.json({ error: 'Invalid audio recording.' }, { status: 400 });
  }

  try {
    const value = await generateJson(
      `Transcribe this school-assistant voice message accurately. The expected language is ${language}. Preserve names and educational terms. Return only the spoken words, without commentary.`,
      [{ role: 'user', parts: [
        { inline_data: { mime_type: audio.type, data: Buffer.from(await audio.arrayBuffer()).toString('base64') } },
        { text: 'Transcribe the attached voice message.' },
      ] }],
      { type: 'OBJECT', properties: { transcript: { type: 'STRING' } }, required: ['transcript'] },
    ) as { transcript?: unknown };
    if (typeof value.transcript !== 'string' || !value.transcript.trim() || value.transcript.length > 20000) throw new Error('Invalid transcript.');
    return NextResponse.json({ transcript: value.transcript.trim() });
  } catch {
    return NextResponse.json({ error: 'The recording could not be transcribed. Try again in a quieter place.' }, { status: 502 });
  }
}

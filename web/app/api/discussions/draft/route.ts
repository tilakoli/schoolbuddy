import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { draftDiscussionInstructions } from '@/lib/ai/discussion-draft';
import { authenticateRequest } from '@/lib/supabase/request';
import { isRecord, isUuid } from '@shared/domain/requests';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (auth.profile.role !== 'teacher') return NextResponse.json({ error: 'Only teachers can draft discussion instructions.' }, { status: 403 });

  const { user, supabase } = auth;
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isUuid(body.classId) || !Array.isArray(body.materialIds) || body.materialIds.length > 20 ||
      !body.materialIds.every(isUuid) ||
      (body.chapter !== undefined && body.chapter !== null && typeof body.chapter !== 'string') ||
      (body.language !== undefined && typeof body.language !== 'string')) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Confirms the teacher owns this class before pulling its materials' extracted text into a prompt.
  const { data: classRow } = await supabase.from('classes').select('id').eq('id', body.classId).eq('teacher_id', user.id).maybeSingle();
  if (!classRow) return NextResponse.json({ error: 'Class not found.' }, { status: 404 });

  const rate = await checkAiRateLimit(user.id, 'discussion-draft');
  if (!rate.ok) {
    return NextResponse.json({ error: `You're generating too quickly — wait a few minutes and try again.` }, { status: 429 });
  }

  const { data: materials } = body.materialIds.length
    ? await supabase.from('materials').select('title, chapter, extracted_text')
        .in('id', body.materialIds).eq('class_id', body.classId).eq('status', 'extracted')
    : { data: [] };

  try {
    const instructions = await draftDiscussionInstructions(materials ?? [], (body.chapter as string | null | undefined) ?? null, (body.language as string | undefined) ?? 'en');
    return NextResponse.json({ instructions });
  } catch (error) {
    console.error('Discussion draft failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Unable to draft instructions right now. Please try again.' }, { status: 503 });
  }
}

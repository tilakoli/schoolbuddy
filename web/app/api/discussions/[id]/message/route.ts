import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { answerDiscussionChat } from '@/lib/ai/discussion-chat';
import { createAdminClient } from '@/lib/supabase/admin';
import { authenticateRequest } from '@/lib/supabase/request';
import { getEffectiveDiscussionStatus, type Discussion, type DiscussionMessage } from '@shared/domain/discussions';
import { isDiscussionMessageRequest } from '@shared/domain/requests';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: discussionId } = await params;
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (auth.profile.role !== 'student') return NextResponse.json({ error: 'Only students can take part in a discussion.' }, { status: 403 });

  const { user, supabase } = auth;
  const body: unknown = await request.json().catch(() => null);
  if (!isDiscussionMessageRequest(body)) return NextResponse.json({ error: 'Invalid message.' }, { status: 400 });

  // RLS ("Students view published discussions targeted to them") already
  // covers both "not published" and "not a target" — an empty result here
  // means the student simply cannot see this discussion.
  const { data: discussion, error: discussionError } = await supabase
    .from('discussions')
    .select('id, title, chapter, instructions, source_material_ids, links, status, due_at')
    .eq('id', discussionId)
    .single();
  if (discussionError || !discussion) return NextResponse.json({ error: 'Discussion not found.' }, { status: 404 });
  if (getEffectiveDiscussionStatus(discussion) !== 'published') {
    return NextResponse.json({ error: 'This discussion has ended — your teacher is no longer accepting new messages.' }, { status: 409 });
  }

  const rate = await checkAiRateLimit(user.id, 'discussion-chat');
  if (!rate.ok) {
    return NextResponse.json({ error: `You're sending messages too quickly — wait a few minutes and try again.` }, { status: 429 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  let thread = (
    await admin.from('discussion_threads').select('id, status').eq('discussion_id', discussionId).eq('student_id', user.id).maybeSingle()
  ).data;
  if (thread?.status === 'submitted') {
    return NextResponse.json({ error: 'This discussion has already been submitted.' }, { status: 409 });
  }
  if (!thread) {
    const { data: created, error: createError } = await admin
      .from('discussion_threads')
      .insert({ discussion_id: discussionId, student_id: user.id })
      .select('id, status')
      .single();
    if (createError || !created) return NextResponse.json({ error: 'Could not start this discussion.' }, { status: 500 });
    thread = created;
  }

  const { data: priorMessages } = await admin
    .from('discussion_messages')
    .select('id, thread_id, role, text, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });

  let reply: string;
  try {
    const result = await answerDiscussionChat(
      supabase,
      discussion as Discussion,
      (priorMessages ?? []) as DiscussionMessage[],
      body.text,
      body.language ?? 'en',
    );
    reply = result.reply;
  } catch (error) {
    console.error('Discussion chat failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Unable to answer right now. The AI service may be unavailable.' }, { status: 503 });
  }

  const { error: saveError } = await admin.from('discussion_messages').insert([
    { thread_id: thread.id, role: 'user', text: body.text },
    { thread_id: thread.id, role: 'assistant', text: reply },
  ]);
  if (saveError) console.error('Discussion message save failed:', saveError.code);

  return NextResponse.json({ reply, threadId: thread.id });
}

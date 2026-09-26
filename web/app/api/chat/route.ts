import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { createAdminClient } from '@/lib/supabase/admin';
import { authenticateRequest } from '@/lib/supabase/request';
import { answerSchoolChat } from '@/lib/ai/grounded-chat';
import { isChatRequest } from '@shared/domain/requests';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { user, supabase } = auth;
  const body: unknown = await request.json().catch(() => null);
  if (!isChatRequest(body)) return NextResponse.json({ error: 'Invalid or oversized conversation.' }, { status: 400 });
  const { messages, sessionId } = body;
  if (sessionId) {
    const { data: session, error } = await supabase.from('ai_chat_sessions')
      .select('id').eq('id', sessionId).eq('user_id', user.id).single();
    if (error || !session) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
  }

  const rate = await checkAiRateLimit(user.id, 'chat');
  if (!rate.ok) {
    return NextResponse.json(
      { error: `You're sending messages too quickly — wait a few minutes and try again.` },
      { status: 429 }
    );
  }

  let answer: Awaited<ReturnType<typeof answerSchoolChat>>;
  try {
    answer = await answerSchoolChat(supabase, auth.profile.role, body);
  } catch (error) {
    console.error('School chat failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Unable to answer right now. School sources or the AI service may be unavailable.' }, { status: 503 });
  }
  const { reply, grounding } = answer;
  let historySaved = false;
  let assistantMessageId: string | undefined;

  // Persist this turn — the client still resends the full history to
  // Gemini each call (unchanged above), but only the newest user message
  // plus this reply need writing, since every earlier turn was already
  // saved on a prior call. Best-effort: a persistence failure shouldn't
  // fail a reply the user already has.
  let resolvedSessionId = sessionId;
  const admin = createAdminClient();
  if (admin) {
    try {
      if (!resolvedSessionId) {
        const firstUserText = messages.find((m) => m.role === 'user')?.text ?? 'New chat';
        const title = firstUserText.length > 40 ? `${firstUserText.slice(0, 40)}…` : firstUserText;
        const { data: session } = await admin.from('ai_chat_sessions').insert({ user_id: user.id, title }).select('id').single();
        resolvedSessionId = session?.id;
      } else {
        await admin.from('ai_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', resolvedSessionId).eq('user_id', user.id);
      }

      if (resolvedSessionId) {
        const newestUserMessage = messages[messages.length - 1];
        const { data: savedMessages, error: saveError } = await admin.from('ai_chat_messages').insert([
          { session_id: resolvedSessionId, user_id: user.id, role: 'user', text: newestUserMessage.text },
          { session_id: resolvedSessionId, user_id: user.id, role: 'assistant', text: reply, grounding },
        ]).select('id, role');
        historySaved = !saveError;
        assistantMessageId = savedMessages?.find((message) => message.role === 'assistant')?.id;
        if (saveError) console.error('Chat history save failed:', saveError.code);
      }
    } catch {
      // Swallow — the chat reply itself already succeeded.
    }
  }

  return NextResponse.json({ reply, grounding, historySaved, sessionId: resolvedSessionId, assistantMessageId });
}

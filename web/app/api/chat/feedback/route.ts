import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authenticateRequest } from '@/lib/supabase/request';

const REASONS = ['incorrect', 'missing_sources', 'not_helpful', 'unsafe'] as const;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const value = body as { messageId?: unknown; feedback?: unknown; reason?: unknown } | null;
  if (!value || typeof value.messageId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.messageId) ||
      (value.feedback !== 1 && value.feedback !== -1) ||
      (value.reason != null && (typeof value.reason !== 'string' || !REASONS.includes(value.reason as typeof REASONS[number]))) ||
      (value.feedback === 1 && value.reason != null)) {
    return NextResponse.json({ error: 'Invalid feedback.' }, { status: 400 });
  }

  const { data: message } = await auth.supabase
    .from('ai_chat_messages')
    .select('id, role')
    .eq('id', value.messageId)
    .eq('role', 'assistant')
    .maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Feedback service is unavailable.' }, { status: 503 });
  const { error } = await admin.from('ai_chat_messages').update({
    feedback: value.feedback,
    feedback_reason: value.feedback === -1 ? value.reason ?? null : null,
    feedback_at: new Date().toISOString(),
  }).eq('id', value.messageId).eq('user_id', auth.user.id).eq('role', 'assistant');

  if (error) return NextResponse.json({ error: 'Unable to save feedback.' }, { status: 500 });
  return NextResponse.json({ saved: true });
}

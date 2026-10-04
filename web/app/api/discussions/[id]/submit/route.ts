import { NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/aiRateLimit';
import { generateDiscussionReport } from '@/lib/ai/discussion-report';
import { createAdminClient } from '@/lib/supabase/admin';
import { authenticateRequest } from '@/lib/supabase/request';
import type { DiscussionMessage, DiscussionReport } from '@shared/domain/discussions';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: discussionId } = await params;
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (auth.profile.role !== 'student') return NextResponse.json({ error: 'Only students can submit a discussion.' }, { status: 403 });

  const { user } = auth;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  const { data: thread, error: threadError } = await admin
    .from('discussion_threads')
    .select('id, status, started_at')
    .eq('discussion_id', discussionId)
    .eq('student_id', user.id)
    .maybeSingle();
  if (threadError || !thread) return NextResponse.json({ error: 'Nothing to submit yet — send a message first.' }, { status: 404 });

  // Idempotent — a retry/double-click just confirms, rather than re-running
  // (and re-billing) the analysis.
  if (thread.status === 'submitted') return NextResponse.json({ submitted: true });

  const { data: messages } = await admin
    .from('discussion_messages')
    .select('id, thread_id, role, text, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });
  const transcript = (messages ?? []) as DiscussionMessage[];
  if (!transcript.some((message) => message.role === 'user')) {
    return NextResponse.json({ error: 'Nothing to submit yet — send a message first.' }, { status: 400 });
  }

  const rate = await checkAiRateLimit(user.id, 'discussion-report');
  if (!rate.ok) {
    return NextResponse.json({ error: `You're submitting too quickly — wait a few minutes and try again.` }, { status: 429 });
  }

  let report: DiscussionReport;
  try {
    const raw = await generateDiscussionReport(transcript);
    const durationMinutes = Math.max(1, Math.round((Date.now() - new Date(thread.started_at).getTime()) / 60000));
    report = { ...raw, durationMinutes, generatedAt: new Date().toISOString() };
  } catch (error) {
    console.error('Discussion report generation failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Unable to submit right now. Please try again.' }, { status: 503 });
  }

  const { error: updateError } = await admin
    .from('discussion_threads')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), report })
    .eq('id', thread.id);
  if (updateError) {
    console.error('Discussion thread submit failed:', updateError.code);
    return NextResponse.json({ error: 'Could not submit this discussion. Please try again.' }, { status: 500 });
  }

  // The student never receives report content — it's teacher-only.
  return NextResponse.json({ submitted: true });
}

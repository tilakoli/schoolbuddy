import { NextResponse } from 'next/server';
import { isSubmissionRequest } from '@shared/domain/requests';
import { authenticateRequest } from '@/lib/supabase/request';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (auth.profile.role !== 'student') return NextResponse.json({ error: 'Only students can submit.' }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!isSubmissionRequest(body)) return NextResponse.json({ error: 'Invalid assignment or answers.' }, { status: 400 });
  // The database validates direct callers too, checks closure under a lock and
  // scores against the private answer key. No service-role bypass here.
  const { data, error } = await auth.supabase.rpc('submit_assignment', {
    p_assignment_id: body.assignmentId,
    p_answers: body.answers,
  }).single();
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === '23505' ? 409 : error.code === '22023' ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? 'Could not save submission.' : error.message }, { status });
  }
  return NextResponse.json(data);
}

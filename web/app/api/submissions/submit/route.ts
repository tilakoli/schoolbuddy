import { NextResponse } from 'next/server';
import { getEffectiveStatus } from '@/components/assignments/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

interface McqAnswer {
  id: string;
  selected_index: number;
}

export async function POST(request: Request) {
  const { assignmentId, answers } = (await request.json()) as { assignmentId?: string; answers?: unknown };
  if (!assignmentId) return NextResponse.json({ error: 'assignmentId is required.' }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  // RLS ("Students view assignments in enrolled classes") means this only
  // returns a row if the caller is actually enrolled in this assignment's class.
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
  if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });

  const status = getEffectiveStatus(assignment);
  if (status !== 'active') {
    return NextResponse.json(
      { error: status === 'cancelled' ? 'This assignment was cancelled.' : 'This assignment is no longer accepting submissions.' },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'You already submitted this assignment.' }, { status: 400 });

  const questions = assignment.questions as { id: string; prompt: string; options: string[] }[] | null;

  if (questions && questions.length > 0) {
    // MCQ — grade server-side against the answer key, which students have no
    // RLS access to at all, so this comparison can only happen here.
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

    const { data: key } = await admin.from('assignment_answer_keys').select('answers').eq('assignment_id', assignmentId).single();
    if (!key) return NextResponse.json({ error: 'Answer key missing for this test.' }, { status: 500 });

    const correctByQuestion = new Map((key.answers as { id: string; correct_index: number }[]).map((a) => [a.id, a.correct_index]));
    const submitted = (Array.isArray(answers) ? answers : []) as McqAnswer[];
    const score = submitted.filter((a) => correctByQuestion.get(a.id) === a.selected_index).length;
    const maxScore = questions.length;
    const passed = assignment.pass_score != null ? score >= assignment.pass_score : null;

    const { data: submission, error } = await admin
      .from('submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        answers: submitted,
        score,
        max_score: maxScore,
        passed,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error || !submission) return NextResponse.json({ error: error?.message || 'Could not save submission.' }, { status: 500 });
    return NextResponse.json(submission);
  }

  // Freeform — no grading yet, plain RLS-respecting insert.
  const text = typeof (answers as { text?: string } | null)?.text === 'string' ? (answers as { text: string }).text : '';
  const { data: submission, error } = await supabase
    .from('submissions')
    .insert({
      assignment_id: assignmentId,
      student_id: user.id,
      answers: { text },
      status: 'submitted',
    })
    .select('*')
    .single();
  if (error || !submission) return NextResponse.json({ error: error?.message || 'Could not save submission.' }, { status: 500 });
  return NextResponse.json(submission);
}

import { isRecord } from '@shared/domain/requests';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/require-admin';

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { email, password, full_name, role, subjectName } = body;

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password || typeof full_name !== 'string' || !full_name.trim() || (role !== 'teacher' && role !== 'student')) {
    return NextResponse.json({ error: 'email, password, full_name, and role (teacher/student) are required.' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    app_metadata: { role, school_id: auth.schoolId },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Optional onboarding shortcut: a subject has exactly one teacher
  // (0012_subject_teacher.sql), so admin/VP can set the new teacher up with
  // their subject right away instead of the teacher having to create it
  // themselves after logging in. Uses the service-role client since the
  // subjects RLS insert policy requires teacher_id = auth.uid() of the
  // creator, which wouldn't be true here (the admin is acting on someone
  // else's behalf). Non-fatal if it fails — the account is already created.
  if (role === 'teacher' && typeof subjectName === 'string' && subjectName.trim()) {
    const { error: subjectError } = await supabaseAdmin.from('subjects').insert({
      school_id: auth.schoolId,
      name: subjectName.trim(),
      teacher_id: data.user.id,
    });
    if (subjectError) {
      return NextResponse.json({ id: data.user.id, subjectWarning: subjectError.message });
    }
  }

  return NextResponse.json({ id: data.user.id });
}

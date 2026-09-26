import { isRecord, isUuid } from '@shared/domain/requests';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/require-admin';

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { userId, password } = body;
  if (!isUuid(userId) || typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'userId and password are required.' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const { data: target, error: targetError } = await supabaseAdmin
    .from('profiles').select('role, school_id').eq('id', userId).single();
  if (targetError || !target || target.school_id !== auth.schoolId ||
      (target.role !== 'teacher' && target.role !== 'student')) {
    return NextResponse.json({ error: 'Only teacher/student accounts in your school can be managed here.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

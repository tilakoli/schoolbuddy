import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/require-admin';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, password } = await request.json();
  if (!userId || !password) {
    return NextResponse.json({ error: 'userId and password are required.' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  if (auth.role === 'vice_principal') {
    const { data: target } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
    if (target?.role === 'admin') {
      return NextResponse.json({ error: 'Vice principals cannot manage admin accounts.' }, { status: 403 });
    }
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

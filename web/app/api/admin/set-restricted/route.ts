import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/require-admin';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, restricted } = await request.json();
  if (!userId || typeof restricted !== 'boolean') {
    return NextResponse.json({ error: 'userId and restricted (boolean) are required.' }, { status: 400 });
  }
  if (userId === auth.user.id) {
    return NextResponse.json({ error: 'You cannot restrict your own account.' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: restricted ? '876000h' : 'none',
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { error: profileError } = await supabaseAdmin.from('profiles').update({ restricted }).eq('id', userId);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

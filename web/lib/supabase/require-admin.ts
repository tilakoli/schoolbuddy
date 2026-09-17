import { createClient } from '@/lib/supabase/server';

// "Staff" access — admin or vice_principal. Routes that must stay
// admin-only (none currently) should check auth.role === 'admin' themselves
// after calling this.
export async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) return { error: 'Supabase is not configured.', status: 500 } as const;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.', status: 401 } as const;

  const { data: profile } = await supabase.from('profiles').select('role, school_id').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'vice_principal') {
    return { error: 'Forbidden.', status: 403 } as const;
  }

  return { user, role: profile.role as 'admin' | 'vice_principal', schoolId: profile.school_id } as const;
}

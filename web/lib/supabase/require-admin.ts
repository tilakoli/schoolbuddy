import { authenticateRequest } from '@/lib/supabase/request';

export async function requireAdmin(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return { error: 'Unauthorized.', status: 401 } as const;
  if (auth.profile.role !== 'admin' && auth.profile.role !== 'vice_principal') {
    return { error: 'Forbidden.', status: 403 } as const;
  }
  return { user: auth.user, role: auth.profile.role as 'admin' | 'vice_principal', schoolId: auth.profile.school_id } as const;
}

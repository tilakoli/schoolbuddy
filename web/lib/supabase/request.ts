import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from './server';

// Invalid authorization headers never fall back to an unrelated cookie session.
export async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('authorization');
  let supabase;
  let token: string | undefined;
  if (authorization !== null) {
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!match || !url || !key) return null;
    token = match[1];
    supabase = createSupabaseClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } else {
    supabase = await createClient();
  }
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role, school_id, restricted').eq('id', user.id).single();
  if (profileError || !profile || profile.restricted) return null;
  return { user, profile, supabase };
}

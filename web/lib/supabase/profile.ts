import { createClient } from '@/lib/supabase/server';

export type { Role, Profile } from '@shared/domain/profile';
import type { Profile } from '@shared/domain/profile';

export async function getUserAndProfile() {
  const supabase = await createClient();
  if (!supabase) return { user: null, profile: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { user, profile: profile as Profile | null };
}

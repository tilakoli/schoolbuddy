import { supabase } from '@/lib/supabase';

export type { Role, Profile } from '@/shared/domain/profile';
import type { Profile } from '@/shared/domain/profile';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return data as Profile;
}

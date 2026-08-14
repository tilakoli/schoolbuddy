import { supabase } from '@/lib/supabase';

export type Role = 'admin' | 'teacher' | 'student';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return data as Profile;
}

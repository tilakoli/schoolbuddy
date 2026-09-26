import { createAdminClient } from '@/lib/supabase/admin';

// Chat is naturally higher-frequency (one call per message); extraction and
// generation each do a much more expensive multimodal/long-context call, so
// they get a tighter cap over a longer window.
const LIMITS = {
  chat: { max: 20, windowMinutes: 5 },
  'voice-transcription': { max: 20, windowMinutes: 10 },
  'materials-extract': { max: 10, windowMinutes: 60 },
  'assignments-generate': { max: 10, windowMinutes: 60 },
} as const;

export type AiRoute = keyof typeof LIMITS;

export async function checkAiRateLimit(
  userId: string,
  route: AiRoute
): Promise<{ ok: true } | { ok: false; retryAfterMinutes: number }> {
  const admin = createAdminClient();
  // Fail open if Supabase isn't configured — the route's own "not
  // configured" checks already cover that case with a clearer message.
  if (!admin) return { ok: true };

  const { max, windowMinutes } = LIMITS[route];
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count } = await admin
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('route', route)
    .gte('created_at', since);

  if ((count ?? 0) >= max) {
    return { ok: false, retryAfterMinutes: windowMinutes };
  }

  await admin.from('ai_requests').insert({ user_id: userId, route });
  return { ok: true };
}

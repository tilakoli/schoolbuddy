import AiChat from '@/components/AiChat';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { redirect } from 'next/navigation';

export default async function AiChatPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect('/login');
  return <AiChat role={profile.role} userId={user.id} />;
}

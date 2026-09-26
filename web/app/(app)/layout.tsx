import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getUserAndProfile } from '@/lib/supabase/profile';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect('/login');

  if (!profile) return <div className="flex min-h-screen w-full">{children}</div>;

  return <AppShell role={profile.role} name={user.user_metadata?.full_name || user.email?.split('@')[0] || 'School member'}>{children}</AppShell>;
}

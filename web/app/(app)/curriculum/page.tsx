import { redirect } from 'next/navigation';
import ComingSoon from '@/components/ComingSoon';
import { getUserAndProfile } from '@/lib/supabase/profile';

export default async function CurriculumPage() {
  const { profile } = await getUserAndProfile();
  if (profile?.role !== 'teacher') redirect('/dashboard');

  return <ComingSoon title="Curriculum" description="Upload and manage learning materials here — not built yet." />;
}

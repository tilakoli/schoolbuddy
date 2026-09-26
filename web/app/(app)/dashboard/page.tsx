import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import TeacherDashboard from '@/components/dashboard/TeacherDashboard';
import { getUserAndProfile } from '@/lib/supabase/profile';

export default async function DashboardPage() {
  const { user, profile } = await getUserAndProfile();
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      {(profile?.role === 'admin' || profile?.role === 'vice_principal') && <AdminDashboard name={name} />}
      {profile?.role === 'teacher' && <TeacherDashboard name={name} userId={user!.id} />}
      {(!profile || profile.role === 'student') && <StudentDashboard name={name} />}
    </main>
  );
}

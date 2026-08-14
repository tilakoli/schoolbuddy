import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import TeacherDashboard from '@/components/dashboard/TeacherDashboard';
import { getUserAndProfile } from '@/lib/supabase/profile';

export default async function DashboardPage() {
  const { user, profile } = await getUserAndProfile();
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      {profile?.role === 'admin' && <AdminDashboard name={name} />}
      {profile?.role === 'teacher' && <TeacherDashboard name={name} />}
      {(!profile || profile.role === 'student') && <StudentDashboard name={name} />}
    </main>
  );
}

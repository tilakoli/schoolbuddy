import { ActivityIndicator, View } from 'react-native';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import TeacherDashboard from '@/components/dashboard/TeacherDashboard';
import Screen from '@/components/shared/Screen';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen() {
  const { session, user, profile } = useAuthStore();
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  if (session && !profile) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {profile?.role === 'admin' && <AdminDashboard name={name} />}
      {profile?.role === 'teacher' && user && <TeacherDashboard name={name} userId={user.id} />}
      {(!profile || profile.role === 'student') && <StudentDashboard name={name} />}
    </Screen>
  );
}

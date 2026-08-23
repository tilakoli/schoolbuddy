import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import Button from '@/components/shared/Button';
import Screen from '@/components/shared/Screen';
import { APP_CONFIG } from '@/constants/config';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
};

export default function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Unable to sign out', getErrorMessage(error));
      return;
    }
    router.replace('/auth/login');
  };

  return (
    <Screen>
      <Text style={{ color: Colors.foreground, fontSize: 32, fontWeight: '700' }}>Settings</Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.md, marginTop: 6 }}>
        Manage your account.
      </Text>

      <View
        style={{
          backgroundColor: Colors.card,
          borderColor: Colors.border,
          borderWidth: 1,
          borderRadius: BorderRadius.lg,
          padding: Spacing.md,
          marginTop: Spacing.xl,
        }}
      >
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.xs }}>SIGNED IN AS</Text>
        <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600', marginTop: 5 }}>
          {user?.email}
        </Text>
        {profile && (
          <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 3 }}>
            {ROLE_LABEL[profile.role]}
          </Text>
        )}
      </View>

      <View style={{ flex: 1 }} />
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.xs, textAlign: 'center', marginBottom: Spacing.md }}>
        {APP_CONFIG.name} · v1.0.0
      </Text>
      <Button label="Sign out" variant="outline" onPress={signOut} />
    </Screen>
  );
}

import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function ProtectedLayout() {
  const { session, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

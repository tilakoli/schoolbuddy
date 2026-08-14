import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { APP_CONFIG } from '@/constants/config';
import { Colors, FontSize } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { session, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Colors.background,
          gap: 14,
        }}
      >
        <ActivityIndicator color={Colors.primary} />
        <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }}>
          {APP_CONFIG.name}
        </Text>
      </View>
    );
  }

  if (session) return <Redirect href="/(app)" />;
  return <Redirect href="/auth/login" />;
}

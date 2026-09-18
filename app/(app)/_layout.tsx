import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
}

export default function ProtectedLayout() {
  const { session, initialized, profile } = useAuthStore();
  const { t } = useLanguageStore();

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;

  const role = profile?.role;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mutedForeground,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.dashboard'), tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{ title: t('nav.aiChat'), tabBarIcon: ({ color }) => <TabIcon glyph="💬" color={color} /> }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: t('nav.classes'),
          href: role === 'teacher' ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon glyph="📚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: t('nav.students'),
          href: role === 'teacher' ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon glyph="🧑‍🎓" color={color} />,
        }}
      />
      <Tabs.Screen
        name="subjects"
        options={{
          title: t('nav.subjects'),
          href: role === 'student' ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon glyph="📖" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: t('nav.assignments'),
          href: role === 'teacher' || role === 'student' ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon glyph="📝" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('nav.settings'), tabBarIcon: ({ color }) => <TabIcon glyph="⚙" color={color} /> }}
      />
    </Tabs>
  );
}

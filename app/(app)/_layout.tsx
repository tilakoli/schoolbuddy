import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import ChatWidget from '@/components/ChatWidget';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
}

export default function ProtectedLayout() {
  const { session, initialized, profile } = useAuthStore();

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
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mutedForeground,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          href: role === 'teacher' ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon glyph="📚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          href: role === 'teacher' ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon glyph="🧑‍🎓" color={color} />,
        }}
      />
      <Tabs.Screen
        name="subjects"
        options={{
          title: 'Subjects',
          href: role === 'student' ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon glyph="📖" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          href: role === 'teacher' || role === 'student' ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon glyph="📝" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon glyph="⚙" color={color} /> }}
      />
    </Tabs>
    <ChatWidget />
    </View>
  );
}

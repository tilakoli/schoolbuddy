import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import Button from '@/components/shared/Button';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import Screen from '@/components/shared/Screen';
import { APP_CONFIG } from '@/constants/config';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';

export default function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const { t } = useLanguageStore();

  const roleLabel: Record<string, string> = {
    admin: t('settings.roleAdmin'),
    vice_principal: t('settings.roleVicePrincipal'),
    teacher: t('settings.roleTeacher'),
    student: t('settings.roleStudent'),
  };

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
    <Screen scroll>
      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: 30 }}>{t('settings.title')}</Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.md, marginTop: 6 }}>{t('settings.subtitle')}</Text>

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
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.xs }}>{t('settings.signedInAs')}</Text>
        <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600', marginTop: 5 }}>
          {user?.email}
        </Text>
        {profile && (
          <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 3 }}>
            {roleLabel[profile.role]}
          </Text>
        )}
      </View>

      <View
        style={{
          backgroundColor: Colors.card,
          borderColor: Colors.border,
          borderWidth: 1,
          borderRadius: BorderRadius.lg,
          padding: Spacing.md,
          marginTop: Spacing.md,
        }}
      >
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.xs, marginBottom: Spacing.sm }}>{t('settings.language')}</Text>
        <LanguageSwitcher />
      </View>

      <View style={{ marginTop: Spacing.xl }}>
        <Button label={t('common.signOut')} variant="outline" onPress={signOut} />
      </View>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.md }}>
        {APP_CONFIG.name} · v1.0.0
      </Text>
    </Screen>
  );
}

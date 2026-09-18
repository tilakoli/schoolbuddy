import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AuthScreen from '@/components/auth/AuthScreen';
import Button from '@/components/shared/Button';
import ConfigNotice from '@/components/shared/ConfigNotice';
import Input from '@/components/shared/Input';
import { APP_CONFIG } from '@/constants/config';
import { Colors, FontSize } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useLanguageStore } from '@/stores/languageStore';

export default function LoginScreen() {
  const { t } = useLanguageStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleLogin = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(undefined);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      router.replace('/(app)');
    } catch (cause) {
      setError(getErrorMessage(cause, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow={t('auth.welcomeBackEyebrow')}
      title={t('auth.signInTitle', { name: APP_CONFIG.name })}
      description={t('auth.signInSubtitle')}
    >
      {!isSupabaseConfigured && <ConfigNotice />}
      <Input
        label={t('auth.email')}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label={t('auth.password')}
        placeholder="Enter your password"
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
        error={error}
      />
      <TouchableOpacity
        onPress={() => router.push('/auth/forgot-password')}
        style={{ alignSelf: 'flex-end', marginBottom: 20 }}
      >
        <Text style={{ color: Colors.primary, fontSize: FontSize.sm }}>{t('auth.forgotPassword')}</Text>
      </TouchableOpacity>
      <Button
        label={loading ? t('auth.signingIn') : t('auth.signIn')}
        onPress={handleLogin}
        variant="accent"
        loading={loading}
        disabled={!isSupabaseConfigured || !email.trim() || !password}
      />
    </AuthScreen>
  );
}

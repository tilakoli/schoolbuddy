import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AuthScreen from '@/components/auth/AuthScreen';
import Button from '@/components/shared/Button';
import ConfigNotice from '@/components/shared/ConfigNotice';
import Input from '@/components/shared/Input';
import { Colors, FontSize } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useLanguageStore } from '@/stores/languageStore';

export default function ForgotPasswordScreen() {
  const { t } = useLanguageStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const handleReset = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(undefined);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      setMessage(t('auth.resetSuccessMessage'));
    } catch (cause) {
      setError(getErrorMessage(cause, 'Unable to send reset instructions.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow={t('auth.accountRecoveryEyebrow')}
      title={t('auth.resetTitle')}
      description={t('auth.resetSubtitle')}
      footer={
        <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center' }}>
          <Text style={{ color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
            {t('auth.backToSignIn')}
          </Text>
        </TouchableOpacity>
      }
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
        error={error}
      />
      {message ? (
        <Text style={{ color: Colors.success, fontSize: FontSize.sm, lineHeight: 20, marginBottom: 16 }}>
          {message}
        </Text>
      ) : null}
      <Button
        label={loading ? t('auth.sending') : t('auth.sendReset')}
        onPress={handleReset}
        variant="accent"
        loading={loading}
        disabled={!isSupabaseConfigured || !email.trim()}
      />
    </AuthScreen>
  );
}

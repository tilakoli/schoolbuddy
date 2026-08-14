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

export default function ForgotPasswordScreen() {
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
      setMessage('Password reset instructions have been sent if an account exists for that email.');
    } catch (cause) {
      setError(getErrorMessage(cause, 'Unable to send reset instructions.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password."
      description="Enter your email and we’ll send you recovery instructions."
      footer={
        <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center' }}>
          <Text style={{ color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
            Back to sign in
          </Text>
        </TouchableOpacity>
      }
    >
      {!isSupabaseConfigured && <ConfigNotice />}
      <Input
        label="Email"
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
        label="Send reset instructions"
        onPress={handleReset}
        loading={loading}
        disabled={!isSupabaseConfigured || !email.trim()}
      />
    </AuthScreen>
  );
}

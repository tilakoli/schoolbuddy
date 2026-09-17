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

export default function LoginScreen() {
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
      eyebrow="WELCOME BACK"
      title="Sign in to School Buddy."
      description="Use the email and password your school administrator gave you."
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
      />
      <Input
        label="Password"
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
        <Text style={{ color: Colors.primary, fontSize: FontSize.sm }}>Forgot password?</Text>
      </TouchableOpacity>
      <Button
        label="Sign in"
        onPress={handleLogin}
        variant="accent"
        loading={loading}
        disabled={!isSupabaseConfigured || !email.trim() || !password}
      />
    </AuthScreen>
  );
}

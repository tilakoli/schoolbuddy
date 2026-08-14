import '../global.css';
import { useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { fetchProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const { setSession, setProfile, setInitialized } = useAuthStore();

  useEffect(() => {
    if (!supabase) {
      setInitialized(true);
      return;
    }

    const bootstrapTimeout = setTimeout(() => setInitialized(true), 2000);

    const applySession = async (session: Session | null) => {
      setSession(session);
      setProfile(session ? await fetchProfile(session.user.id) : null);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .finally(() => {
        clearTimeout(bootstrapTimeout);
        setInitialized(true);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
      setInitialized(true);
    });

    return () => {
      clearTimeout(bootstrapTimeout);
      data.subscription.unsubscribe();
    };
  }, [setInitialized, setProfile, setSession]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
    </>
  );
}

import '../global.css';
import { useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Lora_500Medium, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { NunitoSans_400Regular, NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans';
import { Colors } from '@/constants/theme';
import { fetchProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { setSession, setProfile, setInitialized } = useAuthStore();
  const [fontsLoaded] = useFonts({
    Lora_500Medium,
    Lora_600SemiBold,
    NunitoSans_400Regular,
    NunitoSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

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

  if (!fontsLoaded) return null;

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

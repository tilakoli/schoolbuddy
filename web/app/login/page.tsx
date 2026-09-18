'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfigNotice from '@/components/ConfigNotice';
import { useLanguage } from '@/components/LanguageProvider';
import { APP_CONFIG } from '@/constants/config';
import { getErrorMessage } from '@/lib/errors';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    setError(undefined);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      router.push('/dashboard');
      router.refresh();
    } catch (cause) {
      setError(getErrorMessage(cause, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="px-6 py-5">
        <Link href="/" className="font-heading text-lg font-semibold text-foreground">
          {APP_CONFIG.name}
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="animate-fade-up w-full max-w-sm">
          <p className="text-xs font-bold tracking-[0.15em] text-primary">{t('auth.welcomeBackEyebrow')}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{t('auth.signInTitle', { name: APP_CONFIG.name })}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>

          {!isSupabaseConfigured && (
            <div className="mt-6">
              <ConfigNotice />
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card shadow-sm px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card shadow-sm px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={!isSupabaseConfigured || !email.trim() || !password || loading}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

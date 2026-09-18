'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import ConfigNotice from '@/components/ConfigNotice';
import { useLanguage } from '@/components/LanguageProvider';
import { APP_CONFIG } from '@/constants/config';
import { getErrorMessage } from '@/lib/errors';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
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
    <>
      <header className="px-6 py-5">
        <Link href="/" className="font-heading text-lg font-semibold text-foreground">
          {APP_CONFIG.name}
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="animate-fade-up w-full max-w-sm">
          <p className="text-xs font-bold tracking-[0.15em] text-primary">{t('auth.accountRecoveryEyebrow')}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{t('auth.resetTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('auth.resetSubtitle')}</p>

          {!isSupabaseConfigured && (
            <div className="mt-6">
              <ConfigNotice />
            </div>
          )}

          <form onSubmit={handleReset} className="mt-8 space-y-4">
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
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </div>

            {message && <p className="text-sm text-success">{message}</p>}

            <button
              type="submit"
              disabled={!isSupabaseConfigured || !email.trim() || loading}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {loading ? t('auth.sending') : t('auth.sendReset')}
            </button>

            <Link href="/login" className="block text-center text-sm font-semibold text-primary">
              {t('auth.backToSignIn')}
            </Link>
          </form>
        </div>
      </main>
    </>
  );
}

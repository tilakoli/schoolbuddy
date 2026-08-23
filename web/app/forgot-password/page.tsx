'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import ConfigNotice from '@/components/ConfigNotice';
import { getErrorMessage } from '@/lib/errors';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
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
      setMessage('Password reset instructions have been sent if an account exists for that email.');
    } catch (cause) {
      setError(getErrorMessage(cause, 'Unable to send reset instructions.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-xs font-bold tracking-[0.15em] text-primary">ACCOUNT RECOVERY</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Reset your password.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you recovery instructions.
        </p>

        {!isSupabaseConfigured && (
          <div className="mt-6">
            <ConfigNotice />
          </div>
        )}

        <form onSubmit={handleReset} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email
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
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send reset instructions'}
          </button>

          <Link href="/login" className="block text-center text-sm font-semibold text-primary">
            Back to sign in
          </Link>
        </form>
      </div>
    </main>
  );
}

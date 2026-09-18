'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const signOut = async () => {
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setLoading(false);
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <div>
      <button
        onClick={signOut}
        disabled={loading}
        className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
      >
        {loading ? t('common.signingOut') : t('common.signOut')}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

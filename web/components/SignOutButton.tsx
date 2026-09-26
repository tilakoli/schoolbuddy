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
        className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        {loading ? t('common.signingOut') : t('common.signOut')}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

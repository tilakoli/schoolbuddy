'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGUAGE_COOKIE, translate, type Language } from '@/lib/i18n';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// `initialLanguage` comes from the root layout (a server component reading
// the cookie), so the first client render already matches what the server
// rendered — no flash of English before switching.
export function LanguageProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage: Language }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    document.cookie = `${LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Server components (dashboards, settings' own labels) read the cookie
    // directly, so they need a fresh render to pick up the new value.
    router.refresh();
  };

  const t = useMemo(() => (key: string, params?: Record<string, string>) => translate(language, key, params), [language]);

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

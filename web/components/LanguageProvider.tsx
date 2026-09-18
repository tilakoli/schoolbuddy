'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LANGUAGE_COOKIE, type Language } from '@/lib/i18n';

// The actual provider is next-intl's own `NextIntlClientProvider`, mounted
// in app/layout.tsx. This hook is kept as the stable call-site API every
// component already uses (`const { t, language, setLanguage } = useLanguage()`)
// so none of them needed to change when the engine underneath swapped from
// a hand-rolled dictionary lookup to next-intl.
export function useLanguage() {
  const router = useRouter();
  const language = useLocale() as Language;
  const t = useTranslations();

  const setLanguage = (next: Language) => {
    document.cookie = `${LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Server components (dashboards, settings' own labels) read the cookie
    // via i18n/request.ts, so they need a fresh render to pick up the new
    // value — next-intl's client messages refresh along with it.
    router.refresh();
  };

  return { language, setLanguage, t: (key: string, params?: Record<string, string>) => t(key, params) };
}

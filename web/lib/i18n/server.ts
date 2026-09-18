import { getLocale, getTranslations } from 'next-intl/server';
import type { Language } from './index';

// Locale resolution (reading the cookie, defaulting to 'en') now lives in
// ../../i18n/request.ts, the single source of truth next-intl itself reads
// from — this just exposes it under the pre-existing name.
export async function getServerLanguage(): Promise<Language> {
  return (await getLocale()) as Language;
}

// For a server component: `const t = await getServerT();` then `t('nav.dashboard')`.
// Kept as the stable call site API — internally this is next-intl's own
// getTranslations(), configured in ../../i18n/request.ts.
export async function getServerT() {
  const t = await getTranslations();
  return (key: string, params?: Record<string, string>) => t(key, params);
}

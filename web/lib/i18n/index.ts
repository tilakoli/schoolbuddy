// Message content itself now lives in ../../messages/{en,hi,te}.json, loaded
// by next-intl (see ../../i18n/request.ts) — this file only keeps the small
// bits that aren't next-intl's concern: the locale type, display labels for
// the language switcher, and the cookie used to persist the choice.
export type Language = 'en' | 'hi' | 'te';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  te: 'తెలుగు',
};

export const LANGUAGE_COOKIE = 'school-buddy-language';

export function isLanguage(value: string | undefined): value is Language {
  return value === 'en' || value === 'hi' || value === 'te';
}

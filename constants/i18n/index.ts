// Message content itself now lives in ./{en,hi,te}.json, loaded by i18next
// (see ../../lib/i18n.ts) — this file only keeps the small bits that aren't
// i18next's concern: the locale type and display labels for the switcher.
export type Language = 'en' | 'hi' | 'te';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  te: 'తెలుగు',
};

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/constants/i18n/en.json';
import hi from '@/constants/i18n/hi.json';
import te from '@/constants/i18n/te.json';
import type { Language } from '@/constants/i18n';

// `keySeparator: '.'` + `nsSeparator: false` keeps every call site using the
// same full-dotted-key convention as before (`t('assignment.newAssignment')`)
// instead of restructuring into i18next's own namespace system — this is
// what let the whole mobile app migrate to i18next with zero call-site
// changes (see stores/languageStore.ts, which wraps this).
i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    te: { translation: te },
  },
  lng: 'en',
  fallbackLng: 'en',
  keySeparator: '.',
  nsSeparator: false,
  interpolation: {
    escapeValue: false,
    // Dictionaries use single-brace `{param}` placeholders (matching
    // next-intl's ICU-compatible syntax on web) — i18next defaults to
    // `{{param}}`, so override the delimiters to match.
    prefix: '{',
    suffix: '}',
  },
  returnNull: false,
});

export function setI18nLanguage(language: Language) {
  return i18next.changeLanguage(language);
}

export default i18next;

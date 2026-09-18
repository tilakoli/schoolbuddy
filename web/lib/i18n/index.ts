import { en, type Dictionary } from './en';
import { hi } from './hi';
import { te } from './te';

export type Language = 'en' | 'hi' | 'te';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  te: 'తెలుగు',
};

export const DICTIONARIES: Record<Language, Dictionary> = { en, hi, te };

export const LANGUAGE_COOKIE = 'school-buddy-language';

function readPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), obj);
}

// Plain function, usable from both server and client code (the LanguageProvider
// context wraps this for client components; server components call it directly).
export function translate(language: Language, key: string, params?: Record<string, string>) {
  const raw = readPath(DICTIONARIES[language], key) ?? readPath(DICTIONARIES.en, key) ?? key;
  let text = typeof raw === 'string' ? raw : key;
  if (params) {
    for (const [param, value] of Object.entries(params)) text = text.replace(`{${param}}`, value);
  }
  return text;
}

export function isLanguage(value: string | undefined): value is Language {
  return value === 'en' || value === 'hi' || value === 'te';
}

export type { Dictionary };

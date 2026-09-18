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

function readPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), obj);
}

export function translate(language: Language, key: string, params?: Record<string, string>) {
  const raw = readPath(DICTIONARIES[language], key) ?? readPath(DICTIONARIES.en, key) ?? key;
  let text = typeof raw === 'string' ? raw : key;
  if (params) {
    for (const [param, value] of Object.entries(params)) text = text.replace(`{${param}}`, value);
  }
  return text;
}

export type { Dictionary };

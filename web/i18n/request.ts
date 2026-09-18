import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { isLanguage, LANGUAGE_COOKIE, type Language } from '@/lib/i18n';
import enMessages from '../messages/en.json';

const loaders: Record<Language, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('../messages/en.json'),
  hi: () => import('../messages/hi.json'),
  te: () => import('../messages/te.json'),
};

function readPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), obj);
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const value = store.get(LANGUAGE_COOKIE)?.value;
  const locale: Language = isLanguage(value) ? value : 'en';

  const messages = (await loaders[locale]()).default;

  return {
    locale,
    messages,
    onError(error) {
      // A missing key means the dictionaries drifted (the exact bug that
      // motivated this migration) — fail loudly while developing instead of
      // rendering the raw key silently. `npm run i18n:check` is the real
      // build-time safety net (see scripts/sync-i18n.mjs); this is a
      // best-effort runtime backstop for anything that slips past it.
      if (process.env.NODE_ENV !== 'production') throw error;
      console.error(error);
    },
    getMessageFallback({ key, namespace }) {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const fallback = readPath(enMessages, fullKey);
      return typeof fallback === 'string' ? fallback : fullKey;
    },
  };
});

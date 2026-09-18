import { cookies } from 'next/headers';
import { isLanguage, LANGUAGE_COOKIE, translate, type Language } from './index';

export async function getServerLanguage(): Promise<Language> {
  const store = await cookies();
  const value = store.get(LANGUAGE_COOKIE)?.value;
  return isLanguage(value) ? value : 'en';
}

// For a server component: `const t = await getServerT();` then `t('nav.dashboard')`.
export async function getServerT() {
  const language = await getServerLanguage();
  return (key: string, params?: Record<string, string>) => translate(language, key, params);
}

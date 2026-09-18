'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { LANGUAGE_LABELS, type Language } from '@/lib/i18n';

const LANGUAGES: Language[] = ['en', 'hi', 'te'];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold ${
            language === lang ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}

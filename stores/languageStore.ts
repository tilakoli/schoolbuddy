import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '@/constants/i18n';
import i18next, { setI18nLanguage } from '@/lib/i18n';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

// Zustand + AsyncStorage still own persistence across app restarts (unchanged
// from before) — but `t`/`setLanguage` now delegate to i18next (see
// lib/i18n.ts), which is what every screen actually renders through via
// react-i18next. Kept as the stable call-site API (`useLanguageStore()`) so
// none of the screens that already call it needed to change.
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (language) => {
        // Await the (in-memory, effectively instant) language switch before
        // updating Zustand state, so the re-render it triggers already sees
        // i18next on the new language — avoids a one-tick flash of stale text.
        setI18nLanguage(language).then(() => set({ language }));
      },
      t: (key, params) => i18next.t(key, params),
    }),
    {
      name: 'school-buddy-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      // The persisted language is only known after AsyncStorage resolves
      // (async), so once it does, push it into i18next — until then i18next
      // stays on its 'en' default, same as before persistence was involved.
      onRehydrateStorage: () => (state) => {
        if (state?.language) setI18nLanguage(state.language);
      },
    }
  )
);

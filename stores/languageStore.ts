import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translate, type Language } from '@/constants/i18n';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
      t: (key, params) => translate(get().language, key, params),
    }),
    {
      name: 'school-buddy-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
    }
  )
);

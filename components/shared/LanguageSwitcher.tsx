import { Text, TouchableOpacity, View } from 'react-native';
import { LANGUAGE_LABELS, type Language } from '@/constants/i18n';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useLanguageStore } from '@/stores/languageStore';

const LANGUAGES: Language[] = ['en', 'hi', 'te'];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <View style={{ flexDirection: 'row', gap: 4, backgroundColor: Colors.secondary, borderRadius: BorderRadius.md, padding: 4 }}>
      {LANGUAGES.map((lang) => {
        const active = language === lang;
        return (
          <TouchableOpacity
            key={lang}
            onPress={() => setLanguage(lang)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: Spacing.sm,
              borderRadius: BorderRadius.sm,
              backgroundColor: active ? Colors.card : 'transparent',
            }}
          >
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: active ? Colors.foreground : Colors.mutedForeground }}>
              {LANGUAGE_LABELS[lang]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

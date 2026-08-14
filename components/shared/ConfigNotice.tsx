import { Text, View } from 'react-native';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';

export default function ConfigNotice() {
  return (
    <View
      style={{
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primaryBorder,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
      }}
    >
      <Text style={{ color: Colors.foreground, fontWeight: '600', marginBottom: 4 }}>
        Supabase setup required
      </Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, lineHeight: 19 }}>
        Copy .env.example to .env and add your project URL and anonymous key.
      </Text>
    </View>
  );
}

import { Text, View } from 'react-native';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';

export const TILE_PALETTE = [
  { bg: 'rgba(52,57,150,0.1)', text: Colors.primary },
  { bg: 'rgba(42,148,199,0.12)', text: Colors.info },
  { bg: 'rgba(218,149,11,0.12)', text: Colors.warning },
  { bg: 'rgba(44,150,93,0.12)', text: Colors.success },
] as const;

export default function DashboardBanner({
  eyebrow,
  name,
  summary,
}: {
  eyebrow: string;
  name: string;
  summary?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -56,
          right: -36,
          width: 180,
          height: 180,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -56,
          right: 56,
          width: 120,
          height: 120,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      />
      <Text style={{ color: 'rgba(251,252,253,0.7)', fontSize: FontSize.sm }}>{eyebrow}</Text>
      <Text style={{ color: Colors.primaryForeground, fontSize: 26, fontWeight: '700', marginTop: 4 }}>
        {name}
      </Text>
      {summary && (
        <Text style={{ color: 'rgba(251,252,253,0.85)', fontSize: FontSize.sm, marginTop: 8 }}>{summary}</Text>
      )}
    </View>
  );
}

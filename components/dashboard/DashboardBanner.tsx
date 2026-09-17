import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text, View } from 'react-native';
import { BorderRadius, Colors, ColorsRgb, FontFamily, FontSize, Spacing } from '@/constants/theme';

export const TILE_PALETTE = [
  { bg: `rgba(${ColorsRgb.primary},0.12)`, text: Colors.primary },
  { bg: `rgba(${ColorsRgb.info},0.12)`, text: Colors.info },
  { bg: `rgba(${ColorsRgb.warning},0.12)`, text: Colors.warning },
  { bg: `rgba(${ColorsRgb.success},0.12)`, text: Colors.success },
] as const;

export default function DashboardBanner({
  eyebrow,
  name,
  subtitle,
  summary,
}: {
  eyebrow: string;
  name: string;
  subtitle?: string;
  summary?: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(450)}
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
      <Text style={{ color: Colors.primaryForeground, fontFamily: FontFamily.heading, fontSize: 25, marginTop: 4 }}>
        {name}
      </Text>
      {subtitle && (
        <Text style={{ color: 'rgba(251,252,253,0.85)', fontSize: FontSize.sm, marginTop: 2 }}>{subtitle}</Text>
      )}
      {summary && (
        <Text style={{ color: 'rgba(251,252,253,0.85)', fontSize: FontSize.sm, marginTop: 8 }}>{summary}</Text>
      )}
    </Animated.View>
  );
}

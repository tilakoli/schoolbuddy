import { Pressable, Text, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, BorderRadius } from '@/constants/theme';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const styles: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
  primary: {
    bg: Colors.primary,
    border: Colors.primary,
    text: Colors.primaryForeground,
  },
  accent: {
    bg: Colors.accent,
    border: Colors.accent,
    text: Colors.accentForeground,
  },
  secondary: {
    bg: Colors.secondary,
    border: Colors.secondary,
    text: Colors.foreground,
  },
  outline: {
    bg: 'transparent',
    border: Colors.border,
    text: Colors.foreground,
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const s = styles[variant];
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        {
          backgroundColor: s.bg,
          borderWidth: 1,
          borderColor: s.border,
          borderRadius: BorderRadius.full,
          paddingVertical: 18,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.4 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={s.text} />
      ) : (
        <Text style={{
          fontFamily: FontFamily.label,
          fontSize: FontSize.md,
          color: s.text,
        }}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

import { TouchableOpacity, Text, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, FontFamily, FontSize, BorderRadius } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

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

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
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
    </TouchableOpacity>
  );
}

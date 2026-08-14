import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Colors, FontFamily, FontSize, BorderRadius } from '@/constants/theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
};

export default function Input({
  label,
  error,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{
          fontFamily: FontFamily.label,
          fontSize: FontSize.sm,
          color: Colors.foreground,
          marginBottom: 8,
        }}>
          {label}
        </Text>
      )}

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: error ? Colors.danger : focused ? Colors.primary : Colors.border,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: 16,
      }}>
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          secureTextEntry={hidden}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          placeholderTextColor={Colors.mutedForeground}
          style={{
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.md,
            color: Colors.foreground,
            paddingVertical: 16,
          }}
        />

        {/* Password toggle */}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidden(!hidden)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Text style={{ fontSize: 16, color: Colors.mutedForeground }}>
              {hidden ? '👁' : '🙈'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Custom right icon */}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.7}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={{
          fontFamily: FontFamily.body,
          fontSize: FontSize.xs,
          color: Colors.danger,
          marginTop: 6,
        }}>
          {error}
        </Text>
      )}
    </View>
  );
}

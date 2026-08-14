import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Screen from '@/components/shared/Screen';
import { Colors, FontSize, Spacing } from '@/constants/theme';

type AuthScreenProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
}>;

export default function AuthScreen({ eyebrow, title, description, children, footer }: AuthScreenProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll contentContainerStyle={{ justifyContent: 'center' }}>
        <Text
          style={{
            color: Colors.primary,
            fontSize: FontSize.xs,
            fontWeight: '700',
            letterSpacing: 1.8,
            marginBottom: Spacing.sm,
          }}
        >
          {eyebrow}
        </Text>
        <Text
          style={{
            color: Colors.foreground,
            fontSize: 36,
            fontWeight: '700',
            lineHeight: 43,
            marginBottom: Spacing.sm,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: Colors.mutedForeground,
            fontSize: FontSize.md,
            lineHeight: 23,
            marginBottom: Spacing.xl,
          }}
        >
          {description}
        </Text>
        {children}
        {footer ? <View style={{ marginTop: Spacing.lg }}>{footer}</View> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

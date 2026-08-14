import type { PropsWithChildren } from 'react';
import { ScrollView, type ScrollViewProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}>;

export default function Screen({ children, scroll = false, contentContainerStyle }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ flexGrow: 1, padding: 24 }, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: 24 }, contentContainerStyle]}>{children}</View>
  );

  return <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>{content}</SafeAreaView>;
}

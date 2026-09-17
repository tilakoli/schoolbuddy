import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '@/components/shared/Screen';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AiChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const scrollRef = useRef<ScrollView>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !supabase || !API_URL) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(undefined);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: 26 }}>AI Chat</Text>
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.md }}>
          Ask me anything about School Buddy.
        </Text>

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ gap: Spacing.sm }}>
          {messages.length === 0 && (
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>Start the conversation below.</Text>
          )}
          {messages.map((message, i) => (
            <View
              key={i}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                backgroundColor: message.role === 'user' ? Colors.primary : Colors.secondary,
                borderRadius: BorderRadius.lg,
                paddingHorizontal: Spacing.sm,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: message.role === 'user' ? Colors.primaryForeground : Colors.foreground, fontSize: FontSize.sm }}>
                {message.text}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={{ alignSelf: 'flex-start' }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
          {error && <Text style={{ color: Colors.danger, fontSize: FontSize.sm }}>{error}</Text>}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            paddingTop: Spacing.sm,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={Colors.mutedForeground}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: BorderRadius.md,
              paddingHorizontal: Spacing.sm,
              paddingVertical: 10,
              fontSize: FontSize.sm,
              color: Colors.foreground,
            }}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!input.trim() || loading}
            accessibilityLabel="Send"
            style={{
              width: 40,
              height: 40,
              borderRadius: BorderRadius.md,
              backgroundColor: Colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !input.trim() || loading ? 0.5 : 1,
            }}
          >
            <Text style={{ color: Colors.accentForeground, fontSize: FontSize.md }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

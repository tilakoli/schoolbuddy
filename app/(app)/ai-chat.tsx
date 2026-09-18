import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import Markdown from 'react-native-markdown-display';
import Screen from '@/components/shared/Screen';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { stripMarkdownForSpeech } from '@/lib/markdown';
import { supabase } from '@/lib/supabase';
import { useLanguageStore } from '@/stores/languageStore';

const markdownStyles = {
  body: { color: Colors.foreground, fontSize: FontSize.sm },
  paragraph: { marginTop: 0, marginBottom: 4 },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  heading1: { fontSize: FontSize.md, fontWeight: '700' as const, marginBottom: 4 },
  heading2: { fontSize: FontSize.md, fontWeight: '700' as const, marginBottom: 4 },
  heading3: { fontSize: FontSize.sm, fontWeight: '700' as const, marginBottom: 4 },
  hr: { display: 'none' as const, height: 0, marginVertical: 0 },
  code_inline: { backgroundColor: Colors.background, borderRadius: 4, paddingHorizontal: 4 },
};

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const SPEECH_LANG: Record<string, string> = { en: 'en-US', hi: 'hi-IN', te: 'te-IN' };

export default function AiChatScreen() {
  const { t, language } = useLanguageStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadSessions = () => {
    if (!supabase) return;
    supabase
      .from('ai_chat_sessions')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data }) => setSessions(data ?? []));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speak = (text: string, index: number) => {
    if (speakingIndex === index) {
      Speech.stop();
      setSpeakingIndex(null);
      return;
    }
    Speech.stop();
    setSpeakingIndex(index);
    Speech.speak(stripMarkdownForSpeech(text), {
      language: SPEECH_LANG[language] ?? 'en-US',
      onDone: () => setSpeakingIndex(null),
      onStopped: () => setSpeakingIndex(null),
      onError: () => setSpeakingIndex(null),
    });
  };

  const startNewChat = () => {
    Speech.stop();
    setMessages([]);
    setActiveSessionId(null);
    setError(undefined);
    setHistoryVisible(false);
  };

  const openSession = async (id: string) => {
    if (!supabase) return;
    Speech.stop();
    setHistoryVisible(false);
    setError(undefined);
    const { data } = await supabase.from('ai_chat_messages').select('role, text').eq('session_id', id).order('created_at', { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
    setActiveSessionId(id);
  };

  const deleteSession = (id: string) => {
    Alert.alert(t('chat.deleteChat'), t('chat.deleteChatConfirm'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t('chat.deleteChat'),
        style: 'destructive',
        onPress: async () => {
          if (!supabase) return;
          await supabase.from('ai_chat_sessions').delete().eq('id', id);
          setSessions((prev) => prev.filter((s) => s.id !== id));
          if (activeSessionId === id) startNewChat();
        },
      },
    ]);
  };

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
        body: JSON.stringify({ messages: nextMessages, sessionId: activeSessionId, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      if (data.sessionId && data.sessionId !== activeSessionId) setActiveSessionId(data.sessionId);
      loadSessions();
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: 26 }}>{t('chat.title')}</Text>
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>{t('chat.subtitle')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
            <TouchableOpacity
              onPress={startNewChat}
              accessibilityLabel={t('chat.newChat')}
              style={{
                width: 36,
                height: 36,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: FontSize.md, color: Colors.foreground }}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHistoryVisible(true)}
              accessibilityLabel={t('chat.history')}
              style={{
                width: 36,
                height: 36,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: FontSize.md }}>🕘</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView ref={scrollRef} style={{ flex: 1, marginTop: Spacing.md }} contentContainerStyle={{ gap: Spacing.sm }}>
          {messages.length === 0 && (
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{t('chat.tryOneOfThese')}</Text>
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
              {message.role === 'assistant' ? (
                <Markdown style={markdownStyles}>{message.text}</Markdown>
              ) : (
                <Text style={{ color: Colors.primaryForeground, fontSize: FontSize.sm }}>{message.text}</Text>
              )}
              {message.role === 'assistant' && (
                <TouchableOpacity onPress={() => speak(message.text, i)} style={{ marginTop: 6 }}>
                  <Text style={{ color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' }}>
                    {speakingIndex === i ? `⏹ ${t('chat.stop')}` : `🔊 ${t('chat.listen')}`}
                  </Text>
                </TouchableOpacity>
              )}
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
            placeholder={t('chat.placeholder')}
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

      <Modal visible={historyVisible} transparent animationType="slide" onRequestClose={() => setHistoryVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setHistoryVisible(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: Colors.card,
              borderTopLeftRadius: BorderRadius.xl,
              borderTopRightRadius: BorderRadius.xl,
              padding: Spacing.md,
              maxHeight: '70%',
            }}
          >
            <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: FontSize.lg, marginBottom: Spacing.sm }}>
              {t('chat.history')}
            </Text>
            {sessions.length === 0 && (
              <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginBottom: Spacing.md }}>{t('chat.noHistory')}</Text>
            )}
            <ScrollView style={{ maxHeight: 360 }}>
              {sessions.map((session) => (
                <View
                  key={session.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: activeSessionId === session.id ? Colors.primaryLight : 'transparent',
                    borderRadius: BorderRadius.md,
                    marginBottom: 4,
                  }}
                >
                  <TouchableOpacity onPress={() => openSession(session.id)} style={{ flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm }}>
                    <Text
                      numberOfLines={1}
                      style={{ color: activeSessionId === session.id ? Colors.primary : Colors.foreground, fontSize: FontSize.sm, fontWeight: '600' }}
                    >
                      {session.title}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteSession(session.id)} style={{ padding: Spacing.sm }} accessibilityLabel={t('chat.deleteChat')}>
                    <Text style={{ color: Colors.danger, fontSize: FontSize.sm }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

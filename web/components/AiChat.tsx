'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { HistoryIcon, PlusIcon, SendIcon, SparkleIcon, SpeakerIcon, SpeakerOffIcon, TrashIcon, XIcon } from '@/components/icons';
import { useLanguage } from '@/components/LanguageProvider';
import { stripMarkdownForSpeech } from '@/lib/markdown';
import { createClient } from '@/lib/supabase/client';

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-1.5 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  h1: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 font-semibold">{children}</p>,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline">
      {children}
    </a>
  ),
  code: ({ children }: { children?: React.ReactNode }) => <code className="rounded bg-secondary px-1 py-0.5 text-xs">{children}</code>,
  hr: () => null,
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

const SPEECH_LANG: Record<string, string> = { en: 'en-US', hi: 'hi-IN', te: 'te-IN' };

export default function AiChat() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [t('chat.prompt1'), t('chat.prompt2'), t('chat.prompt3'), t('chat.prompt4')];

  const loadSessions = async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase.from('ai_chat_sessions').select('id, title, updated_at').order('updated_at', { ascending: false });
    setSessions(data ?? []);
  };

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from('ai_chat_sessions')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data }) => setSessions(data ?? []));
  }, []);

  // Stop any in-progress speech when the page is left, so it never keeps
  // talking after the user has navigated away.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (text: string, index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speakingIndex === index) {
      setSpeakingIndex(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
    const targetLang = SPEECH_LANG[language] ?? 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang === targetLang) ?? voices.find((v) => v.lang.startsWith(targetLang.split('-')[0]));
    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.lang = targetLang;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const startNewChat = () => {
    window.speechSynthesis?.cancel();
    setMessages([]);
    setActiveSessionId(null);
    setError(undefined);
    setHistoryOpen(false);
  };

  const openSession = async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;
    window.speechSynthesis?.cancel();
    setHistoryOpen(false);
    setError(undefined);
    const { data } = await supabase.from('ai_chat_messages').select('role, text').eq('session_id', id).order('created_at', { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
    setActiveSessionId(id);
  };

  const deleteSession = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(t('chat.deleteChatConfirm'))) return;
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('ai_chat_sessions').delete().eq('id', id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) startNewChat();
  };

  const send = async (event: FormEvent, override?: string) => {
    event.preventDefault();
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(undefined);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }));
    }
  };

  return (
    <div className="relative mx-auto flex h-[calc(100vh-5rem)] w-full max-w-3xl flex-1 flex-col px-6 py-6 md:h-screen md:py-10">
      <div className="animate-fade-up flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SparkleIcon width={20} height={20} className="text-accent" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('chat.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('chat.subtitle')}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={startNewChat}
            aria-label={t('chat.newChat')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary"
          >
            <PlusIcon width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label={t('chat.history')}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-secondary ${
              historyOpen ? 'bg-secondary text-primary' : 'text-foreground'
            }`}
          >
            <HistoryIcon width={16} height={16} />
          </button>
        </div>
      </div>

      {historyOpen && <div className="fixed inset-0 z-10" onClick={() => setHistoryOpen(false)} />}

      {historyOpen && (
        <div className="absolute right-6 top-20 z-20 max-h-96 w-72 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('chat.history')}</p>
            <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <XIcon width={14} height={14} />
            </button>
          </div>
          {sessions.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">{t('chat.noHistory')}</p>}
          <div className="mt-1 space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-1 rounded-lg pr-1 hover:bg-secondary ${
                  activeSessionId === session.id ? 'bg-primary-light text-primary' : 'text-foreground'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openSession(session.id)}
                  className="min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-sm"
                >
                  {session.title}
                </button>
                <button
                  type="button"
                  onClick={(event) => deleteSession(session.id, event)}
                  aria-label={t('chat.deleteChat')}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-danger"
                >
                  <TrashIcon width={13} height={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div ref={listRef} className="mt-6 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="animate-fade-up flex h-full flex-col items-center justify-center text-center" style={{ animationDelay: '0.08s' }}>
            <div className="ai-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <SparkleIcon width={26} height={26} className="text-accent" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">{t('chat.howCanIHelp')}</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t('chat.tryOneOfThese')}</p>
            <div className="mt-6 grid w-full max-w-md gap-2 sm:grid-cols-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={(event) => send(event, prompt)}
                  className="rounded-lg border border-border bg-card px-3 py-2.5 text-left text-xs font-medium text-foreground shadow-sm hover:bg-secondary"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            className={`animate-fade-up flex items-end gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            style={{ animationDelay: '0.02s' }}
          >
            {message.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <SparkleIcon width={13} height={13} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground shadow-sm'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="[&_p]:leading-relaxed">
                  <ReactMarkdown components={markdownComponents}>{message.text}</ReactMarkdown>
                </div>
              ) : (
                message.text
              )}
              {message.role === 'assistant' && (
                <button
                  type="button"
                  onClick={() => speak(message.text, i)}
                  aria-label={speakingIndex === i ? t('chat.stop') : t('chat.listen')}
                  className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
                >
                  {speakingIndex === i ? <SpeakerOffIcon width={13} height={13} /> : <SpeakerIcon width={13} height={13} />}
                  {speakingIndex === i ? t('chat.stop') : t('chat.listen')}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <SparkleIcon width={13} height={13} />
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <form onSubmit={send} className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t('chat.placeholder')}
          className="flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-50"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

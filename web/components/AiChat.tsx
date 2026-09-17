'use client';

import { useRef, useState, type FormEvent } from 'react';
import { SendIcon, SparkleIcon } from '@/components/icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_PROMPTS = [
  'What can you help me with?',
  'Explain a concept simply, step by step',
  'Help me plan a study schedule',
  'Give me tips for writing a good essay',
] as const;

export default function AiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const listRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }));
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] w-full max-w-3xl flex-1 flex-col px-6 py-6 md:h-screen md:py-10">
      <div className="animate-fade-up flex items-center gap-2">
        <SparkleIcon width={20} height={20} className="text-accent" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ask me anything about School Buddy.</p>
        </div>
      </div>

      <div ref={listRef} className="mt-6 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="animate-fade-up flex h-full flex-col items-center justify-center text-center" style={{ animationDelay: '0.08s' }}>
            <div className="ai-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <SparkleIcon width={26} height={26} className="text-accent" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">How can I help?</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Ask a question, or try one of these to get started.
            </p>
            <div className="mt-6 grid w-full max-w-md gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
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
              {message.text}
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
          placeholder="Type a message…"
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

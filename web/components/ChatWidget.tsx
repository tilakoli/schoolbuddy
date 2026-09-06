'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ChatIcon, SendIcon, XIcon } from '@/components/icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const listRef = useRef<HTMLDivElement>(null);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
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
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-30">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:w-96">
          <div className="flex items-center justify-between bg-primary px-4 py-3">
            <p className="text-sm font-semibold text-primary-foreground">Ask AI</p>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-primary-foreground/80 hover:text-primary-foreground">
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">Ask me anything about School Buddy.</p>
            )}
            {messages.map((message, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  message.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && <div className="max-w-[85%] rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">Thinking…</div>}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
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
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
      >
        {open ? <XIcon className="h-6 w-6" /> : <ChatIcon className="h-6 w-6" />}
      </button>
    </div>
  );
}

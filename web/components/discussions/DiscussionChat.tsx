'use client';

import { useEffect, useRef, useState } from 'react';
import { FileTextIcon, SendIcon, SparkleIcon, XIcon } from '@/components/icons';
import { useLanguage } from '@/components/LanguageProvider';
import { getVideoEmbedUrl } from '@shared/domain/learning';
import type { DiscussionLink, DiscussionMessage, MyDiscussionThread } from '@shared/domain/discussions';
import { createClient } from '@/lib/supabase/client';

interface DiscussionMaterial {
  id: string;
  title: string;
  chapter: string | null;
  video_url: string | null;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export default function DiscussionChat({
  discussionId,
  title,
  chapter,
  instructions,
  links,
  materials,
  initialThread,
  initialMessages,
  ended,
}: {
  discussionId: string;
  title: string;
  chapter: string | null;
  instructions: string | null;
  links: DiscussionLink[];
  materials: DiscussionMaterial[];
  initialThread: MyDiscussionThread | null;
  initialMessages: DiscussionMessage[];
  ended: boolean;
}) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<DiscussionMessage[]>(initialMessages);
  // Shown prominently on first open (no messages sent yet); afterward only
  // reachable via the "Teacher's note" toggle below, per the student's
  // explicit ask — not shown every time they reopen a chat already in progress.
  const [showInstructions, setShowInstructions] = useState(initialMessages.length === 0 && Boolean(instructions));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(initialThread?.status === 'submitted');
  const [submitting, setSubmitting] = useState(false);
  const [showIdleModal, setShowIdleModal] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [materialFiles, setMaterialFiles] = useState<{ path: string; mime: string; url: string }[]>([]);
  const [materialFilesLoading, setMaterialFilesLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (submitted || ended) return;
    lastActivityRef.current = Date.now();
    idleTimerRef.current = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) setShowIdleModal(true);
    }, 30000);
    return () => {
      if (idleTimerRef.current) window.clearInterval(idleTimerRef.current);
    };
  }, [submitted, ended]);

  const selectMaterial = async (material: DiscussionMaterial) => {
    setSelectedMaterialId(material.id);
    setMaterialFilesLoading(true);
    setMaterialFiles([]);
    const supabase = createClient();
    if (!supabase) {
      setMaterialFilesLoading(false);
      return;
    }
    const { data: files } = await supabase.from('material_files').select('file_path, mime_type').eq('material_id', material.id).order('position');
    const signed = await Promise.all((files ?? []).map(async (file) => {
      const { data: signedData } = await supabase.storage.from('materials').createSignedUrl(file.file_path, 3600);
      return { path: file.file_path, mime: file.mime_type, url: signedData?.signedUrl ?? '' };
    }));
    setMaterialFiles(signed.filter((file) => file.url));
    setMaterialFilesLoading(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || submitted || ended) return;
    lastActivityRef.current = Date.now();
    setShowIdleModal(false);
    const optimistic: DiscussionMessage = { id: `local-${Date.now()}`, thread_id: '', role: 'user', text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/discussions/${discussionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong.');
      setMessages((prev) => [...prev, { id: `local-${Date.now()}-reply`, thread_id: data.threadId, role: 'assistant', text: data.reply, created_at: new Date().toISOString() }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }));
    }
  };

  const submitDiscussion = async () => {
    if (!window.confirm(t('discussions.submitConfirm'))) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/discussions/${discussionId}/submit`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit this discussion.');
      setSubmitted(true);
      setShowIdleModal(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit this discussion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] w-full max-w-6xl flex-1 flex-col px-4 py-6 md:h-[calc(100vh-76px)] md:py-8">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {chapter && <p className="mt-1 text-sm text-muted-foreground">{chapter}</p>}
        </div>
        {instructions && (
          <button
            type="button"
            onClick={() => setShowInstructions((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            <FileTextIcon width={14} />
            {t('discussions.teacherNote')}
          </button>
        )}
      </div>

      {instructions && showInstructions && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary-light p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">{t('discussions.teacherNote')}</p>
            <button type="button" onClick={() => setShowInstructions(false)} aria-label="Close" className="shrink-0 text-primary/70 hover:text-primary">
              <XIcon width={14} height={14} />
            </button>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{instructions}</p>
        </div>
      )}

      <div className="mt-4 grid flex-1 gap-4 overflow-hidden lg:grid-cols-[260px_1fr]">
        <aside className="hidden overflow-y-auto rounded-xl border border-border bg-card p-3 lg:block">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('guided.materials')}</p>
          <div className="mt-2 space-y-1.5">
            {materials.length === 0 && <p className="text-xs text-muted-foreground">{t('guided.noMaterials')}</p>}
            {materials.map((material) => (
              <button
                key={material.id}
                type="button"
                onClick={() => selectMaterial(material)}
                className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs ${
                  selectedMaterialId === material.id ? 'border-primary bg-primary-light text-primary' : 'border-border text-foreground hover:bg-secondary'
                }`}
              >
                <FileTextIcon width={13} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{material.title}</span>
                  {material.chapter && <span className="block truncate text-[10px] text-muted-foreground">{material.chapter}</span>}
                </span>
              </button>
            ))}
          </div>
          {materialFilesLoading && <p className="mt-3 text-xs text-muted-foreground">{t('common.loading')}</p>}
          {materialFiles.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-border-soft pt-3">
              {materialFiles.map((file) => (
                <div key={file.path} className="rounded-lg border border-border p-1.5">
                  {file.mime.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL.
                    <img src={file.url} alt="" className="max-h-40 w-full rounded object-contain" />
                  ) : file.mime === 'application/pdf' ? (
                    <embed src={file.url} type="application/pdf" className="h-40 w-full rounded" />
                  ) : (
                    <a href={file.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline">{t('guided.openFile')}</a>
                  )}
                </div>
              ))}
            </div>
          )}
          {(materials.some((material) => material.video_url) || links.some((link) => getVideoEmbedUrl(link.url))) && (
            <div className="mt-3 space-y-2 border-t border-border-soft pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('guided.videos')}</p>
              {materials.filter((material) => material.video_url).map((material) => {
                const embedUrl = material.video_url ? getVideoEmbedUrl(material.video_url) : null;
                return embedUrl ? (
                  <div key={`material-${material.id}`} className="aspect-video w-full overflow-hidden rounded-lg">
                    <iframe src={embedUrl} title={material.title} allowFullScreen className="h-full w-full" />
                  </div>
                ) : null;
              })}
              {links.map((link) => {
                const embedUrl = getVideoEmbedUrl(link.url);
                return embedUrl ? (
                  <div key={`link-${link.url}`} className="aspect-video w-full overflow-hidden rounded-lg">
                    <iframe src={embedUrl} title={link.label} allowFullScreen className="h-full w-full" />
                  </div>
                ) : null;
              })}
            </div>
          )}
          {links.some((link) => !getVideoEmbedUrl(link.url)) && (
            <div className="mt-3 space-y-1 border-t border-border-soft pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('discussions.links')}</p>
              {links.filter((link) => !getVideoEmbedUrl(link.url)).map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="block truncate text-xs font-semibold text-primary underline">
                  {link.label} ↗
                </a>
              ))}
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="ai-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <SparkleIcon width={26} height={26} className="text-accent" />
                </div>
                <p className="mt-4 max-w-xs text-sm text-muted-foreground">{t('discussions.startHint')}</p>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`flex items-end gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <SparkleIcon width={13} height={13} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground shadow-sm'
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

          {submitted ? (
            <div className="mt-3 rounded-xl border border-success/30 bg-success/5 p-4 text-center text-sm font-semibold text-success">
              {t('discussions.submittedNotice')}
            </div>
          ) : (
            <>
              {ended && (
                <div className="mt-3 rounded-xl border border-border-soft bg-secondary/40 p-3 text-center text-xs font-semibold text-muted-foreground">
                  {t('discussions.discussionEnded')}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-border-soft bg-secondary/40 px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">{t('discussions.areYouDone')}</p>
                <button
                  type="button"
                  onClick={submitDiscussion}
                  disabled={submitting || messages.length === 0}
                  className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                >
                  {submitting ? t('discussions.submitting') : t('discussions.submitDiscussion')}
                </button>
              </div>
              {!ended && (
                <form
                  onSubmit={(event) => { event.preventDefault(); sendMessage(); }}
                  className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-md"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(event) => { setInput(event.target.value); lastActivityRef.current = Date.now(); }}
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
              )}
            </>
          )}
        </div>
      </div>

      {showIdleModal && !submitted && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl">
            <p className="text-sm font-semibold text-foreground">{t('discussions.areYouDone')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('discussions.idleHint')}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={submitDiscussion}
                disabled={submitting || messages.length === 0}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
              >
                {t('discussions.submitDiscussion')}
              </button>
              <button
                type="button"
                onClick={() => { setShowIdleModal(false); lastActivityRef.current = Date.now(); }}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                {t('discussions.keepGoing')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

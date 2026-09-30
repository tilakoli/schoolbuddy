'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { BookIcon, MicIcon, PaperclipIcon, SendIcon, SparkleIcon, TrashIcon, XIcon } from '@/components/icons';
import EmptyState from '@/components/shared/EmptyState';
import { setChatHandoff } from '@/lib/chatHandoff';
import { createClient } from '@/lib/supabase/client';

interface LessonSession {
  id: string;
  title: string;
  updated_at: string;
}

const CHAT_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
const SILENCE_VOLUME_THRESHOLD = 0.018;

export default function LessonsLanding({ name }: { name: string }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string>();
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const detectionTimerRef = useRef<number | null>(null);
  const heardSpeechRef = useRef(false);
  const peakVolumeRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from('ai_chat_sessions')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setSessions(data ?? []);
        setLoadingSessions(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (detectionTimerRef.current) window.clearInterval(detectionTimerRef.current);
      const context = audioContextRef.current;
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    };
  }, []);

  const addFiles = (selected: File[]) => {
    const combined = [...files, ...selected].slice(0, 3);
    if (selected.some((file) => !CHAT_FILE_TYPES.includes(file.type))) {
      setError('Use PDF, TXT, JPG, PNG, or WebP files.');
      return;
    }
    if (combined.reduce((total, file) => total + file.size, 0) > 10 * 1024 * 1024) {
      setError('Chat attachments must be 10MB or less in total.');
      return;
    }
    setFiles(combined);
    setError(undefined);
  };

  const submit = (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;
    setChatHandoff({ draft: { text, files } });
    router.push('/ai-chat');
  };

  const deleteSession = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(t('chat.deleteChatConfirm'))) return;
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('ai_chat_sessions').delete().eq('id', id);
    setSessions((current) => current.filter((session) => session.id !== id));
  };

  const transcribeAndSubmit = async (blob: Blob) => {
    setTranscribing(true);
    setError(undefined);
    try {
      const form = new FormData();
      form.append('audio', blob, 'voice-message.webm');
      form.append('language', language);
      const response = await fetch('/api/chat/transcribe', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('lessons.transcribeFailed'));
      const transcript = typeof data.transcript === 'string' ? data.transcript.trim() : '';
      if (!transcript) throw new Error(t('lessons.transcribeFailed'));
      submit(transcript);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('lessons.transcribeFailed'));
    } finally {
      setTranscribing(false);
    }
  };

  const stopRecorderResources = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (detectionTimerRef.current) window.clearInterval(detectionTimerRef.current);
    detectionTimerRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('lessons.recordUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      chunksRef.current = [];
      heardSpeechRef.current = false;
      peakVolumeRef.current = 0;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        stopRecorderResources();
        setRecording(false);
        if (!heardSpeechRef.current || peakVolumeRef.current < SILENCE_VOLUME_THRESHOLD) {
          setError('I could not hear speech clearly. Please try again closer to the microphone.');
          return;
        }
        if (blob.size) void transcribeAndSubmit(blob);
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start();

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const startedAt = Date.now();
      let heardSpeech = false;
      let lastSpeechAt = startedAt;
      audioContextRef.current = audioContext;
      detectionTimerRef.current = window.setInterval(() => {
        if (recorder.state !== 'recording') return;
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          energy += normalized * normalized;
        }
        const volume = Math.sqrt(energy / samples.length);
        peakVolumeRef.current = Math.max(peakVolumeRef.current, volume);
        if (volume > SILENCE_VOLUME_THRESHOLD) {
          heardSpeech = true;
          heardSpeechRef.current = true;
          lastSpeechAt = Date.now();
        }
        const now = Date.now();
        if ((heardSpeech && now - lastSpeechAt > 1300) || now - startedAt > 30000) recorder.stop();
      }, 120);

      setRecording(true);
      setError(undefined);
    } catch {
      setError(t('lessons.recordError'));
    }
  };

  const toggleRecording = () => {
    if (transcribing) return;
    if (recording) {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      return;
    }
    void startRecording();
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-10">
      <div className="ai-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
        <SparkleIcon width={26} height={26} className="text-accent" />
      </div>
      <h1 className="mt-4 text-center text-2xl font-semibold text-foreground">{t('lessons.promptWithName', { name })}</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mt-6 w-full rounded-2xl border border-border bg-card p-3 shadow-md"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t('lessons.placeholder')}
          className="w-full bg-transparent px-2 py-1.5 text-sm text-foreground outline-none"
        />
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 px-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs shadow-sm">
                <PaperclipIcon width={12} className="text-primary" />
                <span className="max-w-32 truncate font-semibold text-foreground">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={`Remove ${file.name}`}
                  className="text-muted-foreground hover:text-danger"
                >
                  <XIcon width={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border-soft pt-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= 3}
              className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-40"
            >
              <PaperclipIcon width={14} />
              {t('lessons.upload')}
            </button>
            <button
              type="button"
              onClick={toggleRecording}
              disabled={transcribing}
              className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold disabled:opacity-40 ${
                recording ? 'border-danger bg-danger/10 text-danger' : 'border-border text-foreground hover:bg-secondary'
              }`}
            >
              <MicIcon width={14} />
              {recording ? t('lessons.recording') : transcribing ? t('lessons.transcribing') : t('lessons.record')}
            </button>
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
      </form>
      {error && <p className="mt-2 w-full text-left text-sm text-danger">{error}</p>}

      <div className="mt-10 w-full">
        <h2 className="text-lg font-bold text-foreground">{t('lessons.title')}</h2>
        <div className="mt-3 space-y-2">
          {!loadingSessions && sessions.length === 0 && <EmptyState icon={BookIcon} title={t('lessons.empty')} />}
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-1 rounded-xl border border-border bg-card p-2 shadow-sm hover:border-primary"
            >
              <button
                type="button"
                onClick={() => {
                  setChatHandoff({ openSessionId: session.id });
                  router.push('/ai-chat');
                }}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookIcon width={16} height={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{session.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={(event) => deleteSession(session.id, event)}
                aria-label={t('chat.deleteChat')}
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-danger"
              >
                <TrashIcon width={14} height={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

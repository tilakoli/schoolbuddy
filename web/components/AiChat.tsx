'use client';

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import ChatSources from '@/components/ChatSources';
import type { ChatGrounding } from '@shared/domain/chat';
import type { Role } from '@shared/domain/profile';
import { CopyIcon, HistoryIcon, MicIcon, PaperclipIcon, PlusIcon, RefreshIcon, SendIcon, SparkleIcon, SpeakerIcon, SpeakerOffIcon, ThumbDownIcon, ThumbUpIcon, TrashIcon, XIcon } from '@/components/icons';
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
  id?: string;
  role: 'user' | 'assistant';
  text: string;
  grounding?: ChatGrounding | null;
  feedback?: 1 | -1 | null;
  feedback_reason?: FeedbackReason | null;
}

type FeedbackReason = 'incorrect' | 'missing_sources' | 'not_helpful' | 'unsafe';
const FEEDBACK_REASONS: Array<{ value: FeedbackReason; label: string }> = [
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'missing_sources', label: 'Missing sources' },
  { value: 'not_helpful', label: 'Not helpful' },
  { value: 'unsafe', label: 'Unsafe or inappropriate' },
];

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

const SPEECH_LANG: Record<string, string> = { en: 'en-US', hi: 'hi-IN', te: 'te-IN' };
const CHAT_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
const NEW_CHAT_MARKER = 'new';

interface SpeechRecognitionResultLike { isFinal: boolean; 0: { transcript: string } }
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionLike {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export default function AiChat({ role, userId }: { role: Role; userId: string }) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [listening, setListening] = useState(false);
  const [recordingFallback, setRecordingFallback] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<'listening' | 'thinking' | 'speaking'>('listening');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceBaseRef = useRef('');
  const speechFailedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const voiceDetectionTimerRef = useRef<number | null>(null);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const conversationRef = useRef(false);
  const conversationTranscriptRef = useRef('');
  const activeChatStorageKey = `schoolbuddy-active-chat:${userId}`;

  const suggestedPrompts = role === 'admin' || role === 'vice_principal'
    ? [t('chat.schoolPromptTeachers'), t('chat.schoolPromptSubjects'), t('chat.schoolPromptAssignments'), t('chat.schoolPromptMaterials')]
    : [t('chat.schoolPromptClasses'), t('chat.schoolPromptAssignments'), t('chat.prompt1'), t('chat.prompt2')];

  const loadSessions = async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase.from('ai_chat_sessions').select('id, title, updated_at').order('updated_at', { ascending: false });
    setSessions(data ?? []);
  };

  useEffect(() => {
    const restoreChat = async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('ai_chat_sessions')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false });
      const restoredSessions = data ?? [];
      setSessions(restoredSessions);

      const storedSessionId = localStorage.getItem(activeChatStorageKey);
      if (storedSessionId === NEW_CHAT_MARKER) return;
      const sessionToRestore = restoredSessions.find((session) => session.id === storedSessionId) ?? restoredSessions[0];
      if (!sessionToRestore) return;

      const { data: restoredMessages, error: loadError } = await supabase
        .from('ai_chat_messages')
        .select('id, role, text, grounding, feedback, feedback_reason')
        .eq('session_id', sessionToRestore.id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (loadError) return;
      setMessages((restoredMessages ?? []) as ChatMessage[]);
      setActiveSessionId(sessionToRestore.id);
      localStorage.setItem(activeChatStorageKey, sessionToRestore.id);
    };
    void restoreChat();
  }, [activeChatStorageKey]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis?.getVoices() ?? []);
      setSelectedVoice((current) => current || localStorage.getItem('schoolbuddy-voice') || '');
    };
    const timer = window.setTimeout(loadVoices, 0);
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => { window.clearTimeout(timer); window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices); };
  }, []);

  const configureVoice = (utterance: SpeechSynthesisUtterance) => {
    const targetLang = SPEECH_LANG[language] ?? 'en-US';
    const languageCode = targetLang.split('-')[0];
    const candidates = availableVoices.filter((voice) => voice.lang === targetLang || voice.lang.startsWith(languageCode));
    const preferred = candidates.find((voice) => voice.name === selectedVoice) ?? [...candidates].sort((a, b) => {
      const score = (voice: SpeechSynthesisVoice) => /natural|enhanced|premium|neural/i.test(voice.name) ? 4 : /google|microsoft|samantha|daniel|karen|rishi/i.test(voice.name) ? 2 : voice.localService ? 1 : 0;
      return score(b) - score(a);
    })[0];
    if (preferred) utterance.voice = preferred;
    utterance.lang = preferred?.lang ?? targetLang;
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    utterance.volume = 1;
  };

  // Stop any in-progress speech when the page is left, so it never keeps
  // talking after the user has navigated away.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
      recorderRef.current?.stop();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
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
    configureVoice(utterance);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const stopConversation = () => {
    conversationRef.current = false;
    setConversationActive(false);
    setListening(false);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (voiceDetectionTimerRef.current) window.clearInterval(voiceDetectionTimerRef.current);
    void voiceAudioContextRef.current?.close();
    window.speechSynthesis?.cancel();
  };

  const startNewChat = () => {
    if (loading) return;
    if (messages.length === 0 && !activeSessionId) return;
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();
    setMessages([]);
    setActiveSessionId(null);
    setError(undefined);
    setHistoryOpen(false);
    setAttachments([]);
    localStorage.setItem(activeChatStorageKey, NEW_CHAT_MARKER);
  };

  const transcribeRecording = async (blob: Blob) => {
    setTranscribing(true);
    setError(undefined);
    try {
      const form = new FormData();
      form.append('audio', blob, 'voice-message.webm');
      form.append('language', language);
      const response = await fetch('/api/chat/transcribe', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Voice transcription failed.');
      setInput((current) => [current.trim(), data.transcript].filter(Boolean).join(' '));
      if (conversationRef.current) {
        setConversationStatus('thinking');
        await sendMessage(data.transcript, messagesRef.current, true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Voice transcription failed.');
    } finally { setTranscribing(false); }
  };

  const startRecorderFallback = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Microphone recording requires Chrome, Edge, Safari, or Firefox over HTTPS or localhost.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recordingChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(recordingChunksRef.current, { type });
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        if (voiceDetectionTimerRef.current) window.clearInterval(voiceDetectionTimerRef.current);
        voiceDetectionTimerRef.current = null;
        void voiceAudioContextRef.current?.close();
        voiceAudioContextRef.current = null;
        setListening(false);
        setRecordingFallback(false);
        if (blob.size) void transcribeRecording(blob);
      };
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start();
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const recordingStartedAt = new Date().getTime();
      let heardSpeech = false;
      let lastSpeechAt = recordingStartedAt;
      voiceAudioContextRef.current = audioContext;
      voiceDetectionTimerRef.current = window.setInterval(() => {
        if (recorder.state !== 'recording') return;
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) { const normalized = (sample - 128) / 128; energy += normalized * normalized; }
        const volume = Math.sqrt(energy / samples.length);
        if (volume > 0.025) { heardSpeech = true; lastSpeechAt = new Date().getTime(); }
        const now = new Date().getTime();
        if ((heardSpeech && now - lastSpeechAt > 1300) || now - recordingStartedAt > 30000) recorder.stop();
      }, 120);
      setRecordingFallback(true);
      setListening(true);
      setError(undefined);
    } catch {
      setError('Microphone access was denied. Allow microphone permission in your browser and try again.');
    }
  };

  const toggleListening = () => {
    if (conversationRef.current) { stopConversation(); return; }
    if (listening) {
      recognitionRef.current?.abort();
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      setListening(false);
      return;
    }
    conversationRef.current = true;
    setConversationActive(true);
    setConversationStatus('listening');
    beginConversationListening();
  };

  const toggleDictation = () => {
    if (conversationRef.current || loading || transcribing) return;
    if (listening) {
      recognitionRef.current?.stop();
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      setListening(false);
      return;
    }

    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition || speechFailedRef.current) {
      void startRecorderFallback();
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG[language] ?? 'en-US';
    const baseInput = input.trim();
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0]?.transcript ?? '';
      setInput([baseInput, transcript.trim()].filter(Boolean).join(' '));
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      setError('Voice dictation stopped. Check microphone permission and try again.');
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setError(undefined);
    setListening(true);
    recognition.start();
  };

  const beginConversationListening = () => {
    if (!conversationRef.current) return;
    if (recordingFallback && recorderRef.current) { recorderRef.current.stop(); return; }
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition || speechFailedRef.current) { void startRecorderFallback(); return; }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG[language] ?? 'en-US';
    voiceBaseRef.current = input.trim();
    conversationTranscriptRef.current = '';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0]?.transcript ?? '';
      conversationTranscriptRef.current = transcript.trim();
      setInput([voiceBaseRef.current, transcript].filter(Boolean).join(' ').trimStart());
    };
    recognition.onerror = () => {
      speechFailedRef.current = true;
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const transcript = conversationTranscriptRef.current.trim();
      if (!conversationRef.current) return;
      if (transcript) {
        setConversationStatus('thinking');
        void sendMessage(transcript, messagesRef.current, true);
      } else {
        window.setTimeout(() => beginConversationListening(), 250);
      }
    };
    recognitionRef.current = recognition;
    setError(undefined);
    setListening(true);
    setConversationStatus('listening');
    recognition.start();
  };

  const addFiles = (files: File[]) => {
    const combined = [...attachments, ...files].slice(0, 3);
    if (files.some((file) => !CHAT_FILE_TYPES.includes(file.type))) { setError('Use PDF, TXT, JPG, PNG, or WebP files.'); return; }
    if (combined.reduce((total, file) => total + file.size, 0) > 10 * 1024 * 1024) { setError('Chat attachments must be 10MB or less in total.'); return; }
    setAttachments(combined);
    setError(undefined);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const encodeAttachments = () => Promise.all(attachments.map((file) => new Promise<{ name: string; mimeType: string; data: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, mimeType: file.type, data: String(reader.result).split(',')[1] ?? '' });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  })));

  const openSession = async (id: string) => {
    if (loading) return;
    const supabase = createClient();
    if (!supabase) return;
    window.speechSynthesis?.cancel();
    setHistoryOpen(false);
    setError(undefined);
    setLoading(true);
    try {
      const { data, error: loadError } = await supabase
        .from('ai_chat_messages')
        .select('id, role, text, grounding, feedback, feedback_reason')
        .eq('session_id', id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (loadError) throw new Error(t('chat.historyLoadFailed'));
      setMessages((data ?? []) as ChatMessage[]);
      setActiveSessionId(id);
      localStorage.setItem(activeChatStorageKey, id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('chat.historyLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (loading) return;
    if (!window.confirm(t('chat.deleteChatConfirm'))) return;
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('ai_chat_sessions').delete().eq('id', id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) startNewChat();
  };

  const renameSession = async (session: ChatSession, event: React.MouseEvent) => {
    event.stopPropagation();
    if (loading) return;
    const nextTitle = window.prompt('Rename conversation', session.title)?.trim();
    if (!nextTitle || nextTitle === session.title) return;
    const title = nextTitle.slice(0, 80);
    const supabase = createClient();
    if (!supabase) return;
    const { error: renameError } = await supabase.from('ai_chat_sessions').update({ title }).eq('id', session.id);
    if (renameError) {
      setError('This conversation could not be renamed.');
      return;
    }
    setSessions((current) => current.map((item) => item.id === session.id ? { ...item, title } : item));
  };

  const sendMessage = async (textValue: string, priorMessages: ChatMessage[] = messages, voiceTurn = false) => {
    const text = textValue.trim();
    if (!text || loading) return;
    const nextMessages: ChatMessage[] = [...priorMessages, { role: 'user', text }];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(undefined);

    try {
      const encodedAttachments = await encodeAttachments();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.map(({ role, text: messageText }) => ({ role, text: messageText })), sessionId: activeSessionId, language, attachments: encodedAttachments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      const assistantMessage: ChatMessage = { id: data.assistantMessageId, role: 'assistant', text: data.reply, grounding: data.grounding };
      setMessages((prev) => { const updated = [...prev, assistantMessage]; messagesRef.current = updated; return updated; });
      if (data.sessionId) {
        if (data.sessionId !== activeSessionId) setActiveSessionId(data.sessionId);
        localStorage.setItem(activeChatStorageKey, data.sessionId);
      }
      if (data.historySaved === false) setError(t('chat.historySaveFailed'));
      setAttachments([]);
      loadSessions();
      if (voiceTurn && conversationRef.current) {
        setConversationStatus('speaking');
        const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(data.reply));
        configureVoice(utterance);
        utterance.onend = () => { if (conversationRef.current) beginConversationListening(); };
        utterance.onerror = () => { if (conversationRef.current) beginConversationListening(); };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      if (voiceTurn) stopConversation();
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }));
    }
  };

  const send = async (event: FormEvent, override?: string) => {
    event.preventDefault();
    const text = (override ?? input).trim();
    await sendMessage(text);
  };

  const copyAnswer = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex((current) => current === index ? null : current), 1500);
  };

  const retryAnswer = async (index: number) => {
    const userMessage = messages[index - 1];
    if (!userMessage || userMessage.role !== 'user' || loading) return;
    const prior = messages.slice(0, index - 1);
    setFeedbackOpen(null);
    await sendMessage(userMessage.text, prior);
  };

  const saveFeedback = async (index: number, feedback: 1 | -1, reason?: FeedbackReason) => {
    const message = messages[index];
    if (!message?.id) return;
    const previous = message;
    setMessages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, feedback, feedback_reason: reason ?? null } : item));
    setFeedbackOpen(feedback === -1 && !reason ? message.id : null);
    if (feedback === -1 && !reason) return;
    try {
      const response = await fetch('/api/chat/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: message.id, feedback, reason }) });
      if (!response.ok) throw new Error();
      setFeedbackOpen(null);
    } catch {
      setMessages((current) => current.map((item, itemIndex) => itemIndex === index ? previous : item));
      setError('Feedback could not be saved. Please try again.');
    }
  };

  return (
    <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={handleDrop} className="relative mx-auto flex h-[calc(100vh-5rem)] w-full max-w-4xl flex-1 flex-col px-6 py-6 md:h-[calc(100vh-76px)] md:py-8">
      {dragging && <div className="pointer-events-none absolute inset-4 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary-light/90 text-center text-sm font-bold text-primary shadow-lg">Drop up to 3 files here</div>}
      {conversationActive && <div className="absolute inset-x-6 bottom-24 z-20 rounded-2xl border border-primary/20 bg-[#171936] p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-full ${conversationStatus === 'listening' ? 'animate-pulse bg-danger' : 'bg-primary'}`}><MicIcon width={20} /></span><div><p className="font-heading text-base font-semibold">Voice conversation</p><p className="text-xs text-white/60">{conversationStatus === 'listening' ? 'Listening… speak naturally' : conversationStatus === 'thinking' ? 'Thinking…' : 'Speaking…'}</p></div></div>
          <button type="button" onClick={stopConversation} className="rounded-xl bg-danger px-4 py-2.5 text-sm font-bold text-white shadow-lg">Stop conversation</button>
        </div>
      </div>}
      <div className="animate-fade-up flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SparkleIcon width={20} height={20} className="text-accent" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('chat.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('chat.schoolSubtitle')}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={startNewChat}
            disabled={loading}
            aria-label={t('chat.newChat')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary"
          >
            <PlusIcon width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            disabled={loading}
            aria-label={t('chat.history')}
            className={`flex h-9 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary ${
              historyOpen ? 'bg-secondary text-primary' : 'text-foreground'
            }`}
          >
            <HistoryIcon width={16} height={16} />
            <span className="hidden sm:inline">{t('chat.history')}</span>
            {sessions.length > 0 && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{sessions.length}</span>}
          </button>
        </div>
      </div>

      <div className="mt-4 flex w-fit items-center rounded-xl bg-secondary p-1 text-xs font-bold">
        <span className="rounded-lg bg-card px-4 py-2 text-primary shadow-sm">Chat</span>
        <button type="button" onClick={toggleListening} className={`rounded-lg px-4 py-2 ${conversationActive ? 'bg-danger text-white' : 'text-muted-foreground hover:text-foreground'}`}>Voice <span className="ml-1 font-normal opacity-70">Beta</span></button>
        <span className="cursor-not-allowed rounded-lg px-4 py-2 text-muted-foreground/50" title="Planned for a future release">Avatar <span className="ml-1 font-normal">Soon</span></span>
      </div>
      {availableVoices.length > 0 && <div className="mt-2 flex items-center gap-2 self-end text-xs text-muted-foreground"><span>Voice</span><select value={selectedVoice} onChange={(event) => { setSelectedVoice(event.target.value); localStorage.setItem('schoolbuddy-voice', event.target.value); }} className="max-w-48 rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground"><option value="">Best available</option>{availableVoices.filter((voice) => voice.lang.startsWith((SPEECH_LANG[language] ?? 'en').split('-')[0])).map((voice) => <option key={voice.voiceURI} value={voice.name}>{voice.name}</option>)}</select></div>}

      {historyOpen && <div className="fixed inset-0 z-10" onClick={() => setHistoryOpen(false)} />}

      {historyOpen && (
        <div className="absolute right-6 top-20 z-20 max-h-96 w-72 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('chat.history')}</p>
            <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <XIcon width={14} height={14} />
            </button>
          </div>
          {sessions.length > 0 && <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search conversations" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />}
          {sessions.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">{t('chat.noHistory')}</p>}
          <div className="mt-2 space-y-3">
            {(['Today', 'Yesterday', 'Older'] as const).map((group) => {
              const now = new Date();
              const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
              const filtered = sessions.filter((session) => session.title.toLowerCase().includes(historySearch.trim().toLowerCase())).filter((session) => {
                const updated = new Date(session.updated_at).getTime();
                return group === 'Today' ? updated >= startToday : group === 'Yesterday' ? updated >= startToday - 86400000 && updated < startToday : updated < startToday - 86400000;
              });
              if (!filtered.length) return null;
              return <div key={group}><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group}</p><div className="space-y-0.5">{filtered.map((session) => (
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
                <button type="button" onClick={(event) => renameSession(session, event)} aria-label="Rename conversation" title="Rename" className="shrink-0 rounded px-1.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-primary">Edit</button>
                <button
                  type="button"
                  onClick={(event) => deleteSession(session.id, event)}
                  aria-label={t('chat.deleteChat')}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-danger"
                >
                  <TrashIcon width={13} height={13} />
                </button>
              </div>
              ))}</div></div>;
            })}
            {sessions.length > 0 && !sessions.some((session) => session.title.toLowerCase().includes(historySearch.trim().toLowerCase())) && <p className="px-2 py-3 text-sm text-muted-foreground">No matching conversations.</p>}
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
              {message.role === 'assistant' && <ChatSources grounding={message.grounding} />}
              {message.role === 'assistant' && (
                <div className="mt-2 border-t border-border-soft pt-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => speak(message.text, i)} aria-label={speakingIndex === i ? t('chat.stop') : t('chat.listen')} title={speakingIndex === i ? t('chat.stop') : t('chat.listen')} className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-primary">
                      {speakingIndex === i ? <SpeakerOffIcon width={13} /> : <SpeakerIcon width={13} />}{speakingIndex === i ? t('chat.stop') : t('chat.listen')}
                    </button>
                    <button type="button" onClick={() => copyAnswer(message.text, i)} title="Copy answer" className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-primary"><CopyIcon width={13} />{copiedIndex === i ? 'Copied' : 'Copy'}</button>
                    <button type="button" onClick={() => retryAnswer(i)} disabled={loading} title="Try this answer again" className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-40"><RefreshIcon width={13} />Retry</button>
                    {message.id && <>
                      <span className="mx-1 h-4 w-px bg-border-soft" />
                      <button type="button" onClick={() => saveFeedback(i, 1)} aria-label="Helpful answer" title="Helpful" className={`flex h-7 w-7 items-center justify-center rounded-md ${message.feedback === 1 ? 'bg-success/10 text-success' : 'text-muted-foreground hover:bg-secondary hover:text-success'}`}><ThumbUpIcon width={13} /></button>
                      <button type="button" onClick={() => saveFeedback(i, -1)} aria-label="Not helpful answer" title="Not helpful" className={`flex h-7 w-7 items-center justify-center rounded-md ${message.feedback === -1 ? 'bg-danger/10 text-danger' : 'text-muted-foreground hover:bg-secondary hover:text-danger'}`}><ThumbDownIcon width={13} /></button>
                    </>}
                  </div>
                  {message.id && feedbackOpen === message.id && (
                    <div className="mt-2 rounded-lg bg-danger/5 p-2">
                      <p className="text-xs font-semibold text-foreground">What could be better?</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {FEEDBACK_REASONS.map((reason) => <button key={reason.value} type="button" onClick={() => saveFeedback(i, -1, reason.value)} className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-danger hover:text-danger">{reason.label}</button>)}
                      </div>
                    </div>
                  )}
                </div>
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

      {attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{attachments.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"><PaperclipIcon width={13} className="text-primary" /><span className="max-w-40 truncate font-semibold text-foreground">{file.name}</span><button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`} className="text-muted-foreground hover:text-danger"><XIcon width={12} /></button></div>)}</div>}
      {listening && !conversationActive && <div className="mt-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger"><span className="h-2 w-2 animate-pulse rounded-full bg-danger" />Listening — your words appear below in real time</div>}
      {transcribing && <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Transcribing your recording…</div>}
      <form onSubmit={send} className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-md">
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || attachments.length >= 3} aria-label="Attach files" title="Attach files" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-40"><PaperclipIcon width={17} /></button>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t('chat.placeholder')}
          className="flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground outline-none"
        />
        <button type="button" onClick={toggleDictation} disabled={loading || transcribing || conversationActive} aria-label={listening && !conversationActive ? 'Stop voice dictation' : 'Start voice dictation'} title={listening && !conversationActive ? 'Stop dictation' : 'Dictate message'} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${listening && !conversationActive ? 'bg-danger text-white' : 'text-muted-foreground hover:bg-secondary hover:text-primary'} disabled:opacity-35`}><MicIcon width={17} /></button>
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

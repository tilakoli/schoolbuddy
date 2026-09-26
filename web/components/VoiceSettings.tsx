'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

const SPEECH_LANG: Record<string, string> = { en: 'en-US', hi: 'hi-IN', te: 'te-IN' };
const VOICE_STORAGE_KEY = 'schoolbuddy-voice';
const PREVIEW_TEXT: Record<string, string> = {
  en: 'Hello! I am your School Buddy assistant.',
  hi: 'नमस्ते! मैं आपका स्कूल बडी सहायक हूँ।',
  te: 'నమస్కారం! నేను మీ స్కూల్ బడీ సహాయకుడిని.',
};

export default function VoiceSettings() {
  const { language } = useLanguage();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');

  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis?.getVoices() ?? []);
      setSelectedVoice(localStorage.getItem(VOICE_STORAGE_KEY) ?? '');
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const languageVoices = useMemo(() => {
    const target = SPEECH_LANG[language] ?? 'en-US';
    const languageCode = target.split('-')[0];
    return voices.filter((voice) => voice.lang === target || voice.lang.startsWith(languageCode));
  }, [language, voices]);

  const activeVoice = languageVoices.some((voice) => voice.name === selectedVoice) ? selectedVoice : '';

  const changeVoice = (voiceName: string) => {
    setSelectedVoice(voiceName);
    localStorage.setItem(VOICE_STORAGE_KEY, voiceName);
  };

  const preview = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(PREVIEW_TEXT[language] ?? PREVIEW_TEXT.en);
    const voice = languageVoices.find((item) => item.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? SPEECH_LANG[language] ?? 'en-US';
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={activeVoice}
          onChange={(event) => changeVoice(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">Best available voice</option>
          {languageVoices.map((voice) => (
            <option key={voice.voiceURI} value={voice.name}>{voice.name}</option>
          ))}
        </select>
        <button type="button" onClick={preview} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Preview
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Voices shown here are supplied by this browser and device. Installing an enhanced voice in your device settings can add it to this list.
      </p>
      {languageVoices.length === 0 && (
        <p className="mt-2 text-xs font-semibold text-warning">No matching voice is installed for this language.</p>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import type { ChatGrounding, ChatSource } from '@shared/domain/chat';
import { useLanguage } from '@/components/LanguageProvider';

interface Snapshot {
  total_visible_records: number;
  included_records: number;
  records: { id: string; name?: string; title?: string; class_name?: string; subject?: string; subjects?: string[]; status?: string; due_at?: string }[];
}
function readSnapshot(excerpt: string): Snapshot | null {
  try {
    const value = JSON.parse(excerpt);
    return typeof value?.total_visible_records === 'number' && typeof value?.included_records === 'number' && Array.isArray(value?.records) ? value : null;
  } catch { return null; }
}
function RecordSnapshot({ source }: { source: ChatSource }) {
  const { t } = useLanguage();
  const snapshot = readSnapshot(source.excerpt);
  if (!snapshot) return <p>{t('chat.evidence.snapshotUnavailable')}</p>;
  return <>
    <p>{t('chat.evidence.recordCount', { count: String(snapshot.included_records), total: String(snapshot.total_visible_records) })}</p>
    <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
      {snapshot.records.map((record) => <li key={record.id}>
        {[record.name ?? record.title ?? record.class_name, record.subject, record.subjects?.join(', '), record.status,
          record.due_at ? new Date(record.due_at).toLocaleDateString() : null].filter(Boolean).join(' · ')}
      </li>)}
    </ul>
  </>;
}

export default function ChatSources({ grounding }: { grounding?: ChatGrounding | null }) {
  const { t, language } = useLanguage();
  if (!grounding) return <p className="mt-3 text-xs text-muted-foreground">{t('chat.evidence.legacy')}</p>;
  return <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
    <p className="font-semibold">{t(`chat.evidence.${grounding.basis}`)}</p>
    <p className="mt-1">{t('chat.evidence.notAccuracy')}</p>
    {grounding.sources.length > 0 && <>
      <p className="mt-2">{t('chat.evidence.retrieved', { date: new Date(grounding.retrievedAt).toLocaleString(language) })}</p>
      <ul className="mt-2 space-y-2">
        {grounding.sources.map((source) => <li key={source.id} className="rounded-lg bg-secondary/50 p-2">
          <p className="font-medium text-foreground">{source.label}</p>
          <details className="mt-1">
            <summary className="cursor-pointer">{t('chat.evidence.showEvidence')}</summary>
            <div className="mt-2 whitespace-pre-wrap break-words">
              {source.kind === 'material' || source.kind === 'attachment' ? source.excerpt : <RecordSnapshot source={source} />}
            </div>
          </details>
          {source.href.startsWith('/') && !source.href.startsWith('//') &&
            <Link href={source.href} className="mt-1 inline-block font-semibold text-primary underline">{t('chat.evidence.openSource')}</Link>}
        </li>)}
      </ul>
    </>}
    {grounding.limitations.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4">
      {grounding.limitations.map((key) => <li key={key}>{t(`chat.evidence.${key}`)}</li>)}
    </ul>}
  </div>;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { createClient } from '@/lib/supabase/client';
import { getEffectiveDiscussionStatus, CURIOSITY_LABEL, READINESS_LABEL, type Discussion, type DiscussionMessage, type DiscussionThread } from '@shared/domain/discussions';
import { CURIOSITY_BADGE_CLASS, READINESS_BADGE_CLASS, THREAD_STATUS_BADGE_CLASS, THREAD_STATUS_LABEL_KEY } from './badges';
import NewDiscussionForm from './NewDiscussionForm';

function formatDue(dueAt: string | null) {
  if (!dueAt) return null;
  return new Date(dueAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

interface TargetStudent {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  classGroupId: string;
}

export default function DiscussionDetailTeacherClient({
  discussion,
  targetStudents,
  initialThreads,
  classOptions,
}: {
  discussion: Discussion;
  targetStudents: TargetStudent[];
  initialThreads: DiscussionThread[];
  classOptions: ClassOption[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [current, setCurrent] = useState(discussion);
  const [threads] = useState(initialThreads);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const threadByStudent = new Map(threads.map((thread) => [thread.student_id, thread]));
  const selectedThread = selectedStudentId ? threadByStudent.get(selectedStudentId) : undefined;
  const selectedStudent = targetStudents.find((student) => student.id === selectedStudentId);
  const status = getEffectiveDiscussionStatus(current);

  const setStatus = async (patch: Partial<Pick<Discussion, 'status' | 'due_at'>>) => {
    const supabase = createClient();
    if (!supabase) return;
    setStatusSaving(true);
    const { data } = await supabase.from('discussions').update(patch).eq('id', current.id).select('*').single();
    setStatusSaving(false);
    if (data) setCurrent(data as Discussion);
  };

  const reopen = () => {
    const pastDue = current.due_at && new Date(current.due_at) < new Date();
    setStatus({ status: 'published', ...(pastDue ? { due_at: null } : {}) });
  };

  const deleteDiscussion = async () => {
    if (!window.confirm(t('discussions.deleteConfirm'))) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from('discussions').delete().eq('id', current.id);
    if (!error) router.push('/discussions');
  };

  const openStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowFollowUp(false);
    const thread = threadByStudent.get(studentId);
    if (!thread) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    const supabase = createClient();
    if (!supabase) {
      setLoadingMessages(false);
      return;
    }
    const { data } = await supabase
      .from('discussion_messages')
      .select('id, thread_id, role, text, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as DiscussionMessage[]);
    setLoadingMessages(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{current.title}</h1>
      {current.chapter && <p className="mt-1 text-sm text-muted-foreground">{current.chapter}</p>}
      {current.due_at && <p className="mt-1 text-sm text-muted-foreground">{t('form.dueDate')}: {formatDue(current.due_at)}</p>}
      {current.instructions && <p className="mt-3 text-sm text-foreground">{current.instructions}</p>}

      {current.links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {current.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline">
              {link.label} ↗
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('discussions.status')}</span>
        {status === 'draft' && (
          <button
            onClick={() => setStatus({ status: 'published' })}
            disabled={statusSaving}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {t('discussions.publish')}
          </button>
        )}
        {status === 'published' && (
          <button
            onClick={() => setStatus({ status: 'ended' })}
            disabled={statusSaving}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {t('discussions.endNow')}
          </button>
        )}
        {status === 'ended' && (
          <button
            onClick={reopen}
            disabled={statusSaving}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {t('discussions.reopen')}
          </button>
        )}
        {status !== 'cancelled' && (
          <button
            onClick={() => setStatus({ status: 'cancelled' })}
            disabled={statusSaving}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {t('form.cancel')}
          </button>
        )}
        {status === 'cancelled' && (
          <button
            onClick={reopen}
            disabled={statusSaving}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {t('discussions.reactivate')}
          </button>
        )}
        <button onClick={deleteDiscussion} className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10">
          {t('discussions.deletePermanently')}
        </button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t('discussions.students')}</h2>
          <div className="mt-3 space-y-2">
            {targetStudents.map((student) => {
              const thread = threadByStudent.get(student.id);
              const status = thread?.status ?? 'not_started';
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => openStudent(student.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left shadow-sm ${
                    selectedStudentId === student.id ? 'border-primary bg-primary-light' : 'border-border bg-card hover:border-primary'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{student.full_name || student.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {thread?.report && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${READINESS_BADGE_CLASS[thread.report.readiness]}`}>
                        {t(READINESS_LABEL[thread.report.readiness])}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${THREAD_STATUS_BADGE_CLASS[status]}`}>
                      {t(THREAD_STATUS_LABEL_KEY[status])}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {!selectedStudentId && <p className="text-sm text-muted-foreground">{t('discussions.selectStudentHint')}</p>}
          {selectedStudentId && !selectedThread && <p className="text-sm text-muted-foreground">{t('discussions.threadNotStarted')}</p>}
          {selectedThread && (
            <div className="space-y-4">
              {selectedThread.report ? (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${READINESS_BADGE_CLASS[selectedThread.report.readiness]}`}>
                      {t(READINESS_LABEL[selectedThread.report.readiness])}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CURIOSITY_BADGE_CLASS[selectedThread.report.curiosity]}`}>
                      {t(CURIOSITY_LABEL[selectedThread.report.curiosity])}
                    </span>
                    <span className="text-xs text-muted-foreground">{t('discussions.durationMinutes', { count: String(selectedThread.report.durationMinutes) })}</span>
                  </div>
                  <p className="mt-3 text-sm text-foreground">{selectedThread.report.summary}</p>
                  {selectedThread.report.strengths.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('discussions.strengths')}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-foreground">
                        {selectedThread.report.strengths.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {selectedThread.report.gaps.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('discussions.gaps')}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-foreground">
                        {selectedThread.report.gaps.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFollowUp((v) => !v)}
                    className="mt-4 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    {t('discussions.createFollowUp')}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('discussions.inProgressNoReportYet')}</p>
              )}

              {showFollowUp && selectedStudent && (
                <NewDiscussionForm
                  classOptions={classOptions}
                  prefill={{ classId: discussion.class_id, studentId: selectedStudent.id, gaps: selectedThread.report?.gaps }}
                  onCreated={() => setShowFollowUp(false)}
                />
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('discussions.transcript')}</p>
                {loadingMessages && <p className="mt-2 text-sm text-muted-foreground">{t('common.loading')}</p>}
                <div className="mt-2 max-h-96 space-y-2 overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.id} className={`rounded-lg p-2 text-sm ${message.role === 'user' ? 'bg-secondary' : 'border border-border-soft'}`}>
                      <p className="text-xs font-semibold text-muted-foreground">{message.role === 'user' ? t('discussions.student') : t('discussions.ai')}</p>
                      <p className="mt-0.5 text-foreground">{message.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

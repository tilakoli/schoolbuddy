'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { Exam, ExamStatus } from '@shared/domain/learning';
import type { Role } from '@shared/domain/profile';
import { CalendarIcon, ClipboardIcon, PlusIcon, TrashIcon, XIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';

interface ClassOption { id: string; label: string }
interface AssignmentOption { id: string; class_id: string; title: string }
interface ExamView extends Exam { classLabel: string; assignmentTitle: string | null }

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ExamsClient({ role, userId, initialExams, classes, assignments }: {
  role: Role; userId: string; initialExams: ExamView[]; classes: ClassOption[]; assignments: AssignmentOption[];
}) {
  const canManage = role === 'teacher';
  const [exams, setExams] = useState(initialExams);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [duration, setDuration] = useState('60');
  const [room, setRoom] = useState('');
  const [instructions, setInstructions] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const matchingAssignments = useMemo(() => assignments.filter((item) => item.class_id === classId), [assignments, classId]);

  const createExam = async (event: FormEvent) => {
    event.preventDefault();
    if (!classId || !title.trim() || !startsAt) return;
    const supabase = createClient();
    if (!supabase) return;
    setSaving(true); setError(undefined);
    const payload = {
      class_id: classId, created_by: userId, title: title.trim(), description: description.trim() || null,
      starts_at: new Date(startsAt).toISOString(), duration_minutes: Number(duration), room: room.trim() || null,
      instructions: instructions.trim() || null, assignment_id: assignmentId || null, status: 'draft' as const,
    };
    const { data, error: createError } = await supabase.from('exams').insert(payload).select('*').single();
    setSaving(false);
    if (createError || !data) { setError(createError?.message ?? 'Could not create exam.'); return; }
    setExams((current) => [{ ...(data as Exam), classLabel: classes.find((item) => item.id === classId)?.label ?? '', assignmentTitle: assignments.find((item) => item.id === assignmentId)?.title ?? null }, ...current]);
    setTitle(''); setDescription(''); setStartsAt(''); setRoom(''); setInstructions(''); setAssignmentId(''); setCreating(false);
  };

  const setStatus = async (id: string, status: ExamStatus) => {
    const supabase = createClient();
    if (!supabase) return;
    const { error: updateError } = await supabase.from('exams').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (updateError) { setError(updateError.message); return; }
    setExams((current) => current.map((exam) => exam.id === id ? { ...exam, status } : exam));
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this exam schedule?')) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error: deleteError } = await supabase.from('exams').delete().eq('id', id);
    if (deleteError) { setError(deleteError.message); return; }
    setExams((current) => current.filter((exam) => exam.id !== id));
  };

  return <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
    <div className="flex items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-foreground">Exams</h1><p className="mt-2 text-sm text-muted-foreground">{canManage ? 'Schedule, publish, and connect exams to assignments.' : 'Your published exam schedule and instructions.'}</p></div>{canManage && <button onClick={() => setCreating(true)} disabled={!classes.length} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"><PlusIcon width={16}/>Schedule exam</button>}</div>
    {error && <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    {creating && <form onSubmit={createExam} className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold text-foreground">New exam</h2><button type="button" onClick={() => setCreating(false)}><XIcon width={16}/></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">
      <select value={classId} onChange={(e) => { setClassId(e.target.value); setAssignmentId(''); }} required className="rounded-lg border border-border bg-background px-3 py-2 text-sm">{classes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} placeholder="Exam title" className="rounded-lg border border-border bg-background px-3 py-2 text-sm"/>
      <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className="rounded-lg border border-border bg-background px-3 py-2 text-sm"/>
      <div className="grid grid-cols-2 gap-2"><input type="number" min={1} max={480} value={duration} onChange={(e) => setDuration(e.target.value)} required placeholder="Minutes" className="rounded-lg border border-border bg-background px-3 py-2 text-sm"/><input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={120} placeholder="Room / online" className="rounded-lg border border-border bg-background px-3 py-2 text-sm"/></div>
      <select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">No linked assignment</option>{matchingAssignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} placeholder="Short description" className="rounded-lg border border-border bg-background px-3 py-2 text-sm"/>
      <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={10000} rows={3} placeholder="Instructions and permitted materials" className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"/>
    </div><button disabled={saving} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : 'Save draft'}</button></form>}
    <div className="mt-8 grid gap-4 lg:grid-cols-2">{exams.map((exam) => <article key={exam.id} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary"><CalendarIcon width={18}/></span><div><p className="text-xs font-semibold text-primary">{exam.classLabel}</p><h2 className="mt-1 font-semibold text-foreground">{exam.title}</h2><p className="mt-1 text-sm text-muted-foreground">{formatDate(exam.starts_at)} · {exam.duration_minutes} min{exam.room ? ` · ${exam.room}` : ''}</p></div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${exam.status === 'published' ? 'bg-success/10 text-success' : exam.status === 'cancelled' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{exam.status}</span></div>
      {exam.description && <p className="mt-4 text-sm text-muted-foreground">{exam.description}</p>}{exam.instructions && <div className="mt-3 rounded-lg bg-background p-3 text-sm text-foreground"><p className="text-xs font-bold uppercase text-muted-foreground">Instructions</p><p className="mt-1 whitespace-pre-wrap">{exam.instructions}</p></div>}{exam.assignment_id && <Link href={`/assignments/${exam.assignment_id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"><ClipboardIcon width={14}/>{exam.assignmentTitle ?? 'Open assessment'}</Link>}
      {canManage && <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">{exam.status !== 'published' && <button onClick={() => setStatus(exam.id, 'published')} className="rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">Publish</button>}{exam.status === 'published' && <button onClick={() => setStatus(exam.id, 'draft')} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Unpublish</button>}{exam.status !== 'cancelled' && <button onClick={() => setStatus(exam.id, 'cancelled')} className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger">Cancel</button>}<button onClick={() => remove(exam.id)} className="ml-auto rounded p-2 text-muted-foreground hover:text-danger"><TrashIcon width={15}/></button></div>}
    </article>)}{exams.length === 0 && <div className="lg:col-span-2 rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No exams to show yet.</div>}</div>
  </main>;
}

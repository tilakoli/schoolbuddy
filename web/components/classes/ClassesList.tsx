'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { createClient } from '@/lib/supabase/client';

export interface ClassRow {
  id: string;
  name: string;
  subject: string | null;
  period: string | null;
  room: string | null;
  studentCount: number;
}

export default function ClassesList({ initialClasses, teacherId }: { initialClasses: ClassRow[]; teacherId: string }) {
  const [classes, setClasses] = useState(initialClasses);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your class sections this term</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          New class
        </button>
      </div>

      {showCreate && (
        <NewClassForm
          teacherId={teacherId}
          onCreated={(created) => {
            setClasses((prev) => [{ ...created, studentCount: 0 }, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      <div className="mt-6 space-y-2">
        {classes.length === 0 && (
          <p className="text-sm text-muted-foreground">No classes yet — create your first one above.</p>
        )}
        {classes.map((classItem, i) => {
          const tile = TILE_PALETTE[i % TILE_PALETTE.length];
          return (
            <Link
              key={classItem.id}
              href={`/classes/${classItem.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tile.bg} ${tile.text}`}>
                  {classItem.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{classItem.name}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {[classItem.subject, classItem.period, classItem.room].filter(Boolean).join(' · ') || 'No details yet'}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">{classItem.studentCount} students</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NewClassForm({ teacherId, onCreated }: { teacherId: string; onCreated: (row: Omit<ClassRow, 'studentCount'>) => void }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [period, setPeriod] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    setError(undefined);

    const { data, error: insertError } = await supabase
      .from('classes')
      .insert({
        teacher_id: teacherId,
        name: name.trim(),
        subject: subject.trim() || null,
        period: period.trim() || null,
        room: room.trim() || null,
      })
      .select('id, name, subject, period, room')
      .single();

    setLoading(false);
    if (insertError || !data) {
      setError(insertError?.message || 'Something went wrong.');
      return;
    }
    onCreated(data);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-border bg-card shadow-sm p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Class name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:col-span-2"
        />
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Period / time"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Room"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:col-span-1"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create class'}
      </button>
    </form>
  );
}

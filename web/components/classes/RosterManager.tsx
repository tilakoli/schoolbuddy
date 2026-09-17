'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface StudentOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function RosterManager({
  classGroupId,
  initialRoster,
  allStudents,
}: {
  classGroupId: string;
  initialRoster: StudentOption[];
  allStudents: StudentOption[];
}) {
  const [roster, setRoster] = useState(initialRoster);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string>();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rosterIds = new Set(roster.map((s) => s.id));
  const available = allStudents.filter(
    (s) =>
      !rosterIds.has(s.id) &&
      (s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        !search)
  );

  const addStudent = async (student: StudentOption) => {
    const supabase = createClient();
    if (!supabase) return;
    setPendingId(student.id);
    setError(undefined);
    const { error: insertError } = await supabase.from('enrollments').insert({ class_group_id: classGroupId, student_id: student.id });
    setPendingId(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setRoster((prev) => [...prev, student]);
  };

  const removeStudent = async (studentId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    setPendingId(studentId);
    setError(undefined);
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_group_id', classGroupId)
      .eq('student_id', studentId);
    setPendingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRoster((prev) => prev.filter((s) => s.id !== studentId));
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground">Roster</h2>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 space-y-2">
        {roster.length === 0 && <p className="text-sm text-muted-foreground">No students enrolled yet.</p>}
        {roster.map((student) => (
          <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{student.full_name || student.email}</p>
              <p className="truncate text-xs text-muted-foreground">{student.email}</p>
            </div>
            <button
              disabled={pendingId === student.id}
              onClick={() => removeStudent(student.id)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <input
          type="text"
          placeholder="Search students to add…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-border bg-card shadow-sm px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {available.map((student) => (
            <button
              key={student.id}
              disabled={pendingId === student.id}
              onClick={() => addStudent(student)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50"
            >
              <span className="min-w-0 truncate text-foreground">{student.full_name || student.email}</span>
              <span className="shrink-0 text-xs text-muted-foreground">Add</span>
            </button>
          ))}
          {available.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No matching students.</p>}
        </div>
      </div>
    </div>
  );
}

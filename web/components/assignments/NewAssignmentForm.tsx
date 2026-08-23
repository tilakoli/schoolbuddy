'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ASSESSMENT_TYPES, DIFFICULTIES, type AssessmentType, type AssignmentRow, type Difficulty } from './types';

interface NewAssignmentFormProps {
  classId?: string;
  classOptions?: { id: string; name: string }[];
  onCreated: (assignment: AssignmentRow) => void;
}

export default function NewAssignmentForm({ classId, classOptions, onCreated }: NewAssignmentFormProps) {
  const [selectedClassId, setSelectedClassId] = useState(classId ?? classOptions?.[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('homework');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || !selectedClassId) return;
    setLoading(true);
    setError(undefined);

    const { data, error: insertError } = await supabase
      .from('assignments')
      .insert({
        class_id: selectedClassId,
        title: title.trim(),
        description: description.trim() || null,
        assessment_type: assessmentType,
        difficulty,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      })
      .select('*')
      .single();

    setLoading(false);
    if (insertError || !data) {
      setError(insertError?.message || 'Something went wrong.');
      return;
    }
    onCreated(data as AssignmentRow);
    setTitle('');
    setDescription('');
    setDueAt('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl border border-border bg-card shadow-sm p-4">
      {classOptions && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class</label>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          >
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessment type</label>
        <div className="mt-1 flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {ASSESSMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setAssessmentType(type.value)}
              className={`min-w-[70px] flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                assessmentType === type.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {DIFFICULTIES.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setDifficulty(level.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                difficulty === level.value
                  ? 'border-transparent bg-primary-light text-primary'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due date</label>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || !title.trim() || !selectedClassId}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save assignment'}
      </button>
    </form>
  );
}

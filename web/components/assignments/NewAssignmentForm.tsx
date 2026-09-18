'use client';

import { useState, type FormEvent } from 'react';
import FormCard from '@/components/shared/FormCard';
import { useLanguage } from '@/components/LanguageProvider';
import { createClient } from '@/lib/supabase/client';
import { ASSESSMENT_TYPES, DIFFICULTIES, type AssessmentType, type AssignmentRow, type Difficulty, type RubricCriterion } from './types';

interface NewAssignmentFormProps {
  classId?: string;
  classOptions?: { id: string; name: string }[];
  onCreated: (assignment: AssignmentRow) => void;
}

interface DraftCriterion {
  id: string;
  criterion: string;
  max_points: number;
}

export default function NewAssignmentForm({ classId, classOptions, onCreated }: NewAssignmentFormProps) {
  const { t } = useLanguage();
  const [selectedClassId, setSelectedClassId] = useState(classId ?? classOptions?.[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('homework');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [dueAt, setDueAt] = useState('');
  const [showRubric, setShowRubric] = useState(false);
  const [rubric, setRubric] = useState<DraftCriterion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const addCriterion = () => {
    setRubric((prev) => [...prev, { id: crypto.randomUUID(), criterion: '', max_points: 5 }]);
  };

  const updateCriterion = (id: string, patch: Partial<DraftCriterion>) => {
    setRubric((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCriterion = (id: string) => {
    setRubric((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || !selectedClassId) return;
    setLoading(true);
    setError(undefined);

    const usableRubric: RubricCriterion[] = showRubric
      ? rubric.filter((c) => c.criterion.trim()).map((c) => ({ id: c.id, criterion: c.criterion.trim(), max_points: c.max_points }))
      : [];

    const { data, error: insertError } = await supabase
      .from('assignments')
      .insert({
        class_id: selectedClassId,
        title: title.trim(),
        description: description.trim() || null,
        assessment_type: assessmentType,
        difficulty,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        rubric: usableRubric.length > 0 ? usableRubric : null,
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
    setRubric([]);
    setShowRubric(false);
  };

  return (
    <FormCard>
    <form onSubmit={handleSubmit} className="space-y-4">
      {classOptions && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('form.class')}</label>
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
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('form.title')}</label>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('form.description')}</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('assignment.assessmentType')}</label>
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
              {t(type.label)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('assignment.difficulty')}</label>
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
              {t(level.label)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('form.dueDate')}</label>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('assignment.rubricOptional')}</label>
          <button
            type="button"
            onClick={() => {
              setShowRubric((v) => !v);
              if (!showRubric && rubric.length === 0) addCriterion();
            }}
            className="text-xs font-semibold text-primary"
          >
            {showRubric ? t('assignment.removeRubric') : t('assignment.addRubric')}
          </button>
        </div>
        {showRubric && (
          <div className="mt-2 space-y-2">
            {rubric.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t('assignment.criterionPlaceholder')}
                  value={c.criterion}
                  onChange={(event) => updateCriterion(c.id, { criterion: event.target.value })}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <input
                  type="number"
                  min={1}
                  placeholder={t('assignment.points')}
                  value={c.max_points}
                  onChange={(event) => updateCriterion(c.id, { max_points: Number(event.target.value) })}
                  className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <button type="button" onClick={() => removeCriterion(c.id)} className="shrink-0 text-xs font-medium text-danger">
                  {t('form.remove')}
                </button>
              </div>
            ))}
            <button type="button" onClick={addCriterion} className="text-xs font-semibold text-primary">
              {t('assignment.addCriterion')}
            </button>
            <p className="text-xs text-muted-foreground">{t('assignment.rubricHelp')}</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || !title.trim() || !selectedClassId}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {loading ? t('form.saving') : t('assignment.saveAssignment')}
      </button>
    </form>
    </FormCard>
  );
}

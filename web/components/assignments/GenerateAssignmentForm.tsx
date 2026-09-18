'use client';

import { useState, type ReactNode } from 'react';
import { SparkleIcon } from '@/components/icons';
import { useLanguage } from '@/components/LanguageProvider';
import FormCard from '@/components/shared/FormCard';
import { createClient } from '@/lib/supabase/client';
import { DIFFICULTIES, DIFFICULTY_GUIDANCE, type AssignmentRow, type Difficulty } from './types';

interface DraftQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface MaterialOption {
  id: string;
  title: string;
}

export default function GenerateAssignmentForm({
  classId,
  materials,
  onCreated,
  onClose,
  classPicker,
}: {
  classId: string;
  materials: MaterialOption[];
  onCreated: (assignment: AssignmentRow) => void;
  onClose: () => void;
  // Only the general Assignments page (which spans several classes) needs
  // this — it renders its own "Class" select above the rest of the form,
  // inside this same card, so the two tabs (Manual/Generate) look identical.
  classPicker?: ReactNode;
}) {
  const { t, language } = useLanguage();
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [guidance, setGuidance] = useState(DIFFICULTY_GUIDANCE.medium);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [passScore, setPassScore] = useState(0);
  const [dueAt, setDueAt] = useState('');
  const [publishing, setPublishing] = useState(false);

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const selectDifficulty = (level: Difficulty) => {
    setDifficulty(level);
    setGuidance(DIFFICULTY_GUIDANCE[level]);
  };

  const generate = async () => {
    if (selectedMaterialIds.length === 0) {
      setError('Pick at least one material.');
      return;
    }
    setGenerating(true);
    setError(undefined);
    try {
      const res = await fetch('/api/assignments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, materialIds: selectedMaterialIds, questionCount, difficulty, guidance, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed.');

      setTitle(data.title);
      setDescription(data.description);
      setQuestions(data.questions);
      setPassScore(Math.ceil(data.questions.length / 2));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (id: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const updateOption = (id: string, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, options: q.options.map((o, i) => (i === optionIndex ? value : o)) } : q))
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const publish = async () => {
    const supabase = createClient();
    if (!supabase || questions.length === 0 || !title.trim()) return;
    setPublishing(true);
    setError(undefined);

    try {
      const { data: assignment, error: insertError } = await supabase
        .from('assignments')
        .insert({
          class_id: classId,
          title: title.trim(),
          description: description.trim() || null,
          assessment_type: 'test',
          difficulty,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          questions: questions.map(({ id, prompt, options }) => ({ id, prompt, options })),
          pass_score: passScore,
          source_material_ids: selectedMaterialIds,
        })
        .select('*')
        .single();
      if (insertError || !assignment) throw new Error(insertError?.message || 'Could not save the test.');

      const { error: keyError } = await supabase.from('assignment_answer_keys').insert({
        assignment_id: assignment.id,
        answers: questions.map(({ id, correct_index, explanation }) => ({ id, correct_index, explanation })),
      });
      if (keyError) throw new Error(keyError.message);

      onCreated(assignment as AssignmentRow);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setPublishing(false);
    }
  };

  const isReviewing = questions.length > 0;

  return (
    <FormCard>
      {!isReviewing && (
        <>
          {classPicker}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('assignment.sourceMaterials')}</label>
            {materials.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t('assignment.noExtractedMaterials')}</p>
            ) : (
              <div className="mt-2 space-y-1">
                {materials.map((material) => (
                  <label key={material.id} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedMaterialIds.includes(material.id)}
                      onChange={() => toggleMaterial(material.id)}
                    />
                    {material.title}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('assignment.numberOfQuestions')}</label>
              <input
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('assignment.difficulty')}</label>
              <div className="mt-1 flex gap-2">
                {DIFFICULTIES.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => selectDifficulty(level.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      difficulty === level.value ? 'border-transparent bg-primary-light text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {t(level.label)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('assignment.guidanceLabel')}</label>
            <textarea
              value={guidance}
              onChange={(event) => setGuidance(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('assignment.guidanceHelp')}</p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={generate}
              disabled={generating || materials.length === 0}
              className="ai-border-glow flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              <SparkleIcon width={14} height={14} className={generating ? 'animate-spin' : ''} />
              {generating ? t('assignment.generating') : t('assignment.generate')}
            </button>
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              {t('form.cancel')}
            </button>
          </div>
        </>
      )}

      {isReviewing && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('assignment.reviewBeforePublishing')}</p>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('form.title')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('form.description')}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />

          <div className="space-y-3">
            {questions.map((question, qi) => (
              <div key={question.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={question.prompt}
                    onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary"
                  />
                  <button onClick={() => removeQuestion(question.id)} className="shrink-0 text-xs font-medium text-danger">
                    {t('form.remove')}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {question.options.map((option, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={question.correct_index === oi}
                        onChange={() => updateQuestion(question.id, { correct_index: oi })}
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(event) => updateOption(question.id, oi, event.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('assignment.questionSelectCorrect', { n: String(qi + 1) })}</p>
                <input
                  type="text"
                  value={question.explanation}
                  onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })}
                  placeholder={t('assignment.explanationPlaceholder')}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('assignment.passScoreOutOf', { total: String(questions.length) })}
              </label>
              <input
                type="number"
                min={0}
                max={questions.length}
                value={passScore}
                onChange={(event) => setPassScore(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
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
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={publish}
              disabled={publishing || questions.length === 0 || !title.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {publishing ? t('assignment.publishing') : t('assignment.publishTest')}
            </button>
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              {t('form.cancel')}
            </button>
          </div>
        </>
      )}
    </FormCard>
  );
}

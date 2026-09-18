'use client';

import { useEffect, useState } from 'react';
import { ClipboardIcon, SparkleIcon } from '@/components/icons';
import { useLanguage } from '@/components/LanguageProvider';
import EmptyState from '@/components/shared/EmptyState';
import FormCard from '@/components/shared/FormCard';
import { createClient } from '@/lib/supabase/client';
import AssignmentListItem from './AssignmentListItem';
import GenerateAssignmentForm from './GenerateAssignmentForm';
import NewAssignmentForm from './NewAssignmentForm';
import type { AssignmentRow } from './types';

export interface AssignmentWithClass extends AssignmentRow {
  className: string;
}

interface MaterialOption {
  id: string;
  title: string;
}

type CreateTab = 'manual' | 'generate';

export default function AssignmentsPageClient({
  initialAssignments,
  classOptions,
}: {
  initialAssignments: AssignmentWithClass[];
  classOptions?: { id: string; name: string }[];
}) {
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<CreateTab>('manual');
  const [generateClassId, setGenerateClassId] = useState(classOptions?.[0]?.id ?? '');
  const [materialsState, setMaterialsState] = useState<{ classId: string; materials: MaterialOption[] } | null>(null);
  const classNameById = new Map(classOptions?.map((c) => [c.id, c.name]));

  useEffect(() => {
    if (tab !== 'generate' || !generateClassId) return;
    const supabase = createClient();
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('materials')
      .select('id, title')
      .eq('class_id', generateClassId)
      .eq('status', 'extracted')
      .order('title')
      .then(({ data }) => {
        if (cancelled) return;
        setMaterialsState({ classId: generateClassId, materials: data ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [tab, generateClassId]);

  const loadingMaterials = materialsState?.classId !== generateClassId;
  const materials = materialsState?.classId === generateClassId ? materialsState.materials : [];

  const addCreated = (created: AssignmentRow) => {
    setAssignments((prev) => [{ ...created, className: classNameById.get(created.class_id) ?? '' }, ...prev]);
    setShowCreate(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.assignments')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classOptions ? t('assignment.acrossAllClasses') : t('assignment.acrossAllSubjects')}
          </p>
        </div>
        {classOptions && classOptions.length > 0 && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            {showCreate ? t('form.close') : t('assignment.newAssignment')}
          </button>
        )}
      </div>

      {showCreate && classOptions && (
        <div className="mt-4">
          <div className="flex max-w-xs gap-1 rounded-lg bg-secondary p-1">
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === 'manual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('assignment.manual')}
            </button>
            <button
              type="button"
              onClick={() => setTab('generate')}
              className={`ai-border-glow flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-foreground ${
                tab === 'generate' ? 'bg-card shadow-sm' : ''
              }`}
            >
              <SparkleIcon width={13} height={13} className="text-accent" />
              {t('assignment.generateWithAi')}
            </button>
          </div>

          {tab === 'manual' && <NewAssignmentForm classOptions={classOptions} onCreated={addCreated} />}

          {tab === 'generate' &&
            (loadingMaterials ? (
              <FormCard>
                <p className="text-sm text-muted-foreground">{t('assignment.loadingMaterials')}</p>
              </FormCard>
            ) : (
              <GenerateAssignmentForm
                key={generateClassId}
                classId={generateClassId}
                materials={materials}
                onCreated={addCreated}
                onClose={() => setShowCreate(false)}
                classPicker={
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('form.class')}</label>
                    <select
                      value={generateClassId}
                      onChange={(event) => setGenerateClassId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {classOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              />
            ))}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {assignments.length === 0 && (
          <EmptyState icon={ClipboardIcon} title={t('assignment.noAssignmentsYetShort')} description={t('assignment.noAssignmentsYetDesc')} />
        )}
        {assignments.map((assignment) => (
          <AssignmentListItem key={assignment.id} assignment={assignment} className={assignment.className} />
        ))}
      </div>
    </div>
  );
}

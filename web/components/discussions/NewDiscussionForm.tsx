'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { SparkleIcon } from '@/components/icons';
import { useLanguage } from '@/components/LanguageProvider';
import FormCard from '@/components/shared/FormCard';
import { createClient } from '@/lib/supabase/client';
import type { Discussion, DiscussionLink, DiscussionTargetType } from '@shared/domain/discussions';

interface ClassOption {
  id: string;
  name: string;
  classGroupId: string;
}

interface MaterialOption {
  id: string;
  title: string;
  chapter: string | null;
  extracted_text: string | null;
}

interface StudentOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface DiscussionPrefill {
  classId: string;
  studentId: string;
  gaps?: string[];
}

export default function NewDiscussionForm({
  classOptions,
  prefill,
  onCreated,
}: {
  classOptions: ClassOption[];
  prefill?: DiscussionPrefill;
  onCreated: (discussion: Discussion) => void;
}) {
  const { t, language } = useLanguage();
  const [selectedClassId, setSelectedClassId] = useState(prefill?.classId ?? classOptions[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [instructions, setInstructions] = useState('');
  const [links, setLinks] = useState<DiscussionLink[]>([]);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<DiscussionTargetType>(prefill ? 'students' : 'class');
  const [roster, setRoster] = useState<StudentOption[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(prefill ? [prefill.studentId] : []);
  const [dueAt, setDueAt] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const selectedClass = classOptions.find((option) => option.id === selectedClassId);

  useEffect(() => {
    if (!selectedClassId) return;
    const supabase = createClient();
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('materials')
      .select('id, title, chapter, extracted_text')
      .eq('class_id', selectedClassId)
      .eq('status', 'extracted')
      .order('title')
      .then(({ data }) => {
        if (!cancelled) setMaterials(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClass || targetType !== 'students') return;
    const supabase = createClient();
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('enrollments')
      .select('profiles(id, full_name, email)')
      .eq('class_group_id', selectedClass.classGroupId)
      .then(({ data }) => {
        if (cancelled) return;
        const students = ((data ?? []) as unknown as { profiles: StudentOption }[]).map((row) => row.profiles).filter(Boolean);
        setRoster(students);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClass, targetType]);

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    if (!/^https:\/\//i.test(url)) {
      setError(t('discussions.linkUrlInvalid'));
      return;
    }
    setLinks((prev) => [...prev, { label: linkLabel.trim() || url, url }]);
    setLinkLabel('');
    setLinkUrl('');
    setError(undefined);
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const draftWithAi = async () => {
    if (!selectedClassId) return;
    setDrafting(true);
    setError(undefined);
    try {
      const response = await fetch('/api/discussions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClassId, materialIds: selectedMaterialIds, chapter: chapter.trim() || null, language }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not draft instructions.');
      setInstructions((current) => [current.trim(), data.instructions].filter(Boolean).join('\n\n'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not draft instructions.');
    } finally {
      setDrafting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || !selectedClassId || !title.trim()) return;
    if (targetType === 'students' && selectedStudentIds.length === 0) {
      setError(t('discussions.pickAtLeastOneStudent'));
      return;
    }
    setLoading(true);
    setError(undefined);

    const { data: inserted, error: insertError } = await supabase
      .from('discussions')
      .insert({
        class_id: selectedClassId,
        title: title.trim(),
        chapter: chapter.trim() || null,
        instructions: instructions.trim() || null,
        source_material_ids: selectedMaterialIds,
        links,
        target_type: targetType,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        status: publishNow ? 'published' : 'draft',
      })
      .select('*')
      .single();
    if (insertError || !inserted) {
      setLoading(false);
      setError(insertError?.message || 'Could not create this discussion.');
      return;
    }

    if (targetType === 'students') {
      const { error: targetsError } = await supabase
        .from('discussion_targets')
        .insert(selectedStudentIds.map((studentId) => ({ discussion_id: inserted.id, student_id: studentId })));
      if (targetsError) {
        setLoading(false);
        setError(targetsError.message);
        return;
      }
    }

    setLoading(false);
    onCreated(inserted as Discussion);
  };

  return (
    <FormCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('form.class')}</label>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            disabled={!!prefill}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
          >
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>

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
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('materials.chapterOptional')}</label>
          <input
            type="text"
            value={chapter}
            onChange={(event) => setChapter(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('discussions.materials')}</label>
          {materials.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t('assignment.noExtractedMaterials')}</p>
          ) : (
            <div className="mt-2 space-y-1">
              {materials.map((material) => (
                <label key={material.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={selectedMaterialIds.includes(material.id)} onChange={() => toggleMaterial(material.id)} />
                  {material.title}{material.chapter ? ` · ${material.chapter}` : ''}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('discussions.links')}</label>
          {links.length > 0 && (
            <div className="mt-2 space-y-1">
              {links.map((link, index) => (
                <div key={`${link.url}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate text-foreground">{link.label}</span>
                  <button type="button" onClick={() => removeLink(index)} className="shrink-0 text-xs font-medium text-danger">{t('form.remove')}</button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              placeholder={t('discussions.linkLabelPlaceholder')}
              value={linkLabel}
              onChange={(event) => setLinkLabel(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addLink(); } }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="https://..."
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addLink(); } }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <button type="button" onClick={addLink} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">
              {t('form.add')}
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('discussions.instructions')}</label>
            <button
              type="button"
              onClick={draftWithAi}
              disabled={drafting || !selectedClassId}
              className="ai-border-glow flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-50"
            >
              <SparkleIcon width={13} height={13} className="text-accent" />
              {drafting ? t('discussions.drafting') : t('discussions.draftWithAi')}
            </button>
          </div>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
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

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('discussions.targetAudience')}</label>
          <div className="mt-1 flex w-fit gap-1 rounded-lg bg-secondary p-1">
            <button
              type="button"
              onClick={() => setTargetType('class')}
              disabled={!!prefill}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${targetType === 'class' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {t('discussions.wholeClass')}
            </button>
            <button
              type="button"
              onClick={() => setTargetType('students')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${targetType === 'students' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {t('discussions.specificStudents')}
            </button>
          </div>
          {targetType === 'students' && (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {roster.length === 0 && <p className="text-sm text-muted-foreground">{t('roster.noStudentsEnrolledYet')}</p>}
              {roster.map((student) => (
                <label key={student.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                  {student.full_name || student.email}
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} />
          {t('discussions.publishNow')}
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading || !title.trim() || !selectedClassId}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          {loading ? t('form.saving') : publishNow ? t('discussions.publish') : t('discussions.saveDraft')}
        </button>
      </form>
    </FormCard>
  );
}

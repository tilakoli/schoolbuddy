'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { GridIcon } from '@/components/icons';
import { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { useLanguage } from '@/components/LanguageProvider';
import EmptyState from '@/components/shared/EmptyState';
import { createClient } from '@/lib/supabase/client';
import type { ClassGroupSummary } from '@/lib/classGroups';

const NEW_OPTION = '__new__';

export interface GroupOption {
  id: string;
  name: string;
}

export interface SubjectOption {
  id: string;
  name: string;
  teacherName?: string | null;
}

type Props =
  | { initialClasses: ClassGroupSummary[]; canManage: false }
  | {
      initialClasses: ClassGroupSummary[];
      canManage: true;
      groupOptions: GroupOption[];
      subjectOptions: SubjectOption[];
      schoolId: string;
    };

export default function ClassesList(props: Props) {
  const { t } = useLanguage();
  const { initialClasses, canManage } = props;
  const [classes, setClasses] = useState(initialClasses);
  const [groups, setGroups] = useState(canManage ? props.groupOptions : []);
  // Subjects are only ever created via teacher onboarding now, never inline
  // here, so this list doesn't need a setter — it's fixed for the session.
  const [subjects] = useState(canManage ? props.subjectOptions : []);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.classes')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManage ? t('classes.everyClassInSchool') : t('classes.yourSubjectAcrossClasses')}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            {t('classes.newClass')}
          </button>
        )}
      </div>

      {canManage && showCreate && (
        <NewClassForm
          schoolId={props.schoolId}
          groups={groups}
          subjects={subjects}
          onGroupCreated={(group) => setGroups((prev) => [...prev, group])}
          onCreated={({ groupId, groupName, subjectNames }) => {
            setClasses((prev) => {
              const idx = prev.findIndex((g) => g.id === groupId);
              if (idx === -1) {
                return [...prev, { id: groupId, name: groupName, subjectNames, studentCount: 0 }].sort((a, b) =>
                  a.name.localeCompare(b.name)
                );
              }
              const updated = [...prev];
              const existing = updated[idx];
              const merged = [...existing.subjectNames];
              subjectNames.forEach((s) => {
                if (!merged.includes(s)) merged.push(s);
              });
              updated[idx] = { ...existing, subjectNames: merged };
              return updated;
            });
            setShowCreate(false);
          }}
        />
      )}

      <div className="mt-6 space-y-2">
        {classes.length === 0 && (
          <EmptyState
            icon={GridIcon}
            title={t('classes.noClassesYetShort')}
            description={canManage ? t('classes.createFirstOneAbove') : t('classes.adminWillAssign')}
          />
        )}
        {classes.map((classItem, i) => {
          const tile = TILE_PALETTE[i % TILE_PALETTE.length];
          const href = canManage ? `/classes/${classItem.id}` : `/classes/${classItem.id}/subjects/${classItem.offeringId}`;
          return (
            <Link
              key={classItem.id}
              href={href}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tile.bg} ${tile.text}`}>
                  {classItem.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{classItem.name}</p>
                  {canManage && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {classItem.subjectNames.join(' · ') || t('classes.noSubjectsYet')}
                    </p>
                  )}
                </div>
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">{classItem.studentCount} {t('dashboard.statStudents').toLowerCase()}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NewClassForm({
  schoolId,
  groups,
  subjects,
  onGroupCreated,
  onCreated,
}: {
  schoolId: string;
  groups: GroupOption[];
  subjects: SubjectOption[];
  onGroupCreated: (group: GroupOption) => void;
  onCreated: (result: { groupId: string; groupName: string; subjectNames: string[] }) => void;
}) {
  const { t } = useLanguage();
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? NEW_OPTION);
  const [newGroupName, setNewGroupName] = useState('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [period, setPeriod] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || subjectIds.length === 0) return;
    setLoading(true);
    setError(undefined);

    try {
      let resolvedGroupId = groupId;
      let groupName = groups.find((g) => g.id === groupId)?.name ?? '';
      if (groupId === NEW_OPTION) {
        if (!newGroupName.trim()) throw new Error('Enter a class name.');
        const { data: group, error: groupError } = await supabase
          .from('class_groups')
          .insert({ school_id: schoolId, name: newGroupName.trim() })
          .select('id, name')
          .single();
        if (groupError || !group) throw new Error(groupError?.message || 'Could not create class.');
        resolvedGroupId = group.id;
        groupName = group.name;
        onGroupCreated(group);
      }

      // teacher_id isn't sent — a DB trigger sets it from each subject's own
      // teacher, since a subject has exactly one teacher school-wide.
      const rows = subjectIds.map((subjectId) => ({
        school_id: schoolId,
        class_group_id: resolvedGroupId,
        subject_id: subjectId,
        name: subjects.find((s) => s.id === subjectId)?.name ?? '',
        period: period.trim() || null,
        room: room.trim() || null,
      }));
      const { error: insertError } = await supabase.from('classes').insert(rows);
      if (insertError) throw new Error(insertError.message);

      onCreated({ groupId: resolvedGroupId, groupName, subjectNames: rows.map((r) => r.name) });
      setNewGroupName('');
      setSubjectIds([]);
      setPeriod('');
      setRoom('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-border bg-card shadow-sm p-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('form.class')}</label>
        <select
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:w-1/2"
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
          <option value={NEW_OPTION}>{t('classes.newClassOption')}</option>
        </select>
        {groupId === NEW_OPTION && (
          <input
            type="text"
            placeholder={t('classes.newClassName')}
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:w-1/2"
          />
        )}
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('classes.subjectsTaughtInClass')}</label>
        {subjects.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {t('classes.noSubjectsOnboard')}
          </p>
        ) : (
          <div className="mt-2 space-y-1">
            {subjects.map((subject) => (
              <label key={subject.id} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={subjectIds.includes(subject.id)} onChange={() => toggleSubject(subject.id)} />
                {subject.name}
                {subject.teacherName ? ` (${subject.teacherName})` : ''}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder={t('form.period')}
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder={t('form.room')}
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || subjectIds.length === 0}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {loading
          ? t('classes.creating')
          : subjectIds.length > 1
            ? t('classes.createClassWithCount', { count: String(subjectIds.length) })
            : t('classes.createClass')}
      </button>
    </form>
  );
}

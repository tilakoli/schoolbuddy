'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import RosterManager, { type StudentOption } from '@/components/classes/RosterManager';
import type { MaterialRow } from '@/components/curriculum/SubjectMaterials';

export interface OfferingRow {
  id: string;
  subjectName: string;
  teacherName: string | null;
  period: string | null;
  room: string | null;
}

interface SubjectOption {
  id: string;
  name: string;
  teacherName: string | null;
}

const STATUS_STYLE: Record<MaterialRow['status'], string> = {
  pending: 'bg-warning/10 text-warning',
  extracted: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
};

const TABS = ['Students', 'Subjects', 'Materials'] as const;
type Tab = (typeof TABS)[number];

export default function ClassGroupDetail({
  groupId,
  groupName,
  offerings,
  roster,
  allStudents,
  subjectOptions,
  materials,
  schoolId,
}: {
  groupId: string;
  groupName: string;
  offerings: OfferingRow[];
  roster: StudentOption[];
  allStudents: StudentOption[];
  subjectOptions: SubjectOption[];
  materials: MaterialRow[];
  schoolId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Students');
  const [offeringList, setOfferingList] = useState(offerings);
  const [materialList, setMaterialList] = useState(materials);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const deleteGroup = async () => {
    if (!window.confirm(`Delete "${groupName}" and all its subjects, roster, assignments, and materials? This can't be undone.`)) return;
    const supabase = createClient();
    if (!supabase) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      const materialIds = materialList.map((m) => m.id);
      if (materialIds.length > 0) {
        const { data: files } = await supabase.from('material_files').select('file_path').in('material_id', materialIds);
        if (files && files.length > 0) await supabase.storage.from('materials').remove(files.map((f) => f.file_path));
      }
      const { error } = await supabase.from('class_groups').delete().eq('id', groupId);
      if (error) throw new Error(error.message);
      router.push('/classes');
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete class.');
      setDeleting(false);
    }
  };

  const removeOffering = async (offering: OfferingRow) => {
    if (!window.confirm(`Remove ${offering.subjectName} from this class? Its assignments and materials will be deleted too.`)) return;
    const supabase = createClient();
    if (!supabase) return;
    try {
      const materialIds = materialList.filter((m) => m.class_id === offering.id).map((m) => m.id);
      if (materialIds.length > 0) {
        const { data: files } = await supabase.from('material_files').select('file_path').in('material_id', materialIds);
        if (files && files.length > 0) await supabase.storage.from('materials').remove(files.map((f) => f.file_path));
      }
      const { error } = await supabase.from('classes').delete().eq('id', offering.id);
      if (error) throw new Error(error.message);
      setOfferingList((prev) => prev.filter((o) => o.id !== offering.id));
      setMaterialList((prev) => prev.filter((m) => m.class_id !== offering.id));
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not remove subject.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/classes" className="text-sm font-medium text-primary">
          ← Classes
        </Link>
        <button
          onClick={deleteGroup}
          disabled={deleting}
          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete class'}
        </button>
      </div>
      <h1 className="mt-4 text-2xl font-bold text-foreground">{groupName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {offeringList.map((o) => o.subjectName).join(' · ') || 'No subjects yet'}
      </p>
      {deleteError && <p className="mt-2 text-sm text-danger">{deleteError}</p>}

      <div className="mt-6 flex gap-1 rounded-lg bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold ${
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Students' && <RosterManager classGroupId={groupId} initialRoster={roster} allStudents={allStudents} />}

        {tab === 'Subjects' && (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Subjects</h2>
              <button
                onClick={() => setShowAddSubject((v) => !v)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Assign subject
              </button>
            </div>

            {showAddSubject && (
              <AddSubjectForm
                groupId={groupId}
                schoolId={schoolId}
                subjects={subjectOptions.filter((s) => !offeringList.some((o) => o.subjectName === s.name))}
                onCreated={(newOfferings) => {
                  setOfferingList((prev) => [...prev, ...newOfferings]);
                  setShowAddSubject(false);
                }}
              />
            )}

            <div className="mt-4 space-y-2">
              {offeringList.length === 0 && <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>}
              {offeringList.map((offering) => (
                <div
                  key={offering.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4"
                >
                  <Link href={`/classes/${groupId}/subjects/${offering.id}`} className="min-w-0 flex-1 hover:opacity-80">
                    <p className="truncate font-semibold text-foreground">{offering.subjectName}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {[offering.teacherName, offering.period, offering.room].filter(Boolean).join(' · ') || 'No details yet'}
                    </p>
                  </Link>
                  <button
                    onClick={() => removeOffering(offering)}
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Materials' && (
          <div>
            <h2 className="text-lg font-bold text-foreground">Materials</h2>
            <p className="mt-1 text-sm text-muted-foreground">Uploaded from each subject&apos;s own page, shown here for this class.</p>
            <div className="mt-4 space-y-2">
              {materialList.length === 0 && <p className="text-sm text-muted-foreground">No materials uploaded yet.</p>}
              {materialList.map((material) => (
                <div key={material.id} className="rounded-xl border border-border bg-card shadow-sm p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{material.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[material.className, material.chapter].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[material.status]}`}>
                      {material.status}
                    </span>
                  </div>
                  {material.status === 'extracted' && material.summary && (
                    <p className="mt-2 text-sm text-muted-foreground">{material.summary}</p>
                  )}
                  {material.status === 'failed' && material.error_message && (
                    <p className="mt-2 text-sm text-danger">{material.error_message}</p>
                  )}
                  {material.status === 'extracted' && material.extracted_text && (
                    <button
                      onClick={() => setExpandedMaterialId(expandedMaterialId === material.id ? null : material.id)}
                      className="mt-2 text-xs font-semibold text-primary"
                    >
                      {expandedMaterialId === material.id ? 'Hide extracted text' : 'View extracted text'}
                    </button>
                  )}
                  {expandedMaterialId === material.id && material.extracted_text && (
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-background p-3 text-xs text-muted-foreground">
                      {material.extracted_text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddSubjectForm({
  groupId,
  schoolId,
  subjects,
  onCreated,
}: {
  groupId: string;
  schoolId: string;
  subjects: SubjectOption[];
  onCreated: (offerings: OfferingRow[]) => void;
}) {
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
      // teacher_id isn't sent — a DB trigger sets it from each subject's own
      // teacher, since a subject has exactly one teacher school-wide.
      const rows = subjectIds.map((subjectId) => ({
        school_id: schoolId,
        class_group_id: groupId,
        subject_id: subjectId,
        name: subjects.find((s) => s.id === subjectId)?.name ?? '',
        period: period.trim() || null,
        room: room.trim() || null,
      }));
      const { data, error: insertError } = await supabase.from('classes').insert(rows).select('id, subject_id, period, room');
      if (insertError || !data) throw new Error(insertError?.message || 'Something went wrong.');

      const teacherNameBySubject = new Map(subjects.map((s) => [s.id, s.teacherName]));
      const nameBySubject = new Map(subjects.map((s) => [s.id, s.name]));
      onCreated(
        data.map((row) => ({
          id: row.id,
          subjectName: nameBySubject.get(row.subject_id) ?? '',
          teacherName: teacherNameBySubject.get(row.subject_id) ?? null,
          period: row.period,
          room: row.room,
        }))
      );
      setSubjectIds([]);
      setPeriod('');
      setRoom('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (subjects.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No more subjects to assign — every subject in the school is already taught here, or none have been onboarded yet.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-border bg-card shadow-sm p-4">
      <div className="space-y-1">
        {subjects.map((subject) => (
          <label key={subject.id} className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={subjectIds.includes(subject.id)} onChange={() => toggleSubject(subject.id)} />
            {subject.name}
            {subject.teacherName ? ` (${subject.teacherName})` : ''}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
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
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || subjectIds.length === 0}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {loading ? 'Assigning…' : `Assign ${subjectIds.length > 1 ? `${subjectIds.length} subjects` : 'subject'}`}
      </button>
    </form>
  );
}

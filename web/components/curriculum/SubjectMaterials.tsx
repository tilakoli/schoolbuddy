'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface MaterialRow {
  id: string;
  class_id: string;
  className: string;
  title: string;
  chapter: string | null;
  status: 'pending' | 'extracted' | 'failed';
  extracted_text: string | null;
  summary: string | null;
  error_message: string | null;
}

const STATUS_STYLE: Record<MaterialRow['status'], string> = {
  pending: 'bg-warning/10 text-warning',
  extracted: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
};

const MAX_SINGLE_PDF_BYTES = 15 * 1024 * 1024;
const MAX_BATCH_BYTES = 25 * 1024 * 1024;

export default function SubjectMaterials({
  classId,
  initialMaterials,
  teacherId,
}: {
  classId: string;
  initialMaterials: MaterialRow[];
  teacherId: string;
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const updateMaterial = (material: MaterialRow) => {
    setMaterials((prev) => prev.map((m) => (m.id === material.id ? material : m)));
  };

  const retryExtraction = async (materialId: string) => {
    setBusyId(materialId);
    setError(undefined);
    try {
      const res = await fetch('/api/materials/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId }),
      });
      const updated = await res.json();
      if (updated?.id) updateMaterial({ ...updated, className: '' });
    } catch {
      setError('Retry failed — check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteMaterial = async (material: MaterialRow) => {
    const supabase = createClient();
    if (!supabase) return;
    setBusyId(material.id);
    setError(undefined);
    try {
      const { data: files } = await supabase.from('material_files').select('file_path').eq('material_id', material.id);
      if (files && files.length > 0) await supabase.storage.from('materials').remove(files.map((f) => f.file_path));
      const { error: deleteError } = await supabase.from('materials').delete().eq('id', material.id);
      if (deleteError) throw new Error(deleteError.message);
      setMaterials((prev) => prev.filter((m) => m.id !== material.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete material.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Materials</h2>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          Upload material
        </button>
      </div>

      {showUpload && (
        <UploadForm
          classId={classId}
          teacherId={teacherId}
          onCreated={(material) => {
            setMaterials((prev) => [material, ...prev]);
            setShowUpload(false);
          }}
          onUpdated={updateMaterial}
        />
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-4 space-y-2">
        {materials.length === 0 && <p className="text-sm text-muted-foreground">No materials uploaded yet.</p>}
        {materials.map((material) => (
          <div key={material.id} className="rounded-xl border border-border bg-card shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{material.title}</p>
                {material.chapter && <p className="mt-1 truncate text-xs text-muted-foreground">{material.chapter}</p>}
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
                onClick={() => setExpandedId(expandedId === material.id ? null : material.id)}
                className="mt-2 text-xs font-semibold text-primary"
              >
                {expandedId === material.id ? 'Hide extracted text' : 'View extracted text'}
              </button>
            )}
            {expandedId === material.id && material.extracted_text && (
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-background p-3 text-xs text-muted-foreground">
                {material.extracted_text}
              </p>
            )}

            <div className="mt-3 flex gap-2">
              {material.status === 'failed' && (
                <button
                  onClick={() => retryExtraction(material.id)}
                  disabled={busyId === material.id}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  {busyId === material.id ? 'Retrying…' : 'Retry extraction'}
                </button>
              )}
              <button
                onClick={() => deleteMaterial(material)}
                disabled={busyId === material.id}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                {busyId === material.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadForm({
  classId,
  teacherId,
  onCreated,
  onUpdated,
}: {
  classId: string;
  teacherId: string;
  onCreated: (material: MaterialRow) => void;
  onUpdated: (material: MaterialRow) => void;
}) {
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<'uploading' | 'extracting' | null>(null);
  const [error, setError] = useState<string>();

  const handleFiles = (selected: FileList | null) => {
    const list = Array.from(selected ?? []);
    setError(undefined);

    if (list.length === 0) {
      setFiles([]);
      return;
    }
    if (list.length === 1 && list[0].type === 'application/pdf') {
      if (list[0].size > MAX_SINGLE_PDF_BYTES) {
        setError('This PDF is too large (over 15MB, roughly 50+ pages) — try splitting it into smaller sections.');
        setFiles([]);
        return;
      }
      setFiles(list);
      return;
    }
    if (list.some((f) => f.type === 'application/pdf')) {
      setError('Pick either one PDF, or several images (e.g. photos of notebook pages) — not both together.');
      setFiles([]);
      return;
    }
    const totalBytes = list.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_BATCH_BYTES) {
      setError('These files together are too large (over 25MB) — try uploading fewer at a time.');
      setFiles([]);
      return;
    }
    setFiles(list);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || files.length === 0) return;

    setStage('uploading');
    setError(undefined);

    try {
      const materialId = crypto.randomUUID();

      const uploaded = await Promise.all(
        files.map(async (file, index) => {
          const filePath = `${classId}/${materialId}/${index}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from('materials').upload(filePath, file, {
            contentType: file.type,
          });
          if (uploadError) throw new Error(uploadError.message);
          return { file_path: filePath, mime_type: file.type, position: index };
        })
      );

      const { data: inserted, error: insertError } = await supabase
        .from('materials')
        .insert({
          id: materialId,
          class_id: classId,
          teacher_id: teacherId,
          title: title.trim(),
          chapter: chapter.trim() || null,
        })
        .select('*')
        .single();
      if (insertError || !inserted) throw new Error(insertError?.message || 'Could not save material.');

      const { error: filesError } = await supabase
        .from('material_files')
        .insert(uploaded.map((f) => ({ material_id: materialId, ...f })));
      if (filesError) throw new Error(filesError.message);

      onCreated({ ...inserted, className: '' });
      setTitle('');
      setChapter('');
      setFiles([]);
      setStage('extracting');

      const res = await fetch('/api/materials/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId }),
      });
      const updated = await res.json();
      if (updated?.id) onUpdated({ ...updated, className: '' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setStage(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-border bg-card shadow-sm p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Chapter (optional)"
          value={chapter}
          onChange={(event) => setChapter(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>
      <input
        type="file"
        accept="application/pdf,image/*"
        multiple
        onChange={(event) => handleFiles(event.target.files)}
        className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
      />
      <p className="text-xs text-muted-foreground">
        One PDF (15MB max), or several photos of pages (e.g. a notebook) — those get combined into one material.
        {files.length > 1 && ` ${files.length} files selected.`}
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={!!stage || files.length === 0 || !title.trim()}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {stage === 'uploading' ? 'Uploading…' : stage === 'extracting' ? 'Extracting…' : 'Upload'}
      </button>
    </form>
  );
}

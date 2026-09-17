'use client';

import { useState } from 'react';
import { SparkleIcon } from '@/components/icons';
import AssignmentListItem from '@/components/assignments/AssignmentListItem';
import GenerateAssignmentForm from '@/components/assignments/GenerateAssignmentForm';
import NewAssignmentForm from '@/components/assignments/NewAssignmentForm';
import type { AssignmentRow } from '@/components/assignments/types';

interface MaterialOption {
  id: string;
  title: string;
}

export default function ClassAssignments({
  classId,
  initialAssignments,
  extractedMaterials,
}: {
  classId: string;
  initialAssignments: AssignmentRow[];
  extractedMaterials?: MaterialOption[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Assignments</h2>
        <div className="flex gap-2">
          {extractedMaterials && (
            <button
              onClick={() => {
                setShowGenerate((v) => !v);
                setShowCreate(false);
              }}
              className="ai-border-glow flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              <SparkleIcon width={13} height={13} className="text-accent" />
              Generate with AI
            </button>
          )}
          <button
            onClick={() => {
              setShowCreate((v) => !v);
              setShowGenerate(false);
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            New assignment
          </button>
        </div>
      </div>

      {showCreate && (
        <NewAssignmentForm
          classId={classId}
          onCreated={(created) => {
            setAssignments((prev) => [created, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {showGenerate && extractedMaterials && (
        <GenerateAssignmentForm
          classId={classId}
          materials={extractedMaterials}
          onCreated={(created) => {
            setAssignments((prev) => [created, ...prev]);
            setShowGenerate(false);
          }}
          onClose={() => setShowGenerate(false)}
        />
      )}

      <div className="mt-4 space-y-2">
        {assignments.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
        {assignments.map((assignment) => (
          <AssignmentListItem key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </div>
  );
}

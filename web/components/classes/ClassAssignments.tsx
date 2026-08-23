'use client';

import { useState } from 'react';
import AssignmentListItem from '@/components/assignments/AssignmentListItem';
import NewAssignmentForm from '@/components/assignments/NewAssignmentForm';
import type { AssignmentRow } from '@/components/assignments/types';

export default function ClassAssignments({ classId, initialAssignments }: { classId: string; initialAssignments: AssignmentRow[] }) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Assignments</h2>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          New assignment
        </button>
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

      <div className="mt-4 space-y-2">
        {assignments.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
        {assignments.map((assignment) => (
          <AssignmentListItem key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </div>
  );
}

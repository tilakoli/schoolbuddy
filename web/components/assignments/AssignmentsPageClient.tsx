'use client';

import { useState } from 'react';
import AssignmentListItem from './AssignmentListItem';
import NewAssignmentForm from './NewAssignmentForm';
import type { AssignmentRow } from './types';

export interface AssignmentWithClass extends AssignmentRow {
  className: string;
}

export default function AssignmentsPageClient({
  initialAssignments,
  classOptions,
}: {
  initialAssignments: AssignmentWithClass[];
  classOptions?: { id: string; name: string }[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [showCreate, setShowCreate] = useState(false);
  const classNameById = new Map(classOptions?.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classOptions ? 'Across all your classes' : 'Across all your subjects'}
          </p>
        </div>
        {classOptions && classOptions.length > 0 && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            New assignment
          </button>
        )}
      </div>

      {showCreate && classOptions && (
        <NewAssignmentForm
          classOptions={classOptions}
          onCreated={(created) => {
            setAssignments((prev) => [{ ...created, className: classNameById.get(created.class_id) ?? '' }, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      <div className="mt-6 space-y-2">
        {assignments.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
        {assignments.map((assignment) => (
          <AssignmentListItem key={assignment.id} assignment={assignment} className={assignment.className} />
        ))}
      </div>
    </div>
  );
}

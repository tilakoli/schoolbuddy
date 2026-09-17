import type { ReactNode } from 'react';

// The one card chrome every form on the site should sit in — used by
// NewAssignmentForm, GenerateAssignmentForm, and anything else that needs
// the same "boxed form" look, so they stay visually consistent by
// construction instead of by copy-pasted classNames.
export default function FormCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 space-y-4 rounded-xl border border-border bg-card shadow-sm p-4 ${className}`}>{children}</div>;
}

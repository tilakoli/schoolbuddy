import type { ComponentType, SVGProps } from 'react';

// A consistent "nothing here yet" treatment — an icon in a soft tile plus a
// dashed boundary, instead of a line of gray text floating alone on the
// page. Used wherever a list/section can legitimately be empty.
export default function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <Icon width={18} height={18} />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

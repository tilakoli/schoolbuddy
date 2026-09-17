import type { ReactNode } from 'react';

export const TILE_PALETTE = [
  { bg: 'bg-primary/10', text: 'text-primary' },
  { bg: 'bg-info/10', text: 'text-info' },
  { bg: 'bg-warning/10', text: 'text-warning' },
  { bg: 'bg-success/10', text: 'text-success' },
] as const;

export default function DashboardBanner({
  eyebrow,
  name,
  subtitle,
  summary,
  actions,
}: {
  eyebrow: string;
  name: string;
  subtitle?: string;
  summary?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="animate-fade-up relative overflow-hidden rounded-2xl bg-primary p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-20 h-40 w-40 rounded-full bg-white/10" />
      <p className="relative text-sm text-primary-foreground/70">{eyebrow}</p>
      <h1 className="relative mt-1 text-2xl font-bold text-primary-foreground sm:text-3xl">{name}</h1>
      {subtitle && <p className="relative mt-0.5 text-sm text-primary-foreground/80">{subtitle}</p>}
      {summary && <p className="relative mt-2 max-w-md text-sm text-primary-foreground/80">{summary}</p>}
      {actions && <div className="relative mt-5 flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

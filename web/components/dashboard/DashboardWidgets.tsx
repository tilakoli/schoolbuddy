import Link from 'next/link';
import type { ComponentType, ReactNode, SVGProps } from 'react';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type Tone = 'primary' | 'info' | 'warning' | 'success' | 'danger';

const TONES: Record<Tone, { surface: string; text: string; bar: string }> = {
  primary: { surface: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' },
  info: { surface: 'bg-info/10', text: 'text-info', bar: 'bg-info' },
  warning: { surface: 'bg-warning/10', text: 'text-warning', bar: 'bg-warning' },
  success: { surface: 'bg-success/10', text: 'text-success', bar: 'bg-success' },
  danger: { surface: 'bg-danger/10', text: 'text-danger', bar: 'bg-danger' },
};

export function DashboardKpi({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  delay = 0,
}: {
  icon: Icon;
  label: string;
  value: number | string;
  detail: string;
  tone: Tone;
  delay?: number;
}) {
  const colors = TONES[tone];
  return (
    <article className="dashboard-card animate-dashboard-in relative overflow-hidden p-5" style={{ animationDelay: `${delay}ms` }}>
      <span className={`absolute inset-x-0 top-0 h-1 ${colors.bar}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors.surface} ${colors.text}`}>
          <Icon width={20} height={20} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

export function DashboardPanel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`dashboard-card p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className="shrink-0 text-sm font-bold text-primary hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export interface BarDatum {
  label: string;
  value: number;
}

export function AnimatedBarChart({ data, valueLabel }: { data: BarDatum[]; valueLabel: string }) {
  const visible = data.slice(0, 7);
  const max = Math.max(1, ...visible.map((item) => item.value));

  if (visible.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No class data yet.</p>;
  }

  return (
    <div>
      <div className="flex h-56 items-end gap-3 border-b border-border-soft px-1 pt-5" role="img" aria-label={valueLabel}>
        {visible.map((item, index) => {
          const height = item.value === 0 ? 4 : Math.max(12, (item.value / max) * 100);
          return (
            <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-bold text-foreground">{item.value}</span>
              <div className="flex h-[78%] w-full items-end justify-center">
                <div
                  className="chart-bar w-full max-w-11 rounded-t-lg bg-primary"
                  style={{ '--bar-height': `${height}%`, animationDelay: `${120 + index * 70}ms` } as React.CSSProperties}
                />
              </div>
              <span className="w-full truncate text-center text-[11px] text-muted-foreground" title={item.label}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>{valueLabel}</caption>
        <tbody>{visible.map((item) => <tr key={item.label}><th>{item.label}</th><td>{item.value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function ProgressBreakdown({
  items,
}: {
  items: Array<{ label: string; value: number; total: number; tone: Tone }>;
}) {
  return (
    <div className="space-y-5">
      {items.map((item, index) => {
        const percent = item.total ? Math.round((item.value / item.total) * 100) : 0;
        return (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-foreground">{item.label}</span>
              <span className="text-muted-foreground">{item.value} · {percent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={`chart-progress h-full rounded-full ${TONES[item.tone].bar}`}
                style={{ '--progress-width': `${percent}%`, animationDelay: `${150 + index * 100}ms` } as React.CSSProperties}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

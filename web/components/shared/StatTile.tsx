import type { ComponentType, SVGProps } from 'react';

const TONE_CLASS = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  info: { bg: 'bg-info/10', text: 'text-info' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
  success: { bg: 'bg-success/10', text: 'text-success' },
} as const;

export type StatTileTone = keyof typeof TONE_CLASS;

// The colorful tinted-tile look every dashboard already uses for its stats
// (TILE_PALETTE) — pulled out so pages like Performance and the student
// detail page can have the same visual weight instead of a plain white box.
export default function StatTile({
  icon: Icon,
  value,
  label,
  tone,
  style,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: string;
  label: string;
  tone: StatTileTone;
  style?: React.CSSProperties;
}) {
  const t = TONE_CLASS[tone];
  return (
    <div className={`animate-fade-up rounded-xl ${t.bg} p-4`} style={style}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-card ${t.text}`}>
        <Icon width={16} height={16} />
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

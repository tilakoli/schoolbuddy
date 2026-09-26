export default function LoadingIndicator({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'w-full' : 'flex min-h-[45vh] w-full flex-col items-center justify-center px-6'} role="status" aria-live="polite">
      <div className="loading-track w-full max-w-xs overflow-hidden rounded-full bg-secondary">
        <div className="loading-progress h-1 rounded-full bg-primary" />
      </div>
      {!compact && <p className="mt-4 text-sm font-semibold text-muted-foreground">Preparing your workspace…</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
}

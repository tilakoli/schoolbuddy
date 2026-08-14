export default function ConfigNotice() {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
      Supabase isn&apos;t configured yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>web/.env.local</code>.
    </div>
  );
}

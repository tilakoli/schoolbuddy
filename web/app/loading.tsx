// Same idea as app/(app)/loading.tsx, for the public routes (/, /login,
// /forgot-password) that still fetch on the server (e.g. checking for an
// existing session).
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading" />
    </div>
  );
}

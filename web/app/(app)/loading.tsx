// Next.js shows this automatically the moment a navigation into any page
// under app/(app) starts (App Router Suspense) — the Sidebar stays mounted
// (it lives in the layout, not here), only this content area swaps in,
// so there's always immediate feedback that a click did something.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-10">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading" />
    </main>
  );
}

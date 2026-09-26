// Next.js shows this automatically the moment a navigation into any page
// under app/(app) starts (App Router Suspense) — the Sidebar stays mounted
// (it lives in the layout, not here), only this content area swaps in,
// so there's always immediate feedback that a click did something.
import LoadingIndicator from '@/components/LoadingIndicator';

export default function Loading() {
  return <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10"><LoadingIndicator /></main>;
}

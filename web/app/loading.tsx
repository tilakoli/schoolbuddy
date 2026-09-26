// Same idea as app/(app)/loading.tsx, for the public routes (/, /login,
// /forgot-password) that still fetch on the server (e.g. checking for an
// existing session).
import LoadingIndicator from '@/components/LoadingIndicator';

export default function Loading() {
  return <LoadingIndicator />;
}

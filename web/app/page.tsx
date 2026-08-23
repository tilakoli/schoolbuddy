import Link from 'next/link';
import { APP_CONFIG } from '@/constants/config';
import { createClient } from '@/lib/supabase/server';

const FEATURES = [
  ['For teachers', 'Manage classes, post assignments, and track submissions in one place.'],
  ['For students', 'See upcoming work and class schedules at a glance.'],
  ['Managed access', 'Accounts are provisioned by your school administrator — no public sign-up.'],
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-foreground">{APP_CONFIG.name}</span>
          <Link
            href={user ? '/dashboard' : '/login'}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {user ? 'Dashboard' : 'Sign in'}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="text-xs font-bold tracking-[0.15em] text-primary">SCHOOL BUDDY</p>
          <h1 className="mt-3 text-4xl font-bold text-foreground sm:text-5xl">{APP_CONFIG.tagline}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            One shared workspace for classes, assignments, and progress — built for teachers and students
            at your school.
          </p>
          <Link
            href={user ? '/dashboard' : '/login'}
            className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {user ? 'Go to dashboard' : 'Sign in to continue'}
          </Link>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-3">
          {FEATURES.map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-border bg-card shadow-sm p-6">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        {APP_CONFIG.name} · Questions? {APP_CONFIG.supportEmail}
      </footer>
    </>
  );
}

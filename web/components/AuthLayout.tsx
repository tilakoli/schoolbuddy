import Link from 'next/link';
import type { ReactNode } from 'react';
import { BookIcon, CheckIcon, ShieldIcon, SparkleIcon } from '@/components/icons';
import { APP_CONFIG } from '@/constants/config';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-card lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-24 -top-20 h-96 w-96 rounded-full bg-white/[0.06]" />
        <Link href="/" className="relative flex items-center gap-3 font-heading text-xl font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><BookIcon /></span>
          {APP_CONFIG.name}
        </Link>

        <div className="relative max-w-xl py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide"><SparkleIcon width={15} /> LEARNING, CONNECTED</span>
          <h1 className="mt-7 text-4xl font-semibold leading-tight xl:text-5xl">One school workspace for teaching, learning and progress.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/75">Classes, assignments, learning materials and grounded AI help come together in one calm workspace.</p>
        </div>

        <div className="relative grid gap-3 text-sm text-primary-foreground/85 sm:grid-cols-3">
          <span className="flex items-center gap-2"><CheckIcon width={16} /> Role-aware access</span>
          <span className="flex items-center gap-2"><ShieldIcon width={16} /> School-managed</span>
          <span className="flex items-center gap-2"><SparkleIcon width={16} /> AI with sources</span>
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <Link href="/" className="font-heading text-lg font-semibold text-foreground lg:hidden">{APP_CONFIG.name}</Link>
          <Link href="/signup" className="text-sm font-bold text-primary hover:underline">Need an account?</Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-8 sm:px-10">
          <div className="animate-fade-up w-full max-w-md rounded-2xl border border-border-soft bg-card p-6 shadow-md sm:p-8">{children}</div>
        </div>
      </section>
    </main>
  );
}

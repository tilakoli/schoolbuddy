import Link from 'next/link';
import {
  BookIcon,
  CalendarIcon,
  ChatIcon,
  ClipboardIcon,
  FileTextIcon,
  MailIcon,
  ShieldIcon,
  SparkleIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@/components/icons';
import { APP_CONFIG } from '@/constants/config';
import { createClient } from '@/lib/supabase/server';

const AUDIENCES = [
  {
    icon: BookIcon,
    title: 'Teachers',
    description:
      'Upload class materials, generate AI-assisted tests with adjustable difficulty, grade with rubrics, and track every class in one place.',
  },
  {
    icon: UsersIcon,
    title: 'Students',
    description: 'See assignments as they’re posted, submit your work, and track your scores and progress over time.',
  },
  {
    icon: ShieldIcon,
    title: 'Admins',
    description: 'Provision accounts, structure classes and subjects, and get a school-wide view — no public sign-up, ever.',
  },
] as const;

const CAPABILITIES = [
  {
    icon: SparkleIcon,
    title: 'AI-generated tests',
    description: 'Draft multiple-choice tests from uploaded materials, with difficulty guidance a teacher can fine-tune before publishing.',
    ai: true,
  },
  {
    icon: ClipboardIcon,
    title: 'Rubric-based grading',
    description: 'Score freeform work criterion by criterion, with the total computed automatically — no spreadsheet needed.',
    ai: false,
  },
  {
    icon: FileTextIcon,
    title: 'Smart materials',
    description: 'Upload PDFs or photos of notes — even several at once — and get clean, structured extracted text back.',
    ai: false,
  },
  {
    icon: TrendingUpIcon,
    title: 'Performance tracking',
    description: 'Average scores, pass rates, and history — for one student, one class, or a whole subject.',
    ai: false,
  },
  {
    icon: CalendarIcon,
    title: 'Timetable',
    description: 'A real weekly schedule grid, built from actual class meeting times, for teachers and students alike.',
    ai: false,
  },
  {
    icon: ChatIcon,
    title: 'AI Chat',
    description: 'A built-in assistant for quick questions, available to every role, on web and mobile.',
    ai: true,
  },
] as const;

const STEPS = [
  ['1', 'Admin sets up the school', 'Accounts, classes, and subjects are provisioned centrally — there’s no self-serve sign-up.'],
  ['2', 'Teachers run their subject', 'Upload materials, generate or write assignments, and grade submissions as they come in.'],
  ['3', 'Students learn and track progress', 'Submit work, get feedback, and watch performance build over the term.'],
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const primaryHref = user ? '/dashboard' : '/login';
  const primaryLabel = user ? 'Dashboard' : 'Login';

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-heading text-lg font-semibold text-foreground">
            {APP_CONFIG.name}
          </Link>
          <div className="flex items-center gap-5">
            <a
              href={`mailto:${APP_CONFIG.supportEmail}`}
              className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline"
            >
              Contact us
            </a>
            <Link href={primaryHref} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-20 pb-24">
          <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-16 top-40 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
            <div className="animate-fade-up">
              <p className="text-xs font-bold tracking-[0.15em] text-primary">SCHOOL BUDDY</p>
              <h1 className="mt-3 font-heading text-4xl font-semibold text-foreground sm:text-5xl">{APP_CONFIG.tagline}</h1>
              <p className="mt-4 max-w-lg text-base text-muted-foreground">
                One shared workspace for classes, assignments, materials, and progress — built for teachers and
                students at your school, with AI doing the busywork.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={primaryHref} className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground">
                  {user ? 'Go to dashboard' : 'Sign in to continue'}
                </Link>
                <a href="#capabilities" className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground">
                  See what&apos;s inside
                </a>
              </div>
            </div>

            <div className="animate-fade-up" style={{ animationDelay: '0.12s' }}>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
                </div>

                <div className="relative mt-4 overflow-hidden rounded-xl bg-primary p-4">
                  <div aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
                  <p className="relative text-xs text-primary-foreground/70">Welcome back</p>
                  <p className="relative mt-1 font-heading text-lg font-semibold text-primary-foreground">Priya Sharma</p>
                  <p className="relative text-xs text-primary-foreground/80">Mathematics teacher</p>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[
                    ['4', 'Classes'],
                    ['96', 'Students'],
                    ['3', 'Due'],
                    ['18', 'Tests'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-lg bg-secondary p-2 text-center">
                      <p className="font-heading text-base font-semibold text-foreground">{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">Linear Equations Quiz</span>
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Active</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">Chapter 4 Notes</span>
                    <span className="text-[10px] text-muted-foreground">Extracted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-3">
            {AUDIENCES.map(({ icon: Icon, title, description }, i) => (
              <div
                key={title}
                className="animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Icon width={20} height={20} />
                </div>
                <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="border-y border-border bg-secondary/40 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="animate-fade-up max-w-xl">
              <p className="text-xs font-bold tracking-[0.15em] text-primary">WHAT&apos;S INSIDE</p>
              <h2 className="mt-2 font-heading text-3xl font-semibold text-foreground">Everything a class actually needs</h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map(({ icon: Icon, title, description, ai }, i) => (
                <div
                  key={title}
                  className="animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent ${ai ? 'ai-glow' : ''}`}>
                    <Icon width={18} height={18} />
                  </div>
                  <h3 className={`mt-3 text-sm font-semibold ${ai ? 'ai-shimmer-text' : 'text-foreground'}`}>{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="animate-fade-up max-w-xl">
            <p className="text-xs font-bold tracking-[0.15em] text-primary">HOW IT WORKS</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold text-foreground">Set up once, run all year</h2>
          </div>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {STEPS.map(([n, title, description], i) => (
              <div key={n} className="animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="font-heading text-3xl font-semibold text-primary/25">{n}</span>
                <h3 className="mt-2 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="px-6 pb-24">
          <div className="animate-fade-up relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center sm:px-16">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div aria-hidden className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-white/10" />
            <h2 className="relative font-heading text-2xl font-semibold text-primary-foreground sm:text-3xl">
              Ready when your school is.
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-primary-foreground/80">
              Ask your administrator for an account, or sign in if you already have one.
            </p>
            <Link
              href={primaryHref}
              className="relative mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
            >
              {user ? 'Go to dashboard' : 'Sign in'}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
          <div>
            <span className="font-heading text-base font-semibold text-foreground">{APP_CONFIG.name}</span>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{APP_CONFIG.tagline}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#capabilities" className="text-muted-foreground hover:text-foreground">
                  What&apos;s inside
                </a>
              </li>
              <li>
                <Link href={primaryHref} className="text-muted-foreground hover:text-foreground">
                  {primaryLabel}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Contact</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={`mailto:${APP_CONFIG.supportEmail}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <MailIcon width={14} height={14} /> {APP_CONFIG.supportEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_CONFIG.name}. Accounts are provisioned by your school administrator.
        </p>
      </footer>
    </>
  );
}

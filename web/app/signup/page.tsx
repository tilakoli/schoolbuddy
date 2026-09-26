import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import { CheckIcon, MailIcon, ShieldIcon, UsersIcon } from '@/components/icons';

const steps = [
  { icon: UsersIcon, title: 'Contact your school', detail: 'Ask your school administrator or teacher for School Buddy access.' },
  { icon: MailIcon, title: 'Receive your account', detail: 'Your school creates the correct role and shares your sign-in details securely.' },
  { icon: CheckIcon, title: 'Sign in and learn', detail: 'Use the same account on the web app and the mobile app.' },
];

export default function SignupPage() {
  return (
    <AuthLayout>
      <p className="text-xs font-bold tracking-[0.15em] text-primary">JOIN SCHOOL BUDDY</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Your school creates your account.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">School Buddy keeps student, teacher and administrator access tied to a verified school. Public self-registration is therefore unavailable.</p>

      <div className="mt-7 space-y-4">
        {steps.map(({ icon: Icon, title, detail }, index) => (
          <div key={title} className="animate-dashboard-in flex gap-3 rounded-xl border border-border-soft bg-background p-4" style={{ animationDelay: `${index * 70}ms` }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon width={18} /></span>
            <div><h2 className="text-sm font-bold text-foreground">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3 rounded-xl bg-primary-light p-4 text-sm text-primary">
        <ShieldIcon className="mt-0.5 shrink-0" />
        <p>Your school assigns the right permissions, classes and learning data to your account.</p>
      </div>

      <Link href="/login" className="mt-7 block w-full rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-foreground">I already have an account</Link>
    </AuthLayout>
  );
}

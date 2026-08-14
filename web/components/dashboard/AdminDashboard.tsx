import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboard({ name }: { name: string }) {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.from('profiles').select('role') : { data: null };

  const admins = data?.filter((row) => row.role === 'admin').length ?? 0;
  const teachers = data?.filter((row) => row.role === 'teacher').length ?? 0;
  const students = data?.filter((row) => row.role === 'student').length ?? 0;

  const stats = [
    { label: 'Teachers', value: teachers },
    { label: 'Students', value: students },
    { label: 'Admins', value: admins },
    { label: 'Total accounts', value: admins + teachers + students },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{name}</h1>
        </div>
        <Link
          href="/settings"
          aria-label="Open settings"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-lg"
        >
          ⚙
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">User management</h2>
      <div className="rounded-xl border border-border bg-card p-4 opacity-60">
        <p className="font-semibold text-foreground">Create and manage teacher &amp; student accounts</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Coming soon. For now, provision accounts from the Supabase dashboard.
        </p>
      </div>
    </>
  );
}

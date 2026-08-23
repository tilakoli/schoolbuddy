import Link from 'next/link';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
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
      <DashboardBanner
        eyebrow="Welcome back"
        name={name}
        summary={`Overseeing ${admins + teachers + students} accounts across the school.`}
        actions={
          <>
            <Link href="/admin/teachers" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
              + New teacher
            </Link>
            <Link href="/admin/students" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-primary-foreground">
              Manage students
            </Link>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, i) => {
          const tile = TILE_PALETTE[i % TILE_PALETTE.length];
          return (
            <div key={stat.label} className={`rounded-xl ${tile.bg} p-4`}>
              <p className={`text-2xl font-bold ${tile.text}`}>{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">User management</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/teachers" className="rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary">
          <p className="font-semibold text-foreground">Manage teachers</p>
          <p className="mt-1 text-sm text-muted-foreground">Create, restrict, and reset passwords for teacher accounts.</p>
        </Link>
        <Link href="/admin/students" className="rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary">
          <p className="font-semibold text-foreground">Manage students</p>
          <p className="mt-1 text-sm text-muted-foreground">Create, restrict, and reset passwords for student accounts.</p>
        </Link>
      </div>
    </>
  );
}

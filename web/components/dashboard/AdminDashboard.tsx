import Link from 'next/link';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { getServerT } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboard({ name }: { name: string }) {
  const supabase = await createClient();
  const t = await getServerT();
  const [{ data: profileRows }, { data: classGroups }, { data: subjects }, { data: assignments }] = supabase
    ? await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('class_groups').select('id'),
        supabase.from('subjects').select('id'),
        supabase.from('assignments').select('id'),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }];

  const admins = profileRows?.filter((row) => row.role === 'admin').length ?? 0;
  const vicePrincipals = profileRows?.filter((row) => row.role === 'vice_principal').length ?? 0;
  const teachers = profileRows?.filter((row) => row.role === 'teacher').length ?? 0;
  const students = profileRows?.filter((row) => row.role === 'student').length ?? 0;
  const staff = admins + vicePrincipals;

  const stats = [
    { label: t('nav.teachers'), value: teachers },
    { label: t('dashboard.statStudents'), value: students },
    { label: t('dashboard.statStaff'), value: staff },
    { label: t('dashboard.statTotalAccounts'), value: staff + teachers + students },
  ];

  const schoolStats = [
    { label: t('dashboard.statClasses'), value: classGroups?.length ?? 0 },
    { label: t('dashboard.statSubjects'), value: subjects?.length ?? 0 },
    { label: t('nav.assignments'), value: assignments?.length ?? 0 },
  ];

  return (
    <>
      <DashboardBanner
        eyebrow={t('dashboard.welcomeBack')}
        name={name}
        summary={t('dashboard.overseeingSummary', { count: String(staff + teachers + students) })}
        actions={
          <>
            <Link href="/admin/teachers" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
              {t('dashboard.newTeacher')}
            </Link>
            <Link href="/admin/students" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-primary-foreground">
              {t('dashboard.manageStudents')}
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

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">{t('dashboard.schoolOverview')}</h2>
      <div className="grid grid-cols-3 gap-3">
        {schoolStats.map((stat, i) => {
          const tile = TILE_PALETTE[(i + 4) % TILE_PALETTE.length];
          return (
            <div key={stat.label} className={`rounded-xl ${tile.bg} p-4`}>
              <p className={`text-2xl font-bold ${tile.text}`}>{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">{t('dashboard.userManagement')}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/teachers" className="rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary">
          <p className="font-semibold text-foreground">{t('dashboard.manageTeachers')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.manageTeachersDesc')}</p>
        </Link>
        <Link href="/admin/students" className="rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary">
          <p className="font-semibold text-foreground">{t('dashboard.manageStudents')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.manageStudentsDesc')}</p>
        </Link>
      </div>
    </>
  );
}

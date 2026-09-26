import Link from 'next/link';
import DashboardBanner from '@/components/dashboard/DashboardBanner';
import { AnimatedBarChart, DashboardKpi, DashboardPanel, ProgressBreakdown } from '@/components/dashboard/DashboardWidgets';
import { BookIcon, ClipboardIcon, GridIcon, ShieldIcon, UsersIcon } from '@/components/icons';
import { getServerT } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'vice_principal' | 'teacher' | 'student';
  restricted: boolean;
  created_at: string;
}
interface ClassGroupRow { id: string; name: string }
interface EnrollmentRow { class_group_id: string }
interface AssignmentRow { status: 'active' | 'ended' | 'cancelled'; due_at: string | null }

function roleLabel(role: ProfileRow['role']) {
  if (role === 'vice_principal') return 'Vice principal';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function AdminDashboard({ name }: { name: string }) {
  const supabase = await createClient();
  const t = await getServerT();
  const results = supabase
    ? await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role, restricted, created_at').order('created_at', { ascending: false }),
        supabase.from('class_groups').select('id, name').order('name'),
        supabase.from('enrollments').select('class_group_id'),
        supabase.from('subjects').select('id'),
        supabase.from('assignments').select('status, due_at'),
      ])
    : [];

  const profiles = (results[0]?.data ?? []) as ProfileRow[];
  const classGroups = (results[1]?.data ?? []) as ClassGroupRow[];
  const enrollments = (results[2]?.data ?? []) as EnrollmentRow[];
  const subjects = results[3]?.data ?? [];
  const assignments = (results[4]?.data ?? []) as AssignmentRow[];
  const teachers = profiles.filter((row) => row.role === 'teacher').length;
  const students = profiles.filter((row) => row.role === 'student').length;
  const staff = profiles.filter((row) => row.role === 'admin' || row.role === 'vice_principal').length;
  const restricted = profiles.filter((row) => row.restricted).length;
  const now = new Date().getTime();
  const activeAssignments = assignments.filter((item) => item.status === 'active' && (!item.due_at || new Date(item.due_at).getTime() >= now)).length;
  const dueSoon = assignments.filter((item) => {
    if (item.status !== 'active' || !item.due_at) return false;
    const difference = new Date(item.due_at).getTime() - now;
    return difference >= 0 && difference < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const enrollmentCounts = new Map<string, number>();
  enrollments.forEach((row) => enrollmentCounts.set(row.class_group_id, (enrollmentCounts.get(row.class_group_id) ?? 0) + 1));
  const classChart = classGroups.map((group) => ({ label: group.name, value: enrollmentCounts.get(group.id) ?? 0 }));

  return (
    <div className="space-y-6">
      <DashboardBanner
        eyebrow={t('dashboard.welcomeBack')}
        name={name}
        summary={t('dashboard.overseeingSummary', { count: String(profiles.length) })}
        actions={<><Link href="/admin/teachers" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">{t('dashboard.newTeacher')}</Link><Link href="/admin/students" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-primary-foreground">{t('dashboard.manageStudents')}</Link></>}
      />

      <section aria-label="School key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpi icon={UsersIcon} label={t('dashboard.statStudents')} value={students} detail={`${teachers} teachers supporting learners`} tone="primary" />
        <DashboardKpi icon={GridIcon} label={t('dashboard.statClasses')} value={classGroups.length} detail={`${subjects.length} subject offerings`} tone="info" delay={60} />
        <DashboardKpi icon={ClipboardIcon} label="Active assignments" value={activeAssignments} detail={`${dueSoon} due in the next 7 days`} tone="warning" delay={120} />
        <DashboardKpi icon={ShieldIcon} label="Account attention" value={restricted} detail={restricted ? 'Restricted accounts need review' : 'All accounts are currently active'} tone={restricted ? 'danger' : 'success'} delay={180} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
        <DashboardPanel title="Students by class" subtitle="Current enrolments across the school" action={{ href: '/classes', label: 'View classes' }}><AnimatedBarChart data={classChart} valueLabel="Number of enrolled students by class" /></DashboardPanel>
        <DashboardPanel title="Account health" subtitle={`${profiles.length} total school accounts`}>
          <ProgressBreakdown items={[
            { label: 'Students', value: students, total: profiles.length, tone: 'primary' },
            { label: 'Teachers', value: teachers, total: profiles.length, tone: 'info' },
            { label: 'School leaders', value: staff, total: profiles.length, tone: 'success' },
            { label: 'Restricted', value: restricted, total: profiles.length, tone: 'danger' },
          ]} />
        </DashboardPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.9fr)]">
        <DashboardPanel title="Recent accounts" subtitle="Latest people added to your school">
          {profiles.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No accounts yet.</p> : (
            <div className="divide-y divide-border-soft">{profiles.slice(0, 5).map((profile) => (
              <div key={profile.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light font-bold text-primary">{(profile.full_name || profile.email || '?').slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{profile.full_name || profile.email || 'School member'}</p><p className="text-xs text-muted-foreground">{roleLabel(profile.role)} · {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div>
                <span className={`h-2.5 w-2.5 rounded-full ${profile.restricted ? 'bg-danger' : 'bg-success'}`} title={profile.restricted ? 'Restricted' : 'Active'} />
              </div>
            ))}</div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Quick management" subtitle="Common school administration tasks">
          <div className="space-y-3">
            <Link href="/admin/teachers" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info"><BookIcon /></span><span><strong className="block text-sm text-foreground">{t('dashboard.manageTeachers')}</strong><span className="text-xs text-muted-foreground">Accounts, access and passwords</span></span></Link>
            <Link href="/admin/students" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><UsersIcon /></span><span><strong className="block text-sm text-foreground">{t('dashboard.manageStudents')}</strong><span className="text-xs text-muted-foreground">Accounts, access and passwords</span></span></Link>
            <Link href="/assignments" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><ClipboardIcon /></span><span><strong className="block text-sm text-foreground">Review assignments</strong><span className="text-xs text-muted-foreground">School-wide workload overview</span></span></Link>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}

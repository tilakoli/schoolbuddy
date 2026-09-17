import { MailIcon } from '@/components/icons';
import SignOutButton from '@/components/SignOutButton';
import { APP_CONFIG } from '@/constants/config';
import { getUserAndProfile, type Role } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  vice_principal: 'Vice Principal',
  teacher: 'Teacher',
  student: 'Student',
};

function initials(name: string | null, email: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return (email ?? '?').charAt(0).toUpperCase();
}

export default async function SettingsPage() {
  const { user, profile } = await getUserAndProfile();

  let subjectName: string | null = null;
  if (profile?.role === 'teacher') {
    const supabase = await createClient();
    const { data } = supabase
      ? await supabase.from('subjects').select('name').eq('teacher_id', profile.id).maybeSingle()
      : { data: null };
    subjectName = data?.name ?? null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage your account.</p>

      <div className="mt-8 max-w-md">
        <div className="animate-fade-up rounded-xl border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
              {initials(profile?.full_name ?? null, user?.email ?? null)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{profile?.full_name || user?.email}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          {profile && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
                {ROLE_LABEL[profile.role]}
              </span>
              {subjectName && (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">{subjectName}</span>
              )}
            </div>
          )}
        </div>

        <div className="animate-fade-up mt-4 rounded-xl border border-border bg-card shadow-sm p-4" style={{ animationDelay: '0.05s' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support</p>
          <a
            href={`mailto:${APP_CONFIG.supportEmail}`}
            className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
          >
            <MailIcon width={16} height={16} className="text-muted-foreground" />
            {APP_CONFIG.supportEmail}
          </a>
        </div>

        <div className="mt-6">
          <SignOutButton />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">{APP_CONFIG.name} · v1.0.0</p>
      </div>
    </main>
  );
}

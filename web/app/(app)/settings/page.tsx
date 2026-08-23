import SignOutButton from '@/components/SignOutButton';
import { APP_CONFIG } from '@/constants/config';
import { getUserAndProfile, type Role } from '@/lib/supabase/profile';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
};

export default async function SettingsPage() {
  const { user, profile } = await getUserAndProfile();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage your account.</p>

      <div className="mt-8 rounded-xl border border-border bg-card shadow-sm p-4">
        <p className="text-xs text-muted-foreground">SIGNED IN AS</p>
        <p className="mt-1 font-semibold text-foreground">{user?.email}</p>
        {profile && <p className="mt-1 text-sm text-muted-foreground">{ROLE_LABEL[profile.role]}</p>}
      </div>

      <div className="flex-1" />
      <p className="mb-4 text-center text-xs text-muted-foreground">{APP_CONFIG.name} · v1.0.0</p>
      <SignOutButton />
    </main>
  );
}

import { redirect } from 'next/navigation';
import AccountsTable from '@/components/admin/AccountsTable';
import { getUserAndProfile, type Profile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function AdminTeachersPage() {
  const { profile } = await getUserAndProfile();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.from('profiles').select('*').eq('role', 'teacher').order('email')
    : { data: null };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <AccountsTable role="teacher" initialAccounts={(data as Profile[]) ?? []} />
    </main>
  );
}

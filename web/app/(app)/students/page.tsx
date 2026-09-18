import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerT } from '@/lib/i18n/server';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function StudentsPage() {
  const { user, profile } = await getUserAndProfile();
  if (profile?.role !== 'teacher') redirect('/dashboard');
  const t = await getServerT();

  const supabase = await createClient();
  const { data: offerings } = supabase
    ? await supabase.from('classes').select('class_group_id').eq('teacher_id', user!.id)
    : { data: null };
  const groupIds = [...new Set((offerings ?? []).map((o) => o.class_group_id))];

  const { data } = supabase && groupIds.length
    ? await supabase
        .from('enrollments')
        .select('profiles(id, full_name, email), class_groups(name)')
        .in('class_group_id', groupIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  interface Row {
    profiles: { id: string; full_name: string | null; email: string | null } | null;
    class_groups: { name: string } | null;
  }
  const rows = ((data ?? []) as unknown as Row[]).filter((row) => row.profiles);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">{t('students.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('students.subtitleAcrossClasses')}</p>

      <div className="mt-8 space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('students.noStudentsYet')}</p>
        )}
        {rows.map((row) => (
          <Link
            key={row.profiles!.id}
            href={`/students/${row.profiles!.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{row.profiles!.full_name || row.profiles!.email}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{row.profiles!.email}</p>
            </div>
            <p className="shrink-0 text-sm text-muted-foreground">{row.class_groups!.name}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

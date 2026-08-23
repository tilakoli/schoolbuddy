import { redirect } from 'next/navigation';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function StudentsPage() {
  const { user, profile } = await getUserAndProfile();
  if (profile?.role !== 'teacher') redirect('/dashboard');

  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from('enrollments')
        .select('profiles(full_name, email), classes!inner(name, teacher_id)')
        .eq('classes.teacher_id', user!.id)
        .order('created_at', { ascending: false })
    : { data: null };

  interface Row {
    profiles: { full_name: string | null; email: string | null } | null;
    classes: { name: string } | null;
  }
  const rows = ((data ?? []) as unknown as Row[]).filter((row) => row.profiles);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">Students</h1>
      <p className="mt-1 text-sm text-muted-foreground">Students across your classes</p>

      <div className="mt-8 space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No students enrolled yet — add them from a class&apos;s roster.</p>
        )}
        {rows.map((row, index) => (
          <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{row.profiles!.full_name || row.profiles!.email}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{row.profiles!.email}</p>
            </div>
            <p className="shrink-0 text-sm text-muted-foreground">{row.classes!.name}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

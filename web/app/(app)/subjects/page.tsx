import { redirect } from 'next/navigation';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function SubjectsPage() {
  const { profile } = await getUserAndProfile();
  if (profile?.role !== 'student') redirect('/dashboard');

  const supabase = await createClient();
  // RLS ("Students view enrolled classes") already restricts this to the
  // classes the signed-in student is enrolled in.
  const { data } = supabase ? await supabase.from('classes').select('*').order('name') : { data: null };
  const subjects = data ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your enrolled subjects this term</p>

      <div className="mt-8 space-y-2">
        {subjects.length === 0 && (
          <p className="text-sm text-muted-foreground">You&apos;re not enrolled in any classes yet.</p>
        )}
        {subjects.map((subject) => (
          <div key={subject.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{subject.name}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {[subject.subject, subject.period].filter(Boolean).join(' · ') || 'No details yet'}
              </p>
            </div>
            <p className="shrink-0 text-sm text-muted-foreground">{subject.room}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

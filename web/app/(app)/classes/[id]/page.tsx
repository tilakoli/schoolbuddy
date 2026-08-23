import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ClassAssignments from '@/components/classes/ClassAssignments';
import ClassSchedule, { type ScheduleSlot } from '@/components/classes/ClassSchedule';
import RosterManager, { type StudentOption } from '@/components/classes/RosterManager';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await getUserAndProfile();
  if (profile?.role !== 'teacher') redirect('/dashboard');

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  const { data: classRow } = await supabase.from('classes').select('*').eq('id', id).single();
  if (!classRow) notFound();

  const [{ data: enrollmentRows }, { data: allStudents }, { data: assignmentRows }, { data: scheduleRows }] = await Promise.all([
    supabase.from('enrollments').select('profiles(id, full_name, email)').eq('class_id', id),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
    supabase.from('assignments').select('*').eq('class_id', id).order('due_at', { ascending: true, nullsFirst: false }),
    supabase.from('class_schedule').select('*').eq('class_id', id),
  ]);

  const roster: StudentOption[] = (enrollmentRows ?? [])
    .map((row) => row.profiles as unknown as StudentOption)
    .filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link href="/classes" className="text-sm font-medium text-primary">
        ← Classes
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">{classRow.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {[classRow.subject, classRow.period, classRow.room].filter(Boolean).join(' · ') || 'No details yet'}
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <RosterManager classId={id} initialRoster={roster} allStudents={(allStudents as StudentOption[]) ?? []} />
        <ClassAssignments classId={id} initialAssignments={assignmentRows ?? []} />
      </div>

      <div className="mt-10">
        <ClassSchedule classId={id} initialSlots={(scheduleRows as ScheduleSlot[]) ?? []} />
      </div>
    </main>
  );
}

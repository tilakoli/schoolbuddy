import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ClassAssignments from '@/components/classes/ClassAssignments';
import ClassSchedule, { type ScheduleSlot } from '@/components/classes/ClassSchedule';
import SubjectMaterials, { type MaterialRow } from '@/components/curriculum/SubjectMaterials';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function SubjectOfferingPage({ params }: { params: Promise<{ id: string; classId: string }> }) {
  const { id: groupId, classId } = await params;
  const { profile } = await getUserAndProfile();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin' && profile.role !== 'vice_principal')) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  const { data: classRow } = await supabase
    .from('classes')
    .select('*, subjects(name), class_groups(name)')
    .eq('id', classId)
    .single();
  if (!classRow) notFound();

  const [{ data: assignmentRows }, { data: scheduleRows }, { data: materialRows }, { data: enrollmentRows }] = await Promise.all([
    supabase.from('assignments').select('*').eq('class_id', classId).order('due_at', { ascending: true, nullsFirst: false }),
    supabase.from('class_schedule').select('*').eq('class_id', classId),
    supabase
      .from('materials')
      .select('id, class_id, title, chapter, status, extracted_text, summary, error_message')
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
    supabase.from('enrollments').select('profiles(id, full_name, email)').eq('class_group_id', classRow.class_group_id),
  ]);
  const materials: MaterialRow[] = ((materialRows ?? []) as unknown as Omit<MaterialRow, 'className'>[]).map((row) => ({
    ...row,
    className: '',
  }));

  interface RosterStudent {
    id: string;
    full_name: string | null;
    email: string | null;
  }
  const roster = ((enrollmentRows ?? []) as unknown as { profiles: RosterStudent }[]).map((r) => r.profiles).filter(Boolean);

  const subjectName = (classRow as unknown as { subjects: { name: string } | null }).subjects?.name ?? 'Subject';
  const className = (classRow as unknown as { class_groups: { name: string } | null }).class_groups?.name ?? '';
  const canManageStructure = profile.role === 'admin' || profile.role === 'vice_principal';
  const backHref = canManageStructure ? `/classes/${groupId}` : '/classes';

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link href={backHref} className="text-sm font-medium text-primary">
        ← {canManageStructure ? className : 'Classes'}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">{subjectName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {[className, classRow.period, classRow.room].filter(Boolean).join(' · ') || 'No details yet'}
      </p>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Students</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The class roster is managed by admin — you can see who&apos;s enrolled here.
        </p>
        <div className="mt-4 space-y-2">
          {roster.length === 0 && <p className="text-sm text-muted-foreground">No students enrolled yet.</p>}
          {roster.map((student) => (
            <div key={student.id} className="rounded-xl border border-border bg-card shadow-sm p-3">
              <p className="text-sm font-semibold text-foreground">{student.full_name || student.email}</p>
              <p className="text-xs text-muted-foreground">{student.email}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <ClassAssignments
          classId={classId}
          initialAssignments={assignmentRows ?? []}
          extractedMaterials={materials.filter((m) => m.status === 'extracted').map((m) => ({ id: m.id, title: m.title }))}
        />
      </div>

      <div className="mt-10">
        <ClassSchedule classId={classId} initialSlots={(scheduleRows as ScheduleSlot[]) ?? []} />
      </div>

      <div className="mt-10">
        <SubjectMaterials classId={classId} initialMaterials={materials} teacherId={classRow.teacher_id} />
      </div>
    </main>
  );
}

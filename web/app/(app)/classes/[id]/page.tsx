import { notFound, redirect } from 'next/navigation';
import ClassGroupDetail, { type OfferingRow } from '@/components/classes/ClassGroupDetail';
import type { StudentOption } from '@/components/classes/RosterManager';
import type { MaterialRow } from '@/components/curriculum/SubjectMaterials';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

// Class structure (subjects/roster/deletion) is admin/VP-only now — a
// teacher only ever needs their own subject within this Class, so send them
// straight there instead of a management view they can't act on.
async function redirectTeacher(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, groupId: string, teacherId: string) {
  const { data: offering } = await supabase
    .from('classes')
    .select('id')
    .eq('class_group_id', groupId)
    .eq('teacher_id', teacherId)
    .maybeSingle();
  redirect(offering ? `/classes/${groupId}/subjects/${offering.id}` : '/classes');
}

export default async function ClassGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await getUserAndProfile();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'vice_principal' && profile.role !== 'teacher')) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  if (profile.role === 'teacher') await redirectTeacher(supabase, id, user!.id);

  const { data: group } = await supabase.from('class_groups').select('id, name').eq('id', id).single();
  if (!group) notFound();

  const [{ data: offeringRows }, { data: enrollmentRows }, { data: allStudents }, { data: subjectRows }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, period, room, teacher_id, subjects(name), profiles(full_name)')
      .eq('class_group_id', id)
      .order('created_at'),
    supabase.from('enrollments').select('profiles(id, full_name, email)').eq('class_group_id', id),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
    // Every subject in the school (admin/VP aren't a subject's teacher
    // themselves — they're assigning someone else's subject to this class).
    supabase.from('subjects').select('id, name, profiles(full_name)').eq('school_id', profile.school_id).order('name'),
  ]);

  interface RawOffering {
    id: string;
    period: string | null;
    room: string | null;
    teacher_id: string;
    subjects: { name: string } | null;
    profiles: { full_name: string | null } | null;
  }
  const offerings: OfferingRow[] = ((offeringRows ?? []) as unknown as RawOffering[]).map((row) => ({
    id: row.id,
    subjectName: row.subjects?.name ?? 'Untitled subject',
    teacherName: row.profiles?.full_name ?? null,
    period: row.period,
    room: row.room,
  }));

  interface RawSubject {
    id: string;
    name: string;
    profiles: { full_name: string | null } | null;
  }
  const subjectOptions = ((subjectRows ?? []) as unknown as RawSubject[]).map((row) => ({
    id: row.id,
    name: row.name,
    teacherName: row.profiles?.full_name ?? null,
  }));

  const roster: StudentOption[] = (enrollmentRows ?? []).map((row) => row.profiles as unknown as StudentOption).filter(Boolean);

  const offeringIds = offerings.map((o) => o.id);
  const { data: materialRows } = offeringIds.length
    ? await supabase
        .from('materials')
        .select('id, class_id, title, chapter, status, extracted_text, summary, error_message')
        .in('class_id', offeringIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  type RawMaterial = Omit<MaterialRow, 'className'>;
  const subjectNameByOffering = new Map(offerings.map((o) => [o.id, o.subjectName]));
  const materials: MaterialRow[] = ((materialRows ?? []) as unknown as RawMaterial[]).map((row) => ({
    ...row,
    className: subjectNameByOffering.get(row.class_id) ?? '',
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <ClassGroupDetail
        groupId={group.id}
        groupName={group.name}
        offerings={offerings}
        roster={roster}
        allStudents={(allStudents as StudentOption[]) ?? []}
        subjectOptions={subjectOptions}
        materials={materials}
        schoolId={profile.school_id}
      />
    </main>
  );
}

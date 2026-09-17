import type { SupabaseClient } from '@supabase/supabase-js';

export interface ClassGroupSummary {
  id: string;
  name: string;
  subjectNames: string[];
  studentCount: number;
  // Only set by fetchTeacherClassGroups — a teacher has exactly one subject,
  // so this is unambiguous and lets the UI link straight to it.
  offeringId?: string;
}

interface OfferingRow {
  id: string;
  class_group_id: string;
  subjects: { name: string } | null;
  class_groups: { name: string } | null;
}

interface EnrollmentRow {
  class_group_id: string;
}

async function countStudentsByGroup(supabase: SupabaseClient, groupIds: string[]): Promise<Map<string, number>> {
  const countByGroup = new Map<string, number>();
  if (groupIds.length === 0) return countByGroup;

  const { data } = await supabase.from('enrollments').select('class_group_id').in('class_group_id', groupIds);
  ((data ?? []) as unknown as EnrollmentRow[]).forEach((row) => {
    countByGroup.set(row.class_group_id, (countByGroup.get(row.class_group_id) ?? 0) + 1);
  });
  return countByGroup;
}

// A Class ("Class 9") holds a shared roster; each subject taught within it
// (Maths, Science, ...) is its own `classes` row. This groups a teacher's
// subject offerings back into their Class, with the roster counted once per
// Class rather than once per subject.
export async function fetchTeacherClassGroups(supabase: SupabaseClient, teacherId: string): Promise<ClassGroupSummary[]> {
  const { data } = await supabase
    .from('classes')
    .select('id, class_group_id, subjects(name), class_groups(name)')
    .eq('teacher_id', teacherId);
  const offerings = (data ?? []) as unknown as OfferingRow[];

  const groupIds = [...new Set(offerings.map((o) => o.class_group_id))];
  const countByGroup = await countStudentsByGroup(supabase, groupIds);

  const byGroup = new Map<string, ClassGroupSummary>();
  offerings.forEach((row) => {
    const id = row.class_group_id;
    if (!byGroup.has(id)) {
      byGroup.set(id, {
        id,
        name: row.class_groups?.name ?? '',
        subjectNames: [],
        studentCount: countByGroup.get(id) ?? 0,
        offeringId: row.id,
      });
    }
    const subjectName = row.subjects?.name;
    const summary = byGroup.get(id)!;
    if (subjectName && !summary.subjectNames.includes(subjectName)) summary.subjectNames.push(subjectName);
  });

  return [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Admin/VP view — every Class in the school, regardless of who teaches what
// in it. No offeringId: a Class can have several subjects/teachers, so
// there's no single offering to link straight to.
export async function fetchSchoolClassGroups(supabase: SupabaseClient, schoolId: string): Promise<ClassGroupSummary[]> {
  const { data: groups } = await supabase.from('class_groups').select('id, name').eq('school_id', schoolId).order('name');
  const groupList = groups ?? [];
  if (groupList.length === 0) return [];

  const groupIds = groupList.map((g) => g.id);
  const [{ data: offeringRows }, countByGroup] = await Promise.all([
    supabase.from('classes').select('class_group_id, subjects(name)').in('class_group_id', groupIds),
    countStudentsByGroup(supabase, groupIds),
  ]);

  const subjectsByGroup = new Map<string, string[]>();
  ((offeringRows ?? []) as unknown as Omit<OfferingRow, 'id' | 'class_groups'>[]).forEach((row) => {
    const subjectName = row.subjects?.name;
    if (!subjectName) return;
    const list = subjectsByGroup.get(row.class_group_id) ?? [];
    if (!list.includes(subjectName)) list.push(subjectName);
    subjectsByGroup.set(row.class_group_id, list);
  });

  return groupList.map((g) => ({
    id: g.id,
    name: g.name,
    subjectNames: subjectsByGroup.get(g.id) ?? [],
    studentCount: countByGroup.get(g.id) ?? 0,
  }));
}

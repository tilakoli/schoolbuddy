import { redirect } from 'next/navigation';
import ExamsClient from '@/components/exams/ExamsClient';
import type { Exam } from '@shared/domain/learning';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

interface ClassRow { id: string; name: string; teacher_id: string; class_groups: { name: string } | null }

export default async function ExamsPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect('/login');
  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  let classQuery = supabase.from('classes').select('id, name, teacher_id, class_groups(name)').order('name');
  if (profile.role === 'teacher') classQuery = classQuery.eq('teacher_id', user.id);
  const { data: classRows } = await classQuery;
  const classes = ((classRows ?? []) as unknown as ClassRow[]).map((row) => ({
    id: row.id,
    label: [row.class_groups?.name, row.name].filter(Boolean).join(' · '),
  }));

  const [{ data: examRows }, { data: assignmentRows }] = await Promise.all([
    supabase.from('exams').select('*, classes(name, class_groups(name)), assignments(title)').order('starts_at'),
    profile.role === 'teacher' && classes.length
      ? supabase.from('assignments').select('id, class_id, title').in('class_id', classes.map((item) => item.id)).order('title')
      : Promise.resolve({ data: [] }),
  ]);
  const exams = ((examRows ?? []) as unknown as Array<Exam & { classes: { name: string; class_groups: { name: string } | null } | null; assignments: { title: string } | null }>).map((exam) => ({
    ...exam,
    classLabel: [exam.classes?.class_groups?.name, exam.classes?.name].filter(Boolean).join(' · '),
    assignmentTitle: exam.assignments?.title ?? null,
  }));

  return <ExamsClient role={profile.role} userId={user.id} initialExams={exams} classes={classes} assignments={assignmentRows ?? []} />;
}

import { notFound, redirect } from 'next/navigation';
import DiscussionChat from '@/components/discussions/DiscussionChat';
import DiscussionDetailTeacherClient from '@/components/discussions/DiscussionDetailTeacherClient';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveDiscussionStatus, type Discussion, type DiscussionMessage, type DiscussionThread, type MyDiscussionThread } from '@shared/domain/discussions';

export default async function DiscussionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await getUserAndProfile();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'student')) redirect('/dashboard');

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  const { data: discussionRow } = await supabase.from('discussions').select('*').eq('id', id).maybeSingle();
  if (!discussionRow) notFound();
  const discussion = discussionRow as Discussion;

  if (profile.role === 'student') {
    const [{ data: materialRows }, { data: threadRow }] = await Promise.all([
      discussion.source_material_ids.length
        ? supabase.from('materials').select('id, title, chapter, video_url').in('id', discussion.source_material_ids).eq('status', 'extracted')
        : Promise.resolve({ data: [] }),
      supabase.rpc('get_my_discussion_thread', { p_discussion_id: id }).maybeSingle(),
    ]);
    const thread = (threadRow ?? null) as MyDiscussionThread | null;

    const { data: messageRows } = thread
      ? await supabase.from('discussion_messages').select('id, thread_id, role, text, created_at').eq('thread_id', thread.id).order('created_at', { ascending: true })
      : { data: [] };

    return (
      <DiscussionChat
        discussionId={id}
        title={discussion.title}
        chapter={discussion.chapter}
        instructions={discussion.instructions}
        links={discussion.links}
        materials={materialRows ?? []}
        initialThread={thread}
        initialMessages={(messageRows ?? []) as DiscussionMessage[]}
        ended={getEffectiveDiscussionStatus(discussion) !== 'published'}
      />
    );
  }

  const { data: classRow } = await supabase
    .from('classes')
    .select('class_group_id, teacher_id')
    .eq('id', discussion.class_id)
    .single();
  if (!classRow || classRow.teacher_id !== user!.id) notFound();

  interface TargetStudent {
    id: string;
    full_name: string | null;
    email: string | null;
  }

  const [{ data: rosterRows }, { data: pickedTargetRows }, { data: threadRows }, { data: classes }] = await Promise.all([
    discussion.target_type === 'class'
      ? supabase.from('enrollments').select('profiles(id, full_name, email)').eq('class_group_id', classRow.class_group_id)
      : Promise.resolve({ data: [] }),
    discussion.target_type === 'students'
      ? supabase.from('discussion_targets').select('profiles(id, full_name, email)').eq('discussion_id', id)
      : Promise.resolve({ data: [] }),
    supabase.from('discussion_threads').select('id, discussion_id, student_id, status, started_at, submitted_at, report').eq('discussion_id', id),
    supabase.from('classes').select('id, name, class_group_id, class_groups(name)').eq('teacher_id', user!.id).order('name'),
  ]);

  const targetStudents: TargetStudent[] =
    discussion.target_type === 'class'
      ? ((rosterRows ?? []) as unknown as { profiles: TargetStudent }[]).map((row) => row.profiles).filter(Boolean)
      : ((pickedTargetRows ?? []) as unknown as { profiles: TargetStudent }[]).map((row) => row.profiles).filter(Boolean);

  interface OfferingRow {
    id: string;
    name: string;
    class_group_id: string;
    class_groups: { name: string } | null;
  }
  const classOptions = ((classes ?? []) as unknown as OfferingRow[]).map((row) => ({
    id: row.id,
    name: row.class_groups?.name ? `${row.class_groups.name} · ${row.name}` : row.name,
    classGroupId: row.class_group_id,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <DiscussionDetailTeacherClient
        discussion={discussion}
        targetStudents={targetStudents}
        initialThreads={(threadRows ?? []) as DiscussionThread[]}
        classOptions={classOptions}
      />
    </main>
  );
}

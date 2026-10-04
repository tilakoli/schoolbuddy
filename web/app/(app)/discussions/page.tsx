import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChatIcon } from '@/components/icons';
import DiscussionsPageClient from '@/components/discussions/DiscussionsPageClient';
import { THREAD_STATUS_BADGE_CLASS, THREAD_STATUS_LABEL_KEY } from '@/components/discussions/badges';
import { getServerT } from '@/lib/i18n/server';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Discussion, DiscussionThreadStatus } from '@shared/domain/discussions';

export default async function DiscussionsPage() {
  const { user, profile } = await getUserAndProfile();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'student')) redirect('/dashboard');

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  if (profile.role === 'teacher') {
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, class_group_id, class_groups(name)')
      .eq('teacher_id', user!.id)
      .order('name');
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

    // RLS ("Teachers manage discussions for own classes") already scopes this.
    const { data: discussionRows } = await supabase.from('discussions').select('*').order('created_at', { ascending: false });

    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <DiscussionsPageClient initialDiscussions={(discussionRows ?? []) as Discussion[]} classOptions={classOptions} />
      </main>
    );
  }

  const t = await getServerT();
  // RLS ("Students view published discussions targeted to them") already scopes this.
  const { data: discussionRows } = await supabase
    .from('discussions')
    .select('*, classes(name, subjects(name))')
    .order('created_at', { ascending: false });
  interface DiscussionWithClass extends Discussion {
    classes: { name: string; subjects: { name: string } | null } | null;
  }
  const discussions = (discussionRows ?? []) as unknown as DiscussionWithClass[];

  const statuses = await Promise.all(
    discussions.map((discussion) => supabase.rpc('get_my_discussion_thread', { p_discussion_id: discussion.id }).maybeSingle())
  );
  const statusById = new Map<string, DiscussionThreadStatus | 'not_started'>(
    discussions.map((discussion, index) => {
      const thread = statuses[index].data as { status: DiscussionThreadStatus } | null;
      return [discussion.id, thread?.status ?? 'not_started'];
    })
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">{t('nav.discussions')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('discussions.studentSubtitle')}</p>

      <div className="mt-6 space-y-2">
        {discussions.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('discussions.noDiscussionsYetStudent')}</p>
        )}
        {discussions.map((discussion) => {
          const status = statusById.get(discussion.id) ?? 'not_started';
          return (
            <Link
              key={discussion.id}
              href={`/discussions/${discussion.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ChatIcon width={16} height={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{discussion.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[discussion.classes?.subjects?.name ?? discussion.classes?.name, discussion.chapter].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${THREAD_STATUS_BADGE_CLASS[status]}`}>
                {t(THREAD_STATUS_LABEL_KEY[status])}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

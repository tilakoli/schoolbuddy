import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { getEffectiveDiscussionStatus, type Discussion } from '@shared/domain/discussions';
import { DISCUSSION_STATUS_BADGE_CLASS, DISCUSSION_STATUS_LABEL_KEY } from './badges';

export default function DiscussionListItem({ discussion, className }: { discussion: Discussion; className?: string }) {
  const { t } = useLanguage();
  const status = getEffectiveDiscussionStatus(discussion);
  return (
    <Link
      href={`/discussions/${discussion.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4 hover:border-primary"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{discussion.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {[className, discussion.chapter].filter(Boolean).join(' · ') || t('discussions.noDetailsYet')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {discussion.target_type === 'class' ? t('discussions.wholeClass') : t('discussions.specificStudents')}
        </span>
        {status !== 'published' && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DISCUSSION_STATUS_BADGE_CLASS[status]}`}>
            {t(DISCUSSION_STATUS_LABEL_KEY[status])}
          </span>
        )}
      </div>
    </Link>
  );
}

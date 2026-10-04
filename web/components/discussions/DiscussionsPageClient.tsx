'use client';

import { useMemo, useState } from 'react';
import { ChatIcon } from '@/components/icons';
import { useLanguage } from '@/components/LanguageProvider';
import EmptyState from '@/components/shared/EmptyState';
import { getEffectiveDiscussionStatus, type Discussion, type DiscussionStatus } from '@shared/domain/discussions';
import DiscussionListItem from './DiscussionListItem';
import NewDiscussionForm from './NewDiscussionForm';

interface ClassOption {
  id: string;
  name: string;
  classGroupId: string;
}

type StatusFilter = DiscussionStatus | 'all';

export default function DiscussionsPageClient({
  initialDiscussions,
  classOptions,
}: {
  initialDiscussions: Discussion[];
  classOptions: ClassOption[];
}) {
  const { t } = useLanguage();
  const [discussions, setDiscussions] = useState(initialDiscussions);
  const [showCreate, setShowCreate] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const classNameById = useMemo(() => new Map(classOptions.map((c) => [c.id, c.name])), [classOptions]);

  const filtered = discussions.filter(
    (discussion) =>
      (classFilter === 'all' || discussion.class_id === classFilter) &&
      (statusFilter === 'all' || getEffectiveDiscussionStatus(discussion) === statusFilter)
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.discussions')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('discussions.teacherSubtitle')}</p>
        </div>
        {classOptions.length > 0 && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            {showCreate ? t('form.close') : t('discussions.newDiscussion')}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mt-4">
          <NewDiscussionForm
            classOptions={classOptions}
            onCreated={(created) => {
              setDiscussions((prev) => [created, ...prev]);
              setShowCreate(false);
            }}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <select
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
        >
          <option value="all">{t('discussions.allClasses')}</option>
          {classOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
        >
          <option value="all">{t('discussions.allStatuses')}</option>
          <option value="draft">{t('discussions.statusDraft')}</option>
          <option value="published">{t('discussions.statusPublished')}</option>
          <option value="ended">{t('discussions.statusEnded')}</option>
          <option value="cancelled">{t('discussions.statusCancelled')}</option>
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <EmptyState icon={ChatIcon} title={t('discussions.noDiscussionsYet')} description={t('discussions.noDiscussionsYetDesc')} />
        )}
        {filtered.map((discussion) => (
          <DiscussionListItem key={discussion.id} discussion={discussion} className={classNameById.get(discussion.class_id)} />
        ))}
      </div>
    </div>
  );
}

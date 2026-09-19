import ComingSoon from '@/components/ComingSoon';
import { getServerT } from '@/lib/i18n/server';

export default async function LearningVideosPage() {
  const t = await getServerT();
  return <ComingSoon title={t('nav.learningVideos')} description={t('comingSoon.learningVideosDesc')} />;
}

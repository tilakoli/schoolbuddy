import ComingSoon from '@/components/ComingSoon';
import { getServerT } from '@/lib/i18n/server';

export default async function ExamsPage() {
  const t = await getServerT();
  return <ComingSoon title={t('nav.exams')} description={t('comingSoon.examsDesc')} />;
}

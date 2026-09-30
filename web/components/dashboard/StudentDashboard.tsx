import LessonsLanding from '@/components/dashboard/LessonsLanding';

export default async function StudentDashboard({ name }: { name: string }) {
  return <LessonsLanding name={name} />;
}

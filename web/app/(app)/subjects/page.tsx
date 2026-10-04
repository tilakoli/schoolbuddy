import { redirect } from 'next/navigation';
import { getServerT } from '@/lib/i18n/server';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

const DAY_SHORT_KEYS = ['timetable.mon', 'timetable.tue', 'timetable.wed', 'timetable.thu', 'timetable.fri', 'timetable.sat', 'timetable.sun'];

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default async function SubjectsPage() {
  const { profile } = await getUserAndProfile();
  if (profile?.role !== 'student') redirect('/dashboard');
  const t = await getServerT();

  const supabase = await createClient();
  // RLS ("Students view enrolled classes") already restricts this to the
  // classes the signed-in student is enrolled in.
  const { data } = supabase
    ? await supabase.from('classes').select('*, subjects(name), class_groups(name)').order('name')
    : { data: null };
  interface Row {
    id: string;
    name: string;
    period: string | null;
    room: string | null;
    subjects: { name: string } | null;
    class_groups: { name: string } | null;
  }
  const subjects = ((data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    subjectName: row.subjects?.name ?? row.name,
    groupName: row.class_groups?.name ?? null,
  }));

  interface ScheduleRow {
    class_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }
  const classIds = subjects.map((subject) => subject.id);
  const { data: scheduleRows } = classIds.length && supabase
    ? await supabase.from('class_schedule').select('class_id, day_of_week, start_time, end_time').in('class_id', classIds)
    : { data: null };

  const scheduleByClass = new Map<string, string[]>();
  ((scheduleRows ?? []) as ScheduleRow[])
    .reduce<Map<string, Map<string, number[]>>>((groups, row) => {
      const byTime = groups.get(row.class_id) ?? new Map<string, number[]>();
      const key = `${row.start_time}-${row.end_time}`;
      byTime.set(key, [...(byTime.get(key) ?? []), row.day_of_week]);
      groups.set(row.class_id, byTime);
      return groups;
    }, new Map())
    .forEach((byTime, classId) => {
      const lines = [...byTime.entries()].map(([key, days]) => {
        const [start, end] = key.split('-');
        const dayLabels = days.sort((a, b) => a - b).map((day) => t(DAY_SHORT_KEYS[day - 1]));
        return `${dayLabels.join(', ')} · ${formatTime(start)}–${formatTime(end)}`;
      });
      scheduleByClass.set(classId, lines);
    });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your enrolled subjects this term</p>

      <div className="mt-8 space-y-2">
        {subjects.length === 0 && (
          <p className="text-sm text-muted-foreground">You&apos;re not enrolled in any classes yet.</p>
        )}
        {subjects.map((subject) => {
          const scheduleLines = scheduleByClass.get(subject.id) ?? [];
          return (
            <div key={subject.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{subject.subjectName}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {[subject.groupName, subject.period].filter(Boolean).join(' · ') || 'No details yet'}
                </p>
                {scheduleLines.length > 0 ? (
                  scheduleLines.map((line) => (
                    <p key={line} className="mt-1 truncate text-xs text-muted-foreground">{line}</p>
                  ))
                ) : (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{t('timetable.noScheduledTimesYet')}</p>
                )}
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">{subject.room}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}

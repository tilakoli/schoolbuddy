import { redirect } from 'next/navigation';
import { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { getServerT } from '@/lib/i18n/server';
import { getUserAndProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

const DAY_KEYS = [
  'timetable.monday',
  'timetable.tuesday',
  'timetable.wednesday',
  'timetable.thursday',
  'timetable.friday',
  'timetable.saturday',
  'timetable.sunday',
];

interface ScheduleRow {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  classes: { name: string } | null;
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default async function TimetablePage() {
  const { user, profile } = await getUserAndProfile();
  if (profile?.role !== 'teacher' && profile?.role !== 'student') redirect('/dashboard');
  const t = await getServerT();

  const supabase = await createClient();
  if (!supabase) redirect('/dashboard');

  let rows: ScheduleRow[] = [];
  if (profile.role === 'teacher') {
    const { data: classes } = await supabase.from('classes').select('id').eq('teacher_id', user!.id);
    const classIds = (classes ?? []).map((c) => c.id);
    if (classIds.length) {
      const { data } = await supabase
        .from('class_schedule')
        .select('id, class_id, day_of_week, start_time, end_time, classes(name)')
        .in('class_id', classIds);
      rows = (data as unknown as ScheduleRow[]) ?? [];
    }
  } else {
    // RLS ("Students view schedule for enrolled classes") scopes this already.
    const { data } = await supabase.from('class_schedule').select('id, class_id, day_of_week, start_time, end_time, classes(name)');
    rows = (data as unknown as ScheduleRow[]) ?? [];
  }

  const days = [...new Set(rows.map((r) => r.day_of_week))].sort((a, b) => a - b);
  const times = [...new Set(rows.map((r) => r.start_time))].sort();

  const classColor = new Map<string, (typeof TILE_PALETTE)[number]>();
  rows.forEach((row) => {
    if (!classColor.has(row.class_id)) classColor.set(row.class_id, TILE_PALETTE[classColor.size % TILE_PALETTE.length]);
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">{t('timetable.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {profile.role === 'teacher' ? t('timetable.teacherSubtitle') : t('timetable.studentSubtitle')}
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {profile.role === 'teacher' ? t('timetable.noScheduledTeacher') : t('timetable.noScheduledStudent')}
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="w-24 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('timetable.time')}</th>
                {days.map((day) => (
                  <th key={day} className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(DAY_KEYS[day - 1])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time}>
                  <td className="text-xs text-muted-foreground">{formatTime(time)}</td>
                  {days.map((day) => {
                    const matches = rows.filter((r) => r.day_of_week === day && r.start_time === time);
                    return (
                      <td key={day}>
                        {matches.map((match) => {
                          const tile = classColor.get(match.class_id)!;
                          return (
                            <div key={match.id} className={`rounded-lg ${tile.bg} px-3 py-2`}>
                              <p className={`text-sm font-semibold ${tile.text}`}>{match.classes?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(match.start_time)}–{formatTime(match.end_time)}
                              </p>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

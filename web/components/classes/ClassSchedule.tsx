'use client';

import { useState, type FormEvent } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { createClient } from '@/lib/supabase/client';

export interface ScheduleSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAY_KEYS = [
  'timetable.monday',
  'timetable.tuesday',
  'timetable.wednesday',
  'timetable.thursday',
  'timetable.friday',
  'timetable.saturday',
  'timetable.sunday',
];

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function ClassSchedule({ classId, initialSlots }: { classId: string; initialSlots: ScheduleSlot[] }) {
  const { t } = useLanguage();
  const [slots, setSlots] = useState(
    [...initialSlots].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
  );
  const [showAdd, setShowAdd] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const addSlot = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    setError(undefined);

    const { data, error: insertError } = await supabase
      .from('class_schedule')
      .insert({ class_id: classId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime })
      .select('*')
      .single();

    setLoading(false);
    if (insertError || !data) {
      setError(insertError?.message || 'Something went wrong.');
      return;
    }
    setSlots((prev) => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
    setShowAdd(false);
  };

  const removeSlot = async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;
    const { error: deleteError } = await supabase.from('class_schedule').delete().eq('id', id);
    if (!deleteError) setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t('timetable.schedule')}</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          {t('timetable.addTime')}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addSlot} className="mt-4 space-y-3 rounded-xl border border-border bg-card shadow-sm p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={dayOfWeek}
              onChange={(event) => setDayOfWeek(Number(event.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {DAY_KEYS.map((dayKey, i) => (
                <option key={dayKey} value={i + 1}>
                  {t(dayKey)}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {loading ? t('timetable.adding') : t('timetable.addToSchedule')}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {slots.length === 0 && <p className="text-sm text-muted-foreground">{t('timetable.noScheduledTimesYet')}</p>}
        {slots.map((slot) => (
          <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-sm p-3">
            <p className="text-sm font-medium text-foreground">
              {t(DAY_KEYS[slot.day_of_week - 1])} · {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
            </p>
            <button
              onClick={() => removeSlot(slot.id)}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              {t('form.remove')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useLanguageStore } from '@/stores/languageStore';

interface ClassRow {
  id: string;
  subjectName: string;
  groupName: string | null;
  period: string | null;
  room: string | null;
}

interface AssignmentRow {
  id: string;
  title: string;
  due_at: string | null;
  className: string;
}

function dueStatus(dueAt: string | null): { label: string; color: string } {
  if (!dueAt) return { label: 'No due date', color: Colors.info };
  const diffDays = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { label: 'Overdue', color: Colors.danger };
  if (diffDays < 2) return { label: 'Due soon', color: Colors.warning };
  return { label: new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), color: Colors.info };
}

export default function StudentDashboard({ name }: { name: string }) {
  const { t } = useLanguageStore();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      // RLS already scopes both queries to this student's own enrolled classes.
      const [{ data: classRows }, { data: assignmentRows }] = await Promise.all([
        supabase.from('classes').select('id, name, period, room, subjects(name), class_groups(name)').order('name'),
        supabase.from('assignments').select('id, title, due_at, classes(name)').order('due_at', { ascending: true, nullsFirst: false }),
      ]);
      if (cancelled) return;
      setClasses(
        ((classRows ?? []) as any[]).map((row) => ({
          id: row.id,
          subjectName: row.subjects?.name ?? row.name,
          groupName: row.class_groups?.name ?? null,
          period: row.period,
          room: row.room,
        }))
      );
      setAssignments(((assignmentRows ?? []) as any[]).map((row) => ({ ...row, className: row.classes?.name ?? '' })));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!classes) {
    return (
      <View style={{ marginTop: Spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const dueSoonCount = assignments.filter((a) => {
    if (!a.due_at) return false;
    const diffDays = (new Date(a.due_at).getTime() - Date.now()) / 86400000;
    return diffDays >= 0 && diffDays < 7;
  }).length;
  const overdueCount = assignments.filter((a) => a.due_at && new Date(a.due_at).getTime() < Date.now()).length;

  const stats = [
    { label: t('dashboard.statEnrolledClasses'), value: String(classes.length) },
    { label: t('dashboard.statDueThisWeek'), value: String(dueSoonCount) },
    { label: t('dashboard.statOverdue'), value: String(overdueCount) },
    { label: t('dashboard.statTotalAssignments'), value: String(assignments.length) },
  ];

  return (
    <>
      <DashboardBanner
        eyebrow={t('dashboard.welcomeBack')}
        name={name}
        summary={
          classes.length > 0
            ? t('dashboard.enrolledSummary', { count: String(classes.length) })
            : t('dashboard.enrolledClassesWillShowUp')
        }
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg }}>
        {stats.map((stat, i) => {
          const tile = TILE_PALETTE[i % TILE_PALETTE.length];
          return (
            <View
              key={stat.label}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                backgroundColor: tile.bg,
                borderRadius: BorderRadius.lg,
                padding: Spacing.md,
              }}
            >
              <Text style={{ color: tile.text, fontFamily: FontFamily.heading, fontSize: FontSize['2xl'] }}>{stat.value}</Text>
              <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 2 }}>{stat.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: FontSize.lg, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        {t('dashboard.myClasses')}
      </Text>
      {classes.length === 0 && (
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{t('dashboard.noClassesYetStudent')}</Text>
      )}
      {classes.map((classItem, i) => {
        const tile = TILE_PALETTE[i % TILE_PALETTE.length];
        return (
          <View
            key={classItem.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: Colors.card,
              borderColor: Colors.border,
              borderWidth: 1,
              borderRadius: BorderRadius.lg,
              padding: Spacing.md,
              marginBottom: Spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: BorderRadius.md,
                  backgroundColor: tile.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: tile.text, fontSize: FontSize.sm, fontWeight: '700' }}>
                  {classItem.subjectName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }} numberOfLines={1}>
                  {classItem.subjectName}
                </Text>
                <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 3 }} numberOfLines={1}>
                  {[classItem.groupName, classItem.period].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{classItem.room}</Text>
          </View>
        );
      })}

      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: FontSize.lg, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        {t('dashboard.upcomingAssignments')}
      </Text>
      {assignments.length === 0 && <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{t('dashboard.noAssignmentsYet')}</Text>}
      {assignments.slice(0, 4).map((assignment) => {
        const status = dueStatus(assignment.due_at);
        return (
          <View
            key={assignment.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Colors.card,
              borderColor: Colors.border,
              borderWidth: 1,
              borderRadius: BorderRadius.lg,
              padding: Spacing.md,
              marginBottom: Spacing.sm,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: BorderRadius.full, backgroundColor: status.color, marginRight: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }}>{assignment.title}</Text>
              <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 3 }}>{assignment.className}</Text>
            </View>
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{status.label}</Text>
          </View>
        );
      })}
    </>
  );
}

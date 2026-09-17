import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface ClassGroupRow {
  id: string;
  name: string;
  subjectNames: string[];
  studentCount: number;
  offeringId: string | null;
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

export default function TeacherDashboard({ name, userId }: { name: string; userId: string }) {
  const [classes, setClasses] = useState<ClassGroupRow[] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [subjectName, setSubjectName] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const { data: subjectRow } = await supabase.from('subjects').select('name').eq('teacher_id', userId).maybeSingle();
      if (!cancelled) setSubjectName(subjectRow?.name ?? null);

      const { data: offeringRows } = await supabase
        .from('classes')
        .select('id, class_group_id, subjects(name), class_groups(name)')
        .eq('teacher_id', userId)
        .order('created_at');
      if (cancelled) return;
      const offerings = (offeringRows ?? []) as any[];

      const groupIds = [...new Set(offerings.map((o) => o.class_group_id))];
      const countByGroup = new Map<string, number>();
      if (groupIds.length > 0) {
        const { data: enrollmentRows } = await supabase.from('enrollments').select('class_group_id').in('class_group_id', groupIds);
        (enrollmentRows ?? []).forEach((row: any) => {
          countByGroup.set(row.class_group_id, (countByGroup.get(row.class_group_id) ?? 0) + 1);
        });
      }

      const byGroup = new Map<string, ClassGroupRow>();
      offerings.forEach((row) => {
        const id = row.class_group_id;
        if (!byGroup.has(id)) {
          byGroup.set(id, {
            id,
            name: row.class_groups?.name ?? '',
            subjectNames: [],
            studentCount: countByGroup.get(id) ?? 0,
            offeringId: row.id,
          });
        }
        const subjectName = row.subjects?.name;
        const entry = byGroup.get(id)!;
        if (subjectName && !entry.subjectNames.includes(subjectName)) entry.subjectNames.push(subjectName);
      });
      const mappedClasses = [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name));
      if (cancelled) return;
      setClasses(mappedClasses);

      const offeringIds = offerings.map((o) => o.id);
      if (offeringIds.length === 0) return;

      const { data: assignmentRows } = await supabase
        .from('assignments')
        .select('id, title, due_at, classes(name)')
        .in('class_id', offeringIds)
        .order('due_at', { ascending: true, nullsFirst: false });
      if (cancelled) return;
      setAssignments(((assignmentRows ?? []) as any[]).map((row) => ({ ...row, className: row.classes?.name ?? '' })));
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!classes) {
    return (
      <View style={{ marginTop: Spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const studentCount = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const dueSoonCount = assignments.filter((a) => a.due_at && (new Date(a.due_at).getTime() - Date.now()) / 86400000 < 7 && (new Date(a.due_at).getTime() - Date.now()) >= 0).length;

  const stats = [
    { label: 'Classes', value: String(classes.length) },
    { label: 'Students', value: String(studentCount) },
    { label: 'Due this week', value: String(dueSoonCount) },
    { label: 'Total assignments', value: String(assignments.length) },
  ];

  return (
    <>
      <DashboardBanner
        eyebrow="Welcome back"
        name={name}
        subtitle={subjectName ? `${subjectName} teacher` : undefined}
        summary={
          classes.length > 0
            ? `Teaching ${studentCount} student${studentCount === 1 ? '' : 's'} across ${classes.length} class${classes.length === 1 ? '' : 'es'}.`
            : 'Your classes will show up here once admin assigns your subject to one.'
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
        Your classes
      </Text>
      {classes.length === 0 && (
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>No classes yet — admin will assign your subject to one.</Text>
      )}
      {classes.map((classItem, i) => {
        const tile = TILE_PALETTE[i % TILE_PALETTE.length];
        return (
          <TouchableOpacity
            key={classItem.id}
            onPress={() => classItem.offeringId && router.push(`/class/${classItem.offeringId}`)}
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
                  {classItem.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }} numberOfLines={1}>
                  {classItem.name}
                </Text>
              </View>
            </View>
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{classItem.studentCount} students</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: FontSize.lg, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        Upcoming assignments
      </Text>
      {assignments.length === 0 && <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>No assignments yet.</Text>}
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

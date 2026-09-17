import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Counts {
  staff: number;
  teachers: number;
  students: number;
  classes: number;
  subjects: number;
  assignments: number;
}

export default function AdminDashboard({ name }: { name: string }) {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    Promise.all([
      supabase.from('profiles').select('role'),
      supabase.from('class_groups').select('id'),
      supabase.from('subjects').select('id'),
      supabase.from('assignments').select('id'),
    ]).then(([profilesRes, classGroupsRes, subjectsRes, assignmentsRes]) => {
      if (cancelled || !profilesRes.data) return;
      setCounts({
        staff: profilesRes.data.filter((row) => row.role === 'admin' || row.role === 'vice_principal').length,
        teachers: profilesRes.data.filter((row) => row.role === 'teacher').length,
        students: profilesRes.data.filter((row) => row.role === 'student').length,
        classes: classGroupsRes.data?.length ?? 0,
        subjects: subjectsRes.data?.length ?? 0,
        assignments: assignmentsRes.data?.length ?? 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { label: 'Teachers', value: counts ? String(counts.teachers) : '—' },
    { label: 'Students', value: counts ? String(counts.students) : '—' },
    { label: 'Staff (admin + VP)', value: counts ? String(counts.staff) : '—' },
    {
      label: 'Total accounts',
      value: counts ? String(counts.staff + counts.teachers + counts.students) : '—',
    },
  ];

  const schoolStats = [
    { label: 'Classes', value: counts ? String(counts.classes) : '—' },
    { label: 'Subjects', value: counts ? String(counts.subjects) : '—' },
    { label: 'Assignments', value: counts ? String(counts.assignments) : '—' },
  ];

  const total = counts ? counts.staff + counts.teachers + counts.students : null;

  return (
    <>
      <DashboardBanner
        eyebrow="Welcome back"
        name={name}
        summary={total !== null ? `Overseeing ${total} accounts across the school.` : undefined}
      />

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: Spacing.sm,
          marginTop: Spacing.lg,
        }}
      >
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
              <Text style={{ color: tile.text, fontFamily: FontFamily.heading, fontSize: FontSize['2xl'] }}>
                {stat.value}
              </Text>
              <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 2 }}>
                {stat.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: FontSize.lg, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        School overview
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {schoolStats.map((stat, i) => {
          const tile = TILE_PALETTE[(i + 4) % TILE_PALETTE.length];
          return (
            <View
              key={stat.label}
              style={{
                flexBasis: '30%',
                flexGrow: 1,
                backgroundColor: tile.bg,
                borderRadius: BorderRadius.lg,
                padding: Spacing.md,
              }}
            >
              <Text style={{ color: tile.text, fontFamily: FontFamily.heading, fontSize: FontSize['2xl'] }}>
                {stat.value}
              </Text>
              <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 2 }}>
                {stat.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: FontSize.lg, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        User management
      </Text>
      <View
        style={{
          backgroundColor: Colors.card,
          borderColor: Colors.border,
          borderWidth: 1,
          borderRadius: BorderRadius.lg,
          padding: Spacing.md,
          opacity: 0.6,
        }}
      >
        <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }}>
          Create and manage teacher &amp; student accounts
        </Text>
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>
          Manage teacher and student accounts from the web app.
        </Text>
      </View>

      {!counts && (
        <View style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useLanguageStore } from '@/stores/languageStore';

interface Counts {
  staff: number;
  teachers: number;
  students: number;
  classes: number;
  subjects: number;
  assignments: number;
}

export default function AdminDashboard({ name }: { name: string }) {
  const { t } = useLanguageStore();
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
    { label: t('nav.teachers'), value: counts ? String(counts.teachers) : '—' },
    { label: t('dashboard.statStudents'), value: counts ? String(counts.students) : '—' },
    { label: t('dashboard.statStaff'), value: counts ? String(counts.staff) : '—' },
    {
      label: t('dashboard.statTotalAccounts'),
      value: counts ? String(counts.staff + counts.teachers + counts.students) : '—',
    },
  ];

  const schoolStats = [
    { label: t('dashboard.statClasses'), value: counts ? String(counts.classes) : '—' },
    { label: t('dashboard.statSubjects'), value: counts ? String(counts.subjects) : '—' },
    { label: t('nav.assignments'), value: counts ? String(counts.assignments) : '—' },
  ];

  const total = counts ? counts.staff + counts.teachers + counts.students : null;

  return (
    <>
      <DashboardBanner
        eyebrow={t('dashboard.welcomeBack')}
        name={name}
        summary={total !== null ? t('dashboard.overseeingSummary', { count: String(total) }) : undefined}
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
        {t('dashboard.schoolOverview')}
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
        {t('dashboard.userManagement')}
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
          {t('dashboard.mobileManagementTitle')}
        </Text>
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>
          {t('dashboard.mobileManagementDesc')}
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

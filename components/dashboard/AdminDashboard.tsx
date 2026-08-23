import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import DashboardBanner, { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Counts {
  admins: number;
  teachers: number;
  students: number;
}

export default function AdminDashboard({ name }: { name: string }) {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase
      .from('profiles')
      .select('role')
      .then(({ data }) => {
        if (cancelled || !data) return;
        setCounts({
          admins: data.filter((row) => row.role === 'admin').length,
          teachers: data.filter((row) => row.role === 'teacher').length,
          students: data.filter((row) => row.role === 'student').length,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { label: 'Teachers', value: counts ? String(counts.teachers) : '—' },
    { label: 'Students', value: counts ? String(counts.students) : '—' },
    { label: 'Admins', value: counts ? String(counts.admins) : '—' },
    {
      label: 'Total accounts',
      value: counts ? String(counts.admins + counts.teachers + counts.students) : '—',
    },
  ];

  const total = counts ? counts.admins + counts.teachers + counts.students : null;

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
              <Text style={{ color: tile.text, fontSize: FontSize['2xl'], fontWeight: '700' }}>
                {stat.value}
              </Text>
              <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 2 }}>
                {stat.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={{ color: Colors.foreground, fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.xl, marginBottom: Spacing.md }}>
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

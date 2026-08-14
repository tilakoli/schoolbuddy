import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BorderRadius, Colors, FontSize, Shadow, Spacing } from '@/constants/theme';
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

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>Welcome back</Text>
          <Text style={{ color: Colors.foreground, fontSize: 28, fontWeight: '700', marginTop: 2 }}>
            {name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={{
            width: 44,
            height: 44,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20 }}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: Spacing.sm,
          marginTop: Spacing.xl,
        }}
      >
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={{
              flexBasis: '47%',
              flexGrow: 1,
              backgroundColor: Colors.card,
              borderColor: Colors.border,
              borderWidth: 1,
              borderRadius: BorderRadius.lg,
              padding: Spacing.md,
              ...Shadow.card,
            }}
          >
            <Text style={{ color: Colors.foreground, fontSize: FontSize['2xl'], fontWeight: '700' }}>
              {stat.value}
            </Text>
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 2 }}>
              {stat.label}
            </Text>
          </View>
        ))}
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
          Coming soon. For now, provision accounts from the Supabase dashboard.
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

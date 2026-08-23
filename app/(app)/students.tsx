import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Screen from '@/components/shared/Screen';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface RosterRow {
  key: string;
  name: string;
  className: string;
}

export default function StudentsScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;

    supabase
      .from('enrollments')
      .select('profiles(full_name, email), classes!inner(name, teacher_id)')
      .eq('classes.teacher_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setRows(
          ((data ?? []) as any[])
            .filter((row) => row.profiles)
            .map((row, index) => ({
              key: String(index),
              name: row.profiles.full_name || row.profiles.email,
              className: row.classes.name,
            }))
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Screen scroll>
      <Text style={{ color: Colors.foreground, fontSize: 28, fontWeight: '700' }}>Students</Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.xl }}>
        Students across your classes.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <>
          {rows.length === 0 && (
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>
              No students enrolled yet — add them from a class&apos;s roster.
            </Text>
          )}
          {rows.map((row) => (
            <View
              key={row.key}
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
              <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }}>{row.name}</Text>
              <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{row.className}</Text>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

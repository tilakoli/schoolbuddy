import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/shared/Screen';
import { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';

interface ClassGroupRow {
  id: string;
  name: string;
  subjectNames: string[];
  studentCount: number;
  offeringId: string | null;
}

export default function ClassesScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const { t } = useLanguageStore();
  const [classes, setClasses] = useState<ClassGroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, class_group_id, subjects(name), class_groups(name)')
        .eq('teacher_id', userId);
      const offerings = (data ?? []) as any[];
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

      if (cancelled) return;
      setClasses([...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Screen scroll>
      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: 26 }}>{t('nav.classes')}</Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>{t('classes.yourSubjectAcrossClasses')}</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <View style={{ marginTop: Spacing.lg }}>
          {classes.length === 0 && <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{t('classes.noClassesYetShort')}</Text>}
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
                <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>
                  {classItem.studentCount} {t('dashboard.statStudents').toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

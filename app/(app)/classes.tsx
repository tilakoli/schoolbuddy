import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import Button from '@/components/shared/Button';
import Screen from '@/components/shared/Screen';
import { TILE_PALETTE } from '@/components/dashboard/DashboardBanner';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface ClassRow {
  id: string;
  name: string;
  subject: string | null;
  period: string | null;
  room: string | null;
  studentCount: number;
}

export default function ClassesScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;

    supabase
      .from('classes')
      .select('id, name, subject, period, room, enrollments(count)')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setClasses(
          (data ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            subject: row.subject,
            period: row.period,
            room: row.room,
            studentCount: row.enrollments?.[0]?.count ?? 0,
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: Colors.foreground, fontSize: 28, fontWeight: '700' }}>Classes</Text>
          <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>Your class sections this term.</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreate((v) => !v)}>
          <Text style={{ color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' }}>New class</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <NewClassForm
          teacherId={userId!}
          onCreated={(created) => {
            setClasses((prev) => [{ ...created, studentCount: 0 }, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <View style={{ marginTop: Spacing.lg }}>
          {classes.length === 0 && (
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>No classes yet — create your first one above.</Text>
          )}
          {classes.map((classItem, i) => {
            const tile = TILE_PALETTE[i % TILE_PALETTE.length];
            return (
              <TouchableOpacity
                key={classItem.id}
                onPress={() => router.push(`/class/${classItem.id}`)}
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
                    <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 3 }} numberOfLines={1}>
                      {[classItem.subject, classItem.period, classItem.room].filter(Boolean).join(' · ') || 'No details yet'}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{classItem.studentCount} students</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function NewClassForm({ teacherId, onCreated }: { teacherId: string; onCreated: (row: Omit<ClassRow, 'studentCount'>) => void }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [period, setPeriod] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!supabase || !name.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .insert({ teacher_id: teacherId, name: name.trim(), subject: subject.trim() || null, period: period.trim() || null, room: room.trim() || null })
      .select('id, name, subject, period, room')
      .single();
    setLoading(false);
    if (!error && data) onCreated(data);
  };

  return (
    <View
      style={{
        backgroundColor: Colors.card,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.md,
        gap: Spacing.sm,
      }}
    >
      {[
        { placeholder: 'Class name', value: name, onChangeText: setName },
        { placeholder: 'Subject', value: subject, onChangeText: setSubject },
        { placeholder: 'Period / time', value: period, onChangeText: setPeriod },
        { placeholder: 'Room', value: room, onChangeText: setRoom },
      ].map((field) => (
        <TextInput
          key={field.placeholder}
          placeholder={field.placeholder}
          placeholderTextColor={Colors.mutedForeground}
          value={field.value}
          onChangeText={field.onChangeText}
          style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 10, fontSize: FontSize.sm, color: Colors.foreground }}
        />
      ))}
      <Button variant="accent" label={loading ? 'Creating…' : 'Create class'} onPress={submit} loading={loading} disabled={!name.trim()} />
    </View>
  );
}

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Screen from '@/components/shared/Screen';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface SubjectRow {
  id: string;
  name: string;
  subject: string | null;
  period: string | null;
  room: string | null;
}

export default function SubjectsScreen() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    // RLS ("Students view enrolled classes") already restricts this to the
    // signed-in student's own enrolled classes.
    supabase
      .from('classes')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (cancelled) return;
        setSubjects((data as SubjectRow[]) ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Screen scroll>
      <Text style={{ color: Colors.foreground, fontSize: 28, fontWeight: '700' }}>Subjects</Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.xl }}>
        Your enrolled subjects this term.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <>
          {subjects.length === 0 && (
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>You&apos;re not enrolled in any classes yet.</Text>
          )}
          {subjects.map((subject) => (
            <View
              key={subject.id}
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
              <View>
                <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }}>{subject.name}</Text>
                <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 3 }}>
                  {[subject.subject, subject.period].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{subject.room}</Text>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

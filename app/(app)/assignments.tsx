import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '@/components/shared/Button';
import Screen from '@/components/shared/Screen';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface AssignmentRow {
  id: string;
  title: string;
  assessment_type: string;
  difficulty: string;
  due_at: string | null;
  className: string;
  class_id: string;
}

const ASSESSMENT_TYPES = ['homework', 'test', 'discussion', 'revision'] as const;
const DIFFICULTIES = ['easy', 'medium', 'expert'] as const;

function dueStatus(dueAt: string | null): { label: string; color: string } {
  if (!dueAt) return { label: 'No due date', color: Colors.info };
  const diffDays = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { label: 'Overdue', color: Colors.danger };
  if (diffDays < 2) return { label: 'Due soon', color: Colors.warning };
  return { label: new Date(dueAt).toLocaleDateString(), color: Colors.info };
}

export default function AssignmentsScreen() {
  const { user, profile } = useAuthStore();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;

    (async () => {
      if (isTeacher) {
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name, class_groups(name)')
          .eq('teacher_id', user.id)
          .order('name');
        if (cancelled) return;
        const options = ((classes ?? []) as any[]).map((row) => ({
          id: row.id,
          name: row.class_groups?.name ? `${row.class_groups.name} · ${row.name}` : row.name,
        }));
        setClassOptions(options);

        if (options.length === 0) {
          setAssignments([]);
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('assignments')
          .select('id, title, assessment_type, difficulty, due_at, class_id, classes(name)')
          .in('class_id', options.map((c) => c.id))
          .order('due_at', { ascending: true, nullsFirst: false });
        if (cancelled) return;
        setAssignments(((data ?? []) as any[]).map((row) => ({ ...row, className: row.classes?.name ?? '' })));
      } else {
        // RLS restricts this to the signed-in student's own enrolled classes.
        const { data } = await supabase
          .from('assignments')
          .select('id, title, assessment_type, difficulty, due_at, class_id, classes(name)')
          .order('due_at', { ascending: true, nullsFirst: false });
        if (cancelled) return;
        setAssignments(((data ?? []) as any[]).map((row) => ({ ...row, className: row.classes?.name ?? '' })));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isTeacher]);

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: 26 }}>Assignments</Text>
          <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>
            {isTeacher ? 'Across all your classes.' : 'Across all your subjects.'}
          </Text>
        </View>
        {isTeacher && classOptions.length > 0 && (
          <TouchableOpacity onPress={() => setShowCreate((v) => !v)}>
            <Text style={{ color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' }}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCreate && (
        <NewAssignmentForm
          classOptions={classOptions}
          onCreated={(created) => {
            setAssignments((prev) => [
              { ...created, className: classOptions.find((c) => c.id === created.class_id)?.name ?? '' },
              ...prev,
            ]);
            setShowCreate(false);
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <View style={{ marginTop: Spacing.lg }}>
          {assignments.length === 0 && (
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>No assignments yet.</Text>
          )}
          {assignments.map((assignment) => {
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
        </View>
      )}
    </Screen>
  );
}

interface NewAssignmentPayload {
  id: string;
  title: string;
  assessment_type: string;
  difficulty: string;
  due_at: string | null;
  class_id: string;
}

function NewAssignmentForm({
  classOptions,
  onCreated,
}: {
  classOptions: { id: string; name: string }[];
  onCreated: (a: NewAssignmentPayload) => void;
}) {
  const [classId, setClassId] = useState(classOptions[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<(typeof ASSESSMENT_TYPES)[number]>('homework');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('medium');
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!supabase || !title.trim() || !classId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('assignments')
      .insert({ class_id: classId, title: title.trim(), assessment_type: assessmentType, difficulty, due_at: dueAt ? new Date(dueAt).toISOString() : null })
      .select('id, title, assessment_type, difficulty, due_at, class_id')
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
      {classOptions.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {classOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => setClassId(option.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: BorderRadius.full,
                backgroundColor: classId === option.id ? Colors.primaryLight : Colors.secondary,
              }}
            >
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: classId === option.id ? Colors.primary : Colors.mutedForeground }}>
                {option.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TextInput
        placeholder="Title"
        placeholderTextColor={Colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 10, fontSize: FontSize.sm, color: Colors.foreground }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {ASSESSMENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setAssessmentType(type)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: assessmentType === type ? Colors.primaryLight : Colors.secondary }}
          >
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: assessmentType === type ? Colors.primary : Colors.mutedForeground, textTransform: 'capitalize' }}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {DIFFICULTIES.map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => setDifficulty(level)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: difficulty === level ? Colors.primaryLight : Colors.secondary }}
          >
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: difficulty === level ? Colors.primary : Colors.mutedForeground, textTransform: 'capitalize' }}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        placeholder="Due date (e.g. 2026-10-30 18:30)"
        placeholderTextColor={Colors.mutedForeground}
        value={dueAt}
        onChangeText={setDueAt}
        style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 10, fontSize: FontSize.sm, color: Colors.foreground }}
      />
      <Button variant="accent" label={loading ? 'Saving…' : 'Save assignment'} onPress={submit} loading={loading} disabled={!title.trim()} />
    </View>
  );
}

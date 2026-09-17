import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '@/components/shared/Button';
import Screen from '@/components/shared/Screen';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface ClassRow {
  id: string;
  class_group_id: string;
  period: string | null;
  room: string | null;
  subjects: { name: string } | null;
  class_groups: { name: string } | null;
}

interface AssignmentRow {
  id: string;
  title: string;
  description: string | null;
  assessment_type: string;
  difficulty: string;
  due_at: string | null;
}

interface RosterStudent {
  id: string;
  full_name: string | null;
  email: string | null;
}

const ASSESSMENT_TYPES = ['homework', 'test', 'discussion', 'revision'] as const;
const DIFFICULTIES = ['easy', 'medium', 'expert'] as const;

export default function SubjectOfferingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  useEffect(() => {
    if (!supabase || !id) return;
    let cancelled = false;

    (async () => {
      const [{ data: cls }, { data: assignmentRows }] = await Promise.all([
        supabase.from('classes').select('*, subjects(name), class_groups(name)').eq('id', id).single(),
        supabase.from('assignments').select('*').eq('class_id', id).order('due_at', { ascending: true, nullsFirst: false }),
      ]);
      if (cancelled) return;
      setClassRow(cls as unknown as ClassRow | null);
      setAssignments((assignmentRows as AssignmentRow[]) ?? []);

      const groupId = (cls as unknown as ClassRow | null)?.class_group_id;
      if (groupId) {
        const { data: enrollmentRows } = await supabase.from('enrollments').select('profiles(id, full_name, email)').eq('class_group_id', groupId);
        if (cancelled) return;
        setRoster(((enrollmentRows ?? []) as unknown as { profiles: RosterStudent }[]).map((r) => r.profiles).filter(Boolean));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: Colors.primary, fontSize: FontSize.md }}>← Classes</Text>
      </TouchableOpacity>
      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: 24, marginTop: Spacing.md }}>
        {classRow?.subjects?.name ?? 'Subject'}
      </Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>
        {[classRow?.class_groups?.name, classRow?.period, classRow?.room].filter(Boolean).join(' · ') || 'No details yet'}
      </Text>

      <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: FontSize.lg, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        Students
      </Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.xs, marginBottom: Spacing.md }}>
        The class roster is managed by admin — you can see who's enrolled here.
      </Text>
      {roster.length === 0 && <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>No students enrolled yet.</Text>}
      {roster.map((student) => (
        <View
          key={student.id}
          style={{
            backgroundColor: Colors.card,
            borderColor: Colors.border,
            borderWidth: 1,
            borderRadius: BorderRadius.md,
            padding: Spacing.sm,
            marginBottom: Spacing.xs,
          }}
        >
          <Text style={{ color: Colors.foreground, fontSize: FontSize.sm, fontWeight: '600' }}>{student.full_name || student.email}</Text>
        </View>
      ))}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        <Text style={{ color: Colors.foreground, fontFamily: FontFamily.heading, fontSize: FontSize.lg }}>Assignments</Text>
        <TouchableOpacity onPress={() => setShowAssignmentForm((v) => !v)}>
          <Text style={{ color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' }}>New assignment</Text>
        </TouchableOpacity>
      </View>

      {showAssignmentForm && (
        <NewAssignmentInlineForm
          classId={id!}
          onCreated={(created) => {
            setAssignments((prev) => [created, ...prev]);
            setShowAssignmentForm(false);
          }}
        />
      )}

      {assignments.length === 0 && (
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>No assignments yet.</Text>
      )}
      {assignments.map((assignment) => (
        <View
          key={assignment.id}
          style={{
            backgroundColor: Colors.card,
            borderColor: Colors.border,
            borderWidth: 1,
            borderRadius: BorderRadius.md,
            padding: Spacing.sm,
            marginBottom: Spacing.xs,
          }}
        >
          <Text style={{ color: Colors.foreground, fontSize: FontSize.sm, fontWeight: '600' }}>{assignment.title}</Text>
          <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.xs, marginTop: 2 }}>
            {assignment.assessment_type} · {assignment.difficulty}
            {assignment.due_at ? ` · Due ${new Date(assignment.due_at).toLocaleDateString()}` : ''}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

function NewAssignmentInlineForm({ classId, onCreated }: { classId: string; onCreated: (a: AssignmentRow) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState<(typeof ASSESSMENT_TYPES)[number]>('homework');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('medium');
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!supabase || !title.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        class_id: classId,
        title: title.trim(),
        description: description.trim() || null,
        assessment_type: assessmentType,
        difficulty,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      })
      .select('*')
      .single();
    setLoading(false);
    if (!error && data) onCreated(data as AssignmentRow);
  };

  return (
    <View
      style={{
        backgroundColor: Colors.card,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
      }}
    >
      <TextInput
        placeholder="Title"
        placeholderTextColor={Colors.mutedForeground}
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 10, fontSize: FontSize.sm, color: Colors.foreground }}
      />
      <TextInput
        placeholder="Description"
        placeholderTextColor={Colors.mutedForeground}
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 10, fontSize: FontSize.sm, color: Colors.foreground, minHeight: 60 }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {ASSESSMENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setAssessmentType(type)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.full,
              backgroundColor: assessmentType === type ? Colors.primaryLight : Colors.secondary,
            }}
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
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.full,
              backgroundColor: difficulty === level ? Colors.primaryLight : Colors.secondary,
            }}
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

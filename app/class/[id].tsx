import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '@/components/shared/Button';
import Screen from '@/components/shared/Screen';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface ClassRow {
  id: string;
  name: string;
  subject: string | null;
  period: string | null;
  room: string | null;
}

interface StudentOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AssignmentRow {
  id: string;
  title: string;
  description: string | null;
  assessment_type: string;
  difficulty: string;
  due_at: string | null;
}

const ASSESSMENT_TYPES = ['homework', 'test', 'discussion', 'revision'] as const;
const DIFFICULTIES = ['easy', 'medium', 'expert'] as const;

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [roster, setRoster] = useState<StudentOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  useEffect(() => {
    if (!supabase || !id) return;
    let cancelled = false;

    (async () => {
      const [{ data: cls }, { data: enrollments }, { data: students }, { data: assignmentRows }] = await Promise.all([
        supabase.from('classes').select('*').eq('id', id).single(),
        supabase.from('enrollments').select('profiles(id, full_name, email)').eq('class_id', id),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
        supabase.from('assignments').select('*').eq('class_id', id).order('due_at', { ascending: true, nullsFirst: false }),
      ]);
      if (cancelled) return;
      setClassRow(cls as ClassRow | null);
      setRoster(((enrollments ?? []) as unknown as { profiles: StudentOption }[]).map((r) => r.profiles).filter(Boolean));
      setAllStudents((students as StudentOption[]) ?? []);
      setAssignments((assignmentRows as AssignmentRow[]) ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const addStudent = async (student: StudentOption) => {
    if (!supabase || !id) return;
    const { error } = await supabase.from('enrollments').insert({ class_id: id, student_id: student.id });
    if (!error) setRoster((prev) => [...prev, student]);
  };

  const removeStudent = async (studentId: string) => {
    if (!supabase || !id) return;
    const { error } = await supabase.from('enrollments').delete().eq('class_id', id).eq('student_id', studentId);
    if (!error) setRoster((prev) => prev.filter((s) => s.id !== studentId));
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  const rosterIds = new Set(roster.map((s) => s.id));
  const available = allStudents.filter(
    (s) =>
      !rosterIds.has(s.id) &&
      (!search ||
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Screen scroll>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: Colors.primary, fontSize: FontSize.md }}>← Classes</Text>
      </TouchableOpacity>
      <Text style={{ color: Colors.foreground, fontSize: 24, fontWeight: '700', marginTop: Spacing.md }}>
        {classRow?.name}
      </Text>
      <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 4 }}>
        {[classRow?.subject, classRow?.period, classRow?.room].filter(Boolean).join(' · ') || 'No details yet'}
      </Text>

      <Text style={{ color: Colors.foreground, fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        Roster
      </Text>
      {roster.length === 0 && (
        <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>No students enrolled yet.</Text>
      )}
      {roster.map((student) => (
        <View
          key={student.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: Colors.card,
            borderColor: Colors.border,
            borderWidth: 1,
            borderRadius: BorderRadius.md,
            padding: Spacing.sm,
            marginBottom: Spacing.xs,
          }}
        >
          <Text style={{ color: Colors.foreground, fontSize: FontSize.sm, fontWeight: '600' }}>
            {student.full_name || student.email}
          </Text>
          <TouchableOpacity onPress={() => removeStudent(student.id)}>
            <Text style={{ color: Colors.danger, fontSize: FontSize.xs, fontWeight: '600' }}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TextInput
        placeholder="Search students to add…"
        placeholderTextColor={Colors.mutedForeground}
        value={search}
        onChangeText={setSearch}
        style={{
          marginTop: Spacing.sm,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: BorderRadius.md,
          paddingHorizontal: Spacing.sm,
          paddingVertical: 10,
          fontSize: FontSize.sm,
          color: Colors.foreground,
        }}
      />
      {available.slice(0, 6).map((student) => (
        <TouchableOpacity
          key={student.id}
          onPress={() => addStudent(student)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}
        >
          <Text style={{ color: Colors.foreground, fontSize: FontSize.sm }}>{student.full_name || student.email}</Text>
          <Text style={{ color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      ))}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        <Text style={{ color: Colors.foreground, fontSize: FontSize.lg, fontWeight: '700' }}>Assignments</Text>
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

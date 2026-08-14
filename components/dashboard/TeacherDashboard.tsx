import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BorderRadius, Colors, FontSize, Shadow, Spacing } from '@/constants/theme';

const STATS = [
  { label: 'Classes', value: '4' },
  { label: 'Students', value: '96' },
  { label: 'Assignments due', value: '3' },
  { label: 'Ungraded', value: '12' },
] as const;

const CLASSES = [
  { name: 'Algebra I', period: 'Period 2 · 9:10 AM', students: 28 },
  { name: 'Algebra I', period: 'Period 4 · 11:45 AM', students: 26 },
  { name: 'Geometry Honors', period: 'Period 5 · 1:00 PM', students: 22 },
  { name: 'AP Calculus', period: 'Period 6 · 2:05 PM', students: 20 },
] as const;

const ASSIGNMENTS = [
  { title: 'Chapter 4 Quiz', className: 'Algebra I', due: 'Due tomorrow', status: 'warning' },
  { title: 'Proof Practice Set', className: 'Geometry Honors', due: 'Due Friday', status: 'info' },
  { title: 'Related Rates Homework', className: 'AP Calculus', due: 'Due Monday', status: 'info' },
] as const;

const STATUS_COLOR: Record<(typeof ASSIGNMENTS)[number]['status'], string> = {
  warning: Colors.warning,
  info: Colors.info,
};

export default function TeacherDashboard({ name }: { name: string }) {
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
        {STATS.map((stat) => (
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
        Your classes
      </Text>
      {CLASSES.map((classItem) => (
        <View
          key={`${classItem.name}-${classItem.period}`}
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
            <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }}>
              {classItem.name}
            </Text>
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 3 }}>
              {classItem.period}
            </Text>
          </View>
          <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>
            {classItem.students} students
          </Text>
        </View>
      ))}

      <Text style={{ color: Colors.foreground, fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.xl, marginBottom: Spacing.md }}>
        Upcoming assignments
      </Text>
      {ASSIGNMENTS.map((assignment) => (
        <View
          key={assignment.title}
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
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: BorderRadius.full,
              backgroundColor: STATUS_COLOR[assignment.status],
              marginRight: Spacing.sm,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.foreground, fontSize: FontSize.md, fontWeight: '600' }}>
              {assignment.title}
            </Text>
            <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm, marginTop: 3 }}>
              {assignment.className}
            </Text>
          </View>
          <Text style={{ color: Colors.mutedForeground, fontSize: FontSize.sm }}>{assignment.due}</Text>
        </View>
      ))}
    </>
  );
}

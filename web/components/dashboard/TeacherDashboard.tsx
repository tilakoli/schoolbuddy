import Link from 'next/link';

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
  warning: 'bg-warning',
  info: 'bg-info',
};

export default function TeacherDashboard({ name }: { name: string }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{name}</h1>
        </div>
        <Link
          href="/settings"
          aria-label="Open settings"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-lg"
        >
          ⚙
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">Your classes</h2>
      <div className="space-y-2">
        {CLASSES.map((classItem) => (
          <div
            key={`${classItem.name}-${classItem.period}`}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="font-semibold text-foreground">{classItem.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{classItem.period}</p>
            </div>
            <p className="text-sm text-muted-foreground">{classItem.students} students</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">Upcoming assignments</h2>
      <div className="space-y-2">
        {ASSIGNMENTS.map((assignment) => (
          <div key={assignment.title} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[assignment.status]}`} />
            <div className="flex-1">
              <p className="font-semibold text-foreground">{assignment.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{assignment.className}</p>
            </div>
            <p className="text-sm text-muted-foreground">{assignment.due}</p>
          </div>
        ))}
      </div>
    </>
  );
}

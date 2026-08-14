import Link from 'next/link';

const STATS = [
  { label: 'Enrolled classes', value: '6' },
  { label: 'Assignments due', value: '3' },
  { label: 'Average grade', value: '91%' },
  { label: 'Announcements', value: '2' },
] as const;

const CLASSES = [
  { name: 'Algebra I', teacher: 'Ms. Patel · Period 2', room: 'Room 108' },
  { name: 'World History', teacher: 'Mr. Nguyen · Period 3', room: 'Room 214' },
  { name: 'Biology', teacher: 'Dr. Alvarez · Period 5', room: 'Lab 3' },
  { name: 'English Literature', teacher: 'Ms. Foster · Period 6', room: 'Room 119' },
] as const;

const ASSIGNMENTS = [
  { title: 'Chapter 4 Quiz', className: 'Algebra I', due: 'Due tomorrow', status: 'warning' },
  { title: 'Reading Response', className: 'English Literature', due: 'Due Friday', status: 'info' },
  { title: 'Lab Report', className: 'Biology', due: 'Due Monday', status: 'info' },
] as const;

const STATUS_COLOR: Record<(typeof ASSIGNMENTS)[number]['status'], string> = {
  warning: 'bg-warning',
  info: 'bg-info',
};

export default function StudentDashboard({ name }: { name: string }) {
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

      <h2 className="mt-10 mb-4 text-lg font-bold text-foreground">My classes</h2>
      <div className="space-y-2">
        {CLASSES.map((classItem) => (
          <div key={classItem.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-semibold text-foreground">{classItem.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{classItem.teacher}</p>
            </div>
            <p className="text-sm text-muted-foreground">{classItem.room}</p>
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import { APP_CONFIG } from '@/constants/config';
import {
  BookIcon,
  CalendarIcon,
  ClipboardIcon,
  FileTextIcon,
  GridIcon,
  HomeIcon,
  PlayCircleIcon,
  SettingsIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@/components/icons';
import type { Role } from '@/lib/supabase/profile';

type IconComponent = typeof HomeIcon;

const NAV: Record<Role, { href: string; label: string; icon: IconComponent }[]> = {
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/admin/teachers', label: 'Teachers', icon: UsersIcon },
    { href: '/admin/students', label: 'Students', icon: UsersIcon },
  ],
  teacher: [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/classes', label: 'Classes', icon: GridIcon },
    { href: '/students', label: 'Students', icon: UsersIcon },
    { href: '/assignments', label: 'Assignments', icon: ClipboardIcon },
    { href: '/exams', label: 'Exams', icon: FileTextIcon },
    { href: '/curriculum', label: 'Curriculum', icon: BookIcon },
    { href: '/performance', label: 'Performance', icon: TrendingUpIcon },
    { href: '/timetable', label: 'Timetable', icon: CalendarIcon },
    { href: '/learning-videos', label: 'Learning Videos', icon: PlayCircleIcon },
  ],
  student: [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/subjects', label: 'Subjects', icon: GridIcon },
    { href: '/assignments', label: 'Assignments', icon: ClipboardIcon },
    { href: '/exams', label: 'Exams', icon: FileTextIcon },
    { href: '/performance', label: 'Performance', icon: TrendingUpIcon },
    { href: '/timetable', label: 'Timetable', icon: CalendarIcon },
    { href: '/learning-videos', label: 'Learning Videos', icon: PlayCircleIcon },
  ],
};

export default function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = [...NAV[role], { href: '/settings', label: 'Settings', icon: SettingsIcon }];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border-soft bg-card px-4 py-6">
      <div className="flex items-center gap-2 px-2 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {APP_CONFIG.name.charAt(0)}
        </div>
        <p className="text-sm font-bold text-foreground">{APP_CONFIG.name}</p>
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                active ? 'bg-primary-light text-primary' : 'text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <SignOutButton />
    </aside>
  );
}

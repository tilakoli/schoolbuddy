'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import { APP_CONFIG } from '@/constants/config';
import { useLanguage } from '@/components/LanguageProvider';
import {
  CalendarIcon,
  ChatIcon,
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

const NAV: Record<Role, { href: string; labelKey: string; icon: IconComponent }[]> = {
  admin: [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: HomeIcon },
    { href: '/ai-chat', labelKey: 'nav.aiChat', icon: ChatIcon },
    { href: '/classes', labelKey: 'nav.classes', icon: GridIcon },
    { href: '/admin/teachers', labelKey: 'nav.teachers', icon: UsersIcon },
    { href: '/admin/students', labelKey: 'nav.students', icon: UsersIcon },
  ],
  vice_principal: [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: HomeIcon },
    { href: '/ai-chat', labelKey: 'nav.aiChat', icon: ChatIcon },
    { href: '/classes', labelKey: 'nav.classes', icon: GridIcon },
    { href: '/admin/teachers', labelKey: 'nav.teachers', icon: UsersIcon },
    { href: '/admin/students', labelKey: 'nav.students', icon: UsersIcon },
  ],
  teacher: [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: HomeIcon },
    { href: '/ai-chat', labelKey: 'nav.aiChat', icon: ChatIcon },
    { href: '/classes', labelKey: 'nav.classes', icon: GridIcon },
    { href: '/students', labelKey: 'nav.students', icon: UsersIcon },
    { href: '/assignments', labelKey: 'nav.assignments', icon: ClipboardIcon },
    { href: '/exams', labelKey: 'nav.exams', icon: FileTextIcon },
    { href: '/performance', labelKey: 'nav.performance', icon: TrendingUpIcon },
    { href: '/timetable', labelKey: 'nav.timetable', icon: CalendarIcon },
    { href: '/learning-videos', labelKey: 'nav.learningVideos', icon: PlayCircleIcon },
  ],
  student: [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: HomeIcon },
    { href: '/ai-chat', labelKey: 'nav.aiChat', icon: ChatIcon },
    { href: '/subjects', labelKey: 'nav.subjects', icon: GridIcon },
    { href: '/assignments', labelKey: 'nav.assignments', icon: ClipboardIcon },
    { href: '/exams', labelKey: 'nav.exams', icon: FileTextIcon },
    { href: '/performance', labelKey: 'nav.performance', icon: TrendingUpIcon },
    { href: '/timetable', labelKey: 'nav.timetable', icon: CalendarIcon },
    { href: '/learning-videos', labelKey: 'nav.learningVideos', icon: PlayCircleIcon },
  ],
};

export default function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const items = [...NAV[role], { href: '/settings', labelKey: 'nav.settings', icon: SettingsIcon }];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border-soft bg-card px-4 py-6">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2 rounded-lg px-2 pb-2 hover:opacity-80">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {APP_CONFIG.name.charAt(0)}
        </div>
        <p className="text-sm font-bold text-foreground">{APP_CONFIG.name}</p>
      </Link>

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
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <SignOutButton />
    </aside>
  );
}

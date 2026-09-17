'use client';

import { useState, type ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { MenuIcon, XIcon } from '@/components/icons';
import { APP_CONFIG } from '@/constants/config';
import type { Role } from '@/lib/supabase/profile';

export default function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border-soft bg-card px-4 py-3 md:hidden">
        <span className="text-sm font-bold text-foreground">{APP_CONFIG.name}</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
        >
          <MenuIcon />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full">
          <Sidebar role={role} onNavigate={() => setOpen(false)} />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-foreground hover:bg-secondary md:hidden"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

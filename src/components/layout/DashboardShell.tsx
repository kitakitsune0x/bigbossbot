'use client';

import { useEffect } from 'react';
import AppSidebar from '@/components/layout/AppSidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { PreferencesProvider } from '@/components/dashboard/PreferencesProvider';
import CommandPalette from '@/components/dashboard/CommandPalette';
import ShortcutsHelp from '@/components/dashboard/ShortcutsHelp';
import type { UserPreferences } from '@/types/auth';

type DashboardShellProps = {
  username: string;
  role: 'admin' | 'member';
  initialPreferences: UserPreferences;
  children: React.ReactNode;
};

function SidebarToggleListener({ children }: { children: React.ReactNode }) {
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    const handle = () => toggleSidebar();
    window.addEventListener('toggle-sidebar', handle);
    return () => window.removeEventListener('toggle-sidebar', handle);
  }, [toggleSidebar]);

  return <>{children}</>;
}

export default function DashboardShell({ username, role, initialPreferences, children }: DashboardShellProps) {
  return (
    <PreferencesProvider initialPreferences={initialPreferences}>
      <SidebarProvider>
        <SidebarToggleListener>
          <AppSidebar username={username} role={role} />
          <SidebarInset>
            <DashboardHeader />
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </SidebarInset>
          <CommandPalette />
          <ShortcutsHelp />
        </SidebarToggleListener>
      </SidebarProvider>
    </PreferencesProvider>
  );
}

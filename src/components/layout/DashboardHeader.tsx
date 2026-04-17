'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { APP_NAME, DASHBOARD_PANEL_LABELS, type DashboardPanelId } from '@/lib/auth/config';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/account/settings': 'Settings',
  '/admin/users': 'User Management',
};

export default function DashboardHeader() {
  const pathname = usePathname();

  // Check if on a panel page like /news, /map, etc.
  const slug = pathname.replace(/^\//, '') as DashboardPanelId;
  const panelLabel = DASHBOARD_PANEL_LABELS[slug] ?? undefined;

  const pageTitle = panelLabel ?? PAGE_LABELS[pathname] ?? APP_NAME;

  return (
    <header className="flex min-h-12 shrink-0 items-center gap-2 border-b bg-background px-3 py-1.5">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-muted-foreground">{APP_NAME}</span>
        <span className="text-muted-foreground/40">/</span>
        {panelLabel ? (
          <>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-medium">{panelLabel}</span>
          </>
        ) : (
          <span className="font-medium">{pageTitle}</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="rounded-md border border-border/80 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          GLOBAL
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-clear" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
          LIVE
        </span>
      </div>
    </header>
  );
}

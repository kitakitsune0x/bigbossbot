'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Kbd } from '@/components/dashboard/ShortcutsHelp';
import { DASHBOARD_PANEL_LABELS, type DashboardPanelId } from '@/lib/auth/config';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/account/security': 'Security',
  '/admin/users': 'User Management',
};

export default function DashboardHeader() {
  const pathname = usePathname();

  // Check if on a panel page like /news, /map, etc.
  const slug = pathname.replace(/^\//, '') as DashboardPanelId;
  const panelLabel = DASHBOARD_PANEL_LABELS[slug] ?? undefined;

  const pageTitle = panelLabel ?? PAGE_LABELS[pathname] ?? 'AWARE';

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b bg-background px-3">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-muted-foreground">AWARE</span>
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

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          className="flex items-center gap-2 rounded border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <span className="hidden sm:inline">Search...</span>
          <span className="flex items-center gap-0.5">
            <Kbd>{'\u2318'}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-clear" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
          LIVE
        </span>
      </div>
    </header>
  );
}

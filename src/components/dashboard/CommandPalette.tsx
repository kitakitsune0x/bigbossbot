'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  Users,
  Newspaper,
  Map,
  Siren,
  Send,
  TrendingUp,
  Crosshair,
  BarChart3,
  Swords,
  Plane,
  Globe,
  Ship,
  Bitcoin,
  Fuel,
  Satellite,
  Search,
  Keyboard,
  Eye,
  EyeOff,
  PanelLeft,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import { useSidebar } from '@/components/ui/sidebar';
import { PANEL_DATA_ENDPOINTS } from '@/components/dashboard/panel-data';
import { focusDashboardPanel } from '@/components/dashboard/panel-navigation';
import { primeDataFeed } from '@/lib/hooks';
import { DASHBOARD_PANEL_IDS, DASHBOARD_PANEL_LABELS, type DashboardPanelId } from '@/lib/auth/config';

const PANEL_ICONS: Record<DashboardPanelId, React.ComponentType<{ className?: string }>> = {
  news: Newspaper,
  map: Map,
  alerts: Siren,
  telegram: Send,
  markets: TrendingUp,
  strikes: Crosshair,
  polymarket: BarChart3,
  conflicts: Swords,
  flights: Plane,
  'regional-alerts': Globe,
  naval: Ship,
  crypto: Bitcoin,
  oil: Fuel,
  satellite: Satellite,
};

export { PANEL_ICONS };

export function scrollToPanel(panelId: string) {
  focusDashboardPanel(panelId as DashboardPanelId);
}

// Optional context for when CommandPalette is used inside PreferencesProvider
type PanelOps = {
  visiblePanels: DashboardPanelId[];
  isPanelHidden: (id: DashboardPanelId) => boolean;
  togglePanel: (id: DashboardPanelId) => Promise<void>;
} | null;

const PanelOpsContext = createContext<PanelOps>(null);
export const PanelOpsProvider = PanelOpsContext.Provider;

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const panelOps = useContext(PanelOpsContext);

  const visiblePanels = panelOps?.visiblePanels ?? [...DASHBOARD_PANEL_IDS];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handlePanelSelect = useCallback((id: DashboardPanelId) => {
    setOpen(false);
    if (pathname === '/dashboard' && !isMobile) {
      focusDashboardPanel(id);
      return;
    }
    router.prefetch(`/${id}`);
    (PANEL_DATA_ENDPOINTS[id] ?? []).forEach((endpoint) => {
      void primeDataFeed(endpoint);
    });
    router.push(`/${id}`);
  }, [isMobile, pathname, router]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search panels, pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard'); }}>
            <LayoutDashboard />
            <span>Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); router.push('/account/security'); }}>
            <Shield />
            <span>Security Settings</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); router.push('/admin/users'); }}>
            <Users />
            <span>User Management</span>
            <CommandShortcut>G U</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Jump to Panel">
          {visiblePanels.map((id) => {
            const Icon = PANEL_ICONS[id];
            return (
              <CommandItem key={id} onSelect={() => handlePanelSelect(id)}>
                <Icon />
                <span>{DASHBOARD_PANEL_LABELS[id]}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {panelOps && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Toggle Panel Visibility">
              {DASHBOARD_PANEL_IDS.map((id) => {
                const Icon = PANEL_ICONS[id];
                const hidden = panelOps.isPanelHidden(id);
                return (
                  <CommandItem key={id} onSelect={() => { void panelOps.togglePanel(id); }}>
                    {hidden ? <EyeOff className="text-muted-foreground" /> : <Eye className="text-status-clear" />}
                    <span>{DASHBOARD_PANEL_LABELS[id]}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {hidden ? 'Hidden' : 'Visible'}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Shortcuts">
          <CommandItem onSelect={() => setOpen(false)}>
            <Search />
            <span>Search</span>
            <CommandShortcut>{'\u2318'}K</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => {
            setOpen(false);
            window.dispatchEvent(new CustomEvent('toggle-shortcuts-help'));
          }}>
            <Keyboard />
            <span>Keyboard Shortcuts</span>
            <CommandShortcut>{'\u2318'}/</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => {
            setOpen(false);
            window.dispatchEvent(new CustomEvent('toggle-sidebar'));
          }}>
            <PanelLeft />
            <span>Toggle Sidebar</span>
            <CommandShortcut>{'\u2318'}B</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

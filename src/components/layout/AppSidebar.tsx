'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  Users,
  LogOut,
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
  Loader2,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { PANEL_DATA_ENDPOINTS } from '@/components/dashboard/panel-data';
import { isPlainLeftClick } from '@/components/dashboard/panel-navigation';
import { Kbd } from '@/components/dashboard/ShortcutsHelp';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { primeDataFeed } from '@/lib/hooks';
import type { DashboardPanelId } from '@/lib/auth/config';

type AppSidebarProps = {
  username: string;
  role: 'admin' | 'member';
};

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/account/security', label: 'Security', icon: Shield },
];

const ADMIN_ITEMS = [
  { href: '/admin/users', label: 'Users', icon: Users },
];

type PanelItem = {
  panelId: DashboardPanelId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const INTEL_ITEMS: PanelItem[] = [
  { panelId: 'news', label: 'Intel Feed', icon: Newspaper },
  { panelId: 'map', label: 'Conflict Map', icon: Map },
  { panelId: 'alerts', label: 'Israel Alerts', icon: Siren },
  { panelId: 'telegram', label: 'Telegram OSINT', icon: Send },
];

const MARKET_ITEMS: PanelItem[] = [
  { panelId: 'markets', label: 'Markets', icon: TrendingUp },
  { panelId: 'crypto', label: 'Crypto', icon: Bitcoin },
  { panelId: 'oil', label: 'Energy', icon: Fuel },
  { panelId: 'polymarket', label: 'Predictions', icon: BarChart3 },
];

const MILITARY_ITEMS: PanelItem[] = [
  { panelId: 'strikes', label: 'Strikes', icon: Crosshair },
  { panelId: 'conflicts', label: 'Conflicts', icon: Swords },
  { panelId: 'flights', label: 'Mil Air', icon: Plane },
  { panelId: 'regional-alerts', label: 'Regional', icon: Globe },
  { panelId: 'naval', label: 'Naval', icon: Ship },
  { panelId: 'satellite', label: 'Satellite', icon: Satellite },
];

type SidebarLinkProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isPending: boolean;
  label: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onWarmRoute?: () => void;
};

function SidebarNavLink({
  href,
  icon: Icon,
  isActive,
  isPending,
  label,
  onClick,
  onWarmRoute,
}: SidebarLinkProps) {
  return (
    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
      <Link
        href={href}
        prefetch
        onClick={onClick}
        onMouseEnter={onWarmRoute}
        onFocus={onWarmRoute}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Icon />}
        <span>{label}</span>
      </Link>
    </SidebarMenuButton>
  );
}

function PanelGroup({
  label,
  items,
  pathname,
  pendingHref,
  warmPanel,
  onPanelSelect,
}: {
  label: string;
  items: PanelItem[];
  pathname: string;
  pendingHref: string | null;
  warmPanel: (panelId: DashboardPanelId) => void;
  onPanelSelect: (panelId: DashboardPanelId, event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.panelId}>
              <SidebarNavLink
                href={`/${item.panelId}`}
                icon={item.icon}
                isActive={pathname === `/${item.panelId}`}
                isPending={pendingHref === `/${item.panelId}`}
                label={item.label}
                onClick={(event) => onPanelSelect(item.panelId, event)}
                onWarmRoute={() => warmPanel(item.panelId)}
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default function AppSidebar({ username, role }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    const allRoutes = [
      ...NAV_ITEMS.map((item) => item.href),
      ...(role === 'admin' ? ADMIN_ITEMS.map((item) => item.href) : []),
      ...INTEL_ITEMS.map((item) => `/${item.panelId}`),
      ...MARKET_ITEMS.map((item) => `/${item.panelId}`),
      ...MILITARY_ITEMS.map((item) => `/${item.panelId}`),
    ];

    const warmRoutesTimeout = window.setTimeout(() => {
      allRoutes
        .filter((href) => href !== pathname)
        .forEach((href) => router.prefetch(href));
    }, 300);

    return () => window.clearTimeout(warmRoutesTimeout);
  }, [pathname, role, router]);

  function warmRoute(href: string) {
    router.prefetch(href);
  }

  function warmPanel(panelId: DashboardPanelId) {
    warmRoute(`/${panelId}`);

    const endpoints = PANEL_DATA_ENDPOINTS[panelId] ?? [];
    endpoints.forEach((endpoint) => {
      void primeDataFeed(endpoint);
    });
  }

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  function navigateToRoute(href: string, event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isPlainLeftClick(event)) {
      return;
    }

    if (href === pathname) {
      event.preventDefault();
      closeMobileSidebar();
      return;
    }

    setPendingHref(href);
    closeMobileSidebar();
  }

  function handlePanelSelect(panelId: DashboardPanelId, event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isPlainLeftClick(event)) {
      return;
    }

    warmPanel(panelId);
    navigateToRoute(`/${panelId}`, event);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-[10px] font-bold">
                  AW
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold tracking-wider">AWARE</span>
                  <span className="truncate text-xs text-muted-foreground">Command Center</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Search shortcut hint */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Search"
                  onClick={() => {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                  }}
                  className="cursor-pointer"
                >
                  <Search />
                  <span>Search</span>
                  <span className="ml-auto flex items-center gap-0.5">
                    <Kbd>{'\u2318'}</Kbd>
                    <Kbd>K</Kbd>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarNavLink
                    href={item.href}
                    icon={item.icon}
                    isActive={pathname === item.href}
                    isPending={pendingHref === item.href}
                    label={item.label}
                    onClick={(event) => navigateToRoute(item.href, event)}
                    onWarmRoute={() => warmRoute(item.href)}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarNavLink
                      href={item.href}
                      icon={item.icon}
                      isActive={pathname === item.href}
                      isPending={pendingHref === item.href}
                      label={item.label}
                      onClick={(event) => navigateToRoute(item.href, event)}
                      onWarmRoute={() => warmRoute(item.href)}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator />

        {/* Panel sections — clickable, scroll to panel on dashboard */}
        <PanelGroup
          label="Intelligence"
          items={INTEL_ITEMS}
          pathname={pathname}
          pendingHref={pendingHref}
          warmPanel={warmPanel}
          onPanelSelect={handlePanelSelect}
        />
        <PanelGroup
          label="Markets"
          items={MARKET_ITEMS}
          pathname={pathname}
          pendingHref={pendingHref}
          warmPanel={warmPanel}
          onPanelSelect={handlePanelSelect}
        />
        <PanelGroup
          label="Military"
          items={MILITARY_ITEMS}
          pathname={pathname}
          pendingHref={pendingHref}
          warmPanel={warmPanel}
          onPanelSelect={handlePanelSelect}
        />

        <SidebarSeparator />

        {/* Shortcuts hint */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Shortcuts"
                  onClick={() => window.dispatchEvent(new CustomEvent('toggle-shortcuts-help'))}
                  className="cursor-pointer"
                >
                  <Keyboard />
                  <span>Shortcuts</span>
                  <span className="ml-auto flex items-center gap-0.5">
                    <Kbd>{'\u2318'}</Kbd>
                    <Kbd>/</Kbd>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={username}>
              <div className="flex aspect-square size-6 items-center justify-center rounded bg-sidebar-accent text-[9px] font-semibold">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{username}</span>
                <span className="truncate text-xs text-muted-foreground capitalize">{role}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logoutAction}>
              <SidebarMenuButton type="submit" tooltip="Log out">
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

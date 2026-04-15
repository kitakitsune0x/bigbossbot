'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2 } from 'lucide-react';
import MetricsBar from '@/components/panels/MetricsBar';
import ThreatClock from '@/components/panels/ThreatClock';
import NewsFeed from '@/components/panels/NewsFeed';
import OilPanel from '@/components/panels/OilPanel';
import MarketsPanel from '@/components/panels/MarketsPanel';
import ConflictFeed from '@/components/panels/ConflictFeed';
import TelegramPanel from '@/components/panels/TelegramPanel';
import FlightsPanel from '@/components/panels/FlightsPanel';
import StrikesPanel from '@/components/panels/StrikesPanel';
import AlertsPanel from '@/components/panels/AlertsPanel';
import SatellitePanel from '@/components/panels/SatellitePanel';
import NavalPanel from '@/components/panels/NavalPanel';
import RegionalAlertsPanel from '@/components/panels/RegionalAlertsPanel';
import CryptoPanel from '@/components/panels/CryptoPanel';
import PolymarketPanel from '@/components/panels/PolymarketPanel';
import DashboardUserMenu from '@/components/dashboard/DashboardUserMenu';
import { useDashboardPreferences } from '@/components/dashboard/PreferencesProvider';
import { PanelOpsProvider } from '@/components/dashboard/CommandPalette';
import KeyboardHandler from '@/components/dashboard/KeyboardHandler';
import { DASHBOARD_PANEL_FOCUS_EVENT } from '@/components/dashboard/panel-navigation';
import { APP_SLUG, DASHBOARD_PANEL_LABELS, type DashboardPanelId } from '@/lib/auth/config';

const ConflictMap = dynamic(() => import('@/components/map/ConflictMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  ),
});

const PANEL_COMPONENTS: Record<DashboardPanelId, React.ComponentType<{ className?: string }>> = {
  news: NewsFeed,
  map: ConflictMap,
  alerts: AlertsPanel,
  telegram: TelegramPanel,
  markets: MarketsPanel,
  strikes: StrikesPanel,
  polymarket: PolymarketPanel,
  conflicts: ConflictFeed,
  flights: FlightsPanel,
  'regional-alerts': RegionalAlertsPanel,
  naval: NavalPanel,
  crypto: CryptoPanel,
  oil: OilPanel,
  satellite: SatellitePanel,
};

const PANEL_SIZE: Record<DashboardPanelId, 'lg' | 'md' | 'sm'> = {
  news: 'lg',
  map: 'lg',
  alerts: 'md',
  telegram: 'lg',
  markets: 'md',
  strikes: 'md',
  polymarket: 'md',
  conflicts: 'md',
  flights: 'md',
  'regional-alerts': 'md',
  naval: 'md',
  crypto: 'sm',
  oil: 'sm',
  satellite: 'md',
};

const SIZE_CLASSES: Record<string, string> = {
  lg: 'col-span-12 sm:col-span-6 xl:col-span-4',
  md: 'col-span-12 sm:col-span-6 xl:col-span-3',
  sm: 'col-span-12 sm:col-span-6 xl:col-span-2',
};

const DASHBOARD_DND_CONTEXT_ID = `${APP_SLUG}-dashboard-dnd`;

function SortablePanel({
  id,
  children,
  spotlighted = false,
}: {
  id: string;
  children: React.ReactNode;
  spotlighted?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${SIZE_CLASSES[PANEL_SIZE[id as DashboardPanelId] ?? 'md']} relative group/panel rounded-xl transition-all duration-300 ${
        spotlighted ? 'ring-2 ring-primary/45 shadow-lg shadow-primary/10' : 'ring-0'
      }`}
      id={`panel-${id}`}
    >
      <div className="absolute top-0 left-0 z-10 opacity-0 group-hover/panel:opacity-100 transition-opacity">
        <button
          className="flex items-center justify-center w-5 h-8 bg-card/90 border-r border-b border-border text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </button>
      </div>
      {children}
    </div>
  );
}

function DashboardGrid() {
  const { visiblePanels, panelOrder, setPanelOrder } = useDashboardPreferences();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [spotlightId, setSpotlightId] = useState<DashboardPanelId | null>(null);
  const spotlightTimeoutRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = panelOrder.indexOf(active.id as DashboardPanelId);
    const newIndex = panelOrder.indexOf(over.id as DashboardPanelId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(panelOrder, oldIndex, newIndex);
    void setPanelOrder(newOrder);
  }, [panelOrder, setPanelOrder]);

  useEffect(() => {
    const handlePanelFocus = (event: Event) => {
      const { panelId } = (event as CustomEvent<{ panelId: DashboardPanelId }>).detail;
      const panelElement = document.getElementById(`panel-${panelId}`);

      if (!panelElement) {
        return;
      }

      panelElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setSpotlightId(panelId);

      if (spotlightTimeoutRef.current) {
        window.clearTimeout(spotlightTimeoutRef.current);
      }

      spotlightTimeoutRef.current = window.setTimeout(() => {
        setSpotlightId((current) => (current === panelId ? null : current));
      }, 1600);
    };

    window.addEventListener(DASHBOARD_PANEL_FOCUS_EVENT, handlePanelFocus as EventListener);

    return () => {
      window.removeEventListener(DASHBOARD_PANEL_FOCUS_EVENT, handlePanelFocus as EventListener);
      if (spotlightTimeoutRef.current) {
        window.clearTimeout(spotlightTimeoutRef.current);
      }
    };
  }, []);

  return (
    <DndContext
      id={DASHBOARD_DND_CONTEXT_ID}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visiblePanels} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-12 auto-rows-[320px] h-full overflow-y-auto">
          {visiblePanels.map((id) => {
            const Component = PANEL_COMPONENTS[id];
            if (!Component) return null;
            return (
              <SortablePanel key={id} id={id} spotlighted={spotlightId === id}>
                <div className="relative isolate h-full overflow-hidden border border-border bg-card [contain:paint]">
                  <Component className="h-full" />
                </div>
              </SortablePanel>
            );
          })}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div className="h-72 w-72 border border-primary/50 bg-card shadow-xl shadow-primary/10 rounded overflow-hidden opacity-90">
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              {DASHBOARD_PANEL_LABELS[activeId as DashboardPanelId]}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DashboardFrame() {
  const prefs = useDashboardPreferences();

  return (
    <PanelOpsProvider value={{
      visiblePanels: prefs.visiblePanels,
      isPanelHidden: prefs.isPanelHidden,
      togglePanel: prefs.togglePanel,
    }}>
      <KeyboardHandler />
      <div className="flex flex-col h-full">
        {/* Status strip */}
        <div className="flex items-center justify-between border-b border-border bg-card px-3 py-1.5 shrink-0">
          <MetricsBar />
          <DashboardUserMenu />
        </div>

        {/* Time strip */}
        <ThreatClock />

        {/* Draggable panel grid */}
        <div className="flex-1 min-h-0">
          <DashboardGrid />
        </div>
      </div>
    </PanelOpsProvider>
  );
}

export default function DashboardClient() {
  return <DashboardFrame />;
}

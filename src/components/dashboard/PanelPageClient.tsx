'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { DashboardPanelId } from '@/lib/auth/config';

function PanelLoadingState() {
  return (
    <div className="flex h-full items-center justify-center gap-2 bg-card text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Opening panel...</span>
    </div>
  );
}

const ConflictMap = dynamic(() => import('@/components/map/ConflictMap'), {
  ssr: false,
  loading: PanelLoadingState,
});

const NewsFeed = dynamic(() => import('@/components/panels/NewsFeed'), { loading: PanelLoadingState });
const OilPanel = dynamic(() => import('@/components/panels/OilPanel'), { loading: PanelLoadingState });
const MarketsPanel = dynamic(() => import('@/components/panels/MarketsPanel'), { loading: PanelLoadingState });
const ConflictFeed = dynamic(() => import('@/components/panels/ConflictFeed'), { loading: PanelLoadingState });
const TelegramPanel = dynamic(() => import('@/components/panels/TelegramPanel'), { loading: PanelLoadingState });
const FlightsPanel = dynamic(() => import('@/components/panels/FlightsPanel'), { loading: PanelLoadingState });
const StrikesPanel = dynamic(() => import('@/components/panels/StrikesPanel'), { loading: PanelLoadingState });
const AlertsPanel = dynamic(() => import('@/components/panels/AlertsPanel'), { loading: PanelLoadingState });
const SatellitePanel = dynamic(() => import('@/components/panels/SatellitePanel'), { loading: PanelLoadingState });
const NavalPanel = dynamic(() => import('@/components/panels/NavalPanel'), { loading: PanelLoadingState });
const RegionalAlertsPanel = dynamic(() => import('@/components/panels/RegionalAlertsPanel'), { loading: PanelLoadingState });
const CryptoPanel = dynamic(() => import('@/components/panels/CryptoPanel'), { loading: PanelLoadingState });
const PolymarketPanel = dynamic(() => import('@/components/panels/PolymarketPanel'), { loading: PanelLoadingState });

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

export default function PanelPageClient({ panelId }: { panelId: DashboardPanelId }) {
  const Component = PANEL_COMPONENTS[panelId];
  if (!Component) return null;

  return <Component className="h-full" />;
}

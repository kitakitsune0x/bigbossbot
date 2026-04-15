import type { DashboardPanelId } from '@/lib/auth/config';
import { buildTheaterApiPath, type TheaterId } from '@/lib/theater';

const PANEL_DATA_PATHS: Partial<Record<DashboardPanelId, string[]>> = {
  news: ['/api/news'],
  alerts: ['/api/alerts'],
  telegram: ['/api/telegram'],
  markets: ['/api/markets'],
  strikes: ['/api/strikes'],
  polymarket: ['/api/polymarket'],
  conflicts: ['/api/conflicts'],
  flights: ['/api/flights'],
  'regional-alerts': ['/api/regional-alerts'],
  naval: ['/api/ships'],
  crypto: ['/api/crypto'],
  oil: ['/api/oil'],
  satellite: ['/api/fires'],
};

export function getPanelDataEndpoints(theater: TheaterId): Partial<Record<DashboardPanelId, string[]>> {
  return Object.fromEntries(
    Object.entries(PANEL_DATA_PATHS).map(([panelId, endpoints]) => [
      panelId,
      (endpoints ?? []).map((endpoint) => buildTheaterApiPath(endpoint, theater)),
    ]),
  ) as Partial<Record<DashboardPanelId, string[]>>;
}

export function getPanelDataPaths(panelId: DashboardPanelId, theater: TheaterId) {
  return getPanelDataEndpoints(theater)[panelId] ?? [];
}

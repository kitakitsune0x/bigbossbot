import type { DashboardPanelId } from '@/lib/auth/config';

export const PANEL_DATA_ENDPOINTS: Partial<Record<DashboardPanelId, string[]>> = {
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

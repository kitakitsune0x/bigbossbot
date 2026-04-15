export const APP_NAME = 'AWARE';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'aware_session';
export const LOGIN_CHALLENGE_COOKIE_NAME = 'aware_login_challenge';

export const SESSION_TTL_MS = Number(process.env.AUTH_SESSION_DAYS ?? '30') * 24 * 60 * 60 * 1000;
export const SESSION_ROLLING_WINDOW_MS = 6 * 60 * 60 * 1000;
export const LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const RECOVERY_CODE_COUNT = 8;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export const DASHBOARD_PANEL_IDS = [
  'news',
  'map',
  'alerts',
  'telegram',
  'markets',
  'strikes',
  'polymarket',
  'conflicts',
  'flights',
  'regional-alerts',
  'naval',
  'crypto',
  'oil',
  'satellite',
] as const;

export type DashboardPanelId = (typeof DASHBOARD_PANEL_IDS)[number];

export const DASHBOARD_PANEL_LABELS: Record<DashboardPanelId, string> = {
  news: 'Live Intel Feed',
  map: 'Conflict Map',
  alerts: 'Israel Alerts',
  telegram: 'Telegram OSINT',
  markets: 'Markets',
  strikes: 'Strikes',
  polymarket: 'Prediction Markets',
  conflicts: 'Conflict Feed',
  flights: 'Military Flights',
  'regional-alerts': 'Regional Alerts',
  naval: 'Naval Tracker',
  crypto: 'Crypto',
  oil: 'Energy',
  satellite: 'Satellite',
};

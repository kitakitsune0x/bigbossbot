export const APP_NAME = 'BIG BOSS BOT';
export const APP_MONOGRAM = 'BB';
export const APP_SLUG = 'big-boss';
export const APP_COOKIE_PREFIX = 'big_boss';
export const APP_USER_AGENT = 'BIG-BOSS-BOT/1.0';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? `${APP_COOKIE_PREFIX}_session`;
export const LOGIN_CHALLENGE_COOKIE_NAME = `${APP_COOKIE_PREFIX}_login_challenge`;
export const AUTH_REQUIRE_2FA = process.env.AUTH_REQUIRE_2FA === 'true';
export const AUTH_SERVICE_UNAVAILABLE_MESSAGE = 'Authentication is temporarily unavailable. Please try again in a moment.';

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
  alerts: 'Alerts',
  telegram: 'Telegram OSINT',
  markets: 'Markets',
  strikes: 'Strikes',
  polymarket: 'Prediction Markets',
  conflicts: 'Conflict Feed',
  flights: 'Military Flights',
  'regional-alerts': 'Regional Watch',
  naval: 'Naval Tracker',
  crypto: 'Crypto',
  oil: 'Energy',
  satellite: 'Satellite',
};

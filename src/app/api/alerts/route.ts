import { NextRequest, NextResponse } from 'next/server';

import { authorizeReadApiAccess } from '@/lib/auth/session';
import { fetchWithTimeout, parseXML, getTextContent } from '@/lib/fetcher';
import { translateHebrew, translateCities, isHebrew, translateFreeText, CITY_TRANSLATIONS } from '@/lib/hebrew';
import { getTheaterFromRequest, type TheaterId } from '@/lib/theater';
import { THEATER_MAP_CONFIG } from '@/lib/theater-map';

export const dynamic = 'force-dynamic';

const STICKY_DURATION_MS: Record<TheaterId, number> = {
  'middle-east': 90_000,
  ukraine: 15 * 60 * 1000,
};

let stickyAlerts: Record<TheaterId, (AlertEvent & { firstSeen: number })[]> = {
  'middle-east': [],
  ukraine: [],
};

async function fetchMiddleEastAlerts() {
  const alerts: AlertEvent[] = [];

  try {
    const res = await fetchWithTimeout('https://api.tzevaadom.co.il/notifications', {
      timeout: 12000,
      headers: {
        'User-Agent': 'BIG-BOSS-BOT/1.0',
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((alert: TzevaAdomAlert, index: number) => {
          const rawThreat = alert.threat || alert.title || 'Alert';
          const rawCities = Array.isArray(alert.cities) ? alert.cities : [alert.data || 'Unknown'];

          let translatedThreat = translateHebrew(rawThreat);
          const translatedLocations = translateCities(rawCities);

          if (CITY_TRANSLATIONS[rawThreat]) {
            if (!rawCities.includes(rawThreat)) {
              translatedLocations.push(CITY_TRANSLATIONS[rawThreat]);
            }
            translatedThreat = 'Rocket/Missile Alert';
          }

          alerts.push({
            id: `tzeva-${index}-${Date.now()}`,
            time: alert.date || new Date().toISOString(),
            type: categorizeAlert(rawThreat),
            threat: translatedThreat,
            threatOriginal: rawThreat,
            locations: translatedLocations,
            locationsOriginal: rawCities,
            source: 'Pikud HaOref',
            active: true,
          });
        });
      }
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.message.includes('Timeout') || (err as NodeJS.ErrnoException).code === 'UND_ERR_CONNECT_TIMEOUT');
    if (!isTimeout) console.error('Tzeva Adom fetch error:', err);
  }

  await Promise.all(alerts.map(async (alert) => {
    if (isHebrew(alert.threat)) {
      alert.threat = await translateFreeText(alert.threat);
    }
    alert.locations = await Promise.all(
      alert.locations.map((loc) => isHebrew(loc) ? translateFreeText(loc) : Promise.resolve(loc)),
    );
  }));

  return {
    alerts,
    source: 'Pikud HaOref / Tzeva Adom',
  };
}

async function fetchUkraineAlerts() {
  const alerts: AlertEvent[] = [];
  const query = encodeURIComponent('Ukraine air raid alert OR missile OR drone OR Kyiv OR Kharkiv OR Odesa');
  const cityKeys = THEATER_MAP_CONFIG.ukraine.alertCities;

  try {
    const res = await fetchWithTimeout(
      `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'BIG-BOSS-BOT/1.0',
          'Accept': 'application/rss+xml, text/xml, */*',
        },
      },
    );
    if (!res.ok) {
      return { alerts, source: 'Google News air-raid monitor' };
    }

    const text = await res.text();
    const doc = parseXML(text);
    const items = doc.getElementsByTagName('item');
    const now = Date.now();

    for (let i = 0; i < Math.min(items.length, 8); i++) {
      const item = items[i];
      let title = getTextContent(item, 'title');
      const pubDate = getTextContent(item, 'pubDate');
      const published = new Date(pubDate).getTime();

      if (!title || Number.isNaN(published) || now - published > 6 * 60 * 60 * 1000) {
        continue;
      }

      const dashIdx = title.lastIndexOf(' - ');
      const source = dashIdx > 0 ? title.substring(dashIdx + 3) : 'Google News';
      if (dashIdx > 0) {
        title = title.substring(0, dashIdx);
      }

      const lowered = title.toLowerCase();
      const locations = new Set<string>();

      for (const key of Object.keys(cityKeys)) {
        if (lowered.includes(key)) {
          const label = key
            .split(' ')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          locations.add(label === 'Odessa' ? 'Odesa' : label);
        }
      }

      if (locations.size === 0 && lowered.includes('ukraine')) {
        locations.add('Kyiv');
      }

      alerts.push({
        id: `ua-alert-${i}-${published}`,
        time: pubDate || new Date().toISOString(),
        type: categorizeAlert(lowered.includes('air raid') ? `${title} air raid` : title),
        threat: title,
        threatOriginal: title,
        locations: [...locations],
        locationsOriginal: [...locations],
        source,
        active: true,
      });
    }
  } catch (err) {
    console.error('Ukraine alert fetch error:', err);
  }

  return {
    alerts,
    source: 'Google News air-raid monitor',
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) return auth;

  const theater = getTheaterFromRequest(request);
  const fetched = theater === 'ukraine'
    ? await fetchUkraineAlerts()
    : await fetchMiddleEastAlerts();

  const now = Date.now();
  const theaterSticky = stickyAlerts[theater];

  for (const alert of fetched.alerts) {
    const exists = theaterSticky.find((sticky) =>
      sticky.threatOriginal === alert.threatOriginal
      && sticky.locationsOriginal.join() === alert.locationsOriginal.join(),
    );
    if (!exists) {
      theaterSticky.push({ ...alert, firstSeen: now });
    }
  }

  stickyAlerts[theater] = theaterSticky.filter((alert) => now - alert.firstSeen < STICKY_DURATION_MS[theater]);

  const allAlerts = stickyAlerts[theater].map((alert) => ({
    ...alert,
    active: fetched.alerts.some((live) =>
      live.threatOriginal === alert.threatOriginal
      && live.locationsOriginal.join() === alert.locationsOriginal.join(),
    ),
  }));

  const status = allAlerts.length > 0 ? 'ACTIVE' : 'CLEAR';

  return NextResponse.json({
    status,
    activeCount: allAlerts.length,
    alerts: allAlerts,
    lastChecked: new Date().toISOString(),
    source: fetched.source,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=3' },
  });
}

interface TzevaAdomAlert {
  date?: string;
  title?: string;
  data?: string;
  threat?: string;
  cities?: string[];
}

interface AlertEvent {
  id: string;
  time: string;
  type: string;
  threat: string;
  threatOriginal: string;
  locations: string[];
  locationsOriginal: string[];
  source: string;
  active: boolean;
}

function categorizeAlert(threat: string): string {
  const text = threat.toLowerCase();
  if (text.includes('missile') || text.includes('טיל') || text.includes('ballistic')) return 'MISSILE';
  if (text.includes('rocket') || text.includes('רקט')) return 'ROCKET';
  if (text.includes('drone') || text.includes('uav') || text.includes('shahed') || text.includes('כטב') || text.includes('hostile aircraft')) return 'DRONE';
  if (text.includes('mortar') || text.includes('artillery') || text.includes('shell')) return 'ARTILLERY';
  if (text.includes('infiltration') || text.includes('חדיר')) return 'INFILTRATION';
  if (text.includes('air raid')) return 'AIR RAID';
  if (text.includes('earthquake') || text.includes('רעידת')) return 'EARTHQUAKE';
  if (text.includes('tsunami')) return 'TSUNAMI';
  if (text.includes('chemical') || text.includes('hazmat')) return 'HAZMAT';
  return 'ALERT';
}

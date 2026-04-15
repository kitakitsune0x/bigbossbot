import { NextRequest, NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { fetchWithTimeout, parseXML, getTextContent } from '@/lib/fetcher';
import { getTheaterFromRequest, type TheaterId } from '@/lib/theater';

export const dynamic = 'force-dynamic';

const COUNTRY_QUERIES: Record<TheaterId, {
  name: string;
  flag: string;
  query: string;
}[]> = {
  'middle-east': [
    { name: 'Lebanon', flag: '🇱🇧', query: 'Lebanon+strike+OR+airstrike+OR+attack+OR+missile+OR+bomb+OR+Hezbollah+OR+Beirut+attack' },
    { name: 'Iran', flag: '🇮🇷', query: 'Iran+strike+OR+attack+OR+missile+OR+bomb+OR+Tehran+strike+OR+IRGC+attack' },
    { name: 'Iraq', flag: '🇮🇶', query: 'Iraq+strike+OR+attack+OR+missile+OR+Baghdad+strike+OR+militia+attack' },
    { name: 'Syria', flag: '🇸🇾', query: 'Syria+strike+OR+airstrike+OR+attack+OR+Damascus+strike' },
    { name: 'Yemen', flag: '🇾🇪', query: 'Yemen+Houthi+strike+OR+attack+OR+missile+OR+drone+OR+"Red+Sea"+attack' },
    { name: 'Kuwait', flag: '🇰🇼', query: 'Kuwait+siren+OR+missile+OR+attack+OR+"air+defense"+OR+intercept' },
    { name: 'Bahrain', flag: '🇧🇭', query: 'Bahrain+attack+OR+missile+OR+military+OR+threat+OR+"5th+Fleet"' },
    { name: 'UAE', flag: '🇦🇪', query: 'UAE+OR+Dubai+OR+"Abu+Dhabi"+attack+OR+missile+OR+drone+OR+intercept' },
    { name: 'Saudi Arabia', flag: '🇸🇦', query: 'Saudi+Arabia+attack+OR+missile+OR+drone+OR+intercept+OR+Houthi' },
    { name: 'Jordan', flag: '🇯🇴', query: 'Jordan+attack+OR+missile+OR+intercept+OR+airspace+OR+military' },
  ],
  ukraine: [
    { name: 'Ukraine', flag: '🇺🇦', query: 'Ukraine+air+raid+OR+missile+OR+drone+OR+strike+OR+Kyiv+attack' },
    { name: 'Russia', flag: '🇷🇺', query: 'Russia+airbase+OR+drone+OR+strike+OR+Belgorod+OR+Kursk+attack' },
    { name: 'Belarus', flag: '🇧🇾', query: 'Belarus+military+OR+border+OR+missile+OR+drone+OR+airspace' },
    { name: 'Poland', flag: '🇵🇱', query: 'Poland+airspace+OR+missile+OR+drone+OR+fighter+scramble+Ukraine' },
    { name: 'Romania', flag: '🇷🇴', query: 'Romania+airspace+OR+drone+OR+Black+Sea+OR+missile+Ukraine' },
    { name: 'Moldova', flag: '🇲🇩', query: 'Moldova+airspace+OR+drone+OR+missile+OR+Transnistria+security' },
    { name: 'Black Sea', flag: '🌊', query: 'Black+Sea+fleet+OR+naval+drone+OR+missile+OR+Sevastopol' },
    { name: 'Crimea', flag: '⚫', query: 'Crimea+Sevastopol+strike+OR+drone+OR+missile' },
  ],
};

const CRITICAL_TERMS = [
  'killed', 'dead', 'deaths', 'casualties', 'massacre',
  'struck', 'hits', 'bombs', 'bombing', 'bombard',
  'invasion', 'invade', 'ground operation',
  'siren', 'air raid', 'take shelter', 'incoming',
  'nuclear', 'chemical',
];

const HIGH_TERMS = [
  'strike', 'airstrike', 'air strike', 'missile',
  'attack', 'attacked', 'intercept', 'shoot down',
  'explosion', 'blast', 'destroyed', 'damage',
  'drone', 'rocket', 'shell', 'artillery',
  'deploy', 'mobilize', 'escalat',
];

const MEDIUM_TERMS = [
  'military', 'troops', 'forces', 'war',
  'conflict', 'tension', 'threaten', 'warn',
  'airspace', 'no-fly', 'evacuate',
  'defense', 'defence',
  'ceasefire', 'negotiate',
];

function scoreSeverity(title: string): 'critical' | 'high' | 'medium' | 'low' {
  const text = title.toLowerCase();
  if (CRITICAL_TERMS.some((kw) => text.includes(kw))) return 'critical';
  if (HIGH_TERMS.some((kw) => text.includes(kw))) return 'high';
  if (MEDIUM_TERMS.some((kw) => text.includes(kw))) return 'medium';
  return 'low';
}

function getAlertLevel(events: { severity: string; hoursAgo: number }[]): 'CLEAR' | 'MONITORING' | 'ALERT' | 'CRITICAL' {
  const recent = events.filter((event) => event.hoursAgo < 12);
  if (recent.some((event) => event.severity === 'critical')) return 'CRITICAL';
  if (recent.some((event) => event.severity === 'high')) return 'ALERT';
  if (recent.length > 0) return 'MONITORING';
  if (events.length > 0) return 'MONITORING';
  return 'CLEAR';
}

interface CountryEvent {
  title: string;
  source: string;
  time: string;
  url: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  hoursAgo: number;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) return auth;

  const theater = getTheaterFromRequest(request);
  const queries = COUNTRY_QUERIES[theater];
  const results: { name: string; flag: string; events: CountryEvent[]; level: string }[] = [];

  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const batchResults = await Promise.allSettled(
      batch.map(async (country) => {
        const url = `https://news.google.com/rss/search?q=${country.query}&hl=en-US&gl=US&ceid=US:en`;
        try {
          const res = await fetchWithTimeout(url, {
            timeout: 8000,
            headers: { 'User-Agent': 'BIG-BOSS/1.0', 'Accept': 'application/rss+xml, text/xml, */*' },
          });
          if (!res.ok) return { ...country, events: [] };

          const text = await res.text();
          const doc = parseXML(text);
          const items = doc.getElementsByTagName('item');
          const events: CountryEvent[] = [];
          const now = Date.now();

          for (let j = 0; j < Math.min(items.length, 8); j++) {
            const item = items[j];
            let title = getTextContent(item, 'title');
            const link = getTextContent(item, 'link');
            const pubDate = getTextContent(item, 'pubDate');

            const dashIdx = title.lastIndexOf(' - ');
            const source = dashIdx > 0 ? title.substring(dashIdx + 3) : 'Google News';
            if (dashIdx > 0) title = title.substring(0, dashIdx);

            const pubTime = new Date(pubDate).getTime();
            const hoursAgo = (now - pubTime) / (1000 * 60 * 60);

            events.push({
              title,
              source,
              time: pubDate,
              url: link,
              severity: scoreSeverity(title),
              hoursAgo: Math.round(hoursAgo * 10) / 10,
            });
          }

          return { ...country, events };
        } catch {
          return { ...country, events: [] };
        }
      }),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        const country = result.value;
        results.push({
          name: country.name,
          flag: country.flag,
          events: country.events,
          level: getAlertLevel(country.events),
        });
      }
    }
  }

  const levelOrder: Record<string, number> = { CRITICAL: 0, ALERT: 1, MONITORING: 2, CLEAR: 3 };
  results.sort((a, b) => (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3));

  return NextResponse.json({
    alerts: results,
    updated: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

import { NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { fetchWithTimeout, parseXML, getTextContent } from '@/lib/fetcher';
import type { ConflictEvent } from '@/types';

export const dynamic = 'force-dynamic';

const CONFLICT_QUERIES = [
  'Iran Israel war military conflict strike attack',
  'missile OR rocket OR drone strike OR attack Arad OR Dimona OR "Tel Aviv" OR Haifa OR Eilat OR Tehran OR Isfahan OR Beirut OR "South Pars" OR Natanz OR "Diego Garcia"',
  'Russia Ukraine war military conflict strike attack',
  'missile OR drone OR artillery Ukraine OR Kyiv OR Kharkiv OR Odesa OR Dnipro OR Zaporizhzhia OR Sumy OR Crimea OR Sevastopol OR Belgorod OR Kursk',
] as const;

const LOCATION_MATCHERS: Array<[string, string]> = [
  ['arad', 'Arad, Israel'],
  ['dimona', 'Dimona, Israel'],
  ['nuclear town', 'Dimona, Israel'],
  ['tel aviv', 'Tel Aviv, Israel'],
  ['haifa', 'Haifa, Israel'],
  ['eilat', 'Eilat, Israel'],
  ['ashkelon', 'Ashkelon, Israel'],
  ['ashdod', 'Ashdod, Israel'],
  ['negev', 'Negev, Israel'],
  ['natanz', 'Natanz, Iran'],
  ['isfahan', 'Isfahan, Iran'],
  ['tehran', 'Tehran, Iran'],
  ['south pars', 'South Pars, Iran'],
  ['bushehr', 'Bushehr, Iran'],
  ['tabriz', 'Tabriz, Iran'],
  ['beirut', 'Beirut, Lebanon'],
  ['lebanon', 'Lebanon'],
  ['damascus', 'Damascus, Syria'],
  ['syria', 'Syria'],
  ['baghdad', 'Baghdad, Iraq'],
  ['iraq', 'Iraq'],
  ['diego garcia', 'Diego Garcia'],
  ['qatar', 'Qatar'],
  ['doha', 'Qatar'],
  ['kuwait', 'Kuwait'],
  ['saudi', 'Saudi Arabia'],
  ['yemen', 'Yemen'],
  ['houthi', 'Yemen'],
  ['gaza', 'Gaza'],
  ['israel', 'Israel'],
  ['iran', 'Iran'],
  ['kyiv', 'Kyiv, Ukraine'],
  ['kiev', 'Kyiv, Ukraine'],
  ['kharkiv', 'Kharkiv, Ukraine'],
  ['odesa', 'Odesa, Ukraine'],
  ['odessa', 'Odesa, Ukraine'],
  ['dnipro', 'Dnipro, Ukraine'],
  ['zaporizhzhia', 'Zaporizhzhia, Ukraine'],
  ['sumy', 'Sumy, Ukraine'],
  ['chernihiv', 'Chernihiv, Ukraine'],
  ['mykolaiv', 'Mykolaiv, Ukraine'],
  ['kherson', 'Kherson, Ukraine'],
  ['donetsk', 'Donetsk'],
  ['luhansk', 'Luhansk'],
  ['crimea', 'Crimea'],
  ['sevastopol', 'Sevastopol, Crimea'],
  ['belgorod', 'Belgorod, Russia'],
  ['kursk', 'Kursk, Russia'],
  ['bryansk', 'Bryansk, Russia'],
  ['black sea', 'Black Sea'],
  ['ukraine', 'Ukraine'],
  ['russia', 'Russia'],
] as const;

function classifyEventType(text: string) {
  if (text.match(/missile|strike|attack|bomb|airstrike|struck|hit|shell|rocket fire/)) return 'STRIKE';
  if (text.match(/intercept|iron dome|defense|defend|shoot down|air raid defense/)) return 'DEFENSE';
  if (text.match(/troop|deploy|military|soldier|force/)) return 'MILITARY';
  if (text.match(/sanction|diplomacy|negotiat|ceasefire|talk/)) return 'DIPLOMATIC';
  if (text.match(/nuclear|enrichment|iaea|uranium|reactor/)) return 'NUCLEAR';
  if (text.match(/drone|uav|shahed/)) return 'DRONE';
  return 'REPORT';
}

function resolveLocation(text: string) {
  for (const [needle, label] of LOCATION_MATCHERS) {
    if (text.includes(needle)) {
      return label;
    }
  }

  return 'Global';
}

export async function GET() {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) return auth;

  const allEvents: ConflictEvent[] = [];
  const seenTitles = new Set<string>();

  const results = await Promise.allSettled(
    CONFLICT_QUERIES.map(async (query) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetchWithTimeout(url, { timeout: 8000 });
      if (!res.ok) return [];

      const text = await res.text();
      const doc = parseXML(text);
      const items = doc.getElementsByTagName('item');
      const events: ConflictEvent[] = [];

      for (let i = 0; i < Math.min(items.length, 25); i++) {
        const item = items[i];
        let title = getTextContent(item, 'title');
        const pubDate = getTextContent(item, 'pubDate');

        const dashIdx = title.lastIndexOf(' - ');
        const source = dashIdx > 0 ? title.substring(dashIdx + 3) : 'Google News';
        if (dashIdx > 0) {
          title = title.substring(0, dashIdx);
        }

        const key = title.toLowerCase().trim().substring(0, 50);
        if (seenTitles.has(key)) {
          continue;
        }
        seenTitles.add(key);

        const lowered = title.toLowerCase();

        events.push({
          id: `gn-${allEvents.length + events.length}-${Date.now()}`,
          date: pubDate || new Date().toISOString(),
          type: classifyEventType(lowered),
          location: resolveLocation(lowered),
          lat: 0,
          lon: 0,
          description: title,
          source,
        });
      }
      return events;
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
  }

  allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(allEvents, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

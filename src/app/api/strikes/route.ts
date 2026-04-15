import { NextRequest, NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { fetchWithTimeout, parseXML, getTextContent } from '@/lib/fetcher';
import { getTheaterFromRequest, type TheaterId } from '@/lib/theater';

export const dynamic = 'force-dynamic';

const STRIKE_QUERIES: Record<TheaterId, string[]> = {
  'middle-east': [
    'Iran+OR+Israel+missile+strike+OR+airstrike+OR+intercept',
    'Iran+OR+Israel+drone+attack+OR+rocket+launch',
  ],
  ukraine: [
    'Ukraine+OR+Russia+missile+strike+OR+airstrike+OR+intercept',
    'Ukraine+OR+Russia+drone+attack+OR+rocket+launch+OR+artillery',
  ],
};

const COUNTRY_MATCHERS: Record<TheaterId, Array<[string, string]>> = {
  'middle-east': [
    ['iran', 'Iran'],
    ['tehran', 'Iran'],
    ['israel', 'Israel'],
    ['lebanon', 'Lebanon'],
    ['syria', 'Syria'],
    ['yemen', 'Yemen'],
    ['houthi', 'Yemen'],
  ],
  ukraine: [
    ['kyiv', 'Ukraine'],
    ['kiev', 'Ukraine'],
    ['kharkiv', 'Ukraine'],
    ['odesa', 'Ukraine'],
    ['odessa', 'Ukraine'],
    ['dnipro', 'Ukraine'],
    ['zaporizhzhia', 'Ukraine'],
    ['sumy', 'Ukraine'],
    ['chernihiv', 'Ukraine'],
    ['ukraine', 'Ukraine'],
    ['belgorod', 'Russia'],
    ['kursk', 'Russia'],
    ['bryansk', 'Russia'],
    ['russia', 'Russia'],
    ['crimea', 'Crimea'],
    ['sevastopol', 'Crimea'],
    ['black sea', 'Black Sea'],
  ],
};

function classifyStrike(text: string) {
  let category = 'REPORT';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (text.match(/intercept|iron dome|shoot down|arrow|david.s sling|patriot|air defense/)) {
    category = 'INTERCEPTION';
    severity = 'high';
  } else if (text.match(/missile|ballistic|iskander|kalibr/)) {
    category = 'MISSILE';
    severity = 'critical';
  } else if (text.match(/drone|uav|shahed/)) {
    category = 'DRONE';
    severity = 'high';
  } else if (text.match(/airstrike|air strike|bombing|bomb|glide bomb/)) {
    category = 'AIRSTRIKE';
    severity = 'critical';
  } else if (text.match(/rocket|artillery|shell/)) {
    category = 'ROCKET';
    severity = 'high';
  } else if (text.match(/strike|attack/)) {
    category = 'STRIKE';
    severity = 'medium';
  }

  return { category, severity };
}

function detectCountry(text: string, theater: TheaterId) {
  for (const [needle, label] of COUNTRY_MATCHERS[theater]) {
    if (text.includes(needle)) return label;
  }

  return theater === 'ukraine' ? 'Ukraine theater' : 'Middle East';
}

export async function GET(request: NextRequest) {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) return auth;

  const theater = getTheaterFromRequest(request);
  const strikes: StrikeEvent[] = [];

  for (const query of STRIKE_QUERIES[theater]) {
    try {
      const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetchWithTimeout(url, { timeout: 8000 });
      if (!res.ok) continue;

      const text = await res.text();
      const doc = parseXML(text);
      const items = doc.getElementsByTagName('item');

      for (let i = 0; i < Math.min(items.length, 15); i++) {
        const item = items[i];
        let title = getTextContent(item, 'title');
        const pubDate = getTextContent(item, 'pubDate');
        const link = getTextContent(item, 'link');

        const dashIdx = title.lastIndexOf(' - ');
        const source = dashIdx > 0 ? title.substring(dashIdx + 3) : '';
        if (dashIdx > 0) title = title.substring(0, dashIdx);

        const lowered = title.toLowerCase();
        const { category, severity } = classifyStrike(lowered);

        strikes.push({
          id: `strike-${strikes.length}-${Date.now()}`,
          date: pubDate || new Date().toISOString(),
          category,
          severity,
          title,
          source,
          url: link,
          country: detectCountry(lowered, theater),
        });
      }
    } catch {
      continue;
    }
  }

  const seen = new Set<string>();
  const deduped = strikes.filter((strike) => {
    const key = strike.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(deduped.slice(0, 25), {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

interface StrikeEvent {
  id: string;
  date: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  source: string;
  url: string;
  country: string;
}

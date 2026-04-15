import { NextResponse } from 'next/server';
import { authorizeApiSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// Match Middle East conflict topics — use word boundaries and specific phrases to avoid false positives
const KEYWORDS = /\biran\b|israel|middle.?east|ceasefire|military.*iran|military.*israel|\bwar\b.*(?:iran|israel|middle.?east)|strike.*(?:iran|israel)|missile|nuclear.*iran|gaza|hezbollah|houthi|lebanon.*(?:strike|offensive|invasion)|syria.*strike|yemen.*(?:strike|attack)|hormuz|red.?sea.*(?:attack|military)|idf\b|irgc\b|netanyahu|khamenei|trump.*iran|regime.*(?:fall|change)|ground.*offensive|air.*strike|drone.*(?:iran|israel|attack)|ballistic/i;

// Exclude anything not about the Iran-Israel-US Middle East conflict
const EXCLUDE = /nba|nfl|mlb|nhl|fifa|world.?cup|premier.?league|champions.?league|super.?bowl|oscar|grammy|emmy|election.*governor|mayor|warriors|lakers|celtics|yankees|dodgers|russia|ukraine|china|taiwan|north.?korea|tariff|crypto|bitcoin|ethereum|solana/i;

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  volume24hr: number;
  liquidity: string;
  active: boolean;
  closed: boolean;
  endDate: string;
  oneDayPriceChange: number;
  image: string;
}

export async function GET() {
  const auth = await authorizeApiSession();
  if (auth instanceof NextResponse) return auth;

  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=500&closed=false&active=true&order=volume24hr&ascending=false',
      {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'AWARE/1.0' },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ markets: [], error: 'API error' }, { status: 200 });
    }

    const data: PolymarketMarket[] = await res.json();

    const filtered = data
      .filter(m => KEYWORDS.test(m.question) && !EXCLUDE.test(m.question))
      .map(m => {
        const outcomes = JSON.parse(m.outcomes) as string[];
        const prices = JSON.parse(m.outcomePrices) as string[];

        return {
          id: m.id,
          question: m.question,
          slug: m.slug,
          outcomes: outcomes.map((o, i) => ({
            label: o,
            price: Math.round(parseFloat(prices[i]) * 100),
          })),
          volume24hr: m.volume24hr,
          volumeTotal: parseFloat(m.volume),
          liquidity: parseFloat(m.liquidity),
          endDate: m.endDate,
          oneDayPriceChange: m.oneDayPriceChange,
          image: m.image,
        };
      })
      .sort((a, b) => {
        const aYes = a.outcomes.find(o => o.label === 'Yes')?.price ?? a.outcomes[0]?.price ?? 0;
        const bYes = b.outcomes.find(o => o.label === 'Yes')?.price ?? b.outcomes[0]?.price ?? 0;
        return bYes - aYes;
      })
      .slice(0, 20);

    return NextResponse.json({
      markets: filtered,
      count: filtered.length,
      updated: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ markets: [], error: 'Fetch failed' }, { status: 200 });
  }
}

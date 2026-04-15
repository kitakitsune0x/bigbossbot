import { NextRequest, NextResponse } from 'next/server';
import { authorizeReadApiAccess } from '@/lib/auth/session';
import { getTheaterFromRequest, type TheaterId } from '@/lib/theater';

export const dynamic = 'force-dynamic';

const POLYMARKET_FILTERS: Record<TheaterId, {
  keywords: RegExp;
  exclude: RegExp;
}> = {
  'middle-east': {
    keywords: /\biran\b|israel|middle.?east|ceasefire|military.*iran|military.*israel|\bwar\b.*(?:iran|israel|middle.?east)|strike.*(?:iran|israel)|missile|nuclear.*iran|gaza|hezbollah|houthi|lebanon.*(?:strike|offensive|invasion)|syria.*strike|yemen.*(?:strike|attack)|hormuz|red.?sea.*(?:attack|military)|idf\b|irgc\b|netanyahu|khamenei|trump.*iran|regime.*(?:fall|change)|ground.*offensive|air.*strike|drone.*(?:iran|israel|attack)|ballistic/i,
    exclude: /nba|nfl|mlb|nhl|fifa|world.?cup|premier.?league|champions.?league|super.?bowl|oscar|grammy|emmy|election.*governor|mayor|warriors|lakers|celtics|yankees|dodgers|russia|ukraine|china|taiwan|north.?korea|tariff|crypto|bitcoin|ethereum|solana/i,
  },
  ukraine: {
    keywords: /\bukraine\b|\brussia\b|kyiv|kiev|kharkiv|odesa|odessa|crimea|sevastopol|donbas|donetsk|luhansk|belgorod|kursk|black.?sea|nato.*russia|putin|zelensky|ceasefire.*ukraine|missile.*ukraine|drone.*ukraine|artillery|frontline|offensive/i,
    exclude: /nba|nfl|mlb|nhl|fifa|world.?cup|premier.?league|champions.?league|super.?bowl|oscar|grammy|emmy|election.*governor|mayor|warriors|lakers|celtics|yankees|dodgers|iran|israel|gaza|hezbollah|houthi|tariff|crypto|bitcoin|ethereum|solana/i,
  },
};

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

export async function GET(request: NextRequest) {
  const auth = await authorizeReadApiAccess();
  if (auth instanceof NextResponse) return auth;

  const theater = getTheaterFromRequest(request);
  const filters = POLYMARKET_FILTERS[theater];

  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=500&closed=false&active=true&order=volume24hr&ascending=false',
      {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'BIG-BOSS/1.0' },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ markets: [], error: 'API error' }, { status: 200 });
    }

    const data: PolymarketMarket[] = await res.json();

    const filtered = data
      .filter((market) => filters.keywords.test(market.question) && !filters.exclude.test(market.question))
      .map((market) => {
        const outcomes = JSON.parse(market.outcomes) as string[];
        const prices = JSON.parse(market.outcomePrices) as string[];

        return {
          id: market.id,
          question: market.question,
          slug: market.slug,
          outcomes: outcomes.map((outcome, index) => ({
            label: outcome,
            price: Math.round(parseFloat(prices[index]) * 100),
          })),
          volume24hr: market.volume24hr,
          volumeTotal: parseFloat(market.volume),
          liquidity: parseFloat(market.liquidity),
          endDate: market.endDate,
          oneDayPriceChange: market.oneDayPriceChange,
          image: market.image,
        };
      })
      .sort((a, b) => {
        const aYes = a.outcomes.find((outcome) => outcome.label === 'Yes')?.price ?? a.outcomes[0]?.price ?? 0;
        const bYes = b.outcomes.find((outcome) => outcome.label === 'Yes')?.price ?? b.outcomes[0]?.price ?? 0;
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

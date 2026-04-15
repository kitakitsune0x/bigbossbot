'use client';

import { useTheaterDataFeed } from '@/components/dashboard/useTheaterDataFeed';

interface MarketOutcome {
  label: string;
  price: number;
}

interface Market {
  id: string;
  question: string;
  slug: string;
  outcomes: MarketOutcome[];
  volume24hr: number;
  volumeTotal: number;
  oneDayPriceChange: number;
  endDate: string;
}

interface PolymarketData {
  markets: Market[];
  count: number;
  updated: string;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function yesColor(price: number): string {
  if (price >= 70) return 'text-emerald-500';
  if (price >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function yesBgColor(price: number): string {
  if (price >= 70) return 'rgb(16 185 129)';
  if (price >= 40) return 'rgb(245 158 11)';
  return 'rgb(239 68 68)';
}

export default function PolymarketPanel() {
  const { data, loading } = useTheaterDataFeed<PolymarketData>('/api/polymarket', 600000);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Predictions</span>
        <span className="text-[10px] text-muted-foreground font-mono">{data?.count ?? 0} markets</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : !data?.markets?.length ? (
          <p className="py-8 text-center text-[12px] text-muted-foreground">No active prediction markets found</p>
        ) : (
          data.markets.map((market) => {
            const yesOutcome = market.outcomes.find(o => o.label === 'Yes') || market.outcomes[0];
            const yesPrice = yesOutcome?.price ?? 0;
            const change = market.oneDayPriceChange;
            const changePercent = change ? (change * 100).toFixed(1) : null;

            return (
              <div key={market.id} className="border-b border-border/50 px-3 py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] leading-tight text-foreground">{market.question}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {formatVolume(market.volume24hr)} 24h
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[14px] font-mono font-bold ${yesColor(yesPrice)}`}>
                      {yesPrice}%
                    </p>
                    {changePercent && (
                      <p className={`text-[10px] font-mono ${parseFloat(changePercent) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {parseFloat(changePercent) >= 0 ? '+' : ''}{changePercent}%
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-1 h-[3px] bg-secondary/40 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.max(yesPrice, 2)}%`,
                      backgroundColor: yesBgColor(yesPrice),
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import { useDataFeed, formatPrice } from '@/lib/hooks';

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  error?: boolean;
}

export default function MarketsPanel() {
  const { data: markets, loading } = useDataFeed<MarketItem[]>('/api/markets', 600000);

  const indices = markets?.filter(m => ['^DJI', '^GSPC', '^VIX', 'GC=F', 'DX-Y.NYB'].includes(m.symbol));
  const defense = markets?.filter(m => !(['^DJI', '^GSPC', '^VIX', 'GC=F', 'DX-Y.NYB'].includes(m.symbol)));

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border pl-6 pr-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Markets</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-7 bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="px-3 pt-2 pb-1">
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Indices</span>
            </div>
            {indices?.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1 hover:bg-accent transition-colors">
                <span className="text-[12px]">{item.name}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[12px] font-medium">
                    {item.error ? '—' : `$${formatPrice(item.price)}`}
                  </span>
                  {!item.error && (
                    <span className={`text-[10px] w-14 text-right ${item.change >= 0 ? 'value-up' : 'value-down'}`}>
                      {(item.changePercent ?? 0) >= 0 ? '+' : ''}{(item.changePercent ?? 0).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="px-3 pt-3 pb-1">
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Defense</span>
            </div>
            {defense?.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1 hover:bg-accent transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono w-7">{item.symbol}</span>
                  <span className="text-[12px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[12px] font-medium">
                    {item.error ? '—' : `$${formatPrice(item.price)}`}
                  </span>
                  {!item.error && (
                    <span className={`text-[10px] w-14 text-right ${item.change >= 0 ? 'value-up' : 'value-down'}`}>
                      {(item.changePercent ?? 0) >= 0 ? '+' : ''}{(item.changePercent ?? 0).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

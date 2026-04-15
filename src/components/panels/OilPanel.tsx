'use client';

import { useDataFeed, formatPrice, formatChange } from '@/lib/hooks';

interface OilData {
  type: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  error?: boolean;
}

export default function OilPanel() {
  const { data: prices, loading } = useDataFeed<OilData[]>('/api/oil', 600000);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border pl-6 pr-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Energy</span>
        <span className="text-[10px] text-muted-foreground font-mono">{prices?.length ?? 0} contracts</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : (
          prices?.map((item, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border/50 px-3 py-1.5 transition-colors hover:bg-accent">
              <div>
                <p className="text-[12px] font-medium text-foreground">{item.name}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.type.replace('_', ' ')}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-mono font-medium text-foreground">
                  {item.error || item.price === null ? 'N/A' : `$${formatPrice(item.price)}`}
                </p>
                {!item.error && item.change !== null && item.changePercent !== null && (
                  <p className={`text-[10px] font-mono ${item.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatChange(item.change, item.changePercent)}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

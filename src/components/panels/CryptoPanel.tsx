'use client';

import { useDataFeed } from '@/lib/hooks';

interface CryptoData {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  error?: boolean;
}

export default function CryptoPanel() {
  const { data: prices, loading } = useDataFeed<CryptoData[]>('/api/crypto', 600000);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Crypto</span>
        <span className="text-[10px] text-muted-foreground font-mono">{prices?.length ?? 0} assets</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : (
          prices?.map((item, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border/50 px-3 py-1.5 transition-colors hover:bg-accent">
              <div>
                <p className="text-[12px] font-medium text-foreground">{item.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{item.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-mono font-medium text-foreground">
                  {item.error ? 'N/A' : `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
                {!item.error && (
                  <p className={`text-[10px] font-mono ${item.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent}%
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

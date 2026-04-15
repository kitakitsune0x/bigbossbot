'use client';

import { timeAgo, useTick } from '@/lib/hooks';
import { useTheaterDataFeed } from '@/components/dashboard/useTheaterDataFeed';

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

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-amber-500',
  low: 'text-muted-foreground',
};

export default function StrikesPanel() {
  const { data: strikes, loading } = useTheaterDataFeed<StrikeEvent[]>('/api/strikes', 120000);
  useTick(15000);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border pl-6 pr-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Strikes</span>
        <span className="text-[10px] text-muted-foreground font-mono">{strikes?.length ?? 0} events</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : strikes?.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted-foreground">No strike events detected</p>
        ) : (
          strikes?.map((strike, i) => (
            <a
              key={i}
              href={strike.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-b border-border/50 px-3 py-1.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{strike.category}</span>
                <span className={`text-[9px] font-semibold uppercase ${SEVERITY_COLOR[strike.severity] ?? 'text-muted-foreground'}`}>
                  {strike.severity}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto font-mono">{timeAgo(strike.date)}</span>
              </div>
              <p className="text-[12px] leading-tight text-foreground">{strike.title}</p>
              <span className="text-[10px] text-muted-foreground">{strike.source} &middot; {strike.country}</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

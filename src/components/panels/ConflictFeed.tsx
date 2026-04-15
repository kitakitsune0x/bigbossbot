'use client';

import { useDataFeed, timeAgo, useTick } from '@/lib/hooks';
import type { ConflictEvent } from '@/types';

export default function ConflictFeed() {
  const { data: rawEvents, loading } = useDataFeed<ConflictEvent[]>('/api/conflicts', 180000);
  useTick(15000);

  const events = rawEvents ? [...rawEvents].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ) : null;

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Conflicts</span>
        <span className="text-[10px] text-muted-foreground font-mono">{events?.length ?? 0} events</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : events?.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted-foreground">No recent conflict events reported</p>
        ) : (
          events?.map((event, i) => (
            <div key={i} className="border-b border-border/50 px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{event.type}</span>
                <span className="text-[10px] text-muted-foreground">{event.location}</span>
                <span className="text-[10px] text-muted-foreground ml-auto font-mono">{timeAgo(event.date)}</span>
              </div>
              <p className="text-[12px] leading-tight text-foreground">{event.description}</p>
              <span className="text-[10px] text-muted-foreground">via {event.source}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

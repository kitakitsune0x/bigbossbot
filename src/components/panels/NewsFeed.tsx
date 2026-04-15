'use client';

import { timeAgo, useTick } from '@/lib/hooks';
import { useTheaterDataFeed } from '@/components/dashboard/useTheaterDataFeed';
import type { NewsItem } from '@/types';

export default function NewsFeed() {
  const { data: news, loading, lastUpdated } = useTheaterDataFeed<NewsItem[]>('/api/news', 90000);
  useTick(15000);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border pl-6 pr-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Intel Feed</span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {news?.length ?? 0}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : (
          news?.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 border-b border-border/50 px-3 py-1.5 transition-colors hover:bg-accent"
            >
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5 w-14 truncate">
                {item.source}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-snug line-clamp-2">{item.title}</p>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {timeAgo(item.pubDate)}
                </span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

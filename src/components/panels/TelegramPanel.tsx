'use client';

import { timeAgo } from '@/lib/hooks';
import { useTheaterDataFeed } from '@/components/dashboard/useTheaterDataFeed';

interface TelegramPost {
  channel: string;
  channelLabel: string;
  color: string;
  postId: number;
  text: string;
  date: string;
  url: string;
}

interface TelegramData {
  posts: TelegramPost[];
  channels: string[];
  updated: string;
}

export default function TelegramPanel() {
  const { data, loading } = useTheaterDataFeed<TelegramData>('/api/telegram', 60000);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Telegram</span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {data?.posts.length ?? 0} / {data?.channels.length ?? 0}ch
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : data?.posts.length === 0 ? (
          <p className="p-3 text-[11px] text-muted-foreground">No posts</p>
        ) : (
          data?.posts.map((post) => (
            <a
              key={`${post.channel}-${post.postId}`}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-b border-border/50 px-3 py-1.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[100px]">
                  {post.channelLabel}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto font-mono shrink-0">
                  {timeAgo(post.date)}
                </span>
              </div>
              <p className="text-[12px] leading-snug line-clamp-3">{post.text}</p>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

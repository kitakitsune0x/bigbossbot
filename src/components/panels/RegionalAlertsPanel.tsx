'use client';

import { useState } from 'react';
import { useDataFeed, timeAgo, useTick } from '@/lib/hooks';

interface CountryEvent {
  title: string;
  source: string;
  time: string;
  url: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  hoursAgo: number;
}

interface CountryAlert {
  name: string;
  flag: string;
  events: CountryEvent[];
  level: string;
}

interface RegionalData {
  alerts: CountryAlert[];
  updated: string;
}

const LEVEL_COLOR: Record<string, string> = {
  CLEAR: 'text-emerald-500',
  MONITORING: 'text-blue-500',
  ALERT: 'text-amber-500',
  CRITICAL: 'text-red-500',
};

export default function RegionalAlertsPanel() {
  const { data, loading } = useDataFeed<RegionalData>('/api/regional-alerts', 60000);
  useTick(15000);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (country: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  };

  const sorted = data?.alerts ? [...data.alerts].sort((a, b) => {
    const aTime = a.events[0]?.hoursAgo ?? 999;
    const bTime = b.events[0]?.hoursAgo ?? 999;
    return aTime - bTime;
  }) : [];

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Regional</span>
        <span className="text-[10px] text-muted-foreground font-mono">{sorted.filter(a => a.level !== 'CLEAR').length} active</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : (
          sorted.map((country, i) => {
            const isCollapsed = collapsed.has(country.name);
            const hasEvents = country.events.length > 0;

            return (
              <div key={i}>
                <button
                  className="flex w-full items-center justify-between border-b border-border/50 px-3 py-1.5 text-left transition-colors hover:bg-accent"
                  onClick={() => toggleCollapse(country.name)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">{isCollapsed ? '\u25b6' : '\u25bc'}</span>
                    <span className="text-[11px]">{country.flag}</span>
                    <span className="text-[12px] font-medium text-foreground">{country.name}</span>
                    {hasEvents && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {country.events[0].hoursAgo < 1
                          ? `${Math.max(1, Math.round(country.events[0].hoursAgo * 60))}m ago`
                          : `${Math.round(country.events[0].hoursAgo)}h ago`
                        }
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${LEVEL_COLOR[country.level] ?? 'text-muted-foreground'}`}>
                    {country.level}
                  </span>
                </button>

                {!isCollapsed && country.events.slice(0, 3).map((event, j) => (
                  <a
                    key={j}
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border-b border-border/50 px-3 py-1 pl-8 transition-colors hover:bg-accent"
                  >
                    <p className="text-[12px] leading-tight text-foreground line-clamp-1">{event.title}</p>
                    <span className="text-[10px] text-muted-foreground">{event.source} &middot; {timeAgo(event.time)}</span>
                  </a>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

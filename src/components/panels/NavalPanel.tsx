'use client';

import { useDataFeed } from '@/lib/hooks';

interface NavalVessel {
  name: string;
  hull: string;
  type: string;
  class: string;
  navy: string;
  lat: number;
  lon: number;
  status: string;
  region: string;
  lastReported: string;
  group?: string;
}

interface NavalData {
  totalTracked: number;
  ships: NavalVessel[];
  updated: string;
  note: string;
}

export default function NavalPanel() {
  const { data, loading } = useDataFeed<NavalData>('/api/ships', 300000);

  const byNavy: Record<string, NavalVessel[]> = {};
  data?.ships.forEach(ship => {
    if (!byNavy[ship.navy]) byNavy[ship.navy] = [];
    byNavy[ship.navy].push(ship);
  });

  const navyOrder = ['US Navy', 'Royal Navy', 'French Navy', 'Israeli Navy', 'Saudi Navy', 'Iran Navy', 'IRGC Navy'];
  const sortedNavies = Object.keys(byNavy).sort((a, b) => {
    const aIdx = navyOrder.indexOf(a);
    const bIdx = navyOrder.indexOf(b);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Naval</span>
        <span className="text-[10px] text-muted-foreground font-mono">{data?.totalTracked ?? 0} vessels</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : (
          sortedNavies.map(navy => (
            <div key={navy}>
              <div className="px-3 py-1 border-b border-border/50 bg-secondary/20">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {navy} ({byNavy[navy].length})
                </span>
              </div>
              {byNavy[navy].map((ship, i) => (
                <div
                  key={i}
                  className="cursor-pointer border-b border-border/50 px-3 py-1.5 transition-colors hover:bg-accent"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('map-focus', {
                      detail: { id: ship.name, lat: ship.lat, lon: ship.lon, type: 'ship' },
                    }));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-foreground">{ship.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{ship.hull}</span>
                    </div>
                    <span className={`text-[9px] font-semibold uppercase ${ship.status === 'Active' ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {ship.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {ship.class} &middot; {ship.type} &middot; {ship.region}
                    {ship.group ? ` \u00b7 ${ship.group}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

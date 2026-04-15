'use client';

import { useTheaterDataFeed } from '@/components/dashboard/useTheaterDataFeed';

interface MilFlight {
  icao24: string;
  callsign: string;
  origin: string;
  lat: number;
  lon: number;
  altitude: number;
  heading: number;
  speed: number;
  type: string;
  aircraftType: string;
  registration: string;
  description: string;
  squawk: string;
  isMilitary: boolean;
  isInteresting: boolean;
}

interface FlightDataResponse {
  total: number;
  military: number;
  flights: MilFlight[];
  source: string;
  updated: string;
}

function focusOnMapTarget(id: string, lat: number, lon: number, type: 'aircraft' | 'ship') {
  window.dispatchEvent(new CustomEvent('map-focus', {
    detail: { id, lat, lon, type },
  }));
}

export default function FlightsPanel() {
  const { data, loading } = useTheaterDataFeed<FlightDataResponse>('/api/flights', 180000);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border pl-4 pr-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Mil Air</span>
        <span className="text-[10px] text-muted-foreground font-mono">{data?.military ?? 0} mil / {data?.total ?? 0} total</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : data?.flights.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted-foreground">No military aircraft detected on ADS-B</p>
        ) : (
          data?.flights.map((f, i) => (
            <div
              key={i}
              className="cursor-pointer border-b border-border/50 px-3 py-1.5 transition-colors hover:bg-accent"
              onClick={() => focusOnMapTarget(f.icao24, f.lat, f.lon, 'aircraft')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono font-medium text-foreground">
                    {f.callsign || f.icao24}
                  </span>
                  {f.aircraftType && (
                    <span className="text-[10px] text-muted-foreground font-mono">{f.aircraftType}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {f.squawk === '7700' && <span className="text-[9px] font-semibold uppercase text-red-500">EMERG</span>}
                  {f.squawk === '7600' && <span className="text-[9px] font-semibold uppercase text-amber-500">NORDO</span>}
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{f.type}</span>
                <span className="font-mono">
                  {f.altitude.toLocaleString()}ft {f.speed}kts {f.heading}&deg;
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

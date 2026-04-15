'use client';

import { useCurrentTheater, useTheaterDataFeed } from '@/components/dashboard/useTheaterDataFeed';

interface FireEvent {
  lat: number;
  lon: number;
  brightness: number;
  frp: number;
  confidence: string;
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  datetime: string;
  daynight: string;
  possibleExplosion: boolean;
}

interface FIRMSData {
  total: number;
  highIntensity: number;
  possibleExplosions: number;
  events: FireEvent[];
  source: string;
  error?: string;
}

function getRegion(lat: number, lon: number): string {
  if (lat > 49 && lat < 53 && lon > 30 && lon < 35) return 'Kyiv region';
  if (lat > 46 && lat < 51 && lon > 22 && lon < 40) return 'Ukraine';
  if (lat > 51 && lat < 57 && lon > 27 && lon < 33) return 'Belarus';
  if (lat > 43 && lat < 49 && lon > 34 && lon < 40) return 'Crimea / Black Sea';
  if (lat > 45 && lat < 57 && lon > 34 && lon < 41.5) return 'Western Russia';
  if (lat > 45 && lat < 49 && lon > 20 && lon < 30) return 'Romania / Moldova';
  if (lat > 36 && lon > 36 && lon < 45) return 'Turkey';
  if (lat > 29 && lat < 34 && lon > 34 && lon < 36) return 'Israel';
  if (lat > 24 && lat < 38 && lon > 44 && lon < 64) return 'Iran';
  if (lat > 29 && lat < 38 && lon > 38 && lon < 49) return 'Iraq';
  if (lat > 32 && lat < 38 && lon > 35 && lon < 43) return 'Syria';
  if (lat > 33 && lat < 35 && lon > 35 && lon < 37) return 'Lebanon';
  if (lat > 12 && lat < 19 && lon > 42 && lon < 55) return 'Yemen';
  if (lat > 16 && lat < 33 && lon > 34 && lon < 56) return 'Saudi Arabia';
  if (lat > 22 && lat < 27 && lon > 51 && lon < 57) return 'UAE';
  if (lat > 25 && lat < 31 && lon > 25 && lon < 35) return 'Egypt';
  if (lat > 30 && lat < 34 && lon > 35 && lon < 40) return 'Jordan';
  if (lat > 23 && lat < 27 && lon > 45 && lon < 51) return 'Qatar/Bahrain';
  if (lat > 21 && lat < 27 && lon > 55 && lon < 60) return 'Oman';
  return 'Middle East';
}

const INTENSITY_COLOR: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  extreme: 'text-red-500',
};

export default function SatellitePanel() {
  const theater = useCurrentTheater();
  const { data, loading } = useTheaterDataFeed<FIRMSData>('/api/fires', 600000);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border pl-4 pr-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Thermal</span>
        <span className="text-[10px] text-muted-foreground font-mono">NASA FIRMS</span>
      </div>
      {/* Summary stats */}
      <div className="flex items-center gap-4 border-b border-border px-3 py-1.5 shrink-0">
        <div>
          <span className="text-[14px] font-mono font-bold text-foreground">{data?.total ?? 0}</span>
          <span className="text-[9px] text-muted-foreground ml-1">total</span>
        </div>
        <div>
          <span className="text-[14px] font-mono font-bold text-orange-500">{data?.highIntensity ?? 0}</span>
          <span className="text-[9px] text-muted-foreground ml-1">high</span>
        </div>
        <div>
          <span className="text-[14px] font-mono font-bold text-red-500">{data?.possibleExplosions ?? 0}</span>
          <span className="text-[9px] text-muted-foreground ml-1">flagged</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 mx-3 my-1 bg-secondary/30 animate-pulse" />
          ))
        ) : data?.events.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted-foreground">
            No thermal anomalies detected in the {theater === 'ukraine' ? 'Ukraine theater' : 'region'}
          </p>
        ) : (
          data?.events.slice(0, 30).map((event, i) => {
            const region = getRegion(event.lat, event.lon);
            return (
              <div
                key={i}
                className={`border-b border-border/50 px-3 py-1.5 transition-colors ${event.possibleExplosion ? 'bg-red-500/10' : 'hover:bg-accent'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-foreground">{region}</span>
                    {event.possibleExplosion && (
                      <span className="text-[9px] font-semibold uppercase text-red-500">FLAGGED</span>
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold uppercase ${INTENSITY_COLOR[event.intensity] ?? 'text-muted-foreground'}`}>
                    {event.intensity}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  FRP: {event.frp} MW | {event.brightness}K | {event.lat.toFixed(2)}, {event.lon.toFixed(2)} |{' '}
                  {new Date(event.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

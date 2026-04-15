'use client';

import { useState, useEffect } from 'react';

const TIME_ZONES = [
  { label: 'DC', zone: 'America/New_York' },
  { label: 'LON', zone: 'Europe/London' },
  { label: 'TLV', zone: 'Asia/Jerusalem' },
  { label: 'THR', zone: 'Asia/Tehran' },
  { label: 'RYD', zone: 'Asia/Riyadh' },
  { label: 'BJ', zone: 'Asia/Shanghai' },
];

export default function ThreatClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  const utc = time.toISOString().replace('T', ' ').substring(0, 19);

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card/50 px-3 py-1 overflow-x-auto">
      <span className="text-[11px] font-mono font-medium text-primary shrink-0">
        {utc}Z
      </span>
      <span className="h-3 w-px bg-border shrink-0" />
      {TIME_ZONES.map((tz) => {
        const localTime = time.toLocaleTimeString('en-US', {
          timeZone: tz.zone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const hour = parseInt(localTime.split(':')[0]);
        const isNight = hour < 6 || hour >= 20;

        return (
          <div key={tz.label} className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground">{tz.label}</span>
            <span className={`text-[11px] font-mono font-medium ${isNight ? 'text-muted-foreground' : 'text-foreground'}`}>
              {localTime}
            </span>
          </div>
        );
      })}
    </div>
  );
}

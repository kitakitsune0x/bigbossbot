'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboardPreferences } from '@/components/dashboard/PreferencesProvider';
import { useDataFeed } from '@/lib/hooks';
import { playAlertSound } from '@/lib/generateAlert';

interface AlertData {
  status: 'ACTIVE' | 'CLEAR';
  activeCount: number;
  alerts: {
    id: string;
    time: string;
    type: string;
    threat: string;
    locations: string[];
    source: string;
    active: boolean;
  }[];
  lastChecked: string;
}

export default function AlertsPanel() {
  const { data, loading } = useDataFeed<AlertData>('/api/alerts', 15000);
  const prevStatus = useRef<string>('CLEAR');
  const [hasInteracted, setHasInteracted] = useState(false);
  const { preferences, setAlertSoundEnabled } = useDashboardPreferences();
  const soundEnabled = preferences.alertSoundEnabled;
  const desktopNotificationsEnabled = preferences.desktopNotificationsEnabled;

  useEffect(() => {
    const handleInteraction = () => { setHasInteracted(true); window.removeEventListener('click', handleInteraction); window.removeEventListener('keydown', handleInteraction); };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => { window.removeEventListener('click', handleInteraction); window.removeEventListener('keydown', handleInteraction); };
  }, []);

  useEffect(() => {
    if (!data) return;
    if (data.status === 'ACTIVE' && prevStatus.current === 'CLEAR' && soundEnabled && hasInteracted) {
      playAlertSound('urgent');
      if (desktopNotificationsEnabled && Notification.permission === 'granted') {
        new Notification('AWARE ALERT', { body: `${data.activeCount} active alert(s)`, icon: '/favicon.ico', tag: 'aware-alert' });
      }
    }
    prevStatus.current = data.status;
  }, [data, soundEnabled, hasInteracted, desktopNotificationsEnabled]);

  useEffect(() => {
    if (desktopNotificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
  }, [desktopNotificationsEnabled]);

  const isActive = data?.status === 'ACTIVE';

  return (
    <div className={`flex h-full flex-col bg-card ${isActive ? 'bg-status-threat/5' : ''}`}>
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Alerts</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const next = !soundEnabled; void setAlertSoundEnabled(next); if (next && hasInteracted) playAlertSound('ping'); }}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${soundEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
          >
            {soundEnabled ? 'SND' : 'MUTE'}
          </button>
          <span className={`text-[10px] font-mono font-semibold ${isActive ? 'text-threat' : 'text-clear'}`}>
            {isActive ? `${data?.activeCount} ACTIVE` : 'CLEAR'}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-20 bg-secondary/30 animate-pulse m-2 rounded" />
        ) : isActive ? (
          <>
            <div className="px-3 py-2 bg-status-threat/10 border-b border-status-threat/20">
              <p className="text-[12px] font-semibold text-threat">INCOMING THREAT DETECTED</p>
              <p className="text-[10px] text-muted-foreground">Pikud HaOref sirens activated</p>
            </div>
            {data?.alerts.map((alert, i) => (
              <div key={i} className="border-b border-border/50 px-3 py-1.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-threat">{alert.type}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(alert.time).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[12px]">{alert.threat}</p>
                <p className="text-[10px] text-muted-foreground">{alert.locations.join(', ')}</p>
              </div>
            ))}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="h-2 w-2 rounded-full bg-status-clear mb-3" />
            <p className="text-[12px] font-medium text-clear">ALL CLEAR</p>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              No active alerts
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-2">
              {data?.lastChecked ? new Date(data.lastChecked).toLocaleTimeString() : '…'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

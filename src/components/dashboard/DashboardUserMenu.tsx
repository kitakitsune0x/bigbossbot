'use client';

import { useState } from 'react';
import { Settings2, X, GripVertical, Eye, EyeOff } from 'lucide-react';
import { DASHBOARD_PANEL_IDS, DASHBOARD_PANEL_LABELS, type DashboardPanelId } from '@/lib/auth/config';
import { useDashboardPreferences } from '@/components/dashboard/PreferencesProvider';
import { PANEL_ICONS } from '@/components/dashboard/CommandPalette';
import { Switch } from '@/components/ui/switch';

export default function DashboardUserMenu() {
  const [open, setOpen] = useState(false);
  const {
    preferences,
    saving,
    isPanelHidden,
    togglePanel,
    setAlertSoundEnabled,
    setDesktopNotificationsEnabled,
    visiblePanels,
  } = useDashboardPreferences();

  async function handleDesktopNotifications(next: boolean) {
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    await setDesktopNotificationsEnabled(next);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Settings2 className="h-3 w-3" />
        <span className="hidden sm:inline">Prefs</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-50 mt-1 w-72 border border-border bg-popover shadow-lg rounded-md">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Preferences</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="border-b border-border px-3 py-2.5 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[12px]">Alert sound</span>
                <Switch
                  checked={preferences.alertSoundEnabled}
                  onCheckedChange={(v) => void setAlertSoundEnabled(v)}
                  disabled={saving}
                  className="scale-75"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[12px]">Desktop notifications</span>
                <Switch
                  checked={preferences.desktopNotificationsEnabled}
                  onCheckedChange={(v) => void handleDesktopNotifications(v)}
                  disabled={saving}
                  className="scale-75"
                />
              </label>
            </div>

            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Panels</p>
                <p className="text-[9px] text-muted-foreground">{visiblePanels.length} visible</p>
              </div>
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {DASHBOARD_PANEL_IDS.map((panelId) => {
                  const Icon = PANEL_ICONS[panelId];
                  const hidden = isPanelHidden(panelId);
                  return (
                    <button
                      key={panelId}
                      onClick={() => void togglePanel(panelId)}
                      disabled={saving}
                      className={`flex items-center gap-2 w-full rounded px-2 py-1.5 text-left transition-colors hover:bg-accent ${hidden ? 'opacity-50' : ''}`}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="text-[12px] flex-1">{DASHBOARD_PANEL_LABELS[panelId]}</span>
                      {hidden ? (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Eye className="h-3 w-3 text-status-clear" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

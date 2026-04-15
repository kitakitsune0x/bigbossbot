'use client';

import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { UserPreferences } from '@/types/auth';
import { DASHBOARD_PANEL_IDS, type DashboardPanelId } from '@/lib/auth/config';

type PreferencesContextValue = {
  preferences: UserPreferences;
  saving: boolean;
  isPanelHidden: (panelId: DashboardPanelId) => boolean;
  togglePanel: (panelId: DashboardPanelId) => Promise<void>;
  setAlertSoundEnabled: (value: boolean) => Promise<void>;
  setDesktopNotificationsEnabled: (value: boolean) => Promise<void>;
  panelOrder: DashboardPanelId[];
  setPanelOrder: (order: DashboardPanelId[]) => Promise<void>;
  visiblePanels: DashboardPanelId[];
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

async function patchPreferences(next: Partial<UserPreferences>) {
  const response = await fetch('/api/me/preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(next),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.error ?? 'Failed to update preferences');
  }

  return json.preferences as UserPreferences;
}

function getResolvedOrder(prefs: UserPreferences): DashboardPanelId[] {
  const saved = (prefs.panelOrder ?? []).filter((id): id is DashboardPanelId =>
    (DASHBOARD_PANEL_IDS as readonly string[]).includes(id)
  );
  // Append any panels not in saved order (new panels)
  const missing = DASHBOARD_PANEL_IDS.filter(id => !saved.includes(id));
  return [...saved, ...missing];
}

export function PreferencesProvider({
  initialPreferences,
  children,
}: {
  initialPreferences: UserPreferences;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);

  const persist = useCallback(async (next: UserPreferences) => {
    const previous = preferences;
    setPreferences(next);
    setSaving(true);

    try {
      const persisted = await patchPreferences(next);
      setPreferences(persisted);
    } catch {
      setPreferences(previous);
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  const value = useMemo<PreferencesContextValue>(() => {
    const panelOrder = getResolvedOrder(preferences);
    const visiblePanels = panelOrder.filter(id => !preferences.hiddenPanels.includes(id));

    return {
      preferences,
      saving,
      isPanelHidden: (panelId) => preferences.hiddenPanels.includes(panelId),
      togglePanel: async (panelId) => {
        const hiddenPanels = preferences.hiddenPanels.includes(panelId)
          ? preferences.hiddenPanels.filter((panel) => panel !== panelId)
          : [...preferences.hiddenPanels, panelId];

        await persist({
          ...preferences,
          hiddenPanels,
        });
      },
      setAlertSoundEnabled: async (value) => {
        await persist({
          ...preferences,
          alertSoundEnabled: value,
        });
      },
      setDesktopNotificationsEnabled: async (value) => {
        await persist({
          ...preferences,
          desktopNotificationsEnabled: value,
        });
      },
      panelOrder,
      setPanelOrder: async (order) => {
        await persist({
          ...preferences,
          panelOrder: order,
        });
      },
      visiblePanels,
    };
  }, [preferences, saving, persist]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useDashboardPreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('useDashboardPreferences must be used inside PreferencesProvider');
  }

  return context;
}

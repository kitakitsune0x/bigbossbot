'use client';

import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { ConflictMapPreferences, UserPreferences } from '@/types/auth';
import { DASHBOARD_PANEL_IDS, type DashboardPanelId } from '@/lib/auth/config';
import type { TheaterId } from '@/lib/theater';
import type { UserRole } from '@/types/auth';

type PreferencesContextValue = {
  preferences: UserPreferences;
  saving: boolean;
  viewer: {
    isAuthenticated: boolean;
    username: string | null;
    role: UserRole | null;
  };
  persistsPreferences: boolean;
  isPanelHidden: (panelId: DashboardPanelId) => boolean;
  togglePanel: (panelId: DashboardPanelId) => Promise<void>;
  setAlertSoundEnabled: (value: boolean) => Promise<void>;
  setDesktopNotificationsEnabled: (value: boolean) => Promise<void>;
  setTheater: (value: TheaterId) => Promise<void>;
  setConflictMapPreferences: (theater: TheaterId, value: ConflictMapPreferences) => Promise<void>;
  setRegionalAlertsCollapsed: (theater: TheaterId, value: string[]) => Promise<void>;
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
  viewer,
  children,
}: {
  initialPreferences: UserPreferences;
  viewer: {
    username: string;
    role: UserRole;
  } | null;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const persistsPreferences = Boolean(viewer);

  const persist = useCallback(async (next: UserPreferences) => {
    setPreferences(next);

    if (!persistsPreferences) {
      return;
    }

    const previous = preferences;
    setSaving(true);

    try {
      const persisted = await patchPreferences(next);
      setPreferences(persisted);
    } catch {
      setPreferences(previous);
    } finally {
      setSaving(false);
    }
  }, [persistsPreferences, preferences]);

  const value = useMemo<PreferencesContextValue>(() => {
    const panelOrder = getResolvedOrder(preferences);
    const visiblePanels = panelOrder.filter(id => !preferences.hiddenPanels.includes(id));

    return {
      preferences,
      saving,
      viewer: {
        isAuthenticated: Boolean(viewer),
        username: viewer?.username ?? null,
        role: viewer?.role ?? null,
      },
      persistsPreferences,
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
      setTheater: async (value) => {
        await persist({
          ...preferences,
          theater: value,
        });
      },
      setConflictMapPreferences: async (theater, value) => {
        await persist({
          ...preferences,
          uiState: {
            ...preferences.uiState,
            conflictMap: {
              ...preferences.uiState.conflictMap,
              [theater]: value,
            },
          },
        });
      },
      setRegionalAlertsCollapsed: async (theater, value) => {
        await persist({
          ...preferences,
          uiState: {
            ...preferences.uiState,
            regionalAlertsCollapsed: {
              ...preferences.uiState.regionalAlertsCollapsed,
              [theater]: value,
            },
          },
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
  }, [persist, persistsPreferences, preferences, saving, viewer]);

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

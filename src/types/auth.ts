import { DEFAULT_THEATER, type TheaterId } from '@/lib/theater';

export type UserRole = 'admin' | 'member';

export type AccountStatus = 'pending_2fa_setup' | 'active' | 'disabled';

export interface AuthSession {
  userId: string;
  username: string;
  role: UserRole;
  sessionId: string;
  expiresAt: string;
}

export interface SessionContext extends AuthSession {
  status: AccountStatus;
  totpRequired: boolean;
}

export interface ConflictMapPreferences {
  showMilAir: boolean;
  showNaval: boolean;
  showCities: boolean;
  showStrikes: boolean;
  showRangeRings: boolean;
  measureMode: boolean;
}

export interface DashboardUiState {
  conflictMap: Record<TheaterId, ConflictMapPreferences>;
  regionalAlertsCollapsed: Record<TheaterId, string[]>;
}

export interface UserPreferences {
  alertSoundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  hiddenPanels: string[];
  panelOrder: string[];
  theater: TheaterId;
  uiState: DashboardUiState;
}

export const DEFAULT_CONFLICT_MAP_PREFERENCES: ConflictMapPreferences = {
  showMilAir: true,
  showNaval: true,
  showCities: true,
  showStrikes: true,
  showRangeRings: false,
  measureMode: false,
};

export function createDefaultDashboardUiState(): DashboardUiState {
  return {
    conflictMap: {
      'middle-east': { ...DEFAULT_CONFLICT_MAP_PREFERENCES },
      ukraine: { ...DEFAULT_CONFLICT_MAP_PREFERENCES },
    },
    regionalAlertsCollapsed: {
      'middle-east': [],
      ukraine: [],
    },
  };
}

export function createDefaultUserPreferences(): UserPreferences {
  return {
    alertSoundEnabled: true,
    desktopNotificationsEnabled: true,
    hiddenPanels: [],
    panelOrder: [],
    theater: DEFAULT_THEATER,
    uiState: createDefaultDashboardUiState(),
  };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = createDefaultUserPreferences();

export interface UserSessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AdminUserSummary {
  id: string;
  username: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt: string | null;
  activeSessionCount: number;
}

export type ApiTokenScope = 'read_intel';

export interface ApiTokenSummary {
  id: string;
  name: string;
  tokenPrefix: string;
  scope: ApiTokenScope;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

import { DEFAULT_THEATER, type TheaterId } from '@/lib/theater';
import { DEFAULT_WORKSPACE, type WorkspaceId } from '@/lib/workspaces';

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

export type ConflictMapMode = 'default' | 'deepstate';

export interface ConflictMapPreferences {
  mapMode: ConflictMapMode;
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

export type DashboardLayouts = Partial<Record<WorkspaceId, string[]>>;

export interface UserPreferences {
  alertSoundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  hiddenPanels: string[];
  panelOrder: string[];
  theater: TheaterId;
  workspaceId: WorkspaceId;
  dashboardLayouts: DashboardLayouts;
  uiState: DashboardUiState;
}

export const DEFAULT_CONFLICT_MAP_PREFERENCES: ConflictMapPreferences = {
  mapMode: 'default',
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
      global: { ...DEFAULT_CONFLICT_MAP_PREFERENCES },
    },
    regionalAlertsCollapsed: {
      global: [],
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
    workspaceId: DEFAULT_WORKSPACE,
    dashboardLayouts: {},
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

export type ApiTokenScope = 'read_intel' | 'read_network' | 'use_network';

export interface ApiTokenSummary {
  id: string;
  name: string;
  tokenPrefix: string;
  scope: ApiTokenScope;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

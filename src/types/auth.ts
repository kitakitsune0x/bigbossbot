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

export interface UserPreferences {
  alertSoundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  hiddenPanels: string[];
  panelOrder: string[];
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  alertSoundEnabled: true,
  desktopNotificationsEnabled: true,
  hiddenPanels: [],
  panelOrder: [],
};

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

import QRCode from 'qrcode';
import { cookies, headers } from 'next/headers';
import type { Prisma } from '@/generated/prisma/client';
import {
  APP_NAME,
  AUTH_REQUIRE_2FA,
  LOGIN_CHALLENGE_COOKIE_NAME,
  LOGIN_CHALLENGE_TTL_MS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_ROLLING_WINDOW_MS,
  SESSION_TTL_MS,
} from '@/lib/auth/config';
import {
  createOpaqueToken,
  createReadablePassword,
  createTotpSecret,
  createTotpUri,
  decryptString,
  encryptString,
  generateRecoveryCodes,
  hashPassword,
  hashRecoveryCode,
  hashToken,
  issueEncryptedPayload,
  normalizeRecoveryCode,
  normalizeUsername,
  readEncryptedPayload,
  verifyPasswordHash,
  verifyTotpCode,
} from '@/lib/auth/crypto';
import { getAdminSelfProtectionError, resolveAdminManagedStatus, shouldExtendSession } from '@/lib/auth/policy';
import { consumeRateLimit } from '@/lib/auth/rate-limit';
import { getPrisma } from '@/lib/prisma';
import { cacheGet, cacheSet, cacheDelete, cacheDeletePrefix } from '@/lib/cache';
import {
  DEFAULT_CONFLICT_MAP_PREFERENCES,
  DEFAULT_USER_PREFERENCES,
  createDefaultDashboardUiState,
  createDefaultUserPreferences,
  type ApiTokenSummary,
  type AdminUserSummary,
  type DashboardUiState,
  type SessionContext,
  type UserPreferences,
  type UserSessionSummary,
} from '@/types/auth';
import { parseTheater } from '@/lib/theater';

type AuditMeta = {
  userId?: string | null;
  usernameCanonical?: string | null;
  metadata?: Record<string, unknown>;
};

type LoginChallenge = {
  userId: string;
  usernameCanonical: string;
};

export type ApiTokenAccessContext = {
  userId: string;
  username: string;
  role: 'admin' | 'member';
  status: 'active';
  totpRequired: boolean;
  authMethod: 'api-token';
  apiTokenId: string;
  apiTokenName: string;
  apiTokenScope: 'read_intel';
};

const API_TOKEN_SCOPE = 'read_intel' as const;

function createApiTokenValue() {
  return `bb_${API_TOKEN_SCOPE}_${createOpaqueToken(24)}`;
}

function getApiTokenPrefix(token: string) {
  const visibleLength = Math.min(token.length, 20);
  const visible = token.slice(0, visibleLength);
  return `${visible}${token.length > visibleLength ? '…' : ''}`;
}

function parseHiddenPanels(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_USER_PREFERENCES.hiddenPanels];
  }

  return value.filter((panel): panel is string => typeof panel === 'string');
}

function parsePanelOrder(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_USER_PREFERENCES.panelOrder];
  }

  return value.filter((panel): panel is string => typeof panel === 'string');
}

function parseConflictMapPreferences(value: unknown) {
  const defaults = DEFAULT_CONFLICT_MAP_PREFERENCES;

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaults };
  }

  const record = value as Record<string, unknown>;

  return {
    showMilAir: typeof record.showMilAir === 'boolean' ? record.showMilAir : defaults.showMilAir,
    showNaval: typeof record.showNaval === 'boolean' ? record.showNaval : defaults.showNaval,
    showCities: typeof record.showCities === 'boolean' ? record.showCities : defaults.showCities,
    showStrikes: typeof record.showStrikes === 'boolean' ? record.showStrikes : defaults.showStrikes,
    showRangeRings: typeof record.showRangeRings === 'boolean' ? record.showRangeRings : defaults.showRangeRings,
    measureMode: typeof record.measureMode === 'boolean' ? record.measureMode : defaults.measureMode,
  };
}

function parseDashboardUiState(value: unknown): DashboardUiState {
  const defaults = createDefaultDashboardUiState();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }

  const record = value as Record<string, unknown>;
  const conflictMapValue = record.conflictMap;
  const regionalCollapsedValue = record.regionalAlertsCollapsed;

  const conflictMapRecord =
    conflictMapValue && typeof conflictMapValue === 'object' && !Array.isArray(conflictMapValue)
      ? (conflictMapValue as Record<string, unknown>)
      : {};

  const regionalCollapsedRecord =
    regionalCollapsedValue && typeof regionalCollapsedValue === 'object' && !Array.isArray(regionalCollapsedValue)
      ? (regionalCollapsedValue as Record<string, unknown>)
      : {};

  return {
    conflictMap: {
      'middle-east': parseConflictMapPreferences(conflictMapRecord['middle-east']),
      ukraine: parseConflictMapPreferences(conflictMapRecord.ukraine),
    },
    regionalAlertsCollapsed: {
      'middle-east': parseHiddenPanels(regionalCollapsedRecord['middle-east']),
      ukraine: parseHiddenPanels(regionalCollapsedRecord.ukraine),
    },
  };
}

function mapPreferences(record: {
  alertSoundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  hiddenPanels: unknown;
  panelOrder?: unknown;
  theater?: unknown;
  uiState?: unknown;
} | null): UserPreferences {
  if (!record) {
    return createDefaultUserPreferences();
  }

  return {
    alertSoundEnabled: record.alertSoundEnabled,
    desktopNotificationsEnabled: record.desktopNotificationsEnabled,
    hiddenPanels: parseHiddenPanels(record.hiddenPanels),
    panelOrder: parsePanelOrder(record.panelOrder),
    theater: parseTheater((record as Record<string, unknown>).theater),
    uiState: parseDashboardUiState((record as Record<string, unknown>).uiState),
  };
}

function mapSessionContext(record: {
  id: string;
  expiresAt: Date;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'member';
    status: 'pending_2fa_setup' | 'active' | 'disabled';
    totpRequired: boolean;
  };
}): SessionContext {
  return {
    userId: record.user.id,
    username: record.user.username,
    role: record.user.role,
    status: record.user.status,
    totpRequired: record.user.totpRequired,
    sessionId: record.id,
    expiresAt: record.expiresAt.toISOString(),
  };
}

function mapApiTokenSummary(record: {
  id: string;
  name: string;
  tokenPrefix: string;
  scope: 'read_intel';
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): ApiTokenSummary {
  return {
    id: record.id,
    name: record.name,
    tokenPrefix: record.tokenPrefix,
    scope: record.scope,
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function getRequestMetadata() {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');

  return {
    ipAddress: forwardedFor?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? null,
    userAgent: headerList.get('user-agent'),
  };
}

export async function auditLog(action: string, details: AuditMeta = {}) {
  const prisma = getPrisma();
  const request = await getRequestMetadata();

  await prisma.auditLog.create({
    data: {
      action,
      userId: details.userId ?? null,
      usernameCanonical: details.usernameCanonical ?? null,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      metadata: details.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

async function setSessionCookie(rawToken: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires: expiresAt,
    maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  });
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

async function setLoginChallengeCookie(challenge: LoginChallenge) {
  const cookieStore = await cookies();
  const payload = issueEncryptedPayload(challenge, LOGIN_CHALLENGE_TTL_MS);

  cookieStore.set(LOGIN_CHALLENGE_COOKIE_NAME, payload, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: Math.floor(LOGIN_CHALLENGE_TTL_MS / 1000),
  });
}

export async function clearLoginChallenge() {
  const cookieStore = await cookies();
  cookieStore.delete(LOGIN_CHALLENGE_COOKIE_NAME);
}

async function readLoginChallenge() {
  const cookieStore = await cookies();
  const challengeCookie = cookieStore.get(LOGIN_CHALLENGE_COOKIE_NAME)?.value;

  if (!challengeCookie) {
    return null;
  }

  try {
    return readEncryptedPayload<LoginChallenge>(challengeCookie);
  } catch {
    await clearLoginChallenge();
    return null;
  }
}

function tryDecryptTotpSecret(cipherText: string) {
  try {
    return decryptString(cipherText);
  } catch {
    return null;
  }
}

async function touchSessionIfNeeded(session: {
  id: string;
  updatedAt: Date;
}) {
  if (!shouldExtendSession(session.updatedAt, Date.now(), SESSION_ROLLING_WINDOW_MS)) {
    return;
  }

  const prisma = getPrisma();
  await prisma.session.update({
    where: { id: session.id },
    data: {
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
}

export async function createSession(userId: string) {
  const prisma = getPrisma();
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const request = await getRequestMetadata();

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      expiresAt,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          totpRequired: true,
        },
      },
    },
  });

  await setSessionCookie(token, expiresAt);
  return mapSessionContext(session);
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    await clearLoginChallenge();
    return null;
  }

  const prisma = getPrisma();
  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          usernameCanonical: true,
        },
      },
    },
  });

  if (session && !session.revokedAt) {
    // Invalidate caches
    cacheDelete(`session:${tokenHash}`);
    cacheDelete(`prefs:${session.user.id}`);

    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await auditLog('logout', {
      userId: session.user.id,
      usernameCanonical: session.user.usernameCanonical,
    });
  }

  await clearSessionCookie();
  await clearLoginChallenge();
  return session?.id ?? null;
}

const SESSION_CACHE_TTL = 30_000; // 30s
const PREFS_CACHE_TTL = 60_000;   // 60s

export async function getCurrentSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const cacheKey = `session:${tokenHash}`;

  // Check in-memory cache first
  const cached = cacheGet<SessionContext>(cacheKey);
  if (cached) return cached;

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          totpRequired: true,
          totpCredential: {
            select: {
              verifiedAt: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  await touchSessionIfNeeded(session);
  const normalizedUser = await normalizePendingUserIfTwoFactorOptional(session.user);
  const ctx = mapSessionContext({
    ...session,
    user: normalizedUser,
  });
  cacheSet(cacheKey, ctx, SESSION_CACHE_TTL);
  return ctx;
}

export async function getOrCreateUserPreferences(userId: string): Promise<UserPreferences> {
  const cacheKey = `prefs:${userId}`;
  const cached = cacheGet<UserPreferences>(cacheKey);
  if (cached) return cached;

  const prisma = getPrisma();
  const preferences = await prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const mapped = mapPreferences(preferences);
  cacheSet(cacheKey, mapped, PREFS_CACHE_TTL);
  return mapped;
}

export async function updateUserPreferences(userId: string, input: Partial<UserPreferences>) {
  // Invalidate cache before write
  cacheDelete(`prefs:${userId}`);

  const prisma = getPrisma();
  const preferences = await prisma.userPreference.upsert({
    where: { userId },
    update: {
      ...(typeof input.alertSoundEnabled === 'boolean' ? { alertSoundEnabled: input.alertSoundEnabled } : {}),
      ...(typeof input.desktopNotificationsEnabled === 'boolean'
        ? { desktopNotificationsEnabled: input.desktopNotificationsEnabled }
        : {}),
      ...(input.hiddenPanels ? { hiddenPanels: input.hiddenPanels } : {}),
      ...(input.panelOrder ? { panelOrder: input.panelOrder } : {}),
      ...(input.theater ? { theater: input.theater } : {}),
      ...(input.uiState ? { uiState: input.uiState as unknown as Prisma.InputJsonValue } : {}),
    },
    create: {
      userId,
      alertSoundEnabled: input.alertSoundEnabled ?? DEFAULT_USER_PREFERENCES.alertSoundEnabled,
      desktopNotificationsEnabled:
        input.desktopNotificationsEnabled ?? DEFAULT_USER_PREFERENCES.desktopNotificationsEnabled,
      hiddenPanels: input.hiddenPanels ?? DEFAULT_USER_PREFERENCES.hiddenPanels,
      panelOrder: input.panelOrder ?? DEFAULT_USER_PREFERENCES.panelOrder,
      theater: input.theater ?? DEFAULT_USER_PREFERENCES.theater,
      uiState: (input.uiState ?? createDefaultDashboardUiState()) as unknown as Prisma.InputJsonValue,
    },
  });

  const mapped = mapPreferences(preferences);
  cacheSet(`prefs:${userId}`, mapped, PREFS_CACHE_TTL);
  return mapped;
}

async function ensureUserPreferences(userId: string) {
  const prisma = getPrisma();

  await prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

function getDefaultTwoFactorState() {
  return AUTH_REQUIRE_2FA
    ? {
        status: 'pending_2fa_setup' as const,
        totpRequired: true,
        nextPath: '/setup-2fa' as const,
      }
    : {
        status: 'active' as const,
        totpRequired: false,
        nextPath: '/dashboard' as const,
      };
}

async function normalizePendingUserIfTwoFactorOptional<T extends {
  id: string;
  status: 'pending_2fa_setup' | 'active' | 'disabled';
  totpRequired: boolean;
  totpCredential?: {
    verifiedAt: Date | null;
  } | null;
}>(user: T) {
  if (AUTH_REQUIRE_2FA || user.status !== 'pending_2fa_setup') {
    return user;
  }

  const nextTotpRequired = Boolean(user.totpCredential?.verifiedAt);
  await getPrisma().user.update({
    where: { id: user.id },
    data: {
      status: 'active',
      totpRequired: nextTotpRequired,
    },
  });

  return {
    ...user,
    status: 'active' as const,
    totpRequired: nextTotpRequired,
  };
}

export async function registerUser(username: string, password: string) {
  const canonical = normalizeUsername(username);
  const request = await getRequestMetadata();
  const limit = consumeRateLimit(`signup:${request.ipAddress ?? 'unknown'}:${canonical}`, 6, 60 * 60 * 1000);

  if (limit.limited) {
    return {
      ok: false as const,
      message: 'Too many signup attempts. Please wait a bit and try again.',
    };
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { usernameCanonical: canonical },
    select: { id: true },
  });

  if (existing) {
    await auditLog('signup_failed', {
      usernameCanonical: canonical,
      metadata: { reason: 'username_taken' },
    });

    return {
      ok: false as const,
      message: 'That username is already in use.',
    };
  }

  const passwordHash = await hashPassword(password);
  const twoFactorState = getDefaultTwoFactorState();
  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      usernameCanonical: canonical,
      passwordHash,
      role: 'member',
      status: twoFactorState.status,
      totpRequired: twoFactorState.totpRequired,
    },
    select: {
      id: true,
      usernameCanonical: true,
    },
  });

  await ensureUserPreferences(user.id);
  await createSession(user.id);
  await auditLog('signup', {
    userId: user.id,
    usernameCanonical: user.usernameCanonical,
  });

  return {
    ok: true as const,
    nextPath: twoFactorState.nextPath,
  };
}

export async function startLogin(username: string, password: string) {
  const canonical = normalizeUsername(username);
  const request = await getRequestMetadata();
  const limit = consumeRateLimit(`login:${request.ipAddress ?? 'unknown'}:${canonical}`, 10, 10 * 60 * 1000);

  if (limit.limited) {
    return {
      ok: false as const,
      message: 'Too many login attempts. Please wait a few minutes and try again.',
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { usernameCanonical: canonical },
    select: {
      id: true,
      username: true,
      usernameCanonical: true,
      passwordHash: true,
      status: true,
      totpRequired: true,
      totpCredential: {
        select: {
          verifiedAt: true,
        },
      },
    },
  });

  if (!user || !(await verifyPasswordHash(user.passwordHash, password))) {
    await auditLog('login_failed', {
      usernameCanonical: canonical,
      metadata: { reason: 'invalid_credentials' },
    });

    return {
      ok: false as const,
      message: 'Invalid username or password.',
    };
  }

  if (user.status === 'disabled') {
    await auditLog('login_failed', {
      userId: user.id,
      usernameCanonical: user.usernameCanonical,
      metadata: { reason: 'disabled' },
    });

    return {
      ok: false as const,
      message: 'This account has been disabled.',
    };
  }

  const normalizedUser = await normalizePendingUserIfTwoFactorOptional(user);

  if (normalizedUser.status === 'pending_2fa_setup') {
    await createSession(normalizedUser.id);
    await auditLog('login_pending_setup', {
      userId: normalizedUser.id,
      usernameCanonical: normalizedUser.usernameCanonical,
    });

    return {
      ok: true as const,
      nextPath: '/setup-2fa',
      pendingSetup: true,
    };
  }

  if (!normalizedUser.totpRequired) {
    await createSession(normalizedUser.id);
    await prisma.user.update({
      where: { id: normalizedUser.id },
      data: { lastLoginAt: new Date() },
    });
    await auditLog('login_success', {
      userId: normalizedUser.id,
      usernameCanonical: normalizedUser.usernameCanonical,
    });

    return {
      ok: true as const,
      nextPath: '/dashboard',
    };
  }

  await setLoginChallengeCookie({
    userId: normalizedUser.id,
    usernameCanonical: normalizedUser.usernameCanonical,
  });

  return {
    ok: true as const,
    requiresTwoFactor: true,
  };
}

export async function verifyLoginSecondFactor(input: { code?: string; recoveryCode?: string }) {
  const challenge = await readLoginChallenge();

  if (!challenge) {
    return {
      ok: false as const,
      message: 'Your login session expired. Start again with your username and password.',
    };
  }

  const request = await getRequestMetadata();
  const limit = consumeRateLimit(
    `totp:${request.ipAddress ?? 'unknown'}:${challenge.usernameCanonical}`,
    10,
    10 * 60 * 1000
  );

  if (limit.limited) {
    return {
      ok: false as const,
      message: 'Too many verification attempts. Please wait a few minutes and try again.',
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    include: {
      totpCredential: true,
      recoveryCodes: true,
    },
  });

  if (!user || user.status !== 'active' || !user.totpCredential?.verifiedAt) {
    await clearLoginChallenge();
    return {
      ok: false as const,
      message: 'This account cannot complete two-factor sign-in right now.',
    };
  }

  let verified = false;

  if (input.code) {
    const secretBase32 = tryDecryptTotpSecret(user.totpCredential.secretCiphertext);

    if (!secretBase32) {
      await auditLog('login_2fa_secret_unreadable', {
        userId: user.id,
        usernameCanonical: user.usernameCanonical,
      });

      return {
        ok: false as const,
        message: 'Your two-factor secret could not be read. Please ask an admin to reset 2FA for this account.',
      };
    }

    verified = verifyTotpCode(secretBase32, user.username, input.code);
  } else if (input.recoveryCode) {
    const normalized = normalizeRecoveryCode(input.recoveryCode);
    const codeHash = hashRecoveryCode(normalized);

    const match = user.recoveryCodes.find((code) => !code.usedAt && code.codeHash === codeHash);

    if (match) {
      await prisma.recoveryCode.update({
        where: { id: match.id },
        data: { usedAt: new Date() },
      });
      verified = true;
    }
  }

  if (!verified) {
    await auditLog('login_2fa_failed', {
      userId: user.id,
      usernameCanonical: user.usernameCanonical,
    });

    return {
      ok: false as const,
      message: 'The code was not valid. Please try again.',
    };
  }

  await clearLoginChallenge();
  await createSession(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await auditLog('login_success', {
    userId: user.id,
    usernameCanonical: user.usernameCanonical,
  });

  return {
    ok: true as const,
    nextPath: '/dashboard',
  };
}

export async function getOrCreateTotpSetup(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { totpCredential: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.totpCredential?.verifiedAt) {
    return {
      alreadyConfigured: true as const,
    };
  }

  const existingSecret = user.totpCredential
    ? tryDecryptTotpSecret(user.totpCredential.secretCiphertext)
    : null;
  const created = existingSecret
    ? { secretBase32: existingSecret, uri: undefined as string | undefined }
    : createTotpSecret(user.username);
  const secretBase32 = created.secretBase32;

  if (!existingSecret) {
    await prisma.totpCredential.upsert({
      where: { userId },
      update: {
        secretCiphertext: encryptString(secretBase32),
        label: user.username,
      },
      create: {
        userId,
        issuer: APP_NAME,
        label: user.username,
        secretCiphertext: encryptString(secretBase32),
      },
    });
  }

  const uri = created.uri ?? createTotpUri(secretBase32, user.username);
  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    width: 220,
    margin: 1,
  });

  return {
    alreadyConfigured: false as const,
    username: user.username,
    secretBase32,
    uri,
    qrCodeDataUrl,
  };
}

export async function completeTotpSetup(userId: string, code: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { totpCredential: true },
  });

  if (!user?.totpCredential) {
    return {
      ok: false as const,
      message: 'No pending authenticator setup was found for this account.',
    };
  }

  const secretBase32 = tryDecryptTotpSecret(user.totpCredential.secretCiphertext);

  if (!secretBase32) {
    return {
      ok: false as const,
      message: 'The stored authenticator secret could not be read. Restart setup and try again.',
    };
  }

  const verified = verifyTotpCode(secretBase32, user.username, code);

  if (!verified) {
    return {
      ok: false as const,
      message: 'The authenticator code was not valid.',
    };
  }

  const recoveryCodes = generateRecoveryCodes();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'active',
        totpRequired: true,
      },
    }),
    prisma.totpCredential.update({
      where: { userId: user.id },
      data: {
        verifiedAt: new Date(),
        label: user.username,
      },
    }),
    prisma.recoveryCode.deleteMany({
      where: { userId: user.id },
    }),
    prisma.recoveryCode.createMany({
      data: recoveryCodes.map((recoveryCode) => ({
        userId: user.id,
        codeHash: hashRecoveryCode(recoveryCode),
      })),
    }),
  ]);

  await auditLog('totp_setup_completed', {
    userId: user.id,
    usernameCanonical: user.usernameCanonical,
  });

  return {
    ok: true as const,
    recoveryCodes,
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, keepSessionId?: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      usernameCanonical: true,
      passwordHash: true,
    },
  });

  if (!user || !(await verifyPasswordHash(user.passwordHash, currentPassword))) {
    return {
      ok: false as const,
      message: 'Current password is incorrect.',
    };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepSessionId ? { id: { not: keepSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    }),
  ]);

  await auditLog('password_changed', {
    userId,
    usernameCanonical: user.usernameCanonical,
  });

  return {
    ok: true as const,
  };
}

export async function regenerateRecoveryCodes(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      usernameCanonical: true,
      totpCredential: {
        select: {
          verifiedAt: true,
        },
      },
    },
  });

  if (!user?.totpCredential?.verifiedAt) {
    return {
      ok: false as const,
      message: 'You need an active authenticator setup before creating recovery codes.',
    };
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({
      where: { userId },
    }),
    prisma.recoveryCode.createMany({
      data: recoveryCodes.map((recoveryCode) => ({
        userId,
        codeHash: hashRecoveryCode(recoveryCode),
      })),
    }),
  ]);

  await auditLog('recovery_codes_regenerated', {
    userId,
    usernameCanonical: user.usernameCanonical,
  });

  return {
    ok: true as const,
    recoveryCodes,
  };
}

export async function listUserSessions(userId: string, currentSessionId?: string): Promise<UserSessionSummary[]> {
  const prisma = getPrisma();
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    current: session.id === currentSessionId,
  }));
}

export async function revokeOtherSessions(userId: string, currentSessionId?: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      usernameCanonical: true,
    },
  });

  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
    },
    data: {
      revokedAt: new Date(),
    },
  });

  await auditLog('sessions_revoked', {
    userId,
    usernameCanonical: user?.usernameCanonical,
    metadata: {
      scope: currentSessionId ? 'others' : 'all',
    },
  });
}

export async function listUserApiTokens(userId: string): Promise<ApiTokenSummary[]> {
  const prisma = getPrisma();
  const tokens = await prisma.apiToken.findMany({
    where: { userId },
    orderBy: [
      { revokedAt: 'asc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scope: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return tokens.map(mapApiTokenSummary);
}

export async function createUserApiToken(userId: string, name: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      usernameCanonical: true,
      status: true,
    },
  });

  if (!user || user.status !== 'active') {
    return {
      ok: false as const,
      message: 'Only active accounts can create agent access tokens.',
    };
  }

  const token = createApiTokenValue();
  const created = await prisma.apiToken.create({
    data: {
      userId,
      name: name.trim(),
      tokenHash: hashToken(token),
      tokenPrefix: getApiTokenPrefix(token),
      scope: API_TOKEN_SCOPE,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scope: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  await auditLog('api_token_created', {
    userId,
    usernameCanonical: user.usernameCanonical,
    metadata: {
      tokenId: created.id,
      tokenName: created.name,
      tokenPrefix: created.tokenPrefix,
      scope: created.scope,
    },
  });

  return {
    ok: true as const,
    token,
    apiToken: mapApiTokenSummary(created),
  };
}

export async function revokeUserApiToken(userId: string, tokenId: string) {
  const prisma = getPrisma();
  const token = await prisma.apiToken.findFirst({
    where: {
      id: tokenId,
      userId,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scope: true,
      revokedAt: true,
      user: {
        select: {
          usernameCanonical: true,
        },
      },
    },
  });

  if (!token) {
    return {
      ok: false as const,
      message: 'Token not found.',
    };
  }

  if (!token.revokedAt) {
    await prisma.apiToken.update({
      where: { id: token.id },
      data: {
        revokedAt: new Date(),
      },
    });

    await auditLog('api_token_revoked', {
      userId,
      usernameCanonical: token.user.usernameCanonical,
      metadata: {
        tokenId: token.id,
        tokenName: token.name,
        tokenPrefix: token.tokenPrefix,
        scope: token.scope,
      },
    });
  }

  return {
    ok: true as const,
  };
}

export async function getApiTokenAccessContext(rawToken: string): Promise<ApiTokenAccessContext | null> {
  const tokenHash = hashToken(rawToken.trim());
  const prisma = getPrisma();
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      name: true,
      scope: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          totpRequired: true,
        },
      },
    },
  });

  if (!token || token.revokedAt || token.user.status !== 'active') {
    return null;
  }

  await prisma.apiToken.update({
    where: { id: token.id },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return {
    userId: token.user.id,
    username: token.user.username,
    role: token.user.role,
    status: 'active',
    totpRequired: token.user.totpRequired,
    authMethod: 'api-token',
    apiTokenId: token.id,
    apiTokenName: token.name,
    apiTokenScope: token.scope,
  };
}

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  const prisma = getPrisma();
  const now = new Date();
  const users = await prisma.user.findMany({
    orderBy: [
      { role: 'desc' },
      { createdAt: 'asc' },
    ],
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      sessions: {
        where: {
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        select: {
          id: true,
        },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    activeSessionCount: user.sessions.length,
  }));
}

export async function updateUserByAdmin(actor: SessionContext, targetUserId: string, input: {
  role?: 'admin' | 'member';
  status?: 'pending_2fa_setup' | 'active' | 'disabled';
}) {
  const selfProtectionError = getAdminSelfProtectionError(actor.userId, targetUserId, input);

  if (selfProtectionError) {
    return {
      ok: false as const,
      message: selfProtectionError,
    };
  }

  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      totpCredential: {
        select: {
          verifiedAt: true,
        },
      },
    },
  });

  if (!target) {
    return {
      ok: false as const,
      message: 'User not found.',
    };
  }

  const nextStatus = resolveAdminManagedStatus(
    input.status,
    Boolean(target.totpCredential?.verifiedAt),
    AUTH_REQUIRE_2FA
  );

  await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
    },
  });

  if (nextStatus === 'disabled') {
    await prisma.session.updateMany({
      where: {
        userId: target.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  await auditLog('admin_user_updated', {
    userId: actor.userId,
    usernameCanonical: normalizeUsername(actor.username),
    metadata: {
      targetUserId,
      role: input.role,
      status: nextStatus,
    },
  });

  return {
    ok: true as const,
  };
}

export async function resetPasswordByAdmin(actor: SessionContext, targetUserId: string) {
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      usernameCanonical: true,
    },
  });

  if (!target) {
    return {
      ok: false as const,
      message: 'User not found.',
    };
  }

  const temporaryPassword = createReadablePassword(16);
  const passwordHash = await hashPassword(temporaryPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { passwordHash },
    }),
    prisma.session.updateMany({
      where: {
        userId: target.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    }),
  ]);

  await auditLog('admin_password_reset', {
    userId: actor.userId,
    usernameCanonical: normalizeUsername(actor.username),
    metadata: {
      targetUserId,
    },
  });

  return {
    ok: true as const,
    temporaryPassword,
  };
}

export async function resetTotpByAdmin(actor: SessionContext, targetUserId: string) {
  const prisma = getPrisma();
  const twoFactorState = getDefaultTwoFactorState();
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
    },
  });

  if (!target) {
    return {
      ok: false as const,
      message: 'User not found.',
    };
  }

  await prisma.$transaction([
    prisma.totpCredential.deleteMany({
      where: { userId: target.id },
    }),
    prisma.recoveryCode.deleteMany({
      where: { userId: target.id },
    }),
    prisma.user.update({
      where: { id: target.id },
      data: {
        status: twoFactorState.status,
        totpRequired: twoFactorState.totpRequired,
      },
    }),
    prisma.session.updateMany({
      where: {
        userId: target.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);

  await auditLog('admin_totp_reset', {
    userId: actor.userId,
    usernameCanonical: normalizeUsername(actor.username),
    metadata: {
      targetUserId,
    },
  });

  return {
    ok: true as const,
  };
}

export async function revokeSessionsByAdmin(actor: SessionContext, targetUserId: string) {
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!target) {
    return {
      ok: false as const,
      message: 'User not found.',
    };
  }

  await prisma.session.updateMany({
    where: {
      userId: target.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  await auditLog('admin_sessions_revoked', {
    userId: actor.userId,
    usernameCanonical: normalizeUsername(actor.username),
    metadata: {
      targetUserId,
    },
  });

  return {
    ok: true as const,
  };
}

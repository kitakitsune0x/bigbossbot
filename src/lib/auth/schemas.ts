import { z } from 'zod';
import { DASHBOARD_PANEL_IDS } from '@/lib/auth/config';
import { THEATER_IDS } from '@/lib/theater';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username must be 24 characters or fewer')
  .regex(/^[A-Za-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be 128 characters or fewer');

export const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const verifyTwoFactorSchema = z.object({
  code: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
}).refine((value) => Boolean(value.code || value.recoveryCode), {
  message: 'Enter a code or a recovery code',
  path: ['code'],
});

export const setupTotpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app'),
});

const conflictMapPreferencesSchema = z.object({
  showMilAir: z.boolean(),
  showNaval: z.boolean(),
  showCities: z.boolean(),
  showStrikes: z.boolean(),
  showRangeRings: z.boolean(),
  measureMode: z.boolean(),
});

const dashboardUiStateSchema = z.object({
  conflictMap: z.object({
    'middle-east': conflictMapPreferencesSchema,
    ukraine: conflictMapPreferencesSchema,
  }),
  regionalAlertsCollapsed: z.object({
    'middle-east': z.array(z.string()),
    ukraine: z.array(z.string()),
  }),
});

export const preferencesPatchSchema = z.object({
  alertSoundEnabled: z.boolean().optional(),
  desktopNotificationsEnabled: z.boolean().optional(),
  hiddenPanels: z.array(z.enum(DASHBOARD_PANEL_IDS)).max(DASHBOARD_PANEL_IDS.length).optional(),
  panelOrder: z.array(z.enum(DASHBOARD_PANEL_IDS)).max(DASHBOARD_PANEL_IDS.length).optional(),
  theater: z.enum(THEATER_IDS).optional(),
  uiState: dashboardUiStateSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one preference must be provided',
});

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
}).refine((value) => value.currentPassword !== value.newPassword, {
  message: 'Choose a different password',
  path: ['newPassword'],
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(['admin', 'member']).optional(),
  status: z.enum(['pending_2fa_setup', 'active', 'disabled']).optional(),
}).refine((value) => Boolean(value.role || value.status), {
  message: 'At least one field must be provided',
});

export const apiTokenCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Token name must be at least 2 characters')
    .max(48, 'Token name must be 48 characters or fewer'),
});

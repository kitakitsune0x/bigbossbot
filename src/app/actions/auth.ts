'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { changePasswordSchema, loginSchema, setupTotpSchema, signupSchema, verifyTwoFactorSchema } from '@/lib/auth/schemas';
import {
  changePassword,
  completeTotpSetup,
  getCurrentSessionContext,
  regenerateRecoveryCodes,
  registerUser,
  revokeCurrentSession,
  revokeOtherSessions,
  startLogin,
  verifyLoginSecondFactor,
} from '@/lib/auth/service';
import { requirePageSession } from '@/lib/auth/session';

export type FormState = {
  error?: string;
  success?: string;
  step?: 'credentials' | 'verify';
  recoveryCodes?: string[];
};

export async function signupAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid sign-up details.',
    };
  }

  const result = await registerUser(parsed.data.username, parsed.data.password);

  if (!result.ok) {
    return {
      error: result.message,
    };
  }

  redirect(result.nextPath);
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      step: 'credentials',
      error: parsed.error.issues[0]?.message ?? 'Invalid login details.',
    };
  }

  const result = await startLogin(parsed.data.username, parsed.data.password);

  if (!result.ok) {
    return {
      step: 'credentials',
      error: result.message,
    };
  }

  if (result.requiresTwoFactor) {
    return {
      step: 'verify',
      success: 'Password verified. Enter your authenticator code or use a recovery code.',
    };
  }

  if (!result.nextPath) {
    return {
      step: 'credentials',
      error: 'No destination was returned for this login flow.',
    };
  }

  redirect(result.nextPath);
}

export async function verifyTwoFactorAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = verifyTwoFactorSchema.safeParse({
    code: formData.get('code'),
    recoveryCode: formData.get('recoveryCode'),
  });

  if (!parsed.success) {
    return {
      step: 'verify',
      error: parsed.error.issues[0]?.message ?? 'Enter a code to continue.',
    };
  }

  const result = await verifyLoginSecondFactor(parsed.data);

  if (!result.ok) {
    return {
      step: 'verify',
      error: result.message,
    };
  }

  redirect(result.nextPath);
}

export async function setupTotpAction(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePageSession({ allowPendingSetup: true });
  const parsed = setupTotpSchema.safeParse({
    code: formData.get('code'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Enter a valid authenticator code.',
    };
  }

  const result = await completeTotpSetup(session.userId, parsed.data.code);

  if (!result.ok) {
    return {
      error: result.message,
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/account/settings');
  return {
    success: 'Two-factor authentication is now active.',
    recoveryCodes: result.recoveryCodes,
  };
}

export async function logoutAction() {
  await revokeCurrentSession();
  redirect('/login');
}

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePageSession();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Check the password fields and try again.',
    };
  }

  const result = await changePassword(
    session.userId,
    parsed.data.currentPassword,
    parsed.data.newPassword,
    session.sessionId
  );

  if (!result.ok) {
    return {
      error: result.message,
    };
  }

  revalidatePath('/account/settings');
  return {
    success: 'Password updated. Other sessions were signed out.',
  };
}

export async function regenerateRecoveryCodesAction(_: FormState, __: FormData): Promise<FormState> {
  const session = await requirePageSession();
  const result = await regenerateRecoveryCodes(session.userId);

  if (!result.ok) {
    return {
      error: result.message,
    };
  }

  revalidatePath('/account/settings');
  return {
    success: 'Fresh recovery codes are ready. Replace your previous set.',
    recoveryCodes: result.recoveryCodes,
  };
}

export async function revokeOtherSessionsAction(_: FormState, __: FormData): Promise<FormState> {
  const session = await requirePageSession();
  await revokeOtherSessions(session.userId, session.sessionId);
  revalidatePath('/account/settings');

  return {
    success: 'Other sessions were revoked.',
  };
}

export async function getSessionForClient() {
  return getCurrentSessionContext();
}

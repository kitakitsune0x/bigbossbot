import { AUTH_REQUIRE_2FA } from '@/lib/auth/config';
import type { AccountStatus } from '@/types/auth';

export function shouldExtendSession(lastTouchedAt: Date | number, now = Date.now(), rollingWindowMs: number) {
  const lastTouchedMs = lastTouchedAt instanceof Date ? lastTouchedAt.getTime() : lastTouchedAt;
  return now - lastTouchedMs >= rollingWindowMs;
}

export function resolveAdminManagedStatus(
  requestedStatus: AccountStatus | undefined,
  hasVerifiedTotp: boolean,
  requireTwoFactor = AUTH_REQUIRE_2FA
) {
  if (requestedStatus === 'active' && requireTwoFactor && !hasVerifiedTotp) {
    return 'pending_2fa_setup' satisfies AccountStatus;
  }

  return requestedStatus;
}

export function getAdminSelfProtectionError(
  actorUserId: string,
  targetUserId: string,
  input: {
    role?: 'admin' | 'member';
    status?: AccountStatus;
  }
) {
  if (actorUserId !== targetUserId) {
    return null;
  }

  if (input.role === 'member' || input.status === 'disabled') {
    return 'You cannot remove your own admin access or disable your own account.';
  }

  return null;
}

import type { AccountStatus } from '@/types/auth';

export function shouldExtendSession(lastTouchedAt: Date | number, now = Date.now(), rollingWindowMs: number) {
  const lastTouchedMs = lastTouchedAt instanceof Date ? lastTouchedAt.getTime() : lastTouchedAt;
  return now - lastTouchedMs >= rollingWindowMs;
}

export function resolveAdminManagedStatus(
  requestedStatus: AccountStatus | undefined,
  hasVerifiedTotp: boolean
) {
  if (requestedStatus === 'active' && !hasVerifiedTotp) {
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

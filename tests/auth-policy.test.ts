import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminSelfProtectionError, resolveAdminManagedStatus, shouldExtendSession } from '@/lib/auth/policy';

test('shouldExtendSession only rotates after the rolling window', () => {
  const now = Date.now();
  const rollingWindowMs = 6 * 60 * 60 * 1000;

  assert.equal(shouldExtendSession(now - 1_000, now, rollingWindowMs), false);
  assert.equal(shouldExtendSession(now - rollingWindowMs, now, rollingWindowMs), true);
  assert.equal(shouldExtendSession(now - rollingWindowMs - 1, now, rollingWindowMs), true);
});

test('resolveAdminManagedStatus only forces pending when global 2FA is required', () => {
  assert.equal(resolveAdminManagedStatus('active', false, true), 'pending_2fa_setup');
  assert.equal(resolveAdminManagedStatus('active', false, false), 'active');
  assert.equal(resolveAdminManagedStatus('active', true, true), 'active');
  assert.equal(resolveAdminManagedStatus('disabled', false), 'disabled');
  assert.equal(resolveAdminManagedStatus(undefined, true), undefined);
});

test('getAdminSelfProtectionError blocks self-demotion and self-disable', () => {
  assert.equal(
    getAdminSelfProtectionError('admin_1', 'admin_1', { role: 'member' }),
    'You cannot remove your own admin access or disable your own account.'
  );
  assert.equal(
    getAdminSelfProtectionError('admin_1', 'admin_1', { status: 'disabled' }),
    'You cannot remove your own admin access or disable your own account.'
  );
  assert.equal(getAdminSelfProtectionError('admin_1', 'member_1', { status: 'disabled' }), null);
});

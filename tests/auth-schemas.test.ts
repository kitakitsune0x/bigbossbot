import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminUserUpdateSchema,
  preferencesPatchSchema,
  signupSchema,
  verifyTwoFactorSchema,
} from '@/lib/auth/schemas';

test('signupSchema accepts a valid username and matching passwords', () => {
  const parsed = signupSchema.safeParse({
    username: 'ops_lead',
    password: 'Sup3rSecure!!',
    confirmPassword: 'Sup3rSecure!!',
  });

  assert.equal(parsed.success, true);
});

test('signupSchema rejects mismatched passwords', () => {
  const parsed = signupSchema.safeParse({
    username: 'ops_lead',
    password: 'Sup3rSecure!!',
    confirmPassword: 'Sup3rSecure??',
  });

  assert.equal(parsed.success, false);
});

test('verifyTwoFactorSchema requires a code or recovery code', () => {
  assert.equal(verifyTwoFactorSchema.safeParse({}).success, false);
  assert.equal(verifyTwoFactorSchema.safeParse({ code: '123456' }).success, true);
  assert.equal(verifyTwoFactorSchema.safeParse({ recoveryCode: 'ABCDEF-123456' }).success, true);
});

test('preferencesPatchSchema rejects empty updates and unknown panel ids', () => {
  assert.equal(preferencesPatchSchema.safeParse({}).success, false);
  assert.equal(
    preferencesPatchSchema.safeParse({ hiddenPanels: ['oil', 'not-a-panel'] }).success,
    false
  );
  assert.equal(
    preferencesPatchSchema.safeParse({ alertSoundEnabled: false, hiddenPanels: ['oil'] }).success,
    true
  );
});

test('adminUserUpdateSchema requires at least one change', () => {
  assert.equal(adminUserUpdateSchema.safeParse({}).success, false);
  assert.equal(adminUserUpdateSchema.safeParse({ role: 'admin' }).success, true);
  assert.equal(adminUserUpdateSchema.safeParse({ status: 'disabled' }).success, true);
});

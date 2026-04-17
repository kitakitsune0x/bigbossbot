import assert from 'node:assert/strict';
import test from 'node:test';
import {
  apiTokenCreateSchema,
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
  assert.equal(
    preferencesPatchSchema.safeParse({
      workspaceId: 'global',
      dashboardLayouts: {
        global: ['news', 'map'],
      },
      uiState: {
        conflictMap: {
          global: {
            mapMode: 'default',
            showMilAir: true,
            showNaval: true,
            showCities: true,
            showStrikes: true,
            showRangeRings: false,
            measureMode: false,
          },
        },
        regionalAlertsCollapsed: {
          global: ['Israel', 'Ukraine'],
        },
      },
    }).success,
    true
  );
});

test('adminUserUpdateSchema requires at least one change', () => {
  assert.equal(adminUserUpdateSchema.safeParse({}).success, false);
  assert.equal(adminUserUpdateSchema.safeParse({ role: 'admin' }).success, true);
  assert.equal(adminUserUpdateSchema.safeParse({ status: 'disabled' }).success, true);
});

test('apiTokenCreateSchema enforces a readable token label', () => {
  assert.equal(apiTokenCreateSchema.safeParse({ name: 'A' }).success, false);
  assert.equal(apiTokenCreateSchema.safeParse({ name: 'Codex MCP' }).success, true);
  assert.equal(apiTokenCreateSchema.safeParse({ name: 'Network Reader', scope: 'read_network' }).success, true);
  assert.equal(apiTokenCreateSchema.safeParse({ name: 'Network Writer', scope: 'use_network' }).success, true);
});

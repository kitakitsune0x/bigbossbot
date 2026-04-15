import assert from 'node:assert/strict';
import test from 'node:test';

process.env.AUTH_ENCRYPTION_KEY = 'test-aware-encryption-key';

import {
  buildTotpFromBase32,
  createReadablePassword,
  createTotpSecret,
  decryptString,
  encryptString,
  generateRecoveryCodes,
  hashPassword,
  hashRecoveryCode,
  issueEncryptedPayload,
  normalizeRecoveryCode,
  normalizeUsername,
  readEncryptedPayload,
  verifyPasswordHash,
  verifyTotpCode,
} from '@/lib/auth/crypto';

test('normalizeUsername trims and lowercases values', () => {
  assert.equal(normalizeUsername('  Ops_Lead  '), 'ops_lead');
});

test('password hashes verify correctly', async () => {
  const password = 'Sup3rSecure!!';
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.equal(await verifyPasswordHash(hash, password), true);
  assert.equal(await verifyPasswordHash(hash, 'wrong-password'), false);
});

test('encrypted strings round-trip cleanly', () => {
  const cipher = encryptString('classified');

  assert.notEqual(cipher, 'classified');
  assert.equal(decryptString(cipher), 'classified');
});

test('encrypted payloads expire as expected', async () => {
  const token = issueEncryptedPayload({ userId: 'user_1' }, 10);
  assert.deepEqual(readEncryptedPayload<{ userId: string }>(token), { userId: 'user_1' });

  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.throws(() => readEncryptedPayload(token), /expired/);
});

test('totp secrets generate valid codes', () => {
  const setup = createTotpSecret('field_agent');
  const code = buildTotpFromBase32(setup.secretBase32, 'field_agent').generate();

  assert.equal(verifyTotpCode(setup.secretBase32, 'field_agent', code), true);
  assert.equal(verifyTotpCode(setup.secretBase32, 'field_agent', '000000'), false);
});

test('recovery codes normalize and hash consistently', () => {
  const [code] = generateRecoveryCodes(1);

  assert.match(code, /^[A-F0-9]{6}-[A-F0-9]{6}$/);
  assert.equal(normalizeRecoveryCode(code.toLowerCase()), code.replace('-', ''));
  assert.equal(hashRecoveryCode(code), hashRecoveryCode(code.toLowerCase()));
});

test('temporary passwords use the requested length', () => {
  assert.equal(createReadablePassword(20).length, 20);
});

import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { Secret, TOTP } from 'otpauth';
import { APP_NAME, RECOVERY_CODE_COUNT } from '@/lib/auth/config';

const ARGON_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

function getEncryptionKey() {
  const secret = process.env.AUTH_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error('AUTH_ENCRYPTION_KEY is not configured');
  }

  return createHash('sha256').update(secret).digest();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function normalizeRecoveryCode(code: string) {
  return code.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createOpaqueToken(size: number = 32) {
  return randomBytes(size).toString('base64url');
}

export async function hashPassword(password: string) {
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPasswordHash(passwordHash: string, password: string) {
  return verify(passwordHash, password, ARGON_OPTIONS);
}

export function encryptString(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptString(cipherText: string) {
  const [ivPart, authTagPart, encryptedPart] = cipherText.split('.');

  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error('Invalid cipher text payload');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivPart, 'base64url')
  );

  decipher.setAuthTag(Buffer.from(authTagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function issueEncryptedPayload<T extends object>(payload: T, ttlMs: number) {
  return encryptString(JSON.stringify({
    ...payload,
    exp: Date.now() + ttlMs,
  }));
}

export function readEncryptedPayload<T extends object>(value: string): T {
  const parsed = JSON.parse(decryptString(value)) as T & { exp?: number };

  if (!parsed.exp || parsed.exp < Date.now()) {
    throw new Error('Encrypted payload expired');
  }

  const { exp, ...payload } = parsed;
  void exp;
  return payload as T;
}

export function createReadablePassword(length: number = 18) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  return Array.from({ length }, () => alphabet[randomBytes(1)[0] % alphabet.length]).join('');
}

export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT) {
  return Array.from({ length: count }, () => {
    const chunkA = randomBytes(3).toString('hex').toUpperCase();
    const chunkB = randomBytes(3).toString('hex').toUpperCase();
    return `${chunkA}-${chunkB}`;
  });
}

export function hashRecoveryCode(code: string) {
  return hashToken(normalizeRecoveryCode(code));
}

export function buildTotpFromBase32(secretBase32: string, label: string) {
  return new TOTP({
    issuer: APP_NAME,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function createTotpUri(secretBase32: string, label: string) {
  return buildTotpFromBase32(secretBase32, label).toString();
}

export function createTotpSecret(label: string) {
  const secret = new Secret({ size: 20 });
  const totp = buildTotpFromBase32(secret.base32, label);

  return {
    secretBase32: secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTotpCode(secretBase32: string, label: string, code: string) {
  const totp = buildTotpFromBase32(secretBase32, label);
  return totp.validate({
    token: code.trim(),
    window: 1,
  }) !== null;
}

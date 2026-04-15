const PLACEHOLDER_ENV_VALUES = new Set([
  'replace-with-a-long-random-secret',
  'replace-with-a-long-random-secret-value',
  'replace-with-a-strong-password',
  'replace-with-a-long-random-password',
  'replace-with-your-cloudflare-tunnel-token',
]);

export function isPlaceholderEnvValue(value?: string | null) {
  return Boolean(value && PLACEHOLDER_ENV_VALUES.has(value.trim()));
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBuildVersion, resolveBuildVersion } from '@/lib/build-version';

test('formatBuildVersion returns a zero-padded date version', () => {
  assert.equal(formatBuildVersion(new Date(Date.UTC(2026, 3, 5))), '2026.04.05');
});

test('resolveBuildVersion prefers the first non-empty candidate', () => {
  assert.equal(resolveBuildVersion('   ', undefined, '2026.04.15', '2026.04.16'), '2026.04.15');
});

test('resolveBuildVersion falls back to a date version when no candidates exist', () => {
  assert.match(resolveBuildVersion(undefined, '', '   '), /^\d{4}\.\d{2}\.\d{2}$/);
});

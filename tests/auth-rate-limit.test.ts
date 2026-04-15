import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeRateLimit } from '@/lib/auth/rate-limit';

test('consumeRateLimit blocks after the configured threshold', () => {
  const key = `login:test:${Date.now()}`;

  const first = consumeRateLimit(key, 2, 1_000);
  const second = consumeRateLimit(key, 2, 1_000);
  const third = consumeRateLimit(key, 2, 1_000);

  assert.equal(first.limited, false);
  assert.equal(second.limited, false);
  assert.equal(third.limited, true);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfterMs > 0);
});

test('consumeRateLimit resets after the window elapses', async () => {
  const key = `signup:test:${Date.now()}`;

  consumeRateLimit(key, 1, 10);
  const limited = consumeRateLimit(key, 1, 10);
  assert.equal(limited.limited, true);

  await new Promise((resolve) => setTimeout(resolve, 15));

  const reset = consumeRateLimit(key, 1, 10);
  assert.equal(reset.limited, false);
});

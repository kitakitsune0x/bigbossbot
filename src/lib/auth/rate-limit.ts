type Bucket = {
  count: number;
  resetAt: number;
};

type GlobalBuckets = typeof globalThis & {
  __bigBossRateLimitBuckets?: Map<string, Bucket>;
};

function getBuckets() {
  const globalBuckets = globalThis as GlobalBuckets;

  if (!globalBuckets.__bigBossRateLimitBuckets) {
    globalBuckets.__bigBossRateLimitBuckets = new Map();
  }

  return globalBuckets.__bigBossRateLimitBuckets;
}

export function consumeRateLimit(key: string, maxAttempts: number, windowMs: number) {
  const buckets = getBuckets();
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      limited: false,
      remaining: maxAttempts - 1,
      retryAfterMs: 0,
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    limited: current.count > maxAttempts,
    remaining: Math.max(0, maxAttempts - current.count),
    retryAfterMs: Math.max(0, current.resetAt - now),
  };
}

/**
 * Simple in-memory TTL cache for hot-path DB lookups (sessions, preferences).
 * Lives in the Node.js process — shared across requests via globalThis.
 */

type CacheEntry<T> = { value: T; expiresAt: number };

type GlobalCache = typeof globalThis & {
  __bigBossCache?: Map<string, CacheEntry<unknown>>;
};

function getStore(): Map<string, CacheEntry<unknown>> {
  const g = globalThis as GlobalCache;
  if (!g.__bigBossCache) {
    g.__bigBossCache = new Map();
  }
  return g.__bigBossCache;
}

export function cacheGet<T>(key: string): T | undefined {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  getStore().set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  getStore().delete(key);
}

export function cacheDeletePrefix(prefix: string): void {
  const store = getStore();
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

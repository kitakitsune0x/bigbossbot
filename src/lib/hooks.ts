import { useState, useEffect, useCallback, useRef } from 'react';

type FeedCacheEntry<T> = {
  data: T | null;
  error: string | null;
  lastUpdated: number | null;
  inflight: Promise<void> | null;
};

const FEED_CACHE = new Map<string, FeedCacheEntry<unknown>>();

function getFeedCacheEntry<T>(url: string): FeedCacheEntry<T> {
  const existing = FEED_CACHE.get(url);
  if (existing) {
    return existing as FeedCacheEntry<T>;
  }

  const next: FeedCacheEntry<T> = {
    data: null,
    error: null,
    lastUpdated: null,
    inflight: null,
  };
  FEED_CACHE.set(url, next);
  return next;
}

function isEmptyPayload(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (value && typeof value === 'object' && 'posts' in value) {
    const posts = (value as { posts?: unknown[] }).posts;
    return Array.isArray(posts) && posts.length === 0;
  }

  return false;
}

async function fetchFeedIntoCache<T>(url: string) {
  const entry = getFeedCacheEntry<T>(url);

  if (entry.inflight) {
    await entry.inflight;
    return getFeedCacheEntry<T>(url);
  }

  entry.inflight = (async () => {
    try {
      const bustUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      const res = await fetch(bustUrl, { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as T;
      const hasExistingData = entry.data !== null;
      entry.data = isEmptyPayload(json) && hasExistingData ? entry.data : json;
      entry.lastUpdated = Date.now();
      entry.error = null;
    } catch (err) {
      entry.error = err instanceof Error ? err.message : 'Failed to fetch';
    } finally {
      entry.inflight = null;
    }
  })();

  await entry.inflight;
  return getFeedCacheEntry<T>(url);
}

export async function primeDataFeed<T>(url: string) {
  const entry = getFeedCacheEntry<T>(url);

  if (entry.data !== null || entry.inflight) {
    return;
  }

  await fetchFeedIntoCache<T>(url);
}

export function useDataFeed<T>(url: string, interval: number = 60000, initialData: T | null = null) {
  const initialEntry = getFeedCacheEntry<T>(url);

  if (initialData !== null && initialEntry.data === null) {
    initialEntry.data = initialData;
    initialEntry.lastUpdated = Date.now();
  }

  const seededData = initialEntry.data ?? initialData;
  const [data, setData] = useState<T | null>(seededData);
  const [loading, setLoading] = useState(seededData === null);
  const [error, setError] = useState<string | null>(initialEntry.error);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialEntry.lastUpdated ? new Date(initialEntry.lastUpdated) : null,
  );
  const mountedRef = useRef(true);

  const syncFromCache = useCallback(() => {
    const entry = getFeedCacheEntry<T>(url);

    if (!mountedRef.current) {
      return;
    }

    setData(entry.data ?? initialData);
    setError(entry.error);
    setLastUpdated(entry.lastUpdated ? new Date(entry.lastUpdated) : null);
    setLoading(false);
  }, [initialData, url]);

  const fetchData = useCallback(async () => {
    const entry = getFeedCacheEntry<T>(url);

    if (entry.data === null) {
      setLoading(true);
    }

    await fetchFeedIntoCache<T>(url);
    syncFromCache();
  }, [syncFromCache, url]);

  useEffect(() => {
    mountedRef.current = true;
    syncFromCache();

    const warmRefresh = window.setTimeout(() => {
      void fetchData();
    }, getFeedCacheEntry<T>(url).data !== null ? 150 : 0);

    const id = setInterval(() => {
      void fetchData();
    }, interval);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(warmRefresh);
      clearInterval(id);
    };
  }, [fetchData, interval, syncFromCache, url]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}

/** Forces a re-render every `ms` milliseconds so relative timestamps stay fresh. */
export function useTick(ms: number = 15000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function timeAgo(date: string | Date): string {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date);

  if (isNaN(then.getTime())) return '';

  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 60) return 'just now';
  if (abs < 3600) return `${Math.floor(abs / 60)}m ago`;
  if (abs < 86400) return `${Math.floor(abs / 3600)}h ago`;
  return `${Math.floor(abs / 86400)}d ago`;
}

export function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatChange(change: number, percent: number): string {
  const c = change ?? 0;
  const p = percent ?? 0;
  const sign = c >= 0 ? '+' : '';
  return `${sign}${c.toFixed(2)} (${sign}${p.toFixed(2)}%)`;
}

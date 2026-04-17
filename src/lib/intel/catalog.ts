import type { WorkspaceId } from '@/lib/workspaces';

export const INTEL_FEED_ALIASES = {
  naval: 'ships',
  satellite: 'satellites',
} as const;

export const INTEL_FEEDS = [
  'news',
  'alerts',
  'conflicts',
  'strikes',
  'telegram',
  'regional-alerts',
  'flights',
  'ships',
  'markets',
  'crypto',
  'oil',
  'polymarket',
  'fires',
  'satellites',
  'earthquakes',
  'internet-outages',
  'sigint',
] as const;

export const INTEL_SEARCHABLE_FEEDS = [
  'news',
  'alerts',
  'conflicts',
  'strikes',
  'telegram',
  'regional-alerts',
  'sigint',
] as const;

export type IntelFeed = (typeof INTEL_FEEDS)[number];
export type SearchableIntelFeed = (typeof INTEL_SEARCHABLE_FEEDS)[number];
export type IntelFeedAlias = keyof typeof INTEL_FEED_ALIASES;

type IntelFeedConfig = {
  serviceBacked: boolean;
  legacyPath: string | null;
  itemsKey: string | null;
  snapshotLimit: number;
};

const INTEL_FEED_CONFIG: Record<IntelFeed, IntelFeedConfig> = {
  news: {
    serviceBacked: true,
    legacyPath: '/api/news',
    itemsKey: null,
    snapshotLimit: 12,
  },
  alerts: {
    serviceBacked: false,
    legacyPath: '/api/alerts',
    itemsKey: 'alerts',
    snapshotLimit: 12,
  },
  conflicts: {
    serviceBacked: false,
    legacyPath: '/api/conflicts',
    itemsKey: null,
    snapshotLimit: 15,
  },
  strikes: {
    serviceBacked: false,
    legacyPath: '/api/strikes',
    itemsKey: null,
    snapshotLimit: 12,
  },
  telegram: {
    serviceBacked: false,
    legacyPath: '/api/telegram',
    itemsKey: 'posts',
    snapshotLimit: 18,
  },
  'regional-alerts': {
    serviceBacked: false,
    legacyPath: '/api/regional-alerts',
    itemsKey: 'alerts',
    snapshotLimit: 12,
  },
  flights: {
    serviceBacked: true,
    legacyPath: '/api/flights',
    itemsKey: 'flights',
    snapshotLimit: 20,
  },
  ships: {
    serviceBacked: true,
    legacyPath: '/api/ships',
    itemsKey: 'ships',
    snapshotLimit: 16,
  },
  markets: {
    serviceBacked: true,
    legacyPath: '/api/markets',
    itemsKey: null,
    snapshotLimit: 20,
  },
  crypto: {
    serviceBacked: false,
    legacyPath: '/api/crypto',
    itemsKey: null,
    snapshotLimit: 10,
  },
  oil: {
    serviceBacked: false,
    legacyPath: '/api/oil',
    itemsKey: null,
    snapshotLimit: 10,
  },
  polymarket: {
    serviceBacked: true,
    legacyPath: '/api/polymarket',
    itemsKey: 'markets',
    snapshotLimit: 12,
  },
  fires: {
    serviceBacked: true,
    legacyPath: '/api/fires',
    itemsKey: 'events',
    snapshotLimit: 20,
  },
  satellites: {
    serviceBacked: true,
    legacyPath: null,
    itemsKey: 'items',
    snapshotLimit: 20,
  },
  earthquakes: {
    serviceBacked: true,
    legacyPath: null,
    itemsKey: 'items',
    snapshotLimit: 20,
  },
  'internet-outages': {
    serviceBacked: true,
    legacyPath: null,
    itemsKey: 'items',
    snapshotLimit: 20,
  },
  sigint: {
    serviceBacked: true,
    legacyPath: null,
    itemsKey: 'items',
    snapshotLimit: 20,
  },
};

const DEFAULT_SNAPSHOT_FEEDS: Record<WorkspaceId, readonly IntelFeed[]> = {
  global: [
    'news',
    'alerts',
    'conflicts',
    'strikes',
    'telegram',
    'regional-alerts',
    'flights',
    'ships',
    'markets',
    'polymarket',
    'fires',
    'satellites',
    'earthquakes',
    'internet-outages',
    'sigint',
  ],
  network: [],
};

const DEFAULT_SEARCHABLE_FEEDS: Record<WorkspaceId, readonly SearchableIntelFeed[]> = {
  global: ['news', 'alerts', 'conflicts', 'strikes', 'telegram', 'regional-alerts', 'sigint'],
  network: [],
};

export function getIntelFeedConfig(feed: IntelFeed) {
  return INTEL_FEED_CONFIG[feed];
}

export function tryParseIntelFeed(value: unknown): IntelFeed | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  const resolved = (INTEL_FEED_ALIASES as Record<string, IntelFeed | undefined>)[normalizedValue] ?? normalizedValue;
  if ((INTEL_FEEDS as readonly string[]).includes(resolved)) {
    return resolved as IntelFeed;
  }

  return null;
}

export function parseIntelFeed(value: unknown): IntelFeed {
  const feed = tryParseIntelFeed(value);
  if (feed) {
    return feed;
  }

  throw new Error(`Unsupported feed "${String(value)}". Supported feeds: ${INTEL_FEEDS.join(', ')}`);
}

export function isSearchableIntelFeed(value: unknown): value is SearchableIntelFeed {
  return typeof value === 'string' && (INTEL_SEARCHABLE_FEEDS as readonly string[]).includes(value);
}

export function parseSearchableIntelFeed(value: unknown): SearchableIntelFeed {
  if (isSearchableIntelFeed(value)) {
    return value;
  }

  throw new Error(
    `Unsupported searchable feed "${String(value)}". Searchable feeds: ${INTEL_SEARCHABLE_FEEDS.join(', ')}`,
  );
}

export function normalizeIntelFeedList(values: readonly string[] | undefined, fallback: readonly IntelFeed[]) {
  const list = values && values.length > 0 ? values : fallback;
  return Array.from(new Set(list.map((value) => parseIntelFeed(value))));
}

export function normalizeSearchableIntelFeedList(
  workspace: WorkspaceId,
  values: readonly string[] | undefined,
) {
  const list = values && values.length > 0 ? values : DEFAULT_SEARCHABLE_FEEDS[workspace];
  return Array.from(new Set(list.map((value) => parseSearchableIntelFeed(value))));
}

export function workspaceSupportsIntelFeed(workspace: WorkspaceId, _feed: IntelFeed) {
  if (workspace === 'network') {
    return false;
  }

  return workspace === 'global';
}

export function feedUsesIntelService(feed: IntelFeed) {
  return INTEL_FEED_CONFIG[feed].serviceBacked;
}

export function getLegacyFeedPath(feed: IntelFeed) {
  return INTEL_FEED_CONFIG[feed].legacyPath;
}

export function getDefaultSnapshotFeeds(workspace: WorkspaceId) {
  return [...DEFAULT_SNAPSHOT_FEEDS[workspace]];
}

export function getDefaultSearchableFeeds(workspace: WorkspaceId) {
  return [...DEFAULT_SEARCHABLE_FEEDS[workspace]];
}

export function countIntelFeedItems(feed: IntelFeed, payload: unknown) {
  const config = INTEL_FEED_CONFIG[feed];
  if (config.itemsKey === null) {
    return Array.isArray(payload) ? payload.length : 0;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 0;
  }

  const items = (payload as Record<string, unknown>)[config.itemsKey];
  return Array.isArray(items) ? items.length : 0;
}

export function limitIntelFeedPayload(feed: IntelFeed, payload: unknown, limit: number) {
  const nextLimit = Math.max(1, Math.floor(limit));
  const config = INTEL_FEED_CONFIG[feed];

  if (config.itemsKey === null) {
    return Array.isArray(payload) ? payload.slice(0, nextLimit) : [];
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  const items = record[config.itemsKey];
  if (!Array.isArray(items)) {
    return payload;
  }

  return {
    ...record,
    [config.itemsKey]: items.slice(0, nextLimit),
  };
}

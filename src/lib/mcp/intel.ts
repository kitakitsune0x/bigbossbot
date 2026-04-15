import { parseTheater, type TheaterId } from '@/lib/theater';

export const BIG_BOSS_MCP_FEEDS = [
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
] as const;

export const BIG_BOSS_MCP_SEARCHABLE_FEEDS = [
  'news',
  'alerts',
  'conflicts',
  'strikes',
  'telegram',
  'regional-alerts',
] as const;

export const BIG_BOSS_MCP_DEFAULT_SNAPSHOT_FEEDS = [
  'news',
  'alerts',
  'conflicts',
  'strikes',
  'telegram',
  'regional-alerts',
  'flights',
] as const;

export type BigBossMcpFeed = (typeof BIG_BOSS_MCP_FEEDS)[number];
export type BigBossSearchableFeed = (typeof BIG_BOSS_MCP_SEARCHABLE_FEEDS)[number];

type FeedMeta = Record<string, unknown>;

type FeedNormalization = {
  items: unknown[];
  meta: FeedMeta;
};

export type BigBossFeedResult = {
  feed: BigBossMcpFeed;
  theater: TheaterId;
  endpoint: string;
  fetchedAt: string;
  itemCount: number;
  totalItems: number;
  items: unknown[];
  meta: FeedMeta;
};

export type BigBossSnapshotResult = {
  theater: TheaterId;
  includedFeeds: BigBossMcpFeed[];
  fetchedAt: string;
  feeds: Record<string, BigBossFeedResult>;
};

export type BigBossSearchResult = {
  feed: BigBossSearchableFeed;
  title: string;
  snippet: string;
  source: string | null;
  url: string | null;
  timestamp: string | null;
  score: number;
  item: unknown;
};

export type BigBossSearchResponse = {
  query: string;
  theater: TheaterId;
  feedsSearched: BigBossSearchableFeed[];
  fetchedAt: string;
  resultCount: number;
  results: BigBossSearchResult[];
};

type FeedConfig = {
  path: string;
  snapshotLimit: number;
  normalize: (payload: unknown) => FeedNormalization;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function stripUndefined(record: FeedMeta) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function normalizeObjectArrayPayload(payload: unknown): FeedNormalization {
  return {
    items: asArray(payload),
    meta: {},
  };
}

const FEED_CONFIG: Record<BigBossMcpFeed, FeedConfig> = {
  news: {
    path: '/api/news',
    snapshotLimit: 12,
    normalize: normalizeObjectArrayPayload,
  },
  alerts: {
    path: '/api/alerts',
    snapshotLimit: 12,
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.alerts),
        meta: stripUndefined({
          status: record.status,
          activeCount: record.activeCount,
          lastChecked: record.lastChecked,
          source: record.source,
        }),
      };
    },
  },
  conflicts: {
    path: '/api/conflicts',
    snapshotLimit: 15,
    normalize: normalizeObjectArrayPayload,
  },
  strikes: {
    path: '/api/strikes',
    snapshotLimit: 12,
    normalize: normalizeObjectArrayPayload,
  },
  telegram: {
    path: '/api/telegram',
    snapshotLimit: 18,
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.posts),
        meta: stripUndefined({
          channels: record.channels,
          updated: record.updated,
        }),
      };
    },
  },
  'regional-alerts': {
    path: '/api/regional-alerts',
    snapshotLimit: 12,
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.alerts),
        meta: stripUndefined({
          updated: record.updated,
        }),
      };
    },
  },
  flights: {
    path: '/api/flights',
    snapshotLimit: 20,
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.flights),
        meta: stripUndefined({
          total: record.total,
          military: record.military,
          source: record.source,
          updated: record.updated,
        }),
      };
    },
  },
  ships: {
    path: '/api/ships',
    snapshotLimit: 16,
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.ships),
        meta: stripUndefined({
          regions: record.regions,
          totalTracked: record.totalTracked,
          source: record.source,
          updated: record.updated,
          note: record.note,
        }),
      };
    },
  },
  markets: {
    path: '/api/markets',
    snapshotLimit: 20,
    normalize: normalizeObjectArrayPayload,
  },
  crypto: {
    path: '/api/crypto',
    snapshotLimit: 10,
    normalize: normalizeObjectArrayPayload,
  },
  oil: {
    path: '/api/oil',
    snapshotLimit: 10,
    normalize: normalizeObjectArrayPayload,
  },
  polymarket: {
    path: '/api/polymarket',
    snapshotLimit: 12,
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.markets),
        meta: stripUndefined({
          count: record.count,
          updated: record.updated,
          error: record.error,
        }),
      };
    },
  },
  fires: {
    path: '/api/fires',
    snapshotLimit: 20,
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.events),
        meta: stripUndefined({
          total: record.total,
          highIntensity: record.highIntensity,
          possibleExplosions: record.possibleExplosions,
          source: record.source,
          theater: record.theater,
          updated: record.updated,
          error: record.error,
        }),
      };
    },
  },
};

function ensureFeed(value: string): BigBossMcpFeed {
  if ((BIG_BOSS_MCP_FEEDS as readonly string[]).includes(value)) {
    return value as BigBossMcpFeed;
  }

  throw new Error(
    `Unsupported feed "${value}". Supported feeds: ${BIG_BOSS_MCP_FEEDS.join(', ')}`,
  );
}

function ensureSearchableFeed(value: string): BigBossSearchableFeed {
  if ((BIG_BOSS_MCP_SEARCHABLE_FEEDS as readonly string[]).includes(value)) {
    return value as BigBossSearchableFeed;
  }

  throw new Error(
    `Unsupported searchable feed "${value}". Searchable feeds: ${BIG_BOSS_MCP_SEARCHABLE_FEEDS.join(', ')}`,
  );
}

function normalizeFeedList(values: readonly string[] | undefined, fallback: readonly BigBossMcpFeed[]) {
  const list = values && values.length > 0 ? values : fallback;
  return Array.from(new Set(list.map(ensureFeed)));
}

function normalizeSearchableFeedList(values: readonly string[] | undefined) {
  const list = values && values.length > 0 ? values : BIG_BOSS_MCP_SEARCHABLE_FEEDS;
  return Array.from(new Set(list.map(ensureSearchableFeed)));
}

function ensureBaseUrl(baseUrl: string) {
  try {
    return new URL(baseUrl).toString();
  } catch {
    throw new Error(`Invalid BIG_BOSS_BASE_URL: ${baseUrl}`);
  }
}

function buildFeedUrl(baseUrl: string, feed: BigBossMcpFeed, theater: TheaterId) {
  const url = new URL(FEED_CONFIG[feed].path, ensureBaseUrl(baseUrl));
  url.searchParams.set('theater', theater);
  return url;
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error('BIG BOSS returned an invalid JSON response.');
  }
}

async function fetchFeedPayload(baseUrl: string, apiToken: string, feed: BigBossMcpFeed, theater: TheaterId) {
  const url = buildFeedUrl(baseUrl, feed, theater);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiToken}`,
        'User-Agent': 'BIG-BOSS MCP/1.0',
      },
      cache: 'no-store',
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not reach BIG BOSS at ${url.origin}: ${error.message}`
        : `Could not reach BIG BOSS at ${url.origin}.`,
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('BIG BOSS rejected the API token. Check BIG_BOSS_API_TOKEN and confirm the token is still active.');
    }

    throw new Error(`BIG BOSS feed "${feed}" failed with HTTP ${response.status}.`);
  }

  return {
    endpoint: url.toString(),
    payload: await parseJsonResponse(response),
  };
}

function limitItems(items: unknown[], limit: number | undefined, fallback: number) {
  const nextLimit = typeof limit === 'number' && Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : fallback;
  return items.slice(0, nextLimit);
}

function parseTimestamp(value: unknown) {
  const text = asString(value);
  if (!text) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(text).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function scoreMatch(haystack: string, query: string, tokens: string[]) {
  if (!haystack) {
    return 0;
  }

  let score = haystack.includes(query) ? query.length + 4 : 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += token.length;
    }
  }

  return score;
}

function buildSearchResults(feedResult: BigBossFeedResult, query: string, tokens: string[]) {
  const results: BigBossSearchResult[] = [];

  switch (feedResult.feed) {
    case 'news':
      for (const item of feedResult.items) {
        if (!isRecord(item)) continue;
        const title = asString(item.title) ?? 'Untitled news item';
        const source = asString(item.source);
        const url = asString(item.link);
        const timestamp = asString(item.pubDate);
        const score = scoreMatch(`${title} ${source ?? ''}`.toLowerCase(), query, tokens);
        if (score <= 0) continue;

        results.push({
          feed: 'news',
          title,
          snippet: source ? `Source: ${source}` : 'News item',
          source,
          url,
          timestamp,
          score,
          item,
        });
      }
      break;
    case 'alerts':
      for (const item of feedResult.items) {
        if (!isRecord(item)) continue;
        const title = asString(item.threat) ?? 'Alert';
        const locations = asArray(item.locations).filter((value): value is string => typeof value === 'string');
        const source = asString(item.source);
        const timestamp = asString(item.time);
        const haystack = `${title} ${locations.join(' ')} ${source ?? ''}`.toLowerCase();
        const score = scoreMatch(haystack, query, tokens);
        if (score <= 0) continue;

        results.push({
          feed: 'alerts',
          title,
          snippet: [asString(item.type), locations.join(', ')].filter(Boolean).join(' · ') || 'Regional alert',
          source,
          url: null,
          timestamp,
          score,
          item,
        });
      }
      break;
    case 'conflicts':
      for (const item of feedResult.items) {
        if (!isRecord(item)) continue;
        const title = asString(item.description) ?? 'Conflict event';
        const location = asString(item.location);
        const source = asString(item.source);
        const timestamp = asString(item.date);
        const haystack = `${title} ${location ?? ''} ${source ?? ''} ${asString(item.type) ?? ''}`.toLowerCase();
        const score = scoreMatch(haystack, query, tokens);
        if (score <= 0) continue;

        results.push({
          feed: 'conflicts',
          title,
          snippet: [asString(item.type), location].filter(Boolean).join(' · ') || 'Conflict event',
          source,
          url: null,
          timestamp,
          score,
          item,
        });
      }
      break;
    case 'strikes':
      for (const item of feedResult.items) {
        if (!isRecord(item)) continue;
        const title = asString(item.title) ?? 'Strike event';
        const country = asString(item.country);
        const source = asString(item.source);
        const timestamp = asString(item.date);
        const url = asString(item.url);
        const haystack = `${title} ${country ?? ''} ${source ?? ''} ${asString(item.category) ?? ''}`.toLowerCase();
        const score = scoreMatch(haystack, query, tokens);
        if (score <= 0) continue;

        results.push({
          feed: 'strikes',
          title,
          snippet: [asString(item.category), country].filter(Boolean).join(' · ') || 'Strike event',
          source,
          url,
          timestamp,
          score,
          item,
        });
      }
      break;
    case 'telegram':
      for (const item of feedResult.items) {
        if (!isRecord(item)) continue;
        const text = asString(item.text) ?? '';
        const channelLabel = asString(item.channelLabel) ?? asString(item.channel) ?? 'Telegram';
        const source = channelLabel;
        const timestamp = asString(item.date);
        const url = asString(item.url);
        const score = scoreMatch(`${text} ${channelLabel}`.toLowerCase(), query, tokens);
        if (score <= 0) continue;

        results.push({
          feed: 'telegram',
          title: `${channelLabel} update`,
          snippet: text,
          source,
          url,
          timestamp,
          score,
          item,
        });
      }
      break;
    case 'regional-alerts':
      for (const item of feedResult.items) {
        if (!isRecord(item)) continue;
        const country = asString(item.name) ?? 'Region';
        const level = asString(item.level);
        const events = asArray(item.events);

        for (const event of events) {
          if (!isRecord(event)) continue;
          const title = asString(event.title) ?? `${country} event`;
          const source = asString(event.source);
          const timestamp = asString(event.time);
          const url = asString(event.url);
          const snippet = [country, asString(event.severity), level].filter(Boolean).join(' · ');
          const haystack = `${country} ${title} ${source ?? ''} ${snippet}`.toLowerCase();
          const score = scoreMatch(haystack, query, tokens);
          if (score <= 0) continue;

          results.push({
            feed: 'regional-alerts',
            title: `${country}: ${title}`,
            snippet,
            source,
            url,
            timestamp,
            score,
            item: {
              country,
              level,
              event,
            },
          });
        }
      }
      break;
    default:
      break;
  }

  return results;
}

export async function getBigBossFeed(params: {
  baseUrl: string;
  apiToken: string;
  feed: BigBossMcpFeed;
  theater: TheaterId | string;
  limit?: number;
}) {
  const theater = parseTheater(params.theater);
  const { endpoint, payload } = await fetchFeedPayload(params.baseUrl, params.apiToken, params.feed, theater);
  const config = FEED_CONFIG[params.feed];
  const normalized = config.normalize(payload);
  const items = limitItems(normalized.items, params.limit, normalized.items.length);

  return {
    feed: params.feed,
    theater,
    endpoint,
    fetchedAt: new Date().toISOString(),
    itemCount: items.length,
    totalItems: normalized.items.length,
    items,
    meta: normalized.meta,
  } satisfies BigBossFeedResult;
}

export async function getBigBossSnapshot(params: {
  baseUrl: string;
  apiToken: string;
  theater: TheaterId | string;
  include?: readonly string[];
}) {
  const theater = parseTheater(params.theater);
  const feeds = normalizeFeedList(params.include, BIG_BOSS_MCP_DEFAULT_SNAPSHOT_FEEDS);
  const feedResults = await Promise.all(
    feeds.map((feed) =>
      getBigBossFeed({
        baseUrl: params.baseUrl,
        apiToken: params.apiToken,
        theater,
        feed,
        limit: FEED_CONFIG[feed].snapshotLimit,
      }),
    ),
  );

  return {
    theater,
    includedFeeds: feeds,
    fetchedAt: new Date().toISOString(),
    feeds: Object.fromEntries(feedResults.map((result) => [result.feed, result])),
  } satisfies BigBossSnapshotResult;
}

export async function searchBigBossIntel(params: {
  baseUrl: string;
  apiToken: string;
  query: string;
  theater: TheaterId | string;
  feeds?: readonly string[];
  limit?: number;
}) {
  const queryText = params.query.trim().toLowerCase();
  if (!queryText) {
    throw new Error('Search query cannot be empty.');
  }

  const theater = parseTheater(params.theater);
  const feeds = normalizeSearchableFeedList(params.feeds);
  const tokens = Array.from(new Set(queryText.split(/\s+/).filter(Boolean)));
  const limit = typeof params.limit === 'number' && Number.isFinite(params.limit)
    ? Math.max(1, Math.floor(params.limit))
    : 10;

  const feedResults = await Promise.all(
    feeds.map((feed) =>
      getBigBossFeed({
        baseUrl: params.baseUrl,
        apiToken: params.apiToken,
        theater,
        feed,
      }),
    ),
  );

  const results = feedResults
    .flatMap((feedResult) => buildSearchResults(feedResult, queryText, tokens))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return parseTimestamp(right.timestamp) - parseTimestamp(left.timestamp);
    })
    .slice(0, limit);

  return {
    query: params.query,
    theater,
    feedsSearched: feeds,
    fetchedAt: new Date().toISOString(),
    resultCount: results.length,
    results,
  } satisfies BigBossSearchResponse;
}

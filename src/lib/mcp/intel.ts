import {
  INTEL_FEEDS,
  INTEL_SEARCHABLE_FEEDS,
  getDefaultSnapshotFeeds,
  getIntelFeedConfig,
  normalizeIntelFeedList,
  normalizeSearchableIntelFeedList,
  parseIntelFeed,
  type IntelFeed,
  type SearchableIntelFeed,
} from '@/lib/intel/catalog';
import { DEFAULT_WORKSPACE, parseWorkspace, type WorkspaceId } from '@/lib/workspaces';

export const BIG_BOSS_MCP_FEEDS = INTEL_FEEDS;
export const BIG_BOSS_MCP_SEARCHABLE_FEEDS = INTEL_SEARCHABLE_FEEDS;
export const BIG_BOSS_MCP_DEFAULT_SNAPSHOT_FEEDS = getDefaultSnapshotFeeds(DEFAULT_WORKSPACE);

type FeedMeta = Record<string, unknown>;

type FeedNormalization = {
  items: unknown[];
  meta: FeedMeta;
};

export type BigBossFeedResult = {
  feed: IntelFeed;
  workspace: WorkspaceId;
  legacyTheater: null;
  endpoint: string;
  fetchedAt: string;
  itemCount: number;
  totalItems: number;
  items: unknown[];
  meta: FeedMeta;
};

export type BigBossSnapshotResult = {
  workspace: WorkspaceId;
  legacyTheater: null;
  includedFeeds: IntelFeed[];
  fetchedAt: string;
  feeds: Record<string, BigBossFeedResult>;
};

export type BigBossSearchResult = {
  feed: SearchableIntelFeed;
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
  workspace: WorkspaceId;
  legacyTheater: null;
  feedsSearched: SearchableIntelFeed[];
  fetchedAt: string;
  resultCount: number;
  results: BigBossSearchResult[];
};

export type BigBossWorkspaceSummary = {
  id: WorkspaceId;
  label: string;
  kind: string;
  public: boolean;
  defaultMapView: {
    center: [number, number];
    zoom: number;
  };
  enabledPanels: string[];
  filterPreset: string;
};

export type BigBossWorkspaceList = {
  fetchedAt: string;
  workspaces: BigBossWorkspaceSummary[];
};

export type BigBossMapEntitiesResult = {
  workspace: WorkspaceId;
  legacyTheater: null;
  endpoint: string;
  fetchedAt: string;
  updated: string | null;
  entities: Record<string, unknown[]>;
  entityCounts: Record<string, number>;
};

export type BigBossNetworkStatusResult = {
  endpoint: string;
  fetchedAt: string;
  status: unknown;
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

const FEED_CONFIG: Record<IntelFeed, { normalize: (payload: unknown) => FeedNormalization }> = {
  news: {
    normalize: normalizeObjectArrayPayload,
  },
  alerts: {
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
    normalize: normalizeObjectArrayPayload,
  },
  strikes: {
    normalize: normalizeObjectArrayPayload,
  },
  telegram: {
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
    normalize: normalizeObjectArrayPayload,
  },
  crypto: {
    normalize: normalizeObjectArrayPayload,
  },
  oil: {
    normalize: normalizeObjectArrayPayload,
  },
  polymarket: {
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
  satellites: {
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.items),
        meta: stripUndefined({
          count: record.count,
          source: record.source,
          updated: record.updated,
        }),
      };
    },
  },
  earthquakes: {
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.items),
        meta: stripUndefined({
          count: record.count,
          updated: record.updated,
        }),
      };
    },
  },
  'internet-outages': {
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.items),
        meta: stripUndefined({
          count: record.count,
          updated: record.updated,
        }),
      };
    },
  },
  sigint: {
    normalize(payload) {
      const record = isRecord(payload) ? payload : {};
      return {
        items: asArray(record.items),
        meta: stripUndefined({
          count: record.count,
          totals: record.totals,
          updated: record.updated,
        }),
      };
    },
  },
};

function resolveWorkspaceId(value: { workspace?: string; theater?: string }) {
  return parseWorkspace(value.workspace ?? value.theater);
}

function legacyTheaterForWorkspace(workspace: WorkspaceId) {
  void workspace;
  return null;
}

function ensureBaseUrl(baseUrl: string) {
  try {
    return new URL(baseUrl).toString();
  } catch {
    throw new Error(`Invalid BIG_BOSS_BASE_URL: ${baseUrl}`);
  }
}

function buildCanonicalUrl(baseUrl: string, path: string, searchParams?: URLSearchParams) {
  const url = new URL(path, ensureBaseUrl(baseUrl));
  searchParams?.forEach((value, key) => url.searchParams.set(key, value));
  return url;
}

function normalizeMapCenter(value: unknown): [number, number] {
  if (Array.isArray(value) && value.length >= 2) {
    const lat = typeof value[0] === 'number' ? value[0] : 0;
    const lon = typeof value[1] === 'number' ? value[1] : 0;
    return [lat, lon];
  }

  return [0, 0];
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error('BIG BOSS BOT returned an invalid JSON response.');
  }
}

async function fetchBigBossJson(
  baseUrl: string,
  apiToken: string,
  path: string,
  searchParams?: URLSearchParams,
) {
  const url = buildCanonicalUrl(baseUrl, path, searchParams);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiToken}`,
        'User-Agent': 'BIG-BOSS-BOT MCP/2.0',
      },
      cache: 'no-store',
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not reach BIG BOSS BOT at ${url.origin}: ${error.message}`
        : `Could not reach BIG BOSS BOT at ${url.origin}.`,
    );
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? ((payload as Record<string, unknown>).error ?? (payload as Record<string, unknown>).detail)
        : payload;

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        typeof detail === 'string'
          ? detail
          : 'BIG BOSS BOT rejected the API token. Confirm BIG_BOSS_API_TOKEN is active and has the required scope.',
      );
    }

    throw new Error(
      typeof detail === 'string'
        ? detail
        : `BIG BOSS BOT request to ${url.pathname} failed with HTTP ${response.status}.`,
    );
  }

  return {
    endpoint: url.toString(),
    payload,
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
    case 'sigint':
      for (const item of feedResult.items) {
        if (!isRecord(item)) continue;
        const title = asString(item.name) ?? asString(item.id) ?? 'Signal event';
        const type = asString(item.type);
        const source = type;
        const metadata = isRecord(item.metadata) ? item.metadata : {};
        const timestamp = asString(metadata.updated) ?? asString(metadata.time);
        const haystack = `${title} ${type ?? ''} ${JSON.stringify(metadata)}`.toLowerCase();
        const score = scoreMatch(haystack, query, tokens);
        if (score <= 0) continue;

        results.push({
          feed: 'sigint',
          title,
          snippet: type ?? 'Signal event',
          source,
          url: null,
          timestamp,
          score,
          item,
        });
      }
      break;
    default:
      break;
  }

  return results;
}

function buildFeedUrl(baseUrl: string, feed: IntelFeed, workspace: WorkspaceId) {
  const searchParams = new URLSearchParams({ workspace });
  return buildCanonicalUrl(baseUrl, `/api/intel/feed/${feed}`, searchParams);
}

function normalizeFeedResponse(options: {
  baseUrl: string;
  workspace: WorkspaceId;
  feed: IntelFeed;
  payload: unknown;
  endpoint?: string;
  limit?: number;
  fetchedAt?: string;
}) {
  const normalized = FEED_CONFIG[options.feed].normalize(options.payload);
  const items = limitItems(normalized.items, options.limit, normalized.items.length);

  return {
    feed: options.feed,
    workspace: options.workspace,
    legacyTheater: legacyTheaterForWorkspace(options.workspace),
    endpoint: options.endpoint ?? buildFeedUrl(options.baseUrl, options.feed, options.workspace).toString(),
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    itemCount: items.length,
    totalItems: normalized.items.length,
    items,
    meta: normalized.meta,
  } satisfies BigBossFeedResult;
}

export async function listBigBossWorkspaces(params: {
  baseUrl: string;
  apiToken: string;
}) {
  const { payload } = await fetchBigBossJson(params.baseUrl, params.apiToken, '/api/intel/workspaces');
  const record = isRecord(payload) ? payload : {};
  const workspaces = asArray(record.workspaces).filter(isRecord).map((workspace) => ({
    id: parseWorkspace(workspace.id),
    label: asString(workspace.label) ?? parseWorkspace(workspace.id),
    kind: asString(workspace.kind) ?? 'global',
    public: workspace.public !== false,
    defaultMapView: isRecord(workspace.defaultMapView)
      ? {
          center: normalizeMapCenter(workspace.defaultMapView.center),
          zoom: typeof workspace.defaultMapView.zoom === 'number' ? workspace.defaultMapView.zoom : 2,
        }
      : {
          center: [0, 0] as [number, number],
          zoom: 2,
        },
    enabledPanels: asArray(workspace.enabledPanels).filter((value): value is string => typeof value === 'string'),
    filterPreset: asString(workspace.filterPreset) ?? parseWorkspace(workspace.id),
  }));

  return {
    fetchedAt: asString(record.fetchedAt) ?? new Date().toISOString(),
    workspaces,
  } satisfies BigBossWorkspaceList;
}

export async function getBigBossFeed(params: {
  baseUrl: string;
  apiToken: string;
  feed: IntelFeed | string;
  workspace?: WorkspaceId | string;
  theater?: string;
  limit?: number;
}) {
  const workspace = resolveWorkspaceId({
    workspace: params.workspace,
    theater: params.theater,
  });
  const feed = parseIntelFeed(params.feed);
  const searchParams = new URLSearchParams({ workspace });
  const { endpoint, payload } = await fetchBigBossJson(
    params.baseUrl,
    params.apiToken,
    `/api/intel/feed/${feed}`,
    searchParams,
  );

  return normalizeFeedResponse({
    baseUrl: params.baseUrl,
    workspace,
    feed,
    payload,
    endpoint,
    limit: params.limit,
  });
}

export async function getBigBossSnapshot(params: {
  baseUrl: string;
  apiToken: string;
  workspace?: WorkspaceId | string;
  theater?: string;
  include?: readonly string[];
}) {
  const workspace = resolveWorkspaceId({
    workspace: params.workspace,
    theater: params.theater,
  });
  const searchParams = new URLSearchParams({ workspace });
  const include = normalizeIntelFeedList(params.include, getDefaultSnapshotFeeds(workspace));
  if (include.length > 0) {
    searchParams.set('include', include.join(','));
  }

  const { payload } = await fetchBigBossJson(
    params.baseUrl,
    params.apiToken,
    '/api/intel/snapshot',
    searchParams,
  );

  const record = isRecord(payload) ? payload : {};
  const snapshotWorkspace = parseWorkspace(record.workspace ?? workspace);
  const fetchedAt = asString(record.fetchedAt) ?? new Date().toISOString();
  const includedFeeds = normalizeIntelFeedList(
    Array.isArray(record.includedFeeds)
      ? record.includedFeeds.filter((value): value is string => typeof value === 'string')
      : include,
    getDefaultSnapshotFeeds(snapshotWorkspace),
  );
  const feedsRecord = isRecord(record.feeds) ? record.feeds : {};

  return {
    workspace: snapshotWorkspace,
    legacyTheater: legacyTheaterForWorkspace(snapshotWorkspace),
    includedFeeds,
    fetchedAt,
    feeds: Object.fromEntries(
      includedFeeds.map((feed) => [
        feed,
        normalizeFeedResponse({
          baseUrl: params.baseUrl,
          workspace: snapshotWorkspace,
          feed,
          payload: feedsRecord[feed],
          fetchedAt,
          limit: getIntelFeedConfig(feed).snapshotLimit,
        }),
      ]),
    ),
  } satisfies BigBossSnapshotResult;
}

export async function searchBigBossIntel(params: {
  baseUrl: string;
  apiToken: string;
  query: string;
  workspace?: WorkspaceId | string;
  theater?: string;
  feeds?: readonly string[];
  limit?: number;
}) {
  const queryText = params.query.trim().toLowerCase();
  if (!queryText) {
    throw new Error('Search query cannot be empty.');
  }

  const workspace = resolveWorkspaceId({
    workspace: params.workspace,
    theater: params.theater,
  });
  const feeds = normalizeSearchableIntelFeedList(workspace, params.feeds);
  const tokens = Array.from(new Set(queryText.split(/\s+/).filter(Boolean)));
  const limit = typeof params.limit === 'number' && Number.isFinite(params.limit)
    ? Math.max(1, Math.floor(params.limit))
    : 10;

  const feedResults = await Promise.all(
    feeds.map((feed) =>
      getBigBossFeed({
        baseUrl: params.baseUrl,
        apiToken: params.apiToken,
        workspace,
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
    workspace,
    legacyTheater: legacyTheaterForWorkspace(workspace),
    feedsSearched: feeds,
    fetchedAt: new Date().toISOString(),
    resultCount: results.length,
    results,
  } satisfies BigBossSearchResponse;
}

export async function getBigBossMapEntities(params: {
  baseUrl: string;
  apiToken: string;
  workspace?: WorkspaceId | string;
  theater?: string;
}) {
  const workspace = resolveWorkspaceId({
    workspace: params.workspace,
    theater: params.theater,
  });
  const { endpoint, payload } = await fetchBigBossJson(
    params.baseUrl,
    params.apiToken,
    '/api/intel/map',
    new URLSearchParams({ workspace }),
  );

  const record = isRecord(payload) ? payload : {};
  const entitiesRecord = isRecord(record.entities) ? record.entities : {};
  const entities = Object.fromEntries(
    Object.entries(entitiesRecord).map(([key, value]) => [key, asArray(value)]),
  );

  return {
    workspace: parseWorkspace(record.workspace ?? workspace),
    legacyTheater: legacyTheaterForWorkspace(parseWorkspace(record.workspace ?? workspace)),
    endpoint,
    fetchedAt: new Date().toISOString(),
    updated: asString(record.updated),
    entities,
    entityCounts: Object.fromEntries(
      Object.entries(entities).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]),
    ),
  } satisfies BigBossMapEntitiesResult;
}

export async function getBigBossNetworkStatus(params: {
  baseUrl: string;
  apiToken: string;
}) {
  const { endpoint, payload } = await fetchBigBossJson(
    params.baseUrl,
    params.apiToken,
    '/api/network/status',
  );

  return {
    endpoint,
    fetchedAt: new Date().toISOString(),
    status: payload,
  } satisfies BigBossNetworkStatusResult;
}

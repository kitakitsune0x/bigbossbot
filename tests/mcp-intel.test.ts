import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBigBossFeed,
  getBigBossMapEntities,
  getBigBossNetworkStatus,
  getBigBossSnapshot,
  listBigBossWorkspaces,
  searchBigBossIntel,
} from '@/lib/mcp/intel';

const originalFetch = globalThis.fetch;

test.after(() => {
  globalThis.fetch = originalFetch;
});

test('getBigBossFeed normalizes nested feed payloads', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    assert.equal(url.pathname, '/api/intel/feed/alerts');
    assert.equal(url.searchParams.get('workspace'), 'global');

    return new Response(JSON.stringify({
      status: 'ACTIVE',
      activeCount: 2,
      alerts: [
        { threat: 'Air raid warning', time: '2026-04-15T10:00:00Z', source: 'Google News' },
        { threat: 'Drone alert', time: '2026-04-15T09:55:00Z', source: 'Google News' },
      ],
      source: 'Google News air-raid monitor',
      lastChecked: '2026-04-15T10:01:00Z',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const result = await getBigBossFeed({
    baseUrl: 'http://127.0.0.1:3000',
    apiToken: 'bb_read_intel_example',
    feed: 'alerts',
    workspace: 'global',
    limit: 1,
  });

  assert.equal(result.feed, 'alerts');
  assert.equal(result.workspace, 'global');
  assert.equal(result.legacyTheater, null);
  assert.equal(result.itemCount, 1);
  assert.equal(result.totalItems, 2);
  assert.equal(result.meta.status, 'ACTIVE');
  assert.equal(result.meta.source, 'Google News air-raid monitor');
});

test('getBigBossSnapshot stitches requested feeds together', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    assert.equal(url.pathname, '/api/intel/snapshot');
    assert.equal(url.searchParams.get('workspace'), 'global');
    assert.equal(url.searchParams.get('include'), 'news,telegram');

    return new Response(JSON.stringify({
      workspace: 'global',
      includedFeeds: ['news', 'telegram'],
      fetchedAt: '2026-04-15T10:03:00Z',
      feeds: {
        news: [
          { title: 'Kyiv intercepts drones', source: 'Reuters', link: 'https://example.com/news-1', pubDate: '2026-04-15T10:00:00Z' },
        ],
        telegram: {
          posts: [
            {
              channelLabel: 'NEXTA',
              text: 'Explosions reported near the border.',
              date: '2026-04-15T09:59:00Z',
              url: 'https://t.me/example/1',
            },
          ],
          channels: ['NEXTA'],
          updated: '2026-04-15T10:02:00Z',
        },
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const result = await getBigBossSnapshot({
    baseUrl: 'http://127.0.0.1:3000',
    apiToken: 'bb_read_intel_example',
    workspace: 'global',
    include: ['news', 'telegram'],
  });

  assert.equal(result.workspace, 'global');
  assert.deepEqual(result.includedFeeds, ['news', 'telegram']);
  assert.equal(result.feeds.news.itemCount, 1);
  assert.equal(result.feeds.telegram.itemCount, 1);
});

test('searchBigBossIntel returns deterministic ranked matches', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());

    if (url.pathname === '/api/intel/feed/news') {
      assert.equal(url.searchParams.get('workspace'), 'global');
      return new Response(JSON.stringify([
        {
          title: 'Kharkiv hit by overnight drone attack',
          source: 'BBC',
          link: 'https://example.com/kharkiv',
          pubDate: '2026-04-15T10:00:00Z',
        },
      ]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/api/intel/feed/telegram') {
      assert.equal(url.searchParams.get('workspace'), 'global');
      return new Response(JSON.stringify({
        posts: [
          {
            channelLabel: 'OSINT Defender',
            text: 'Drone activity reported over Kharkiv.',
            date: '2026-04-15T10:01:00Z',
            url: 'https://t.me/example/2',
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const result = await searchBigBossIntel({
    baseUrl: 'http://127.0.0.1:3000',
    apiToken: 'bb_read_intel_example',
    workspace: 'global',
    query: 'kharkiv drone',
    feeds: ['news', 'telegram'],
    limit: 2,
  });

  assert.equal(result.workspace, 'global');
  assert.equal(result.resultCount, 2);
  assert.equal(result.results[0]?.feed, 'telegram');
  assert.equal(result.results[1]?.feed, 'news');
});

test('listBigBossWorkspaces returns workspace summaries from canonical route', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    assert.equal(url.pathname, '/api/intel/workspaces');

    return new Response(JSON.stringify({
      fetchedAt: '2026-04-15T10:05:00Z',
      workspaces: [
        {
          id: 'global',
          label: 'Global',
          kind: 'global',
          public: true,
          defaultMapView: { center: [22, 12], zoom: 2 },
          enabledPanels: ['news', 'map'],
          filterPreset: 'global',
        },
        {
          id: 'network',
          label: 'Network',
          kind: 'network',
          public: false,
          defaultMapView: { center: [18, 12], zoom: 2 },
          enabledPanels: ['news', 'map'],
          filterPreset: 'network',
        },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const result = await listBigBossWorkspaces({
    baseUrl: 'http://127.0.0.1:3000',
    apiToken: 'bb_read_network_example',
  });

  assert.equal(result.workspaces.length, 2);
  assert.equal(result.workspaces[0]?.id, 'global');
  assert.equal(result.workspaces[1]?.id, 'network');
});

test('getBigBossMapEntities and getBigBossNetworkStatus call canonical routes', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());

    if (url.pathname === '/api/intel/map') {
      assert.equal(url.searchParams.get('workspace'), 'global');
      return new Response(JSON.stringify({
        workspace: 'global',
        updated: '2026-04-15T10:06:00Z',
        entities: {
          flights: [{ callsign: 'REACH123' }],
          ships: [{ name: 'USS Example' }],
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    assert.equal(url.pathname, '/api/network/status');
    return new Response(JSON.stringify({
      ok: true,
      contactsCount: 3,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const map = await getBigBossMapEntities({
    baseUrl: 'http://127.0.0.1:3000',
    apiToken: 'bb_read_intel_example',
    workspace: 'global',
  });
  const network = await getBigBossNetworkStatus({
    baseUrl: 'http://127.0.0.1:3000',
    apiToken: 'bb_read_network_example',
  });

  assert.equal(map.workspace, 'global');
  assert.equal(map.entityCounts.flights, 1);
  assert.equal(map.entityCounts.ships, 1);
  assert.deepEqual(network.status, {
    ok: true,
    contactsCount: 3,
  });
});

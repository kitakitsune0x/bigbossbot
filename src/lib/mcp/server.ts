import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BIG_BOSS_MCP_DEFAULT_SNAPSHOT_FEEDS,
  BIG_BOSS_MCP_FEEDS,
  BIG_BOSS_MCP_SEARCHABLE_FEEDS,
  getBigBossFeed,
  getBigBossSnapshot,
  searchBigBossIntel,
} from '@/lib/mcp/intel';
import { resolveBuildVersion } from '@/lib/build-version';
import { THEATER_IDS, type TheaterId } from '@/lib/theater';

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcSuccess = {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: unknown;
};

type JsonRpcError = {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
};

type RuntimeConfig = {
  baseUrl: string;
  apiToken: string;
};

const SERVER_NAME = 'big-boss-mcp';
const DEFAULT_PROTOCOL_VERSION = '2024-11-05';

function readPersistedBuildVersion() {
  try {
    const version = readFileSync(join(process.cwd(), '.build-version'), 'utf8').trim();

    return version || undefined;
  } catch {
    return undefined;
  }
}

const SERVER_VERSION = resolveBuildVersion(
  process.env.BIG_BOSS_VERSION,
  process.env.APP_VERSION,
  readPersistedBuildVersion(),
);

const TOOL_DEFINITIONS = [
  {
    name: 'get_snapshot',
    description: 'Fetch a stitched BIG BOSS BOT situation snapshot for a theater, optionally narrowing the included feeds.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        theater: {
          type: 'string',
          enum: [...THEATER_IDS],
          description: 'The theater to query.',
        },
        include: {
          type: 'array',
          description: 'Optional subset of feeds to include in the snapshot.',
          items: {
            type: 'string',
            enum: [...BIG_BOSS_MCP_FEEDS],
          },
        },
      },
      required: ['theater'],
    },
  },
  {
    name: 'search_intel',
    description: 'Search BIG BOSS BOT text-heavy feeds for matching news, alerts, telegram posts, conflicts, strikes, or regional watch events.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          minLength: 1,
          description: 'Search query.',
        },
        theater: {
          type: 'string',
          enum: [...THEATER_IDS],
          description: 'The theater to query.',
        },
        feeds: {
          type: 'array',
          description: 'Optional searchable feed subset.',
          items: {
            type: 'string',
            enum: [...BIG_BOSS_MCP_SEARCHABLE_FEEDS],
          },
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Maximum number of matches to return.',
        },
      },
      required: ['query', 'theater'],
    },
  },
  {
    name: 'get_feed',
    description: 'Fetch one BIG BOSS BOT feed directly.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        feed: {
          type: 'string',
          enum: [...BIG_BOSS_MCP_FEEDS],
          description: 'Feed name.',
        },
        theater: {
          type: 'string',
          enum: [...THEATER_IDS],
          description: 'The theater to query.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'Optional number of items to keep from the feed response.',
        },
      },
      required: ['feed', 'theater'],
    },
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureTheater(value: unknown): TheaterId {
  if (typeof value === 'string' && (THEATER_IDS as readonly string[]).includes(value)) {
    return value as TheaterId;
  }

  throw new Error(`Invalid theater. Expected one of: ${THEATER_IDS.join(', ')}`);
}

function ensureFeed(value: unknown) {
  if (typeof value === 'string' && (BIG_BOSS_MCP_FEEDS as readonly string[]).includes(value)) {
    return value as (typeof BIG_BOSS_MCP_FEEDS)[number];
  }

  throw new Error(`Invalid feed. Expected one of: ${BIG_BOSS_MCP_FEEDS.join(', ')}`);
}

function ensureSearchableFeedList(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error('feeds must be an array of feed names.');
  }

  return value.map((entry) => {
    if (typeof entry !== 'string' || !(BIG_BOSS_MCP_SEARCHABLE_FEEDS as readonly string[]).includes(entry)) {
      throw new Error(`feeds must only include: ${BIG_BOSS_MCP_SEARCHABLE_FEEDS.join(', ')}`);
    }

    return entry as (typeof BIG_BOSS_MCP_SEARCHABLE_FEEDS)[number];
  });
}

function ensureFeedList(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error('include must be an array of feed names.');
  }

  return value.map((entry) => ensureFeed(entry));
}

function ensureOptionalLimit(value: unknown, max: number) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`limit must be an integer between 1 and ${max}.`);
  }

  return value;
}

function getRuntimeConfig(): RuntimeConfig {
  const baseUrl = process.env.BIG_BOSS_BASE_URL;
  const apiToken = process.env.BIG_BOSS_API_TOKEN;

  if (!baseUrl) {
    throw new Error('BIG_BOSS_BASE_URL is not set.');
  }

  if (!apiToken) {
    throw new Error('BIG_BOSS_API_TOKEN is not set.');
  }

  return {
    baseUrl,
    apiToken,
  };
}

function createToolResult(payload: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
  };
}

function createToolError(message: string): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    structuredContent: { error: message },
    isError: true,
  };
}

async function handleToolCall(name: string, args: unknown): Promise<ToolResult> {
  try {
    const runtime = getRuntimeConfig();
    const input = isRecord(args) ? args : {};

    switch (name) {
      case 'get_snapshot': {
        const theater = ensureTheater(input.theater);
        const include = ensureFeedList(input.include);
        const result = await getBigBossSnapshot({
          ...runtime,
          theater,
          include,
        });

        return createToolResult(result);
      }
      case 'search_intel': {
        const query = typeof input.query === 'string' ? input.query : '';
        const theater = ensureTheater(input.theater);
        const feeds = ensureSearchableFeedList(input.feeds);
        const limit = ensureOptionalLimit(input.limit, 50);
        const result = await searchBigBossIntel({
          ...runtime,
          query,
          theater,
          feeds,
          limit,
        });

        return createToolResult(result);
      }
      case 'get_feed': {
        const feed = ensureFeed(input.feed);
        const theater = ensureTheater(input.theater);
        const limit = ensureOptionalLimit(input.limit, 100);
        const result = await getBigBossFeed({
          ...runtime,
          feed,
          theater,
          limit,
        });

        return createToolResult(result);
      }
      default:
        return createToolError(`Unknown tool "${name}".`);
    }
  } catch (error) {
    return createToolError(error instanceof Error ? error.message : 'Tool execution failed.');
  }
}

function createJsonRpcSuccess(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

function createJsonRpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcError {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
}

export function startBigBossMcpServer() {
  let buffer = Buffer.alloc(0);

  function writeMessage(message: JsonRpcSuccess | JsonRpcError) {
    const body = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
    process.stdout.write(header);
    process.stdout.write(body);
  }

  async function handleRequest(message: JsonRpcRequest) {
    const id = message.id ?? null;

    try {
      switch (message.method) {
        case 'initialize': {
          const params = isRecord(message.params) ? message.params : {};
          writeMessage(
            createJsonRpcSuccess(id, {
              protocolVersion: typeof params.protocolVersion === 'string' ? params.protocolVersion : DEFAULT_PROTOCOL_VERSION,
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: SERVER_NAME,
                version: SERVER_VERSION,
              },
              instructions: [
                'BIG BOSS BOT MCP exposes on-demand read-only intel tools.',
                `Default snapshot feeds: ${BIG_BOSS_MCP_DEFAULT_SNAPSHOT_FEEDS.join(', ')}`,
                'Set BIG_BOSS_BASE_URL and BIG_BOSS_API_TOKEN before calling tools.',
              ].join(' '),
            }),
          );
          break;
        }
        case 'ping':
          writeMessage(createJsonRpcSuccess(id, {}));
          break;
        case 'tools/list':
          writeMessage(createJsonRpcSuccess(id, { tools: TOOL_DEFINITIONS }));
          break;
        case 'tools/call': {
          const params = isRecord(message.params) ? message.params : {};
          if (typeof params.name !== 'string') {
            writeMessage(createJsonRpcError(id, -32602, 'Tool name is required.'));
            break;
          }

          const result = await handleToolCall(params.name, params.arguments);
          writeMessage(createJsonRpcSuccess(id, result));
          break;
        }
        case 'resources/list':
          writeMessage(createJsonRpcSuccess(id, { resources: [] }));
          break;
        case 'prompts/list':
          writeMessage(createJsonRpcSuccess(id, { prompts: [] }));
          break;
        default:
          if (id !== null) {
            writeMessage(createJsonRpcError(id, -32601, `Method not found: ${message.method}`));
          }
          break;
      }
    } catch (error) {
      writeMessage(
        createJsonRpcError(
          id,
          -32603,
          error instanceof Error ? error.message : 'Internal server error',
        ),
      );
    }
  }

  function parseBuffer() {
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }

      const headerText = buffer.slice(0, headerEnd).toString('utf8');
      const match = headerText.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const bodyLength = Number.parseInt(match[1]!, 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + bodyLength;

      if (buffer.length < messageEnd) {
        return;
      }

      const body = buffer.slice(messageStart, messageEnd).toString('utf8');
      buffer = buffer.slice(messageEnd);

      let message: JsonRpcRequest;
      try {
        message = JSON.parse(body) as JsonRpcRequest;
      } catch {
        continue;
      }

      void handleRequest(message);
    }
  }

  process.stdin.on('data', (chunk: Buffer | string) => {
    const nextChunk = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
    buffer = Buffer.concat([buffer, nextChunk]);
    parseBuffer();
  });

  process.stdin.resume();
}

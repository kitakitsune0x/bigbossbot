import { NextRequest } from 'next/server';
import {
  feedUsesIntelService,
  getDefaultSnapshotFeeds,
  getLegacyFeedPath,
  limitIntelFeedPayload,
  normalizeIntelFeedList,
  parseIntelFeed,
  type IntelFeed,
  workspaceSupportsIntelFeed,
} from '@/lib/intel/catalog';
import {
  IntelServiceError,
  fetchIntelServiceFeed,
  fetchIntelServiceMap,
} from '@/lib/intel/service';
import type { ReadApiAccessContext } from '@/lib/auth/session';
import { WORKSPACE_DEFINITIONS, type WorkspaceDefinition, type WorkspaceId } from '@/lib/workspaces';
import type { SessionContext, ApiTokenScope } from '@/types/auth';
import type { ApiTokenAccessContext } from '@/lib/auth/service';

export class IntelGatewayError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status = 500, detail?: unknown) {
    super(message);
    this.name = 'IntelGatewayError';
    this.status = status;
    this.detail = detail;
  }
}

function isApiTokenContext(auth: ReadApiAccessContext): auth is ApiTokenAccessContext {
  return 'apiTokenScope' in auth;
}

function hasTokenScope(scope: ApiTokenScope, expected: ApiTokenScope) {
  if (scope === expected) {
    return true;
  }

  return scope === 'use_network' && expected === 'read_network';
}

export function actorHasNetworkAccess(auth: ReadApiAccessContext) {
  if ('authMethod' in auth && auth.authMethod === 'guest') {
    return false;
  }

  if (isApiTokenContext(auth)) {
    return hasTokenScope(auth.apiTokenScope, 'read_network');
  }

  return true;
}

export function actorIsAdmin(auth: SessionContext | ApiTokenAccessContext) {
  return auth.role === 'admin';
}

export function getVisibleWorkspaces(auth: ReadApiAccessContext): WorkspaceDefinition[] {
  return Object.values(WORKSPACE_DEFINITIONS).filter((workspace) => {
    if (workspace.public) {
      return true;
    }

    return actorHasNetworkAccess(auth);
  });
}

function getInternalAppBaseUrl() {
  return process.env.INTERNAL_APP_BASE_URL?.trim() || `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers({
    Accept: 'application/json',
  });

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.set('authorization', authorization);
  }

  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.set('cookie', cookie);
  }

  return headers;
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new IntelGatewayError('BIG BOSS BOT returned invalid JSON.', 502);
  }
}

async function fetchLegacyFeedPayload(
  request: NextRequest,
  feed: IntelFeed,
  workspace: WorkspaceId,
) {
  const legacyPath = getLegacyFeedPath(feed);
  if (!legacyPath) {
    throw new IntelGatewayError(`Feed "${feed}" is not available in this workspace.`, 400);
  }

  if (workspace !== 'global') {
    throw new IntelGatewayError(`Feed "${feed}" requires the global workspace.`, 400);
  }

  const url = new URL(legacyPath, getInternalAppBaseUrl());
  url.searchParams.set('theater', 'global');

  let response: Response;
  try {
    response = await fetch(url, {
      headers: buildForwardHeaders(request),
      cache: 'no-store',
    });
  } catch (error) {
    throw new IntelGatewayError(
      error instanceof Error
        ? `Could not reach BIG BOSS BOT at ${url.origin}: ${error.message}`
        : `Could not reach BIG BOSS BOT at ${url.origin}.`,
      503,
    );
  }

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? ((payload as Record<string, unknown>).error ?? (payload as Record<string, unknown>).detail)
        : payload;

    throw new IntelGatewayError(
      typeof detail === 'string' ? detail : `Feed "${feed}" failed with HTTP ${response.status}.`,
      response.status,
      payload,
    );
  }

  return payload;
}

export async function getIntelFeedPayload(options: {
  request: NextRequest;
  auth: ReadApiAccessContext;
  feed: IntelFeed | string;
  workspace: WorkspaceId;
  limit?: number;
}) {
  const feed = parseIntelFeed(options.feed);
  if (!workspaceSupportsIntelFeed(options.workspace, feed)) {
    throw new IntelGatewayError(
      options.workspace === 'global'
        ? `Feed "${feed}" is not available in the global workspace.`
        : `Feed "${feed}" is not available in the ${options.workspace} workspace.`,
      400,
    );
  }

  let payload: unknown;

  try {
    payload = feedUsesIntelService(feed)
      ? await fetchIntelServiceFeed(feed, options.workspace, options.auth)
      : await fetchLegacyFeedPayload(options.request, feed, options.workspace);
  } catch (error) {
    if (error instanceof IntelServiceError) {
      throw new IntelGatewayError(error.message, error.status, error.detail);
    }

    throw error;
  }

  if (typeof options.limit === 'number' && Number.isFinite(options.limit)) {
    return limitIntelFeedPayload(feed, payload, options.limit);
  }

  return payload;
}

export async function getIntelSnapshotPayload(options: {
  request: NextRequest;
  auth: ReadApiAccessContext;
  workspace: WorkspaceId;
  include?: readonly string[];
}) {
  if (options.workspace === 'network') {
    throw new IntelGatewayError('The network workspace does not expose public intel snapshots.', 400);
  }

  const feeds = normalizeIntelFeedList(options.include, getDefaultSnapshotFeeds(options.workspace));
  for (const feed of feeds) {
    if (!workspaceSupportsIntelFeed(options.workspace, feed)) {
      throw new IntelGatewayError(`Feed "${feed}" is not available in the ${options.workspace} workspace.`, 400);
    }
  }

  const feedResults = await Promise.all(
    feeds.map(async (feed) => [
      feed,
      await getIntelFeedPayload({
        request: options.request,
        auth: options.auth,
        feed,
        workspace: options.workspace,
      }),
    ] as const),
  );

  return {
    workspace: options.workspace,
    includedFeeds: feeds,
    fetchedAt: new Date().toISOString(),
    feeds: Object.fromEntries(feedResults),
  };
}

export async function getIntelMapPayload(options: {
  auth: ReadApiAccessContext;
  workspace: WorkspaceId;
}) {
  if (options.workspace === 'network') {
    throw new IntelGatewayError('The network workspace does not expose public map entities.', 400);
  }

  try {
    return await fetchIntelServiceMap(options.workspace, options.auth);
  } catch (error) {
    if (error instanceof IntelServiceError) {
      throw new IntelGatewayError(error.message, error.status, error.detail);
    }

    throw error;
  }
}

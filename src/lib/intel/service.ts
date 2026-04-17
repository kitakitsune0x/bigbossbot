import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';
import { APP_USER_AGENT } from '@/lib/auth/config';
import type { ApiTokenAccessContext } from '@/lib/auth/service';
import type { ReadApiAccessContext } from '@/lib/auth/session';
import type { SessionContext } from '@/types/auth';
import type { IntelFeed } from '@/lib/intel/catalog';
import type { WorkspaceId } from '@/lib/workspaces';

type IntelRequestQuery =
  | URLSearchParams
  | Record<string, string | number | boolean | null | undefined>;

type IntelServiceActor = {
  userId: string | null;
  username: string | null;
  role: 'guest' | 'member' | 'admin';
  authMethod: 'guest' | 'session' | 'api-token';
  apiTokenId: string | null;
  apiTokenName: string | null;
  apiTokenScope: string | null;
};

type IntelServiceRequestOptions = {
  auth: ReadApiAccessContext | SessionContext | ApiTokenAccessContext;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: IntelRequestQuery;
  body?: unknown;
};

export class IntelServiceError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'IntelServiceError';
    this.status = status;
    this.detail = detail;
  }
}

function isApiTokenContext(auth: ReadApiAccessContext | SessionContext | ApiTokenAccessContext): auth is ApiTokenAccessContext {
  return 'apiTokenScope' in auth;
}

function isGuestContext(auth: ReadApiAccessContext | SessionContext | ApiTokenAccessContext): auth is Extract<ReadApiAccessContext, { authMethod: 'guest' }> {
  return 'authMethod' in auth && auth.authMethod === 'guest';
}

function ensureBaseUrl(baseUrl: string) {
  try {
    return new URL(baseUrl).toString();
  } catch {
    throw new Error(`Invalid INTEL_SERVICE_URL: ${baseUrl}`);
  }
}

function getIntelServiceBaseUrl() {
  return ensureBaseUrl(process.env.INTEL_SERVICE_URL ?? 'http://127.0.0.1:8000');
}

function getIntelSharedSecret() {
  const secret = process.env.INTEL_SHARED_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'local-intel-secret';
  }

  throw new IntelServiceError('INTEL_SHARED_SECRET is not configured.', 503);
}

function buildActor(auth: ReadApiAccessContext | SessionContext | ApiTokenAccessContext): IntelServiceActor {
  if (isGuestContext(auth)) {
    return {
      userId: null,
      username: null,
      role: 'guest',
      authMethod: 'guest',
      apiTokenId: null,
      apiTokenName: null,
      apiTokenScope: null,
    };
  }

  if (isApiTokenContext(auth)) {
    return {
      userId: auth.userId,
      username: auth.username,
      role: auth.role,
      authMethod: 'api-token',
      apiTokenId: auth.apiTokenId,
      apiTokenName: auth.apiTokenName,
      apiTokenScope: auth.apiTokenScope,
    };
  }

  return {
    userId: auth.userId,
    username: auth.username,
    role: auth.role,
    authMethod: 'session',
    apiTokenId: null,
    apiTokenName: null,
    apiTokenScope: null,
  };
}

function buildQueryString(query?: IntelRequestQuery) {
  if (!query) {
    return new URLSearchParams();
  }

  if (query instanceof URLSearchParams) {
    return new URLSearchParams(query);
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }
  return searchParams;
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error('Intel service returned invalid JSON.');
  }
}

export async function intelServiceRequest<T>({
  auth,
  path,
  method = 'GET',
  query,
  body,
}: IntelServiceRequestOptions): Promise<T> {
  const baseUrl = getIntelServiceBaseUrl();
  const secret = getIntelSharedSecret();
  const url = new URL(path, baseUrl);
  const searchParams = buildQueryString(query);
  searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const actor = buildActor(auth);
  const encodedMeta = Buffer.from(JSON.stringify(actor), 'utf8').toString('base64');
  const rawBody = body === undefined ? '' : JSON.stringify(body);
  const timestamp = Date.now().toString();
  const signingInput = `${timestamp}\n${method}\n${url.pathname}\n${url.search.slice(1)}\n${encodedMeta}\n${rawBody}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('hex');

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      body: rawBody || undefined,
      headers: {
        Accept: 'application/json',
        ...(rawBody ? { 'Content-Type': 'application/json' } : {}),
        'User-Agent': APP_USER_AGENT,
        'x-bigboss-timestamp': timestamp,
        'x-bigboss-meta': encodedMeta,
        'x-bigboss-signature': signature,
      },
      cache: 'no-store',
    });
  } catch (error) {
    throw new IntelServiceError(
      error instanceof Error
        ? `Could not reach intel service at ${url.origin}: ${error.message}`
        : `Could not reach intel service at ${url.origin}.`,
      503,
    );
  }

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? ((payload as Record<string, unknown>).detail ?? (payload as Record<string, unknown>).error)
        : payload;
    throw new IntelServiceError(
      typeof detail === 'string' ? detail : `Intel service request failed with HTTP ${response.status}.`,
      response.status,
      payload,
    );
  }

  return payload as T;
}

export function fetchIntelServiceFeed(
  feed: IntelFeed,
  workspace: WorkspaceId,
  auth: ReadApiAccessContext | SessionContext | ApiTokenAccessContext,
) {
  return intelServiceRequest<unknown>({
    auth,
    path: `/internal/feed/${feed}`,
    query: { workspace },
  });
}

export function fetchIntelServiceMap(
  workspace: WorkspaceId,
  auth: ReadApiAccessContext | SessionContext | ApiTokenAccessContext,
) {
  return intelServiceRequest<unknown>({
    auth,
    path: '/internal/map',
    query: { workspace },
  });
}

export function fetchIntelNetworkStatus(auth: SessionContext | ApiTokenAccessContext) {
  return intelServiceRequest<unknown>({
    auth,
    path: '/internal/network/status',
  });
}

export function fetchIntelNetworkMessages(
  auth: SessionContext | ApiTokenAccessContext,
  query?: IntelRequestQuery,
) {
  return intelServiceRequest<unknown>({
    auth,
    path: '/internal/network/messages',
    query,
  });
}

export function sendIntelNetworkMessage(
  auth: SessionContext | ApiTokenAccessContext,
  body: unknown,
) {
  return intelServiceRequest<unknown>({
    auth,
    path: '/internal/network/messages',
    method: 'POST',
    body,
  });
}

export function fetchIntelNetworkContacts(auth: SessionContext | ApiTokenAccessContext) {
  return intelServiceRequest<unknown>({
    auth,
    path: '/internal/network/contacts',
  });
}

export function upsertIntelNetworkContact(
  auth: SessionContext | ApiTokenAccessContext,
  peerId: string,
  body: unknown,
) {
  return intelServiceRequest<unknown>({
    auth,
    path: `/internal/network/contacts/${encodeURIComponent(peerId)}`,
    method: 'PUT',
    body,
  });
}

export function deleteIntelNetworkContact(
  auth: SessionContext | ApiTokenAccessContext,
  peerId: string,
) {
  return intelServiceRequest<unknown>({
    auth,
    path: `/internal/network/contacts/${encodeURIComponent(peerId)}`,
    method: 'DELETE',
  });
}

export function fetchIntelNetworkSettings(auth: SessionContext | ApiTokenAccessContext) {
  return intelServiceRequest<unknown>({
    auth,
    path: '/internal/network/settings',
  });
}

export function updateIntelNetworkSettings(
  auth: SessionContext | ApiTokenAccessContext,
  body: unknown,
) {
  return intelServiceRequest<unknown>({
    auth,
    path: '/internal/network/settings',
    method: 'PUT',
    body,
  });
}

export function controlIntelNetwork(
  auth: SessionContext | ApiTokenAccessContext,
  action: string,
) {
  return intelServiceRequest<unknown>({
    auth,
    path: `/internal/network/control/${encodeURIComponent(action)}`,
    method: 'POST',
  });
}

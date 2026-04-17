import type { NextRequest } from 'next/server';
import { DEFAULT_THEATER, LEGACY_THEATER_ALIASES } from '@/lib/theater';

export const WORKSPACE_IDS = ['global', 'network'] as const;

export type WorkspaceId = (typeof WORKSPACE_IDS)[number];

export type WorkspaceKind = 'global' | 'network';

export type WorkspaceDefinition = {
  id: WorkspaceId;
  label: string;
  kind: WorkspaceKind;
  public: boolean;
  defaultMapView: {
    center: [number, number];
    zoom: number;
  };
  enabledPanels: string[];
  filterPreset: string;
};

export const DEFAULT_WORKSPACE: WorkspaceId = 'global';

const BASE_PANELS = [
  'news',
  'map',
  'alerts',
  'telegram',
  'markets',
  'strikes',
  'polymarket',
  'conflicts',
  'flights',
  'regional-alerts',
  'naval',
  'crypto',
  'oil',
  'satellite',
] as const;

export const WORKSPACE_DEFINITIONS: Record<WorkspaceId, WorkspaceDefinition> = {
  global: {
    id: 'global',
    label: 'Global',
    kind: 'global',
    public: true,
    defaultMapView: {
      center: [22, 12],
      zoom: 2,
    },
    enabledPanels: [...BASE_PANELS],
    filterPreset: 'global',
  },
  network: {
    id: 'network',
    label: 'Network',
    kind: 'network',
    public: false,
    defaultMapView: {
      center: [18, 12],
      zoom: 2,
    },
    enabledPanels: ['news', 'map'],
    filterPreset: 'network',
  },
};

export function parseWorkspace(value: unknown): WorkspaceId {
  if (typeof value === 'string') {
    if ((WORKSPACE_IDS as readonly string[]).includes(value)) {
      return value as WorkspaceId;
    }

    if ((LEGACY_THEATER_ALIASES as readonly string[]).includes(value)) {
      return DEFAULT_WORKSPACE;
    }
  }

  return DEFAULT_WORKSPACE;
}

export function getWorkspaceDefinition(workspace: WorkspaceId) {
  return WORKSPACE_DEFINITIONS[workspace];
}

export function getWorkspaceFromRequest(request: NextRequest): WorkspaceId {
  return parseWorkspace(
    request.nextUrl.searchParams.get('workspace')
      ?? request.nextUrl.searchParams.get('theater'),
  );
}

export function buildWorkspaceApiPath(path: string, workspace: WorkspaceId) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}workspace=${workspace}`;
}

export function workspaceSupportsLegacyTheater(_workspace: WorkspaceId): _workspace is never {
  return false;
}

export function workspaceToLegacyTheater(_workspace: WorkspaceId): typeof DEFAULT_THEATER {
  return DEFAULT_THEATER;
}

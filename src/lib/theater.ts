import type { NextRequest } from 'next/server';

export const THEATER_IDS = ['global'] as const;
export const LEGACY_THEATER_ALIASES = ['middle-east', 'ukraine'] as const;
export const THEATER_QUERY_VALUES = [...THEATER_IDS, ...LEGACY_THEATER_ALIASES] as const;

export type TheaterId = (typeof THEATER_IDS)[number];
export type LegacyTheaterAlias = (typeof LEGACY_THEATER_ALIASES)[number];

export const DEFAULT_THEATER: TheaterId = 'global';

export const THEATER_META: Record<TheaterId, {
  label: string;
  shortLabel: string;
  alertSourceLabel: string;
}> = {
  global: {
    label: 'Global',
    shortLabel: 'GLB',
    alertSourceLabel: 'Multi-source monitor',
  },
};

export function parseTheater(value: unknown): TheaterId {
  if (typeof value === 'string' && (THEATER_QUERY_VALUES as readonly string[]).includes(value)) {
    return DEFAULT_THEATER;
  }

  return DEFAULT_THEATER;
}

export function isLegacyTheaterAlias(value: unknown): value is LegacyTheaterAlias {
  return typeof value === 'string' && (LEGACY_THEATER_ALIASES as readonly string[]).includes(value);
}

export function getTheaterFromRequest(request: NextRequest): TheaterId {
  return parseTheater(request.nextUrl.searchParams.get('theater'));
}

export function buildTheaterApiPath(path: string, theater: TheaterId) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}theater=${parseTheater(theater)}`;
}

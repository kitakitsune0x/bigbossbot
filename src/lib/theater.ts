import type { NextRequest } from 'next/server';

export const THEATER_IDS = ['middle-east', 'ukraine'] as const;

export type TheaterId = (typeof THEATER_IDS)[number];

export const DEFAULT_THEATER: TheaterId = 'middle-east';

export const THEATER_META: Record<TheaterId, {
  label: string;
  shortLabel: string;
  alertSourceLabel: string;
}> = {
  'middle-east': {
    label: 'Middle East',
    shortLabel: 'ME',
    alertSourceLabel: 'Pikud HaOref',
  },
  ukraine: {
    label: 'Ukraine',
    shortLabel: 'UA',
    alertSourceLabel: 'Google News monitor',
  },
};

export function parseTheater(value: unknown): TheaterId {
  if (typeof value === 'string' && (THEATER_IDS as readonly string[]).includes(value)) {
    return value as TheaterId;
  }

  return DEFAULT_THEATER;
}

export function getTheaterFromRequest(request: NextRequest): TheaterId {
  return parseTheater(request.nextUrl.searchParams.get('theater'));
}

export function buildTheaterApiPath(path: string, theater: TheaterId) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}theater=${theater}`;
}

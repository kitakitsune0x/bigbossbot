'use client';

import { useMemo } from 'react';
import { useDashboardPreferences } from '@/components/dashboard/PreferencesProvider';
import { useDataFeed } from '@/lib/hooks';
import { buildTheaterApiPath } from '@/lib/theater';

export function useCurrentTheater() {
  const { preferences } = useDashboardPreferences();
  return preferences.theater;
}

export function useTheaterApiPath(path: string) {
  const theater = useCurrentTheater();

  return useMemo(() => buildTheaterApiPath(path, theater), [path, theater]);
}

export function useTheaterDataFeed<T>(path: string, interval = 60000, initialData: T | null = null) {
  const url = useTheaterApiPath(path);
  return useDataFeed<T>(url, interval, initialData);
}

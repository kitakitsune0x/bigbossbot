function normalizeVersion(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

export function formatBuildVersion(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

export function resolveBuildVersion(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalized = normalizeVersion(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return formatBuildVersion();
}

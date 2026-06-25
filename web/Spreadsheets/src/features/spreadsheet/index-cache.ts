const MAX_CACHED_INDEX_LISTS = 8;

const contiguousIndexCache = new Map<number, number[]>();

function normalizeCount(count: number) {
  if (!Number.isFinite(count)) {
    return 0;
  }

  return Math.max(0, Math.floor(count));
}

export function getContiguousIndexes(count: number) {
  const normalizedCount = normalizeCount(count);
  const cached = contiguousIndexCache.get(normalizedCount);

  if (cached) {
    return cached;
  }

  const indexes = Array.from(
    { length: normalizedCount },
    (_, index) => index,
  );

  contiguousIndexCache.set(normalizedCount, indexes);

  if (contiguousIndexCache.size > MAX_CACHED_INDEX_LISTS) {
    const oldestKey = contiguousIndexCache.keys().next().value;

    if (oldestKey !== undefined) {
      contiguousIndexCache.delete(oldestKey);
    }
  }

  return indexes;
}

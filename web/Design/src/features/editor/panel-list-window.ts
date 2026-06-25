export type PanelWindowResult<T> = {
  items: T[];
  hiddenCount: number;
  isWindowed: boolean;
};

export function createPanelWindow<T extends { id: string }>(
  items: T[],
  input: {
    activeIds?: string[];
    limit: number;
  },
): PanelWindowResult<T> {
  const limit = Math.max(1, Math.floor(input.limit));

  if (items.length <= limit) {
    return {
      items,
      hiddenCount: 0,
      isWindowed: false,
    };
  }

  const activeIdSet = new Set(input.activeIds ?? []);
  const includedIds = new Set<string>();

  for (const item of items.slice(0, limit)) {
    includedIds.add(item.id);
  }

  for (const item of items) {
    if (activeIdSet.has(item.id)) {
      includedIds.add(item.id);
    }
  }

  const windowedItems = items.filter((item) => includedIds.has(item.id));

  while (windowedItems.length > limit) {
    const removableIndex = findLastRemovableIndex(windowedItems, activeIdSet);

    if (removableIndex === -1) {
      windowedItems.pop();
      continue;
    }

    windowedItems.splice(removableIndex, 1);
  }

  return {
    items: windowedItems,
    hiddenCount: Math.max(0, items.length - windowedItems.length),
    isWindowed: true,
  };
}

function findLastRemovableIndex<T extends { id: string }>(
  items: T[],
  activeIdSet: Set<string>,
) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!activeIdSet.has(items[index]?.id ?? "")) return index;
  }

  return -1;
}

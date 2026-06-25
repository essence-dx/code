import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { SheetData, SheetOutlineGroup } from "@/features/workbooks/types";

const MAX_OUTLINE_LEVEL = 8;

function id() {
  return `outline_${crypto.randomUUID()}`;
}

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
) {
  return !(leftEnd < rightStart || leftStart > rightEnd);
}

function nextOutlineLevel(
  groups: SheetOutlineGroup[],
  startIndex: number,
  endIndex: number,
) {
  const overlappingLevel = groups.reduce((level, group) => {
    if (!rangesOverlap(startIndex, endIndex, group.startIndex, group.endIndex)) {
      return level;
    }

    return Math.max(level, group.level);
  }, 0);

  return Math.min(overlappingLevel + 1, MAX_OUTLINE_LEVEL);
}

function createOutlineGroup(
  groups: SheetOutlineGroup[],
  startIndex: number,
  endIndex: number,
): SheetOutlineGroup | null {
  if (endIndex <= startIndex) {
    return null;
  }

  const existing = groups.find(
    (group) => group.startIndex === startIndex && group.endIndex === endIndex,
  );

  if (existing) {
    return {
      ...existing,
      collapsed: false,
    };
  }

  return {
    id: id(),
    startIndex,
    endIndex,
    level: nextOutlineLevel(groups, startIndex, endIndex),
    collapsed: false,
  };
}

function sortOutlineGroups(groups: SheetOutlineGroup[]) {
  return [...groups].sort((left, right) => {
    if (left.startIndex !== right.startIndex) {
      return left.startIndex - right.startIndex;
    }

    if (left.endIndex !== right.endIndex) {
      return left.endIndex - right.endIndex;
    }

    return left.level - right.level;
  });
}

export function groupRowsForRange(sheet: SheetData, range: CellRange) {
  const group = createOutlineGroup(
    sheet.rowGroups ?? [],
    range.startRowIndex,
    range.endRowIndex,
  );

  if (!group) {
    return;
  }

  sheet.rowGroups = sortOutlineGroups([
    ...(sheet.rowGroups ?? []).filter((item) => item.id !== group.id),
    group,
  ]);
}

export function groupColumnsForRange(sheet: SheetData, range: CellRange) {
  const group = createOutlineGroup(
    sheet.columnGroups ?? [],
    range.startColumnIndex,
    range.endColumnIndex,
  );

  if (!group) {
    return;
  }

  sheet.columnGroups = sortOutlineGroups([
    ...(sheet.columnGroups ?? []).filter((item) => item.id !== group.id),
    group,
  ]);
}

export function ungroupOutlineForRange(sheet: SheetData, range: CellRange) {
  sheet.rowGroups = (sheet.rowGroups ?? []).filter(
    (group) =>
      !rangesOverlap(
        group.startIndex,
        group.endIndex,
        range.startRowIndex,
        range.endRowIndex,
      ),
  );
  sheet.columnGroups = (sheet.columnGroups ?? []).filter(
    (group) =>
      !rangesOverlap(
        group.startIndex,
        group.endIndex,
        range.startColumnIndex,
        range.endColumnIndex,
      ),
  );
}

export function toggleRowGroupCollapsed(sheet: SheetData, groupId: string) {
  sheet.rowGroups = (sheet.rowGroups ?? []).map((group) =>
    group.id === groupId ? { ...group, collapsed: !group.collapsed } : group,
  );
}

export function toggleColumnGroupCollapsed(sheet: SheetData, groupId: string) {
  sheet.columnGroups = (sheet.columnGroups ?? []).map((group) =>
    group.id === groupId ? { ...group, collapsed: !group.collapsed } : group,
  );
}

export function shiftOutlineGroupsForInsertedIndexes(
  groups: SheetOutlineGroup[],
  insertAt: number,
  count: number,
  maxCount: number,
) {
  return sortOutlineGroups(
    groups.map((group) => {
      if (group.startIndex >= insertAt) {
        return clampOutlineGroup(
          {
            ...group,
            startIndex: group.startIndex + count,
            endIndex: group.endIndex + count,
          },
          maxCount,
        );
      }

      if (group.endIndex >= insertAt) {
        return clampOutlineGroup(
          {
            ...group,
            endIndex: group.endIndex + count,
          },
          maxCount,
        );
      }

      return group;
    }),
  );
}

export function shiftOutlineGroupsForDeletedIndexes(
  groups: SheetOutlineGroup[],
  deleteStart: number,
  deleteEnd: number,
  count: number,
  maxCount: number,
) {
  return sortOutlineGroups(
    groups
      .map((group) => {
        if (group.endIndex < deleteStart) {
          return group;
        }

        if (group.startIndex > deleteEnd) {
          return clampOutlineGroup(
            {
              ...group,
              startIndex: group.startIndex - count,
              endIndex: group.endIndex - count,
            },
            maxCount,
          );
        }

        if (group.startIndex >= deleteStart && group.endIndex <= deleteEnd) {
          return null;
        }

        if (group.startIndex < deleteStart && group.endIndex > deleteEnd) {
          return clampOutlineGroup(
            {
              ...group,
              endIndex: group.endIndex - count,
            },
            maxCount,
          );
        }

        if (group.startIndex < deleteStart) {
          return clampOutlineGroup(
            {
              ...group,
              endIndex: deleteStart - 1,
            },
            maxCount,
          );
        }

        return clampOutlineGroup(
          {
            ...group,
            startIndex: deleteStart,
            endIndex: group.endIndex - count,
          },
          maxCount,
        );
      })
      .filter((group): group is SheetOutlineGroup =>
        Boolean(group && group.endIndex > group.startIndex),
      ),
  );
}

function clampOutlineGroup(group: SheetOutlineGroup, maxCount: number) {
  const endLimit = Math.max(0, maxCount - 1);
  const startIndex = Math.min(Math.max(group.startIndex, 0), endLimit);
  const endIndex = Math.min(Math.max(group.endIndex, startIndex), endLimit);

  return {
    ...group,
    startIndex,
    endIndex,
  };
}

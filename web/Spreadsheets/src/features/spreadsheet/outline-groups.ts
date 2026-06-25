import type {
  SheetData,
  SheetOutlineGroup,
} from "@/features/workbooks/types";

export type SheetOutlineAxis = "row" | "column";

export function getOutlineGroupsForAxis(
  sheet: SheetData,
  axis: SheetOutlineAxis,
) {
  return axis === "row" ? sheet.rowGroups : sheet.columnGroups;
}

export function getCollapsedOutlineIndexes(groups: SheetOutlineGroup[]) {
  const indexes = new Set<number>();

  for (const group of groups) {
    if (!group.collapsed) {
      continue;
    }

    for (let index = group.startIndex + 1; index <= group.endIndex; index += 1) {
      indexes.add(index);
    }
  }

  return indexes;
}

export function getEffectiveHiddenRows(sheet: SheetData) {
  return new Set([
    ...(sheet.hiddenRows ?? []),
    ...getCollapsedOutlineIndexes(sheet.rowGroups ?? []),
  ]);
}

export function getEffectiveHiddenColumns(sheet: SheetData) {
  return new Set([
    ...(sheet.hiddenColumns ?? []),
    ...getCollapsedOutlineIndexes(sheet.columnGroups ?? []),
  ]);
}

export function getOutlineGroupStartingAt(
  groups: SheetOutlineGroup[],
  index: number,
) {
  return (
    [...groups]
      .filter((group) => group.startIndex === index)
      .sort((left, right) => {
        if (left.level !== right.level) {
          return right.level - left.level;
        }

        return right.endIndex - left.endIndex;
      })[0] ?? null
  );
}

import { columnLabel, parseCellKey } from "@/features/workbooks/addresses";
import {
  getEffectiveHiddenColumns,
  getEffectiveHiddenRows,
} from "@/features/spreadsheet/outline-groups";
import { getNamedRangeAreas } from "@/features/spreadsheet/multi-range-selection";
import { nearestVisibleIndex } from "@/features/spreadsheet/state/selection-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  ChartRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type GoToSpecialTarget = {
  id: string;
  label: string;
  description: string;
  count: number;
  sheetId: string;
  range: ChartRange;
};

function normalizeReference(value: string) {
  return value.trim().replace(/\$/g, "");
}

function normalizeSheetName(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }

  return trimmed;
}

function getSheetByName(document: WorkbookDocument, sheetName: string) {
  const normalizedName = normalizeSheetName(sheetName).toLowerCase();

  return (
    document.sheets.find((sheet) => sheet.name.toLowerCase() === normalizedName) ??
    null
  );
}

function splitSheetReference(value: string) {
  const trimmed = value.trim();
  let inQuotedSheet = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];

    if (character === "'") {
      if (trimmed[index + 1] === "'") {
        index += 1;
        continue;
      }

      inQuotedSheet = !inQuotedSheet;
      continue;
    }

    if (character === "!" && !inQuotedSheet) {
      return {
        sheetName: trimmed.slice(0, index),
        reference: trimmed.slice(index + 1),
      };
    }
  }

  return { sheetName: "", reference: trimmed };
}

function normalizeRange(start: NonNullable<ReturnType<typeof parseCellKey>>, end = start) {
  return {
    startRowIndex: Math.min(start.rowIndex, end.rowIndex),
    startColumnIndex: Math.min(start.columnIndex, end.columnIndex),
    endRowIndex: Math.max(start.rowIndex, end.rowIndex),
    endColumnIndex: Math.max(start.columnIndex, end.columnIndex),
  };
}

function parseCellRange(reference: string, sheet: SheetData) {
  const [startReference, endReference = startReference] = normalizeReference(
    reference,
  ).split(":");
  const start = parseCellKey(startReference);
  const end = parseCellKey(endReference);

  if (!start || !end) {
    return null;
  }

  const range = normalizeRange(start, end);

  if (
    range.startRowIndex < 0 ||
    range.startColumnIndex < 0 ||
    range.startRowIndex >= sheet.rowCount ||
    range.startColumnIndex >= sheet.columnCount
  ) {
    return null;
  }

  return {
    ...range,
    endRowIndex: Math.min(range.endRowIndex, sheet.rowCount - 1),
    endColumnIndex: Math.min(range.endColumnIndex, sheet.columnCount - 1),
  } satisfies CellRange;
}

export function resolveGoToReference({
  document,
  activeSheetId,
  input,
}: {
  document: WorkbookDocument;
  activeSheetId: string;
  input: string;
}) {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return null;
  }

  const namedRange = document.namedRanges.find(
    (range) => range.name.toLowerCase() === trimmedInput.toLowerCase(),
  );

  if (namedRange) {
    return {
      sheetId: namedRange.sheetId,
      range: getNamedRangeAreas(namedRange)[0] ?? namedRange.range,
    };
  }

  const { sheetName, reference } = splitSheetReference(trimmedInput);
  const sheet = sheetName
    ? getSheetByName(document, sheetName)
    : (document.sheets.find((item) => item.id === activeSheetId) ??
      document.sheets[0]);

  if (!sheet) {
    return null;
  }

  const range = parseCellRange(reference, sheet);

  return range ? { sheetId: sheet.id, range } : null;
}

function rangeFromFirstCell(sheet: SheetData, keys: string[]) {
  for (const key of keys) {
    const position = parseCellKey(key);

    if (position) {
      return normalizeRange(position);
    }
  }

  return null;
}

function visibleAnchorForHiddenRow(sheet: SheetData, rowIndex: number) {
  return {
    startRowIndex: nearestVisibleIndex(
      rowIndex,
      sheet.rowCount,
      Array.from(getEffectiveHiddenRows(sheet)),
    ),
    startColumnIndex: 0,
    endRowIndex: nearestVisibleIndex(
      rowIndex,
      sheet.rowCount,
      Array.from(getEffectiveHiddenRows(sheet)),
    ),
    endColumnIndex: 0,
  };
}

function visibleAnchorForHiddenColumn(sheet: SheetData, columnIndex: number) {
  return {
    startRowIndex: 0,
    startColumnIndex: nearestVisibleIndex(
      columnIndex,
      sheet.columnCount,
      Array.from(getEffectiveHiddenColumns(sheet)),
    ),
    endRowIndex: 0,
    endColumnIndex: nearestVisibleIndex(
      columnIndex,
      sheet.columnCount,
      Array.from(getEffectiveHiddenColumns(sheet)),
    ),
  };
}

function addTarget(
  targets: GoToSpecialTarget[],
  target: GoToSpecialTarget | null,
) {
  if (target && target.count > 0) {
    targets.push(target);
  }
}

export function getGoToSpecialTargets(document: WorkbookDocument) {
  const targets: GoToSpecialTarget[] = [];

  for (const sheet of document.sheets) {
    const formulaKeys = Object.entries(sheet.cells)
      .filter(([, cell]) => cell.raw.trimStart().startsWith("="))
      .map(([key]) => key);
    const hiddenRows = Array.from(getEffectiveHiddenRows(sheet)).sort(
      (left, right) => left - right,
    );
    const hiddenColumns = Array.from(getEffectiveHiddenColumns(sheet)).sort(
      (left, right) => left - right,
    );
    const noteKeys = document.cellNotes
      .filter((note) => note.sheetId === sheet.id)
      .map((note) => note.cellKey);
    const linkKeys = document.cellLinks
      .filter((link) => link.sheetId === sheet.id)
      .map((link) => link.cellKey);

    addTarget(targets, {
      id: `${sheet.id}:formulas`,
      label: `${sheet.name} formulas`,
      description: `${formulaKeys.length} formula cell${formulaKeys.length === 1 ? "" : "s"}`,
      count: formulaKeys.length,
      sheetId: sheet.id,
      range: rangeFromFirstCell(sheet, formulaKeys) ?? {
        startRowIndex: 0,
        startColumnIndex: 0,
        endRowIndex: 0,
        endColumnIndex: 0,
      },
    });
    addTarget(targets, {
      id: `${sheet.id}:notes`,
      label: `${sheet.name} notes`,
      description: `${noteKeys.length} noted cell${noteKeys.length === 1 ? "" : "s"}`,
      count: noteKeys.length,
      sheetId: sheet.id,
      range: rangeFromFirstCell(sheet, noteKeys) ?? {
        startRowIndex: 0,
        startColumnIndex: 0,
        endRowIndex: 0,
        endColumnIndex: 0,
      },
    });
    addTarget(targets, {
      id: `${sheet.id}:links`,
      label: `${sheet.name} links`,
      description: `${linkKeys.length} linked cell${linkKeys.length === 1 ? "" : "s"}`,
      count: linkKeys.length,
      sheetId: sheet.id,
      range: rangeFromFirstCell(sheet, linkKeys) ?? {
        startRowIndex: 0,
        startColumnIndex: 0,
        endRowIndex: 0,
        endColumnIndex: 0,
      },
    });

    if (hiddenRows[0] !== undefined) {
      addTarget(targets, {
        id: `${sheet.id}:hidden-rows`,
        label: `${sheet.name} hidden rows`,
        description: `${hiddenRows.length} hidden row${hiddenRows.length === 1 ? "" : "s"}, first at ${hiddenRows[0] + 1}`,
        count: hiddenRows.length,
        sheetId: sheet.id,
        range: visibleAnchorForHiddenRow(sheet, hiddenRows[0]),
      });
    }

    if (hiddenColumns[0] !== undefined) {
      addTarget(targets, {
        id: `${sheet.id}:hidden-columns`,
        label: `${sheet.name} hidden columns`,
        description: `${hiddenColumns.length} hidden column${hiddenColumns.length === 1 ? "" : "s"}, first at ${columnLabel(hiddenColumns[0])}`,
        count: hiddenColumns.length,
        sheetId: sheet.id,
        range: visibleAnchorForHiddenColumn(sheet, hiddenColumns[0]),
      });
    }
  }

  return targets;
}

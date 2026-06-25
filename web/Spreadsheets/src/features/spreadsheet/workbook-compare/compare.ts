import { parseCellKey } from "@/features/workbooks/addresses";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import type {
  CellRecord,
  ChartDefinition,
  SheetData,
  TableDefinition,
  WorkbookDocument,
} from "@/features/workbooks/types";
import {
  metadataFields,
  sheetFields,
  type WorkbookCompareCategory,
  type WorkbookCompareItem,
  type WorkbookCompareResult,
  type WorkbookCompareStatus,
  type WorkbookCompareSummary,
} from "@/features/spreadsheet/workbook-compare/types";
import {
  emptySummary,
  getCellRange,
  hasFormula,
  makeId,
  normalizeName,
  previewValue,
  recordCompareItem,
  scopedObjectKey,
  stableJson,
} from "@/features/spreadsheet/workbook-compare/utils";

type SheetMatch = {
  base?: SheetData;
  incoming?: SheetData;
};

function getSheetMatches(base: WorkbookDocument, incoming: WorkbookDocument) {
  const baseById = new Map(base.sheets.map((sheet) => [sheet.id, sheet]));
  const baseByName = new Map(
    base.sheets.map((sheet) => [normalizeName(sheet.name), sheet]),
  );
  const usedBaseIds = new Set<string>();
  const matches: SheetMatch[] = [];

  for (const incomingSheet of incoming.sheets) {
    const match =
      baseById.get(incomingSheet.id) ??
      baseByName.get(normalizeName(incomingSheet.name));

    if (match && !usedBaseIds.has(match.id)) {
      usedBaseIds.add(match.id);
      matches.push({ base: match, incoming: incomingSheet });
    } else {
      matches.push({ incoming: incomingSheet });
    }
  }

  for (const baseSheet of base.sheets) {
    if (!usedBaseIds.has(baseSheet.id)) {
      matches.push({ base: baseSheet });
    }
  }

  return matches;
}

function compareMetadata({
  base,
  incoming,
  items,
  maxItems,
  summary,
}: {
  base: WorkbookDocument;
  incoming: WorkbookDocument;
  items: WorkbookCompareItem[];
  maxItems: number;
  summary: WorkbookCompareSummary;
}) {
  for (const field of metadataFields) {
    const baseValue = base.metadata[field];
    const incomingValue = incoming.metadata[field];

    if (stableJson(baseValue) === stableJson(incomingValue)) {
      continue;
    }

    recordCompareItem({
      item: {
        id: makeId(["metadata", field]),
        category: "metadata",
        status: "changed",
        title: `Workbook ${field} changed`,
        details: "The incoming workbook has a different workbook metadata value.",
        baseValue: previewValue(baseValue),
        incomingValue: previewValue(incomingValue),
        merge: { kind: "metadata", field },
      },
      items,
      maxItems,
      summary,
    });
  }
}

function compareSheets({
  items,
  matches,
  maxItems,
  summary,
}: {
  items: WorkbookCompareItem[];
  matches: SheetMatch[];
  maxItems: number;
  summary: WorkbookCompareSummary;
}) {
  for (const match of matches) {
    if (!match.base && match.incoming) {
      recordCompareItem({
        item: {
          id: makeId(["sheet", "added", match.incoming.id]),
          category: "sheet",
          status: "added",
          title: `Sheet added: ${match.incoming.name}`,
          details:
            "The incoming workbook contains a sheet that is not in the current workbook.",
          incomingValue: `${match.incoming.rowCount} rows x ${match.incoming.columnCount} columns`,
          merge: {
            kind: "sheet",
            action: "add",
            incomingSheetId: match.incoming.id,
          },
        },
        items,
        maxItems,
        summary,
      });
      continue;
    }

    if (match.base && !match.incoming) {
      recordCompareItem({
        item: {
          id: makeId(["sheet", "removed", match.base.id]),
          category: "sheet",
          status: "removed",
          title: `Sheet removed: ${match.base.name}`,
          details: "The incoming workbook does not contain this current sheet.",
          sheetId: match.base.id,
          sheetName: match.base.name,
          baseValue: `${match.base.rowCount} rows x ${match.base.columnCount} columns`,
          merge: {
            kind: "sheet",
            action: "remove",
            baseSheetId: match.base.id,
          },
        },
        items,
        maxItems,
        summary,
      });
      continue;
    }

    if (!match.base || !match.incoming) {
      continue;
    }

    for (const field of sheetFields) {
      const baseValue = match.base[field];
      const incomingValue = match.incoming[field];

      if (stableJson(baseValue) === stableJson(incomingValue)) {
        continue;
      }

      recordCompareItem({
        item: {
          id: makeId(["sheet", match.base.id, field]),
          category: "sheet",
          status: "changed",
          title: `${match.base.name} ${field} changed`,
          details: "The incoming workbook has different sheet-level settings.",
          sheetId: match.base.id,
          sheetName: match.base.name,
          baseValue: previewValue(baseValue),
          incomingValue: previewValue(incomingValue),
          merge: {
            kind: "sheetProperty",
            baseSheetId: match.base.id,
            field,
            incomingSheetId: match.incoming.id,
          },
        },
        items,
        maxItems,
        summary,
      });
    }
  }
}

function compareCells({
  items,
  matches,
  maxItems,
  summary,
}: {
  items: WorkbookCompareItem[];
  matches: SheetMatch[];
  maxItems: number;
  summary: WorkbookCompareSummary;
}) {
  for (const match of matches) {
    if (!match.base || !match.incoming) {
      continue;
    }

    const keys = Array.from(
      new Set([
        ...Object.keys(match.base.cells),
        ...Object.keys(match.incoming.cells),
      ]),
    ).sort((left, right) => {
      const leftPosition = parseCellKey(left);
      const rightPosition = parseCellKey(right);

      if (!leftPosition || !rightPosition) {
        return left.localeCompare(right);
      }

      return (
        leftPosition.rowIndex - rightPosition.rowIndex ||
        leftPosition.columnIndex - rightPosition.columnIndex
      );
    });

    for (const key of keys) {
      const baseCell = match.base.cells[key];
      const incomingCell = match.incoming.cells[key];

      if (stableJson(baseCell) === stableJson(incomingCell)) {
        continue;
      }

      const category: WorkbookCompareCategory =
        hasFormula(baseCell as CellRecord | undefined) ||
        hasFormula(incomingCell as CellRecord | undefined)
          ? "formula"
          : "cell";
      const status: WorkbookCompareStatus = baseCell
        ? incomingCell
          ? "changed"
          : "removed"
        : "added";

      recordCompareItem({
        item: {
          id: makeId([category, match.base.id, key]),
          category,
          status,
          title: `${match.base.name}!${key} ${status}`,
          details:
            category === "formula"
              ? "The formula or formula formatting differs in the incoming workbook."
              : "The cell value or formatting differs in the incoming workbook.",
          sheetId: match.base.id,
          sheetName: match.base.name,
          cellKey: key,
          range: getCellRange(key),
          baseValue: previewValue(baseCell?.raw),
          incomingValue: previewValue(incomingCell?.raw),
          merge: {
            kind: "cell",
            baseSheetId: match.base.id,
            cellKey: key,
            incomingSheetId: match.incoming.id,
          },
        },
        items,
        maxItems,
        summary,
      });
    }
  }
}

function compareCollections<T extends { id: string; sheetId: string }>({
  baseDocument,
  category,
  collection,
  getLabel,
  getSignature,
  incomingDocument,
  items,
  maxItems,
  summary,
}: {
  baseDocument: WorkbookDocument;
  category: "chart" | "table";
  collection: "charts" | "tables";
  getLabel: (item: T) => string;
  getSignature: (item: T) => unknown;
  incomingDocument: WorkbookDocument;
  items: WorkbookCompareItem[];
  maxItems: number;
  summary: WorkbookCompareSummary;
}) {
  const baseItems = baseDocument[collection] as unknown as T[];
  const incomingItems = incomingDocument[collection] as unknown as T[];
  const baseSheets = new Map(baseDocument.sheets.map((sheet) => [sheet.id, sheet]));
  const incomingSheets = new Map(
    incomingDocument.sheets.map((sheet) => [sheet.id, sheet]),
  );
  const baseById = new Map(baseItems.map((item) => [item.id, item]));
  const baseByScopedName = new Map(
    baseItems.map((item) => [
      scopedObjectKey(baseSheets.get(item.sheetId)?.name ?? "", getLabel(item)),
      item,
    ]),
  );
  const usedBaseIds = new Set<string>();

  for (const incomingItem of incomingItems) {
    const incomingSheet = incomingSheets.get(incomingItem.sheetId);
    const incomingScopedKey = scopedObjectKey(
      incomingSheet?.name ?? "",
      getLabel(incomingItem),
    );
    const baseItem =
      baseById.get(incomingItem.id) ?? baseByScopedName.get(incomingScopedKey);
    const baseSheet = baseItem ? baseSheets.get(baseItem.sheetId) : null;

    if (!baseItem || usedBaseIds.has(baseItem.id)) {
      recordCompareItem({
        item: {
          id: makeId([category, "added", incomingItem.id]),
          category,
          status: "added",
          title: `${category === "table" ? "Table" : "Chart"} added: ${getLabel(incomingItem)}`,
          details:
            "The incoming workbook contains this object and the current workbook does not.",
          sheetName: incomingSheet?.name,
          incomingValue: previewValue(getSignature(incomingItem)),
          merge: {
            kind: "collection",
            action: "add",
            collection,
            incomingId: incomingItem.id,
          },
        },
        items,
        maxItems,
        summary,
      });
      continue;
    }

    usedBaseIds.add(baseItem.id);

    if (stableJson(getSignature(baseItem)) !== stableJson(getSignature(incomingItem))) {
      recordCompareItem({
        item: {
          id: makeId([category, "changed", baseItem.id, incomingItem.id]),
          category,
          status: "changed",
          title: `${category === "table" ? "Table" : "Chart"} changed: ${getLabel(baseItem)}`,
          details: "The incoming workbook has different object settings.",
          sheetId: baseItem.sheetId,
          sheetName: baseSheet?.name,
          baseValue: previewValue(getSignature(baseItem)),
          incomingValue: previewValue(getSignature(incomingItem)),
          merge: {
            kind: "collection",
            action: "replace",
            baseId: baseItem.id,
            collection,
            incomingId: incomingItem.id,
          },
        },
        items,
        maxItems,
        summary,
      });
    }
  }

  for (const baseItem of baseItems) {
    if (usedBaseIds.has(baseItem.id)) {
      continue;
    }

    const sheet = baseSheets.get(baseItem.sheetId);

    recordCompareItem({
      item: {
        id: makeId([category, "removed", baseItem.id]),
        category,
        status: "removed",
        title: `${category === "table" ? "Table" : "Chart"} removed: ${getLabel(baseItem)}`,
        details: "The incoming workbook does not contain this current object.",
        sheetId: baseItem.sheetId,
        sheetName: sheet?.name,
        baseValue: previewValue(getSignature(baseItem)),
        merge: {
          kind: "collection",
          action: "remove",
          baseId: baseItem.id,
          collection,
        },
      },
      items,
      maxItems,
      summary,
    });
  }
}

export function compareWorkbookDocuments({
  base,
  incoming,
  incomingName = "Incoming workbook",
  maxItems = 400,
}: {
  base: WorkbookDocument;
  incoming: WorkbookDocument;
  incomingName?: string;
  maxItems?: number;
}): WorkbookCompareResult {
  const normalizedBase = normalizeWorkbookDocument(base);
  const normalizedIncoming = normalizeWorkbookDocument(incoming);
  const items: WorkbookCompareItem[] = [];
  const summary = emptySummary();
  const matches = getSheetMatches(normalizedBase, normalizedIncoming);

  compareMetadata({
    base: normalizedBase,
    incoming: normalizedIncoming,
    items,
    maxItems,
    summary,
  });
  compareSheets({ items, matches, maxItems, summary });
  compareCells({ items, matches, maxItems, summary });
  compareCollections<TableDefinition>({
    baseDocument: normalizedBase,
    category: "table",
    collection: "tables",
    getLabel: (table) => table.name,
    getSignature: (table) => ({
      name: table.name,
      range: table.range,
      sheetId: table.sheetId,
      showFilterButtons: table.showFilterButtons,
      showHeaderRow: table.showHeaderRow,
      showTotalsRow: table.showTotalsRow,
      style: table.style,
    }),
    incomingDocument: normalizedIncoming,
    items,
    maxItems,
    summary,
  });
  compareCollections<ChartDefinition>({
    baseDocument: normalizedBase,
    category: "chart",
    collection: "charts",
    getLabel: (chart) => chart.title,
    getSignature: (chart) => ({
      format: chart.format,
      anchor: chart.anchor,
      range: chart.range,
      sheetId: chart.sheetId,
      showAxes: chart.showAxes,
      showDataLabels: chart.showDataLabels,
      showLegend: chart.showLegend,
      sourcePivotTableId: chart.sourcePivotTableId,
      template: chart.template,
      title: chart.title,
      type: chart.type,
    }),
    incomingDocument: normalizedIncoming,
    items,
    maxItems,
    summary,
  });

  return {
    incomingName,
    items,
    summary,
  };
}

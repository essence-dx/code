import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import type {
  ChartDefinition,
  TableDefinition,
  WorkbookDocument,
} from "@/features/workbooks/types";
import { compareWorkbookDocuments } from "@/features/spreadsheet/workbook-compare/compare";
import type { WorkbookCompareMergeTarget } from "@/features/spreadsheet/workbook-compare/types";
import {
  clone,
  makeUniqueId,
  makeUniqueSheetName,
  mapIncomingSheetId,
} from "@/features/spreadsheet/workbook-compare/utils";

function applyCollectionMerge({
  base,
  incoming,
  merge,
}: {
  base: WorkbookDocument;
  incoming: WorkbookDocument;
  merge: Extract<WorkbookCompareMergeTarget, { kind: "collection" }>;
}) {
  const collection = base[merge.collection] as Array<
    ChartDefinition | TableDefinition
  >;
  const incomingCollection = incoming[merge.collection] as Array<
    ChartDefinition | TableDefinition
  >;

  if (merge.action === "remove" && merge.baseId) {
    base[merge.collection] = collection.filter(
      (item) => item.id !== merge.baseId,
    ) as never;
    return;
  }

  if (!merge.incomingId) {
    return;
  }

  const incomingItem = incomingCollection.find(
    (item) => item.id === merge.incomingId,
  );

  if (!incomingItem) {
    return;
  }

  const existingIds = new Set(collection.map((item) => item.id));
  const nextItem = {
    ...clone(incomingItem),
    id:
      merge.action === "replace" && merge.baseId
        ? merge.baseId
        : makeUniqueId(existingIds, incomingItem.id, merge.collection),
    sheetId: mapIncomingSheetId({
      base,
      incoming,
      incomingSheetId: incomingItem.sheetId,
    }),
  };

  if (!base.sheets.some((sheet) => sheet.id === nextItem.sheetId)) {
    return;
  }

  if (merge.action === "replace" && merge.baseId) {
    base[merge.collection] = collection.map((item) =>
      item.id === merge.baseId ? nextItem : item,
    ) as never;
    return;
  }

  base[merge.collection] = [...collection, nextItem] as never;
}

export function mergeWorkbookCompareItems({
  base,
  incoming,
  itemIds,
}: {
  base: WorkbookDocument;
  incoming: WorkbookDocument;
  itemIds: string[];
}) {
  const selectedIds = new Set(itemIds);
  const output = normalizeWorkbookDocument(clone(base));
  const normalizedIncoming = normalizeWorkbookDocument(incoming);
  const comparison = compareWorkbookDocuments({
    base: output,
    incoming: normalizedIncoming,
    maxItems: Number.POSITIVE_INFINITY,
  });
  const sheetIds = new Set(output.sheets.map((sheet) => sheet.id));

  for (const item of comparison.items) {
    if (!selectedIds.has(item.id) || !item.merge) {
      continue;
    }

    const merge = item.merge;

    if (merge.kind === "metadata") {
      output.metadata[merge.field] = clone(
        normalizedIncoming.metadata[merge.field],
      ) as never;
      continue;
    }

    if (merge.kind === "sheet") {
      if (merge.action === "remove" && merge.baseSheetId) {
        if (output.sheets.length <= 1) {
          continue;
        }

        output.sheets = output.sheets.filter(
          (sheet) => sheet.id !== merge.baseSheetId,
        );
        output.charts = output.charts.filter(
          (chart) => chart.sheetId !== merge.baseSheetId,
        );
        output.tables = output.tables.filter(
          (table) => table.sheetId !== merge.baseSheetId,
        );

        if (output.activeSheetId === merge.baseSheetId) {
          output.activeSheetId = output.sheets[0]?.id ?? "";
        }
      } else if (merge.action === "add" && merge.incomingSheetId) {
        const incomingSheet = normalizedIncoming.sheets.find(
          (sheet) => sheet.id === merge.incomingSheetId,
        );

        if (!incomingSheet) {
          continue;
        }

        const nextSheet = clone(incomingSheet);

        nextSheet.id = makeUniqueId(sheetIds, nextSheet.id, "sheet");
        nextSheet.name = makeUniqueSheetName(output.sheets, nextSheet.name);
        output.sheets.push(nextSheet);
      }
      continue;
    }

    if (merge.kind === "sheetProperty") {
      const outputSheet = output.sheets.find(
        (sheet) => sheet.id === merge.baseSheetId,
      );
      const incomingSheet = normalizedIncoming.sheets.find(
        (sheet) => sheet.id === merge.incomingSheetId,
      );

      if (!outputSheet || !incomingSheet) {
        continue;
      }

      outputSheet[merge.field] = clone(incomingSheet[merge.field]) as never;
      continue;
    }

    if (merge.kind === "cell") {
      const outputSheet = output.sheets.find(
        (sheet) => sheet.id === merge.baseSheetId,
      );
      const incomingSheet = normalizedIncoming.sheets.find(
        (sheet) => sheet.id === merge.incomingSheetId,
      );

      if (!outputSheet || !incomingSheet) {
        continue;
      }

      const incomingCell = incomingSheet.cells[merge.cellKey];

      if (incomingCell) {
        outputSheet.cells[merge.cellKey] = clone(incomingCell);
      } else {
        delete outputSheet.cells[merge.cellKey];
      }
      continue;
    }

    applyCollectionMerge({
      base: output,
      incoming: normalizedIncoming,
      merge,
    });
  }

  return normalizeWorkbookDocument(output);
}

import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import {
  getFormulaReferences,
  type FormulaReference,
} from "@/features/spreadsheet/formula-audit";
import { rewriteWorkbookCustomFunctions } from "@/features/spreadsheet/custom-function-evaluation";
import { getNamedRangeAreas } from "@/features/spreadsheet/multi-range-selection";
import { isDynamicArrayFormula } from "@/features/spreadsheet/dynamic-arrays";
import type {
  ChartRange,
  CellRecord,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type WorkbookRecalculationPlan =
  | {
      dirtyCellCount: number;
      kind: "full";
      reason: string;
      targetKeys: null;
    }
  | {
      dirtyCellCount: number;
      kind: "incremental";
      reason: string;
      targetKeys: string[];
    };

export type WorkbookCellId = `${string}!${string}`;

export type FormulaTraceCell = {
  id: WorkbookCellId;
  sheetId: string;
  sheetName: string;
  key: string;
  address: string;
  range: ChartRange;
};

export type CircularReferenceIssue = {
  id: string;
  sheetId: string;
  sheetName: string;
  key: string;
  address: string;
  range: ChartRange;
  cycle: FormulaTraceCell[];
};

type WorkbookDependencyGraph = {
  dependentsByCell: Map<WorkbookCellId, Set<WorkbookCellId>>;
  formulaCellIds: Set<WorkbookCellId>;
  precedentsByCell: Map<WorkbookCellId, Set<WorkbookCellId>>;
};

const MAX_RANGE_DEPENDENCY_CELLS = 25000;

export function createWorkbookRecalculationPlan({
  activeSheetId,
  document,
  previousDocument,
  previousValues,
}: {
  activeSheetId: string;
  document: WorkbookDocument;
  previousDocument: WorkbookDocument | null;
  previousValues: Record<string, string> | null;
}): WorkbookRecalculationPlan {
  if (!previousDocument || !previousValues) {
    return createFullPlan("initial calculation");
  }

  if (previousDocument.activeSheetId !== document.activeSheetId) {
    return createFullPlan("active sheet changed");
  }

  if (
    getWorkbookStructureSignature(previousDocument) !==
    getWorkbookStructureSignature(document)
  ) {
    return createFullPlan("workbook structure changed");
  }

  const previousActiveSheet = getSheet(previousDocument, activeSheetId);
  const activeSheet = getSheet(document, activeSheetId);

  if (!previousActiveSheet || !activeSheet) {
    return createFullPlan("active sheet unavailable");
  }

  if (
    hasDynamicArrayFormula(previousActiveSheet) ||
    hasDynamicArrayFormula(activeSheet)
  ) {
    return createFullPlan("dynamic array spill ranges require full calculation");
  }

  const changedCellIds = getChangedWorkbookCellIds(previousDocument, document);

  if (changedCellIds.size === 0) {
    return {
      dirtyCellCount: 0,
      kind: "incremental",
      reason: "no cell changes",
      targetKeys: [],
    };
  }

  const graph = buildWorkbookDependencyGraph(document);
  const dirtyCellIds = getDirtyWorkbookCellIds(graph, changedCellIds);
  const targetKeys = getActiveSheetTargetKeys(dirtyCellIds, activeSheetId);

  return {
    dirtyCellCount: dirtyCellIds.size,
    kind: "incremental",
    reason: "dependency graph",
    targetKeys,
  };
}

function createFullPlan(reason: string): WorkbookRecalculationPlan {
  return {
    dirtyCellCount: 0,
    kind: "full",
    reason,
    targetKeys: null,
  };
}

export function buildWorkbookDependencyGraph(
  document: WorkbookDocument,
): WorkbookDependencyGraph {
  const dependentsByCell = new Map<WorkbookCellId, Set<WorkbookCellId>>();
  const formulaCellIds = new Set<WorkbookCellId>();
  const precedentsByCell = new Map<WorkbookCellId, Set<WorkbookCellId>>();

  for (const sheet of document.sheets) {
    for (const [key, cell] of Object.entries(sheet.cells)) {
      if (!cell.raw.trimStart().startsWith("=")) {
        continue;
      }

      const position = parseCellKey(key);

      if (!position) {
        continue;
      }

      const formulaCellId = createCellId(sheet.id, key);
      formulaCellIds.add(formulaCellId);

      const referencedCellIds = getFormulaPrecedentCellIds({
        cell,
        document,
        key,
        position,
        sheet,
      });

      precedentsByCell.set(formulaCellId, referencedCellIds);

      for (const referencedCellId of referencedCellIds) {
        if (!dependentsByCell.has(referencedCellId)) {
          dependentsByCell.set(referencedCellId, new Set());
        }

        dependentsByCell.get(referencedCellId)?.add(formulaCellId);
      }
    }
  }

  return {
    dependentsByCell,
    formulaCellIds,
    precedentsByCell,
  };
}

function getFormulaPrecedentCellIds({
  cell,
  document,
  position,
  sheet,
}: {
  cell: CellRecord;
  document: WorkbookDocument;
  key: string;
  position: { columnIndex: number; rowIndex: number };
  sheet: SheetData;
}) {
  const formula = rewriteWorkbookCustomFunctions({
    customFunctions: document.customFunctions,
    formula: cell.raw,
  });
  const references = getFormulaReferences({
    activeSheet: sheet,
    cellPosition: position,
    document,
    formula,
    sheets: document.sheets,
  });
  const precedentCellIds = new Set<WorkbookCellId>();

  for (const reference of references) {
    addRangeCellIds(precedentCellIds, reference.sheetId, reference.range);
  }

  for (const namedRange of document.namedRanges ?? []) {
    if (!formulaContainsName(formula, namedRange.name)) {
      continue;
    }

    for (const range of getNamedRangeAreas(namedRange)) {
      addRangeCellIds(precedentCellIds, namedRange.sheetId, range);
    }
  }

  return precedentCellIds;
}

export function getFormulaTrace({
  document,
  key,
  sheetId,
}: {
  document: WorkbookDocument;
  key: string;
  sheetId: string;
}) {
  const graph = buildWorkbookDependencyGraph(document);
  const cellId = createCellId(sheetId, key);

  return {
    dependents: cellIdsToFormulaReferences(
      graph.dependentsByCell.get(cellId) ?? new Set(),
      document,
    ),
    precedents: cellIdsToFormulaReferences(
      graph.precedentsByCell.get(cellId) ?? new Set(),
      document,
    ),
  };
}

export function getWorkbookCircularReferenceIssues(
  document: WorkbookDocument,
): CircularReferenceIssue[] {
  const graph = buildWorkbookDependencyGraph(document);
  const cycles = getFormulaCycles(graph);

  return cycles.flatMap((cycle) => {
    const traceCells = cellIdsToTraceCells(cycle, document);

    return traceCells.map((cell) => ({
      id: `circular:${cell.id}`,
      sheetId: cell.sheetId,
      sheetName: cell.sheetName,
      key: cell.key,
      address: cell.address,
      range: cell.range,
      cycle: traceCells,
    }));
  });
}

export function getFormulaTraceKeys(
  references: FormulaReference[],
  activeSheetId: string,
) {
  const keys = new Set<string>();

  for (const reference of references) {
    if (reference.sheetId !== activeSheetId) {
      continue;
    }

    for (
      let rowIndex = reference.range.startRowIndex;
      rowIndex <= reference.range.endRowIndex;
      rowIndex += 1
    ) {
      for (
        let columnIndex = reference.range.startColumnIndex;
        columnIndex <= reference.range.endColumnIndex;
        columnIndex += 1
      ) {
        keys.add(cellKey(rowIndex, columnIndex));

        if (keys.size >= MAX_RANGE_DEPENDENCY_CELLS) {
          return keys;
        }
      }
    }
  }

  return keys;
}

function addRangeCellIds(
  cellIds: Set<WorkbookCellId>,
  sheetId: string,
  range: ChartRange,
) {
  let count = 0;

  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      cellIds.add(createCellId(sheetId, cellKey(rowIndex, columnIndex)));
      count += 1;

      if (count >= MAX_RANGE_DEPENDENCY_CELLS) {
        return;
      }
    }
  }
}

function getChangedWorkbookCellIds(
  previousDocument: WorkbookDocument,
  document: WorkbookDocument,
) {
  const changedCellIds = new Set<WorkbookCellId>();

  for (const sheet of document.sheets) {
    const previousSheet = getSheet(previousDocument, sheet.id);

    if (!previousSheet) {
      continue;
    }

    const keys = new Set([
      ...Object.keys(previousSheet.cells),
      ...Object.keys(sheet.cells),
    ]);

    for (const key of keys) {
      if (
        getComparableCellValue(previousSheet.cells[key]) !==
        getComparableCellValue(sheet.cells[key])
      ) {
        changedCellIds.add(createCellId(sheet.id, key));
      }
    }
  }

  return changedCellIds;
}

function getDirtyWorkbookCellIds(
  graph: WorkbookDependencyGraph,
  changedCellIds: Set<WorkbookCellId>,
) {
  const dirtyCellIds = new Set(changedCellIds);
  const queue = [...changedCellIds];

  while (queue.length > 0) {
    const cellId = queue.shift();

    if (!cellId) {
      continue;
    }

    for (const dependentId of graph.dependentsByCell.get(cellId) ?? []) {
      if (dirtyCellIds.has(dependentId)) {
        continue;
      }

      dirtyCellIds.add(dependentId);
      queue.push(dependentId);
    }
  }

  return dirtyCellIds;
}

function getActiveSheetTargetKeys(
  dirtyCellIds: Set<WorkbookCellId>,
  activeSheetId: string,
) {
  return [...dirtyCellIds]
    .flatMap((cellId) => {
      const parsed = parseCellId(cellId);

      return parsed?.sheetId === activeSheetId ? [parsed.key] : [];
    })
    .sort((left, right) => {
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
}

function getFormulaCycles(graph: WorkbookDependencyGraph) {
  const indexByCellId = new Map<WorkbookCellId, number>();
  const lowLinkByCellId = new Map<WorkbookCellId, number>();
  const stack: WorkbookCellId[] = [];
  const stackedCellIds = new Set<WorkbookCellId>();
  const cycles: WorkbookCellId[][] = [];
  let nextIndex = 0;

  function visit(cellId: WorkbookCellId) {
    indexByCellId.set(cellId, nextIndex);
    lowLinkByCellId.set(cellId, nextIndex);
    nextIndex += 1;
    stack.push(cellId);
    stackedCellIds.add(cellId);

    for (const precedentId of graph.precedentsByCell.get(cellId) ?? []) {
      if (!graph.formulaCellIds.has(precedentId)) {
        continue;
      }

      if (!indexByCellId.has(precedentId)) {
        visit(precedentId);
        lowLinkByCellId.set(
          cellId,
          Math.min(
            lowLinkByCellId.get(cellId) ?? 0,
            lowLinkByCellId.get(precedentId) ?? 0,
          ),
        );
        continue;
      }

      if (stackedCellIds.has(precedentId)) {
        lowLinkByCellId.set(
          cellId,
          Math.min(
            lowLinkByCellId.get(cellId) ?? 0,
            indexByCellId.get(precedentId) ?? 0,
          ),
        );
      }
    }

    if (lowLinkByCellId.get(cellId) !== indexByCellId.get(cellId)) {
      return;
    }

    const component: WorkbookCellId[] = [];
    let current: WorkbookCellId | undefined;

    do {
      current = stack.pop();

      if (!current) {
        break;
      }

      stackedCellIds.delete(current);
      component.push(current);
    } while (current !== cellId);

    const onlyCell = component[0];
    const hasSelfReference =
      component.length === 1 &&
      onlyCell !== undefined &&
      graph.precedentsByCell.get(onlyCell)?.has(onlyCell) === true;

    if (component.length > 1 || hasSelfReference) {
      cycles.push(component.sort(compareCellIds));
    }
  }

  for (const cellId of [...graph.formulaCellIds].sort(compareCellIds)) {
    if (!indexByCellId.has(cellId)) {
      visit(cellId);
    }
  }

  return cycles;
}

function compareCellIds(left: WorkbookCellId, right: WorkbookCellId) {
  const leftParsed = parseCellId(left);
  const rightParsed = parseCellId(right);

  if (!leftParsed || !rightParsed) {
    return left.localeCompare(right);
  }

  if (leftParsed.sheetId !== rightParsed.sheetId) {
    return leftParsed.sheetId.localeCompare(rightParsed.sheetId);
  }

  const leftPosition = parseCellKey(leftParsed.key);
  const rightPosition = parseCellKey(rightParsed.key);

  if (!leftPosition || !rightPosition) {
    return leftParsed.key.localeCompare(rightParsed.key);
  }

  return (
    leftPosition.rowIndex - rightPosition.rowIndex ||
    leftPosition.columnIndex - rightPosition.columnIndex
  );
}

function cellIdsToFormulaReferences(
  cellIds: Iterable<WorkbookCellId>,
  document: WorkbookDocument,
): FormulaReference[] {
  return cellIdsToTraceCells(cellIds, document).map((cell) => ({
    id: cell.id,
    sheetId: cell.sheetId,
    sheetName: cell.sheetName,
    address: cell.address,
    range: cell.range,
  }));
}

function cellIdsToTraceCells(
  cellIds: Iterable<WorkbookCellId>,
  document: WorkbookDocument,
): FormulaTraceCell[] {
  return [...cellIds]
    .flatMap((cellId) => {
      const parsed = parseCellId(cellId);

      if (!parsed) {
        return [];
      }

      const sheet = getSheet(document, parsed.sheetId);
      const position = parseCellKey(parsed.key);

      if (!sheet || !position) {
        return [];
      }

      return [
        {
          id: cellId,
          sheetId: sheet.id,
          sheetName: sheet.name,
          key: parsed.key,
          address: parsed.key,
          range: {
            startRowIndex: position.rowIndex,
            startColumnIndex: position.columnIndex,
            endRowIndex: position.rowIndex,
            endColumnIndex: position.columnIndex,
          },
        },
      ];
    })
    .sort((left, right) => compareCellIds(left.id, right.id));
}

function getWorkbookStructureSignature(document: WorkbookDocument) {
  return JSON.stringify({
    activeSheetId: document.activeSheetId,
    namedRanges: document.namedRanges,
    sheets: document.sheets.map((sheet) => ({
      columnCount: sheet.columnCount,
      id: sheet.id,
      mergedCells: sheet.mergedCells,
      name: sheet.name,
      rowCount: sheet.rowCount,
    })),
    dataModelRelationships: document.dataModelRelationships,
    customFunctions: (document.customFunctions ?? []).map((customFunction) => ({
      enabled: customFunction.enabled,
      expression: customFunction.expression,
      name: customFunction.name,
    })),
    tables: document.tables,
  });
}

function getComparableCellValue(cell: CellRecord | undefined) {
  if (!cell) {
    return "";
  }

  return JSON.stringify({
    raw: cell.raw,
    style: cell.style ?? null,
  });
}

function hasDynamicArrayFormula(sheet: SheetData) {
  return Object.values(sheet.cells).some((cell) => isDynamicArrayFormula(cell.raw));
}

function getSheet(document: WorkbookDocument, sheetId: string) {
  return document.sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

function createCellId(sheetId: string, key: string): WorkbookCellId {
  return `${sheetId}!${key}`;
}

function parseCellId(cellId: WorkbookCellId) {
  const separatorIndex = cellId.lastIndexOf("!");

  if (separatorIndex <= 0) {
    return null;
  }

  return {
    sheetId: cellId.slice(0, separatorIndex),
    key: cellId.slice(separatorIndex + 1),
  };
}

function formulaContainsName(formula: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^A-Z0-9_.])${escapedName}([^A-Z0-9_.]|$)`, "i");

  return pattern.test(stripFormulaStrings(formula));
}

function stripFormulaStrings(formula: string) {
  return formula.replace(/"(?:""|[^"])*"/g, " ");
}

import {
  createBlankSheet,
  createDefaultWorkbookCalculationSettings,
} from "@/features/workbooks/default-workbook";
import { getEffectiveSheetPrintSettings } from "@/features/workbooks/print-settings";
import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import { normalizeCellLinkUrl } from "@/features/workbooks/cell-links";
import { normalizeImportConnectorTransformSteps } from "@/features/workbooks/import-connector-transforms";
import { normalizeChartFormat } from "@/features/spreadsheet/chart-formatting";
import { normalizeChartObjectAnchor } from "@/features/spreadsheet/chart-object-anchor";
import { canonicalizeFormulaInput } from "@/features/spreadsheet/formula-locale";
import { normalizeInsertedObjects } from "@/features/spreadsheet/inserted-objects";
import { normalizeMultiRangeAreas } from "@/features/spreadsheet/multi-range-selection";
import {
  clampSheetColumnCount,
  clampSheetRowCount,
  resolveSheetScaleMode,
} from "@/features/spreadsheet/sheet-scale";
import {
  defaultLargeDataModelStorageSettings,
  resolveLargeDataModelStorageSettings,
} from "@/features/spreadsheet/large-data-model";
import {
  defaultWorkbookTheme,
  normalizeCellStyle,
  normalizeWorkbookCellStyles,
  normalizeWorkbookTheme,
} from "@/features/workbooks/workbook-themes";
import { normalizeCellRichTextRuns } from "@/features/workbooks/rich-text";
import {
  normalizeAutomationScripts,
  normalizeMacroProjects,
} from "@/features/workbooks/workbook-automation";
import {
  normalizeAddIns,
  normalizeCustomFunctions,
} from "@/features/workbooks/workbook-extensions";
import { normalizeNativeWorkbookObjects } from "@/features/workbooks/workbook-native-objects";
import { normalizeUnsupportedWorkbookParts } from "@/features/workbooks/workbook-unsupported-parts";
import type {
  CellLink,
  CellNote,
  CellRecord,
  ChartDefinition,
  ChartRange,
  ConditionalFormatOperator,
  ConditionalFormatRule,
  ConditionalFormatStyle,
  DataValidationErrorStyle,
  DataValidationListSource,
  DataValidationRule,
  DataValidationRuleType,
  FormulaWatch,
  MergedCellRange,
  NamedRange,
  PivotTableAggregation,
  PivotTableCalculatedField,
  PivotTableCalculatedFieldOperator,
  PivotTableCalculatedItem,
  PivotTableConditionalFormatScope,
  PivotTableDefinition,
  PivotTableFieldGrouping,
  PivotTableFieldGroupingMode,
  PivotTableMeasure,
  PivotTableTimelineFilter,
  SheetFilterCondition,
  SheetFilterCriteriaGroup,
  SheetFilterPreset,
  SheetFilterRule,
  SheetFilterRuleType,
  SheetProtection,
  SheetPrintSettings,
  SheetData,
  SparklineDefinition,
  TableDefinition,
  TableSlicer,
  TableTimeline,
  TableTimelineMode,
  WhatIfScenario,
  WorkbookCalculationSettings,
  WorkbookDataModelHierarchy,
  WorkbookDataModelHierarchyLevel,
  WorkbookDataModelKpi,
  WorkbookDataModelPerspective,
  WorkbookDataModelPerspectiveField,
  WorkbookDataModelRelationship,
  WorkbookDataModelStorageSettings,
  WorkbookQueryCredentialMetadata,
  WorkbookQueryCredentialStatus,
  WorkbookQueryDefinition,
  WorkbookQueryFormat,
  WorkbookQueryRefreshDiagnosticCode,
  WorkbookQueryRefreshHistoryEntry,
  WorkbookQuerySource,
  WorkbookDocument,
  WorkbookMetadata,
  WorkbookCommentNotification,
  WorkbookProtection,
  WorkbookProtectedRange,
  WorkbookTrackedChange,
  WorkbookTrackedChangeStatus,
  WorkbookVersionRestore,
  WorkbookVersionSnapshot,
} from "@/features/workbooks/types";

const MIN_COLUMN_WIDTH = 72;
const MAX_COLUMN_WIDTH = 360;
const CONDITIONAL_OPERATORS = new Set<ConditionalFormatOperator>([
  "greaterThan",
  "lessThan",
  "contains",
  "notEmpty",
  "duplicate",
  "topValues",
  "bottomValues",
  "colorScale",
  "dataBar",
  "iconSet",
  "formula",
]);
const PIVOT_CONDITIONAL_FORMAT_SCOPES = new Set<PivotTableConditionalFormatScope>([
  "all",
  "labels",
  "values",
]);
const DATA_VALIDATION_TYPES = new Set<DataValidationRuleType>([
  "list",
  "numberGreaterThan",
  "numberLessThan",
  "dateAfter",
  "dateBefore",
  "textContains",
  "notEmpty",
  "customFormula",
]);
const DATA_VALIDATION_LIST_SOURCES = new Set<DataValidationListSource>([
  "inline",
  "range",
  "dependent",
]);
const DATA_VALIDATION_ERROR_STYLES = new Set<DataValidationErrorStyle>([
  "stop",
  "warning",
  "information",
]);
const FILTER_TYPES = new Set<SheetFilterRuleType>([
  "equals",
  "notEquals",
  "contains",
  "doesNotContain",
  "oneOf",
  "cellColor",
  "fontColor",
  "icon",
  "startsWith",
  "endsWith",
  "empty",
  "notEmpty",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
]);
const TABLE_TIMELINE_MODES = new Set<TableTimelineMode>([
  "year",
  "quarter",
  "month",
]);
const WORKBOOK_QUERY_FORMATS = new Set<WorkbookQueryFormat>([
  "auto",
  "csv",
  "tsv",
  "json",
  "html",
]);
const WORKBOOK_QUERY_CREDENTIAL_STATUSES = new Set<WorkbookQueryCredentialStatus>([
  "notRequired",
  "required",
  "environment",
  "invalid",
]);
const WORKBOOK_QUERY_REFRESH_DIAGNOSTIC_CODES =
  new Set<WorkbookQueryRefreshDiagnosticCode>([
    "auth",
    "blocked",
    "network",
    "parse",
    "rateLimit",
    "server",
    "tooLarge",
    "unknown",
  ]);
const QUERY_SENSITIVE_URL_KEYS = [
  "access_token",
  "api_key",
  "apikey",
  "auth",
  "client_secret",
  "code",
  "key",
  "password",
  "secret",
  "sig",
  "signature",
  "token",
];
const PIVOT_TABLE_AGGREGATIONS = new Set<PivotTableAggregation>([
  "sum",
  "count",
  "average",
  "min",
  "max",
]);
const PIVOT_TABLE_CALCULATED_FIELD_OPERATORS = new Set<PivotTableCalculatedFieldOperator>([
  "add",
  "subtract",
  "multiply",
  "divide",
]);
const PIVOT_TABLE_GROUPING_MODES = new Set<PivotTableFieldGroupingMode>([
  "dateYear",
  "dateQuarter",
  "dateMonth",
  "numberBucket10",
  "numberBucket100",
]);
const CHART_TYPES = new Set<ChartDefinition["type"]>([
  "bar",
  "line",
  "area",
  "pie",
  "scatter",
  "bubble",
  "radar",
  "combo",
  "stock",
  "stacked-bar",
  "stacked-100-bar",
  "waterfall",
  "funnel",
  "histogram",
  "box-whisker",
  "treemap",
  "sunburst",
  "surface",
  "map",
]);
const CHART_TEMPLATES = new Set<NonNullable<ChartDefinition["template"]>>([
  "standard",
  "presentation",
  "mono",
]);
const TABLE_STYLES = new Set<TableDefinition["style"]>([
  "blue",
  "green",
  "slate",
]);
const MAX_VERSION_HISTORY = 20;
const MAX_VERSION_RESTORE_LOG = 50;

function isCellRecord(value: unknown): value is CellRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "raw" in value &&
    typeof (value as CellRecord).raw === "string"
  );
}

function normalizeIndexes(value: unknown, maxIndex: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const indexes = Array.from(
    new Set(
      value
        .map((index) => Number(index))
        .filter(
          (index) =>
            Number.isInteger(index) &&
            index >= 0 &&
            index < maxIndex,
        ),
    ),
  ).sort((left, right) => left - right);

  return indexes.length >= maxIndex ? [] : indexes;
}

function rangesOverlap(left: ChartRange, right: ChartRange) {
  return !(
    left.endRowIndex < right.startRowIndex ||
    left.startRowIndex > right.endRowIndex ||
    left.endColumnIndex < right.startColumnIndex ||
    left.startColumnIndex > right.endColumnIndex
  );
}

function normalizeMergedCells(
  value: unknown,
  rowCount: number,
  columnCount: number,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<MergedCellRange[]>((mergedCells, item) => {
    if (typeof item !== "object" || item === null) {
      return mergedCells;
    }

    const candidate = item as Partial<MergedCellRange>;
    const startRowIndex = Math.min(
      Math.max(Number(candidate.startRowIndex) || 0, 0),
      rowCount - 1,
    );
    const startColumnIndex = Math.min(
      Math.max(Number(candidate.startColumnIndex) || 0, 0),
      columnCount - 1,
    );
    const endRowIndex = Math.min(
      Math.max(Number(candidate.endRowIndex) || startRowIndex, startRowIndex),
      rowCount - 1,
    );
    const endColumnIndex = Math.min(
      Math.max(Number(candidate.endColumnIndex) || startColumnIndex, startColumnIndex),
      columnCount - 1,
    );
    const mergedCell = {
      id:
        typeof candidate.id === "string"
          ? candidate.id
          : `merge_${crypto.randomUUID()}`,
      startRowIndex,
      startColumnIndex,
      endRowIndex,
      endColumnIndex,
    };
    const isSingleCell =
      mergedCell.startRowIndex === mergedCell.endRowIndex &&
      mergedCell.startColumnIndex === mergedCell.endColumnIndex;

    if (
      isSingleCell ||
      mergedCells.some((existing) => rangesOverlap(existing, mergedCell))
    ) {
      return mergedCells;
    }

    mergedCells.push(mergedCell);
    return mergedCells;
  }, []);
}

function normalizeOutlineGroups(value: unknown, maxIndex: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<SheetData["rowGroups"]>((groups, item) => {
    if (typeof item !== "object" || item === null) {
      return groups;
    }

    const candidate = item as Partial<SheetData["rowGroups"][number]>;
    const startIndex = Math.min(
      Math.max(Math.floor(Number(candidate.startIndex)), 0),
      maxIndex - 1,
    );
    const endIndex = Math.min(
      Math.max(Math.floor(Number(candidate.endIndex)), startIndex),
      maxIndex - 1,
    );

    if (
      !Number.isFinite(startIndex) ||
      !Number.isFinite(endIndex) ||
      endIndex <= startIndex
    ) {
      return groups;
    }

    groups.push({
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id.slice(0, 80)
          : `group_${crypto.randomUUID()}`,
      startIndex,
      endIndex,
      level: Math.min(Math.max(Math.floor(Number(candidate.level)) || 1, 1), 8),
      collapsed: candidate.collapsed === true,
    });

    return groups;
  }, []);
}

function normalizeSheet(value: unknown, fallbackName: string): SheetData {
  if (typeof value !== "object" || value === null) {
    return createBlankSheet(fallbackName);
  }

  const candidate = value as Partial<SheetData>;
  const cells: Record<string, CellRecord> = {};
  const columnWidths: Record<string, number> = {};
  const tabColor =
    typeof candidate.tabColor === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(candidate.tabColor)
      ? candidate.tabColor
      : undefined;
  const rowCount = clampSheetRowCount(candidate.rowCount);
  const columnCount = clampSheetColumnCount(candidate.columnCount);
  const scaleMode = resolveSheetScaleMode({
    scaleMode: candidate.scaleMode,
    rowCount,
    columnCount,
  });

  for (const [key, cell] of Object.entries(candidate.cells ?? {})) {
    const position = parseCellKey(key);

    if (
      position &&
      position.rowIndex < rowCount &&
      position.columnIndex < columnCount &&
      isCellRecord(cell)
    ) {
      const raw = canonicalizeFormulaInput(cell.raw.slice(0, 5000));
      const style =
        typeof cell.style === "object" && cell.style !== null
          ? normalizeCellStyle(cell.style)
          : undefined;
      const richTextRuns = raw.startsWith("=")
        ? []
        : normalizeCellRichTextRuns(cell.richTextRuns, raw);

      cells[cellKey(position.rowIndex, position.columnIndex)] = {
        raw,
        ...(style && Object.keys(style).length > 0 ? { style } : {}),
        ...(richTextRuns.length > 0 ? { richTextRuns } : {}),
      };
    }
  }

  for (const [key, width] of Object.entries(candidate.columnWidths ?? {})) {
    if (/^\d+$/.test(key) && Number.isFinite(width)) {
      columnWidths[key] = Math.min(
        Math.max(Math.round(width), MIN_COLUMN_WIDTH),
        MAX_COLUMN_WIDTH,
      );
    }
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    name: typeof candidate.name === "string" ? candidate.name.slice(0, 80) : fallbackName,
    ...(tabColor ? { tabColor } : {}),
    scaleMode,
    rowCount,
    columnCount,
    columnWidths,
    hiddenRows: normalizeIndexes(candidate.hiddenRows, rowCount),
    hiddenColumns: normalizeIndexes(candidate.hiddenColumns, columnCount),
    showGridlines: candidate.showGridlines !== false,
    rowGroups: normalizeOutlineGroups(candidate.rowGroups, rowCount),
    columnGroups: normalizeOutlineGroups(candidate.columnGroups, columnCount),
    mergedCells: normalizeMergedCells(candidate.mergedCells, rowCount, columnCount),
    cells,
  };
}

function normalizeWorkbookMetadata(value: unknown): WorkbookMetadata {
  if (typeof value !== "object" || value === null) {
    return {
      description: "",
      favorite: false,
      folderName: "",
      isTemplate: false,
      lastOpenedAt: "",
      tags: [],
      updatedAt: "",
    };
  }

  const candidate = value as Partial<WorkbookMetadata>;

  return {
    description:
      typeof candidate.description === "string"
        ? candidate.description.trim().slice(0, 240)
        : "",
    favorite: candidate.favorite === true,
    folderName:
      typeof candidate.folderName === "string"
        ? candidate.folderName.trim().slice(0, 80)
        : "",
    isTemplate: candidate.isTemplate === true,
    lastOpenedAt:
      typeof candidate.lastOpenedAt === "string"
        ? candidate.lastOpenedAt
        : "",
    tags: Array.isArray(candidate.tags)
      ? Array.from(
          new Set(
            candidate.tags
              .filter((tag): tag is string => typeof tag === "string")
              .map((tag) => tag.trim())
              .filter(Boolean)
              .map((tag) => tag.slice(0, 32)),
          ),
        ).slice(0, 12)
      : [],
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
  };
}

function normalizeWorkbookCalculationSettings(value: unknown) {
  const fallback = createDefaultWorkbookCalculationSettings();

  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const candidate = value as Partial<WorkbookCalculationSettings>;
  const iterativeCalculation =
    typeof candidate.iterativeCalculation === "object" &&
    candidate.iterativeCalculation !== null
      ? (candidate.iterativeCalculation as Partial<
          WorkbookCalculationSettings["iterativeCalculation"]
        >)
      : {};
  const maxIterations = Number(iterativeCalculation.maxIterations);
  const maxChange = Number(iterativeCalculation.maxChange);
  const calendarSystem =
    candidate.calendarSystem === "gregorian" ||
    candidate.calendarSystem === "gregorian-1904" ||
    candidate.calendarSystem === "hijri" ||
    candidate.calendarSystem === "buddhist"
      ? candidate.calendarSystem
      : fallback.calendarSystem;

  return {
    calendarSystem,
    iterativeCalculation: {
      enabled: iterativeCalculation.enabled === true,
      maxIterations:
        Number.isFinite(maxIterations) && maxIterations > 0
          ? Math.min(Math.max(Math.round(maxIterations), 1), 10000)
          : fallback.iterativeCalculation.maxIterations,
      maxChange:
        Number.isFinite(maxChange) && maxChange > 0
          ? Math.min(Math.max(maxChange, 0.000000001), 1)
          : fallback.iterativeCalculation.maxChange,
    },
  };
}

function normalizeVersionHistory(value: unknown): WorkbookVersionSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<WorkbookVersionSnapshot[]>((versions, item) => {
    if (typeof item !== "object" || item === null) {
      return versions;
    }

    const candidate = item as Partial<WorkbookVersionSnapshot>;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.createdAt !== "string" ||
      typeof candidate.documentJson !== "string"
    ) {
      return versions;
    }

    try {
      const parsed = JSON.parse(candidate.documentJson) as Partial<WorkbookDocument>;
      const snapshotDocument = normalizeWorkbookDocument({
        ...parsed,
        versionHistory: [],
        versionRestores: [],
      });

      snapshotDocument.versionHistory = [];
      snapshotDocument.versionRestores = [];
      versions.push({
        id: candidate.id,
        label:
          typeof candidate.label === "string" && candidate.label.trim()
            ? candidate.label.trim().slice(0, 80)
            : "Saved version",
        createdAt: candidate.createdAt,
        sheetCount: Math.max(0, Number(candidate.sheetCount) || 0),
        cellCount: Math.max(0, Number(candidate.cellCount) || 0),
        documentJson: JSON.stringify(snapshotDocument),
      });
    } catch {
      return versions;
    }

    return versions;
  }, []).slice(0, MAX_VERSION_HISTORY);
}

function normalizeVersionRestores(value: unknown): WorkbookVersionRestore[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<WorkbookVersionRestore[]>((restores, item) => {
    if (typeof item !== "object" || item === null) {
      return restores;
    }

    const candidate = item as Partial<WorkbookVersionRestore>;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.versionId !== "string" ||
      typeof candidate.restoredAt !== "string"
    ) {
      return restores;
    }

    restores.push({
      id: candidate.id,
      versionId: candidate.versionId,
      label:
        typeof candidate.label === "string" && candidate.label.trim()
          ? candidate.label.trim().slice(0, 80)
          : "Saved version",
      restoredAt: candidate.restoredAt,
      sheetCount: Math.max(0, Number(candidate.sheetCount) || 0),
      cellCount: Math.max(0, Number(candidate.cellCount) || 0),
    });

    return restores;
  }, []).slice(0, MAX_VERSION_RESTORE_LOG);
}

function normalizeText(value: unknown, fallback: string, limit = 160) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, limit) || fallback
    : fallback;
}

function normalizeEmailList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((email): email is string => typeof email === "string")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)),
    ),
  ).slice(0, 20);
}

function normalizeRange(value: unknown, sheet: SheetData): ChartRange | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const range = value as Partial<ChartRange>;
  const startRowIndex = Math.min(
    Math.max(Number(range.startRowIndex) || 0, 0),
    sheet.rowCount - 1,
  );
  const startColumnIndex = Math.min(
    Math.max(Number(range.startColumnIndex) || 0, 0),
    sheet.columnCount - 1,
  );
  const endRowIndex = Math.min(
    Math.max(Number(range.endRowIndex) || startRowIndex, startRowIndex),
    sheet.rowCount - 1,
  );
  const endColumnIndex = Math.min(
    Math.max(Number(range.endColumnIndex) || startColumnIndex, startColumnIndex),
    sheet.columnCount - 1,
  );

  return {
    startRowIndex,
    startColumnIndex,
    endRowIndex,
    endColumnIndex,
  };
}

function normalizeProtectedRanges(
  value: unknown,
  sheets: SheetData[],
): WorkbookProtectedRange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookProtectedRange>;
      const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
      const range = sheet ? normalizeRange(candidate.range, sheet) : null;
      const allowedEmails = normalizeEmailList(candidate.allowedEmails);

      if (
        typeof candidate.id !== "string" ||
        typeof candidate.sheetId !== "string" ||
        !sheetIds.has(candidate.sheetId) ||
        !range ||
        allowedEmails.length === 0
      ) {
        return [];
      }

      return [
        {
          id: candidate.id.trim().slice(0, 100),
          sheetId: candidate.sheetId,
          name: normalizeText(candidate.name, "Protected range", 80),
          range,
          allowedEmails,
          createdByName: normalizeText(candidate.createdByName, "Workbook owner", 80),
          createdByEmail:
            typeof candidate.createdByEmail === "string"
              ? candidate.createdByEmail.trim().toLowerCase().slice(0, 160)
              : "",
          createdAt:
            typeof candidate.createdAt === "string"
              ? candidate.createdAt.slice(0, 40)
              : "",
          updatedAt:
            typeof candidate.updatedAt === "string"
              ? candidate.updatedAt.slice(0, 40)
              : "",
        },
      ];
    })
    .slice(0, 200);
}

function normalizeTrackedChangeCell(value: unknown): CellRecord | undefined {
  if (!isCellRecord(value)) {
    return undefined;
  }

  const raw = canonicalizeFormulaInput(value.raw.slice(0, 5000));
  const style =
    typeof value.style === "object" && value.style !== null
      ? normalizeCellStyle(value.style)
      : undefined;
  const hasStyle = style ? Object.keys(style).length > 0 : false;
  const richTextRuns = raw.startsWith("=")
    ? []
    : normalizeCellRichTextRuns(value.richTextRuns, raw);

  if (!raw && !hasStyle && !richTextRuns.length) {
    return undefined;
  }

  return {
    raw,
    ...(hasStyle ? { style } : {}),
    ...(richTextRuns.length > 0 ? { richTextRuns } : {}),
  };
}

function normalizeTrackedChanges(
  value: unknown,
  sheets: SheetData[],
): WorkbookTrackedChange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookTrackedChange>;
      const cellPosition =
        typeof candidate.cellKey === "string"
          ? parseCellKey(candidate.cellKey)
          : null;

      if (
        typeof candidate.id !== "string" ||
        typeof candidate.sheetId !== "string" ||
        !sheetIds.has(candidate.sheetId) ||
        !cellPosition
      ) {
        return [];
      }

      const status: WorkbookTrackedChangeStatus =
        candidate.status === "accepted" || candidate.status === "rejected"
          ? candidate.status
          : "pending";

      return [
        {
          id: candidate.id.trim().slice(0, 100),
          sheetId: candidate.sheetId,
          sheetName: normalizeText(candidate.sheetName, "Sheet", 80),
          cellKey: cellKey(cellPosition.rowIndex, cellPosition.columnIndex),
          summary: normalizeText(candidate.summary, "Changed cell", 240),
          beforeCell: normalizeTrackedChangeCell(candidate.beforeCell),
          afterCell: normalizeTrackedChangeCell(candidate.afterCell),
          actorName: normalizeText(candidate.actorName, "Workbook collaborator", 80),
          actorEmail:
            typeof candidate.actorEmail === "string"
              ? candidate.actorEmail.trim().toLowerCase().slice(0, 160)
              : "",
          createdAt:
            typeof candidate.createdAt === "string"
              ? candidate.createdAt.slice(0, 40)
              : "",
          status,
          reviewedAt:
            typeof candidate.reviewedAt === "string"
              ? candidate.reviewedAt.slice(0, 40)
              : undefined,
          reviewedByName:
            typeof candidate.reviewedByName === "string"
              ? candidate.reviewedByName.trim().slice(0, 80)
              : undefined,
          reviewedByEmail:
            typeof candidate.reviewedByEmail === "string"
              ? candidate.reviewedByEmail.trim().toLowerCase().slice(0, 160)
              : undefined,
        },
      ];
    })
    .slice(0, 300);
}

function normalizeCharts(
  value: unknown,
  sheets: SheetData[],
  pivotTables: PivotTableDefinition[],
): ChartDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const pivotTableIds = new Set(pivotTables.map((pivotTable) => pivotTable.id));

  return value.reduce<ChartDefinition[]>((charts, item) => {
    if (typeof item !== "object" || item === null) {
      return charts;
    }

    const candidate = item as Partial<ChartDefinition>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const range = sheet ? normalizeRange(candidate.range, sheet) : null;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheet ||
      !sheetIds.has(candidate.sheetId) ||
      !candidate.type ||
      !CHART_TYPES.has(candidate.type) ||
      !range
    ) {
      return charts;
    }

    charts.push({
      anchor: normalizeChartObjectAnchor(candidate.anchor, sheet, range),
      id: candidate.id,
      sheetId: candidate.sheetId,
      title:
        typeof candidate.title === "string"
          ? candidate.title.slice(0, 120)
          : "Chart",
      type: candidate.type,
      template:
        candidate.template && CHART_TEMPLATES.has(candidate.template)
          ? candidate.template
          : undefined,
      showDataLabels: candidate.showDataLabels === false ? false : undefined,
      showAxes: candidate.showAxes === false ? false : undefined,
      showLegend: candidate.showLegend === false ? false : undefined,
      format: normalizeChartFormat(candidate.format),
      range,
      sourcePivotTableId:
        typeof candidate.sourcePivotTableId === "string" &&
        candidate.sourcePivotTableId.trim() &&
        pivotTableIds.has(candidate.sourcePivotTableId.trim())
          ? candidate.sourcePivotTableId.trim().slice(0, 80)
          : undefined,
    });

    return charts;
  }, []);
}

function normalizeSparklines(value: unknown, sheets: SheetData[]): SparklineDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<SparklineDefinition[]>((sparklines, item) => {
    if (typeof item !== "object" || item === null) {
      return sparklines;
    }

    const candidate = item as Partial<SparklineDefinition>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const range = sheet ? normalizeRange(candidate.range, sheet) : null;
    const targetCellKey =
      typeof candidate.targetCellKey === "string"
        ? candidate.targetCellKey
        : null;
    const targetPosition = targetCellKey ? parseCellKey(targetCellKey) : null;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      candidate.type !== "line" ||
      !sheet ||
      !range ||
      !targetCellKey ||
      !targetPosition ||
      targetPosition.rowIndex >= sheet.rowCount ||
      targetPosition.columnIndex >= sheet.columnCount
    ) {
      return sparklines;
    }

    sparklines.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      targetCellKey,
      type: "line",
      range,
    });

    return sparklines;
  }, []);
}

function normalizeTableName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .replace(/^[^A-Za-z_]+/, "")
    .slice(0, 80);
}

function normalizeTables(value: unknown, sheets: SheetData[]): TableDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const tableNames = new Set<string>();

  return value.reduce<TableDefinition[]>((tables, item) => {
    if (typeof item !== "object" || item === null) {
      return tables;
    }

    const candidate = item as Partial<TableDefinition>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const range = sheet ? normalizeRange(candidate.range, sheet) : null;
    const name = normalizeTableName(candidate.name);

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !range ||
      !name ||
      tableNames.has(name.toLowerCase())
    ) {
      return tables;
    }

    const now = new Date().toISOString();

    tableNames.add(name.toLowerCase());
    tables.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      name,
      range,
      style:
        candidate.style && TABLE_STYLES.has(candidate.style)
          ? candidate.style
          : "blue",
      showHeaderRow: candidate.showHeaderRow !== false,
      showFilterButtons: candidate.showFilterButtons !== false,
      showTotalsRow: candidate.showTotalsRow === true,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return tables;
  }, []);
}

function isColumnInsideTable(table: TableDefinition, columnIndex: number) {
  return (
    Number.isInteger(columnIndex) &&
    columnIndex >= table.range.startColumnIndex &&
    columnIndex <= table.range.endColumnIndex
  );
}

function normalizeDataModelRelationships(
  value: unknown,
  tables: TableDefinition[],
): WorkbookDataModelRelationship[] {
  if (!Array.isArray(value) || tables.length < 2) {
    return [];
  }

  const tablesById = new Map(tables.map((table) => [table.id, table]));
  const usedKeys = new Set<string>();
  const now = new Date().toISOString();

  return value.reduce<WorkbookDataModelRelationship[]>((relationships, item) => {
    if (typeof item !== "object" || item === null) {
      return relationships;
    }

    const candidate = item as Partial<WorkbookDataModelRelationship>;
    const fromTable =
      typeof candidate.fromTableId === "string"
        ? tablesById.get(candidate.fromTableId)
        : undefined;
    const toTable =
      typeof candidate.toTableId === "string"
        ? tablesById.get(candidate.toTableId)
        : undefined;
    const fromColumnIndex = Number(candidate.fromColumnIndex);
    const toColumnIndex = Number(candidate.toColumnIndex);

    if (
      typeof candidate.id !== "string" ||
      !fromTable ||
      !toTable ||
      fromTable.id === toTable.id ||
      !isColumnInsideTable(fromTable, fromColumnIndex) ||
      !isColumnInsideTable(toTable, toColumnIndex)
    ) {
      return relationships;
    }

    const key = [
      fromTable.id,
      fromColumnIndex,
      toTable.id,
      toColumnIndex,
    ].join("\u001f");

    if (usedKeys.has(key)) {
      return relationships;
    }

    usedKeys.add(key);
    relationships.push({
      id: candidate.id.trim().slice(0, 120),
      active: candidate.active !== false,
      cardinality:
        candidate.cardinality === "oneToOne" ? "oneToOne" : "manyToOne",
      fromColumnIndex,
      fromTableId: fromTable.id,
      name:
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim().replace(/\s+/g, " ").slice(0, 160)
          : `${fromTable.name} -> ${toTable.name}`,
      toColumnIndex,
      toTableId: toTable.id,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return relationships;
  }, []);
}

function normalizeDataModelHierarchyLevels(
  value: unknown,
  table: TableDefinition,
): WorkbookDataModelHierarchyLevel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const usedColumns = new Set<number>();

  return value.reduce<WorkbookDataModelHierarchyLevel[]>((levels, item) => {
    if (typeof item !== "object" || item === null) {
      return levels;
    }

    const candidate = item as Partial<WorkbookDataModelHierarchyLevel>;
    const columnIndex = Number(candidate.columnIndex);

    if (
      !isColumnInsideTable(table, columnIndex) ||
      usedColumns.has(columnIndex)
    ) {
      return levels;
    }

    usedColumns.add(columnIndex);
    levels.push({
      columnIndex,
      name: normalizeText(candidate.name, `Level ${levels.length + 1}`, 80),
    });

    return levels;
  }, []).slice(0, 8);
}

function normalizeDataModelHierarchies(
  value: unknown,
  tables: TableDefinition[],
): WorkbookDataModelHierarchy[] {
  if (!Array.isArray(value) || tables.length === 0) {
    return [];
  }

  const tablesById = new Map(tables.map((table) => [table.id, table]));
  const usedNames = new Set<string>();
  const now = new Date().toISOString();

  return value.reduce<WorkbookDataModelHierarchy[]>((hierarchies, item) => {
    if (typeof item !== "object" || item === null) {
      return hierarchies;
    }

    const candidate = item as Partial<WorkbookDataModelHierarchy>;
    const table =
      typeof candidate.tableId === "string"
        ? tablesById.get(candidate.tableId)
        : undefined;

    if (typeof candidate.id !== "string" || !table) {
      return hierarchies;
    }

    const name = normalizeText(candidate.name, "Hierarchy", 120);
    const key = `${table.id}:${name.toLowerCase()}`;
    const levels = normalizeDataModelHierarchyLevels(candidate.levels, table);

    if (usedNames.has(key) || levels.length < 2) {
      return hierarchies;
    }

    usedNames.add(key);
    hierarchies.push({
      id: candidate.id.trim().slice(0, 120),
      active: candidate.active !== false,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      levels,
      name,
      tableId: table.id,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return hierarchies;
  }, []);
}

function normalizeDataModelKpis(
  value: unknown,
  tables: TableDefinition[],
): WorkbookDataModelKpi[] {
  if (!Array.isArray(value) || tables.length === 0) {
    return [];
  }

  const tablesById = new Map(tables.map((table) => [table.id, table]));
  const usedNames = new Set<string>();
  const now = new Date().toISOString();

  return value.reduce<WorkbookDataModelKpi[]>((kpis, item) => {
    if (typeof item !== "object" || item === null) {
      return kpis;
    }

    const candidate = item as Partial<WorkbookDataModelKpi>;
    const table =
      typeof candidate.tableId === "string"
        ? tablesById.get(candidate.tableId)
        : undefined;
    const valueColumnIndex = Number(candidate.valueColumnIndex);
    const target = Number(candidate.target);

    if (
      typeof candidate.id !== "string" ||
      !table ||
      !isColumnInsideTable(table, valueColumnIndex) ||
      !Number.isFinite(target)
    ) {
      return kpis;
    }

    const name = normalizeText(candidate.name, "KPI", 120);
    const key = `${table.id}:${name.toLowerCase()}`;

    if (usedNames.has(key)) {
      return kpis;
    }

    usedNames.add(key);
    kpis.push({
      id: candidate.id.trim().slice(0, 120),
      active: candidate.active !== false,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      direction:
        candidate.direction === "lowerIsBetter"
          ? "lowerIsBetter"
          : "higherIsBetter",
      goodThreshold: Math.min(
        Math.max(Number(candidate.goodThreshold) || 1, 0),
        10,
      ),
      name,
      tableId: table.id,
      target,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
      valueColumnIndex,
      warningThreshold: Math.min(
        Math.max(Number(candidate.warningThreshold) || 0.8, 0),
        10,
      ),
    });

    return kpis;
  }, []);
}

function normalizeDataModelPerspectiveFields(
  value: unknown,
  tablesById: Map<string, TableDefinition>,
): WorkbookDataModelPerspectiveField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const usedKeys = new Set<string>();

  return value.reduce<WorkbookDataModelPerspectiveField[]>((fields, item) => {
    if (typeof item !== "object" || item === null) {
      return fields;
    }

    const candidate = item as Partial<WorkbookDataModelPerspectiveField>;
    const table =
      typeof candidate.tableId === "string"
        ? tablesById.get(candidate.tableId)
        : undefined;
    const columnIndex = Number(candidate.columnIndex);
    const key = `${candidate.tableId}:${columnIndex}`;

    if (
      !table ||
      !isColumnInsideTable(table, columnIndex) ||
      usedKeys.has(key)
    ) {
      return fields;
    }

    usedKeys.add(key);
    fields.push({
      columnIndex,
      tableId: table.id,
    });

    return fields;
  }, []).slice(0, 200);
}

function normalizeDataModelPerspectives(
  value: unknown,
  tables: TableDefinition[],
): WorkbookDataModelPerspective[] {
  if (!Array.isArray(value) || tables.length === 0) {
    return [];
  }

  const tablesById = new Map(tables.map((table) => [table.id, table]));
  const usedNames = new Set<string>();
  const now = new Date().toISOString();

  return value.reduce<WorkbookDataModelPerspective[]>((perspectives, item) => {
    if (typeof item !== "object" || item === null) {
      return perspectives;
    }

    const candidate = item as Partial<WorkbookDataModelPerspective>;
    const tableIds = Array.isArray(candidate.tableIds)
      ? Array.from(
          new Set(
            candidate.tableIds.filter(
              (tableId): tableId is string =>
                typeof tableId === "string" && tablesById.has(tableId),
            ),
          ),
        ).slice(0, 24)
      : [];
    const fields = normalizeDataModelPerspectiveFields(
      candidate.fields,
      tablesById,
    );

    if (
      typeof candidate.id !== "string" ||
      tableIds.length === 0 ||
      fields.length === 0
    ) {
      return perspectives;
    }

    const name = normalizeText(candidate.name, "Perspective", 120);

    if (usedNames.has(name.toLowerCase())) {
      return perspectives;
    }

    usedNames.add(name.toLowerCase());
    perspectives.push({
      id: candidate.id.trim().slice(0, 120),
      active: candidate.active !== false,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      fields,
      name,
      tableIds,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return perspectives;
  }, []);
}

function normalizeDataModelStorage(
  value: unknown,
): WorkbookDataModelStorageSettings {
  return resolveLargeDataModelStorageSettings(
    typeof value === "object" && value !== null
      ? (value as Partial<WorkbookDataModelStorageSettings>)
      : defaultLargeDataModelStorageSettings,
  );
}

function normalizeTableSlicers(
  value: unknown,
  sheets: SheetData[],
  tables: TableDefinition[],
): TableSlicer[] {
  if (!Array.isArray(value) || tables.length === 0) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const tablesById = new Map(tables.map((table) => [table.id, table]));

  return value.reduce<TableSlicer[]>((slicers, item) => {
    if (typeof item !== "object" || item === null) {
      return slicers;
    }

    const candidate = item as Partial<TableSlicer>;
    const table =
      typeof candidate.tableId === "string"
        ? tablesById.get(candidate.tableId)
        : undefined;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !table ||
      table.sheetId !== candidate.sheetId
    ) {
      return slicers;
    }

    const columnIndex = Math.min(
      Math.max(
        Number(candidate.columnIndex) || table.range.startColumnIndex,
        table.range.startColumnIndex,
      ),
      table.range.endColumnIndex,
    );
    const now = new Date().toISOString();

    slicers.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      tableId: table.id,
      columnIndex,
      name:
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim().slice(0, 80)
          : `${table.name} ${columnIndex + 1}`,
      selectedValues: Array.isArray(candidate.selectedValues)
        ? candidate.selectedValues
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.slice(0, 500))
            .slice(0, 250)
        : [],
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return slicers;
  }, []);
}

function normalizeTableTimelines(
  value: unknown,
  sheets: SheetData[],
  tables: TableDefinition[],
): TableTimeline[] {
  if (!Array.isArray(value) || tables.length === 0) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const tablesById = new Map(tables.map((table) => [table.id, table]));

  return value.reduce<TableTimeline[]>((timelines, item) => {
    if (typeof item !== "object" || item === null) {
      return timelines;
    }

    const candidate = item as Partial<TableTimeline>;
    const table =
      typeof candidate.tableId === "string"
        ? tablesById.get(candidate.tableId)
        : undefined;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !table ||
      table.sheetId !== candidate.sheetId
    ) {
      return timelines;
    }

    const columnIndex = Math.min(
      Math.max(
        Number(candidate.columnIndex) || table.range.startColumnIndex,
        table.range.startColumnIndex,
      ),
      table.range.endColumnIndex,
    );
    const now = new Date().toISOString();

    timelines.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      tableId: table.id,
      columnIndex,
      name:
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim().slice(0, 80)
          : `${table.name} timeline`,
      mode:
        candidate.mode && TABLE_TIMELINE_MODES.has(candidate.mode)
          ? candidate.mode
          : "month",
      selectedPeriods: Array.isArray(candidate.selectedPeriods)
        ? candidate.selectedPeriods
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.slice(0, 24))
            .slice(0, 120)
        : [],
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return timelines;
  }, []);
}

function normalizePivotFieldIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizePivotValueFields(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<PivotTableDefinition["valueFields"][number]>;

      if (
        typeof candidate.fieldId !== "string" ||
        !candidate.fieldId.trim() ||
        !candidate.aggregation ||
        !PIVOT_TABLE_AGGREGATIONS.has(candidate.aggregation)
      ) {
        return [];
      }

      return [
        {
          aggregation: candidate.aggregation,
          fieldId: candidate.fieldId.trim().slice(0, 80),
          label:
            typeof candidate.label === "string" && candidate.label.trim()
              ? candidate.label.trim().slice(0, 120)
              : `${candidate.aggregation} of ${candidate.fieldId.trim()}`,
        },
      ];
    })
    .slice(0, 8);
}

function normalizePivotFilterSelections(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string[]>>(
    (selections, [fieldId, selectedValues]) => {
      const normalizedFieldId = fieldId.trim().slice(0, 80);

      if (!normalizedFieldId || !Array.isArray(selectedValues)) {
        return selections;
      }

      selections[normalizedFieldId] = selectedValues
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 500))
        .filter(Boolean)
        .slice(0, 250);
      return selections;
    },
    {},
  );
}

function createPivotSourceFieldIdSet(range: ChartRange) {
  const fieldIds = new Set<string>();

  for (
    let columnIndex = range.startColumnIndex;
    columnIndex <= range.endColumnIndex;
    columnIndex += 1
  ) {
    fieldIds.add(`field_${columnIndex}`);
  }

  return fieldIds;
}

function normalizeCalculatedFieldName(
  value: unknown,
  index: number,
  usedNames: Set<string>,
) {
  const baseName =
    typeof value === "string" && value.trim()
      ? value.trim().replace(/\s+/g, " ").slice(0, 80)
      : `Calculated Field ${index + 1}`;
  let name = baseName;
  let suffix = 2;

  while (usedNames.has(name.toLowerCase())) {
    const suffixText = ` ${suffix}`;

    name = `${baseName.slice(0, 80 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedNames.add(name.toLowerCase());
  return name;
}

function normalizePivotCalculatedFields(
  value: unknown,
  sourceFieldIds: Set<string>,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();
  const usedNames = new Set<string>();

  return value
    .flatMap((item, index) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<PivotTableCalculatedField>;
      const id =
        typeof candidate.id === "string"
          ? candidate.id.trim().slice(0, 80)
          : "";
      const leftFieldId =
        typeof candidate.leftFieldId === "string"
          ? candidate.leftFieldId.trim().slice(0, 80)
          : "";
      const rightFieldId =
        typeof candidate.rightFieldId === "string"
          ? candidate.rightFieldId.trim().slice(0, 80)
          : "";

      if (
        !id ||
        seenIds.has(id) ||
        !sourceFieldIds.has(leftFieldId) ||
        !sourceFieldIds.has(rightFieldId) ||
        !candidate.operator ||
        !PIVOT_TABLE_CALCULATED_FIELD_OPERATORS.has(candidate.operator)
      ) {
        return [];
      }

      seenIds.add(id);
      return [
        {
          id,
          name: normalizeCalculatedFieldName(candidate.name, index, usedNames),
          leftFieldId,
          operator: candidate.operator,
          rightFieldId,
        },
      ];
    })
    .slice(0, 8);
}

function normalizePivotCalculatedItems(
  value: unknown,
  groupedFieldIds: Set<string>,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();
  const usedNames = new Set<string>();

  return value
    .flatMap((item, index) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<PivotTableCalculatedItem>;
      const id =
        typeof candidate.id === "string"
          ? candidate.id.trim().slice(0, 80)
          : "";
      const fieldId =
        typeof candidate.fieldId === "string"
          ? candidate.fieldId.trim().slice(0, 80)
          : "";
      const leftItem =
        typeof candidate.leftItem === "string"
          ? candidate.leftItem.trim().slice(0, 500)
          : "";
      const rightItem =
        typeof candidate.rightItem === "string"
          ? candidate.rightItem.trim().slice(0, 500)
          : "";

      if (
        !id ||
        seenIds.has(id) ||
        !groupedFieldIds.has(fieldId) ||
        !leftItem ||
        !rightItem ||
        !candidate.operator ||
        !PIVOT_TABLE_CALCULATED_FIELD_OPERATORS.has(candidate.operator)
      ) {
        return [];
      }

      seenIds.add(id);
      return [
        {
          id,
          fieldId,
          leftItem,
          operator: candidate.operator,
          rightItem,
          name: normalizeCalculatedFieldName(candidate.name, index, usedNames),
        },
      ];
    })
    .slice(0, 8);
}

function normalizeMeasureName(
  value: unknown,
  index: number,
  usedNames: Set<string>,
) {
  const baseName =
    typeof value === "string" && value.trim()
      ? value.trim().replace(/\s+/g, " ").slice(0, 80)
      : `Measure ${index + 1}`;
  let name = baseName;
  let suffix = 2;

  while (usedNames.has(name.toLowerCase())) {
    const suffixText = ` ${suffix}`;

    name = `${baseName.slice(0, 80 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedNames.add(name.toLowerCase());
  return name;
}

function normalizePivotMeasures(
  value: unknown,
  valueLabels: Set<string>,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();
  const usedNames = new Set(valueLabels);

  return value
    .flatMap((item, index) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<PivotTableMeasure>;
      const id =
        typeof candidate.id === "string"
          ? candidate.id.trim().slice(0, 80)
          : "";
      const leftValueLabel =
        typeof candidate.leftValueLabel === "string"
          ? candidate.leftValueLabel.trim().slice(0, 120)
          : "";
      const rightValueLabel =
        typeof candidate.rightValueLabel === "string"
          ? candidate.rightValueLabel.trim().slice(0, 120)
          : "";

      if (
        !id ||
        seenIds.has(id) ||
        !valueLabels.has(leftValueLabel) ||
        !valueLabels.has(rightValueLabel) ||
        !candidate.operator ||
        !PIVOT_TABLE_CALCULATED_FIELD_OPERATORS.has(candidate.operator)
      ) {
        return [];
      }

      seenIds.add(id);
      return [
        {
          id,
          name: normalizeMeasureName(candidate.name, index, usedNames),
          leftValueLabel,
          operator: candidate.operator,
          rightValueLabel,
        },
      ];
    })
    .slice(0, 8);
}

function normalizePivotFieldGroupings(
  value: unknown,
  groupedFieldIds: Set<string>,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<PivotTableFieldGrouping>;
      const fieldId =
        typeof candidate.fieldId === "string"
          ? candidate.fieldId.trim().slice(0, 80)
          : "";

      if (
        !fieldId ||
        seenIds.has(fieldId) ||
        !groupedFieldIds.has(fieldId) ||
        !candidate.mode ||
        !PIVOT_TABLE_GROUPING_MODES.has(candidate.mode)
      ) {
        return [];
      }

      seenIds.add(fieldId);
      return [{ fieldId, mode: candidate.mode }];
    })
    .slice(0, 8);
}

function normalizePivotTimelineFilters(
  value: unknown,
  sourceFieldIds: Set<string>,
): PivotTableTimelineFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<PivotTableTimelineFilter>;
      const fieldId =
        typeof candidate.fieldId === "string"
          ? candidate.fieldId.trim().slice(0, 80)
          : "";

      if (
        !fieldId ||
        seenIds.has(fieldId) ||
        !sourceFieldIds.has(fieldId) ||
        !candidate.mode ||
        !TABLE_TIMELINE_MODES.has(candidate.mode)
      ) {
        return [];
      }

      seenIds.add(fieldId);
      return [
        {
          fieldId,
          mode: candidate.mode,
          selectedPeriods: Array.isArray(candidate.selectedPeriods)
            ? Array.from(
                new Set(
                  candidate.selectedPeriods
                    .filter((item): item is string => typeof item === "string")
                    .map((item) => item.trim().slice(0, 24))
                    .filter(Boolean),
                ),
              ).slice(0, 120)
            : [],
        },
      ];
    })
    .slice(0, 4);
}

function normalizePivotTables(
  value: unknown,
  sheets: SheetData[],
  tables: TableDefinition[],
): PivotTableDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const tablesById = new Map(tables.map((table) => [table.id, table]));

  return value.reduce<PivotTableDefinition[]>((pivotTables, item) => {
    if (typeof item !== "object" || item === null) {
      return pivotTables;
    }

    const candidate = item as Partial<PivotTableDefinition>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const sourceTable =
      typeof candidate.sourceTableId === "string"
        ? tablesById.get(candidate.sourceTableId)
        : undefined;
    const sourceRange = sheet
      ? normalizeRange(sourceTable?.range ?? candidate.sourceRange, sheet)
      : null;
    const outputRange = sheet ? normalizeRange(candidate.outputRange, sheet) : null;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !sheet ||
      !sourceRange ||
      !outputRange ||
      (sourceTable && sourceTable.sheetId !== candidate.sheetId)
    ) {
      return pivotTables;
    }

    const now = new Date().toISOString();
    const rowFieldIds = normalizePivotFieldIds(candidate.rowFieldIds);
    const columnFieldIds = normalizePivotFieldIds(candidate.columnFieldIds);
    const filterFieldIds = normalizePivotFieldIds(candidate.filterFieldIds);
    const groupedFieldIds = new Set([...rowFieldIds, ...columnFieldIds]);
    const sourceFieldIds = createPivotSourceFieldIdSet(sourceRange);
    const calculatedFields = normalizePivotCalculatedFields(
      candidate.calculatedFields,
      sourceFieldIds,
    );
    const valueFields = normalizePivotValueFields(candidate.valueFields);
    const valueLabels = new Set(valueFields.map((field) => field.label));

    pivotTables.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      name:
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim().slice(0, 80)
          : "PivotTable",
      sourceRange,
      ...(sourceTable ? { sourceTableId: sourceTable.id } : {}),
      outputRange,
      rowFieldIds,
      columnFieldIds,
      filterFieldIds,
      filterSelections: normalizePivotFilterSelections(
        candidate.filterSelections,
      ),
      calculatedFields,
      calculatedItems: normalizePivotCalculatedItems(
        candidate.calculatedItems,
        groupedFieldIds,
      ),
      measures: normalizePivotMeasures(candidate.measures, valueLabels),
      fieldGroupings: normalizePivotFieldGroupings(
        candidate.fieldGroupings,
        groupedFieldIds,
      ),
      timelineFilters: normalizePivotTimelineFilters(
        candidate.timelineFilters,
        sourceFieldIds,
      ),
      valueFields,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return pivotTables;
  }, []);
}

function normalizeConditionalStyle(value: unknown): ConditionalFormatStyle {
  if (typeof value !== "object" || value === null) {
    return {
      background: "#dcfce7",
      foreground: "#14532d",
      bold: true,
    };
  }

  const candidate = value as Partial<ConditionalFormatStyle>;
  const candidateThresholds =
    typeof candidate.scale?.thresholds === "object" &&
    candidate.scale.thresholds !== null
      ? candidate.scale.thresholds
      : null;
  const lowThreshold =
    typeof candidateThresholds?.low === "number" &&
    Number.isFinite(candidateThresholds.low)
      ? Math.min(Math.max(Math.round(candidateThresholds.low), 0), 100)
      : undefined;
  const highThreshold =
    typeof candidateThresholds?.high === "number" &&
    Number.isFinite(candidateThresholds.high)
      ? Math.min(Math.max(Math.round(candidateThresholds.high), 0), 100)
      : undefined;
  const scale =
    typeof candidate.scale === "object" &&
    candidate.scale !== null &&
    typeof candidate.scale.minColor === "string" &&
    typeof candidate.scale.maxColor === "string"
      ? {
          minColor: candidate.scale.minColor.slice(0, 32),
          maxColor: candidate.scale.maxColor.slice(0, 32),
          thresholds:
            lowThreshold !== undefined && highThreshold !== undefined
              ? {
                  low: Math.min(lowThreshold, highThreshold),
                  high: Math.max(lowThreshold, highThreshold),
                }
              : undefined,
        }
      : undefined;

  return {
    background:
      typeof candidate.background === "string"
        ? candidate.background.slice(0, 32)
        : "#dcfce7",
    foreground:
      typeof candidate.foreground === "string"
        ? candidate.foreground.slice(0, 32)
        : "#14532d",
    bold: candidate.bold === true ? true : undefined,
    italic: candidate.italic === true ? true : undefined,
    scale,
  };
}

function normalizeConditionalFormats(
  value: unknown,
  sheets: SheetData[],
  pivotTables: PivotTableDefinition[],
): ConditionalFormatRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const pivotTablesById = new Map(
    pivotTables.map((pivotTable) => [pivotTable.id, pivotTable]),
  );

  return value.reduce<ConditionalFormatRule[]>((rules, item) => {
    if (typeof item !== "object" || item === null) {
      return rules;
    }

    const candidate = item as Partial<ConditionalFormatRule>;
    const sourcePivotTableId =
      typeof candidate.sourcePivotTableId === "string" &&
      pivotTablesById.has(candidate.sourcePivotTableId.trim())
        ? candidate.sourcePivotTableId.trim().slice(0, 80)
        : undefined;
    const sourcePivotTable = sourcePivotTableId
      ? pivotTablesById.get(sourcePivotTableId)
      : undefined;
    const sheetId = sourcePivotTable?.sheetId ?? candidate.sheetId;
    const sheet = sheets.find((itemSheet) => itemSheet.id === sheetId);
    const range = sheet ? normalizeRange(candidate.range, sheet) : null;

    if (
      typeof candidate.id !== "string" ||
      typeof sheetId !== "string" ||
      !sheetIds.has(sheetId) ||
      !candidate.operator ||
      !CONDITIONAL_OPERATORS.has(candidate.operator) ||
      !range
    ) {
      return rules;
    }

    rules.push({
      id: candidate.id,
      sheetId,
      range,
      operator: candidate.operator,
      value:
        typeof candidate.value === "string"
          ? candidate.value.slice(0, 120)
          : "",
      style: normalizeConditionalStyle(candidate.style),
      sourcePivotTableId,
      pivotTableScope:
        candidate.pivotTableScope &&
        PIVOT_CONDITIONAL_FORMAT_SCOPES.has(candidate.pivotTableScope)
          ? candidate.pivotTableScope
          : sourcePivotTableId
            ? "values"
            : undefined,
    });

    return rules;
  }, []);
}

function normalizeDataValidations(
  value: unknown,
  sheets: SheetData[],
): DataValidationRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<DataValidationRule[]>((rules, item) => {
    if (typeof item !== "object" || item === null) {
      return rules;
    }

    const candidate = item as Partial<DataValidationRule>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const range = sheet ? normalizeRange(candidate.range, sheet) : null;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !candidate.type ||
      !DATA_VALIDATION_TYPES.has(candidate.type) ||
      !range
    ) {
      return rules;
    }

    rules.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      range,
      type: candidate.type,
      value:
        typeof candidate.value === "string"
          ? candidate.value.slice(0, 500)
          : "",
      listSource:
        candidate.listSource &&
        DATA_VALIDATION_LIST_SOURCES.has(candidate.listSource)
          ? candidate.listSource
          : undefined,
      dependentCell:
        typeof candidate.dependentCell === "string" &&
        candidate.dependentCell.trim()
          ? candidate.dependentCell.slice(0, 40)
          : undefined,
      inputMessage:
        typeof candidate.inputMessage === "string" &&
        candidate.inputMessage.trim()
          ? candidate.inputMessage.slice(0, 160)
          : undefined,
      errorMessage:
        typeof candidate.errorMessage === "string" &&
        candidate.errorMessage.trim()
          ? candidate.errorMessage.slice(0, 160)
          : undefined,
      showInputMessage:
        typeof candidate.showInputMessage === "boolean"
          ? candidate.showInputMessage
          : undefined,
      showErrorAlert:
        typeof candidate.showErrorAlert === "boolean"
          ? candidate.showErrorAlert
          : undefined,
      errorStyle:
        candidate.errorStyle &&
        DATA_VALIDATION_ERROR_STYLES.has(candidate.errorStyle)
          ? candidate.errorStyle
          : undefined,
      ignoreBlank:
        typeof candidate.ignoreBlank === "boolean"
          ? candidate.ignoreBlank
          : undefined,
      circleInvalid:
        typeof candidate.circleInvalid === "boolean"
          ? candidate.circleInvalid
          : undefined,
    });

    return rules;
  }, []);
}

function normalizeFilters(value: unknown, sheets: SheetData[]): SheetFilterRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<SheetFilterRule[]>((filters, item) => {
    if (typeof item !== "object" || item === null) {
      return filters;
    }

    const candidate = item as Partial<SheetFilterRule>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const range = sheet ? normalizeRange(candidate.range, sheet) : null;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !candidate.type ||
      !FILTER_TYPES.has(candidate.type) ||
      !range
    ) {
      return filters;
    }

    const columnIndex = Math.min(
      Math.max(Number(candidate.columnIndex) || range.startColumnIndex, range.startColumnIndex),
      range.endColumnIndex,
    );
    const conditions = Array.isArray(candidate.conditions)
      ? candidate.conditions
          .flatMap((item) => {
            if (typeof item !== "object" || item === null) {
              return [];
            }

            const condition = item as Partial<SheetFilterCondition>;

            if (!condition.type || !FILTER_TYPES.has(condition.type)) {
              return [];
            }

            return [
              {
                type: condition.type,
                value:
                  typeof condition.value === "string"
                    ? condition.value.slice(0, 500)
                    : "",
                values: Array.isArray(condition.values)
                  ? condition.values
                      .filter((item): item is string => typeof item === "string")
                      .map((item) => item.slice(0, 500))
                      .slice(0, 250)
                  : undefined,
              },
            ];
          })
          .slice(0, 4)
      : [];
    const criteriaGroups = Array.isArray(candidate.criteriaGroups)
      ? candidate.criteriaGroups
          .flatMap((item) => {
            if (typeof item !== "object" || item === null) {
              return [];
            }

            const group = item as Partial<SheetFilterCriteriaGroup>;
            const groupConditions = Array.isArray(group.conditions)
              ? group.conditions
                  .flatMap((item) => {
                    if (typeof item !== "object" || item === null) {
                      return [];
                    }

                    const condition = item as Partial<
                      SheetFilterCriteriaGroup["conditions"][number]
                    >;

                    if (!condition.type || !FILTER_TYPES.has(condition.type)) {
                      return [];
                    }

                    return [
                      {
                        columnIndex: Math.min(
                          Math.max(
                            Number(condition.columnIndex) ||
                              range.startColumnIndex,
                            range.startColumnIndex,
                          ),
                          range.endColumnIndex,
                        ),
                        headerName:
                          typeof condition.headerName === "string" &&
                          condition.headerName.trim()
                            ? condition.headerName.trim().slice(0, 80)
                            : undefined,
                        type: condition.type,
                        value:
                          typeof condition.value === "string"
                            ? condition.value.slice(0, 500)
                            : "",
                        values: Array.isArray(condition.values)
                          ? condition.values
                              .filter((item): item is string => typeof item === "string")
                              .map((item) => item.slice(0, 500))
                              .slice(0, 250)
                          : undefined,
                      },
                    ];
                  })
                  .slice(0, 16)
              : [];

            return groupConditions.length > 0
              ? [{ conditions: groupConditions }]
              : [];
          })
          .slice(0, 64)
      : [];

    filters.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      range,
      columnIndex,
      headerName:
        typeof candidate.headerName === "string" && candidate.headerName.trim()
          ? candidate.headerName.trim().slice(0, 80)
          : undefined,
      type: candidate.type,
      value:
        typeof candidate.value === "string"
          ? candidate.value.slice(0, 500)
          : "",
      values: Array.isArray(candidate.values)
        ? candidate.values
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.slice(0, 500))
            .slice(0, 250)
        : undefined,
      joiner: candidate.joiner === "or" ? "or" : undefined,
      conditions: conditions.length > 0 ? conditions : undefined,
      criteriaGroups:
        criteriaGroups.length > 0 ? criteriaGroups : undefined,
    });

    return filters;
  }, []);
}

function normalizeFilterPresetName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

function normalizeFilterPresets(
  value: unknown,
  sheets: SheetData[],
): SheetFilterPreset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<SheetFilterPreset[]>((presets, item) => {
    if (typeof item !== "object" || item === null) {
      return presets;
    }

    const candidate = item as Partial<SheetFilterPreset>;
    const name = normalizeFilterPresetName(candidate.name);

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !name
    ) {
      return presets;
    }

    const filters = normalizeFilters(candidate.filters, sheets).filter(
      (filter) => filter.sheetId === candidate.sheetId,
    );

    if (filters.length === 0) {
      return presets;
    }

    const now = new Date().toISOString();

    presets.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      name,
      filters,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return presets;
  }, []);
}

function normalizeCellNotes(value: unknown, sheets: SheetData[]): CellNote[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<CellNote[]>((notes, item) => {
    if (typeof item !== "object" || item === null) {
      return notes;
    }

    const candidate = item as Partial<CellNote>;
    const noteCellKey =
      typeof candidate.cellKey === "string" ? candidate.cellKey : null;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const position = noteCellKey ? parseCellKey(noteCellKey) : null;
    const text = typeof candidate.text === "string" ? candidate.text.trim() : "";

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !sheet ||
      !noteCellKey ||
      !position ||
      position.rowIndex >= sheet.rowCount ||
      position.columnIndex >= sheet.columnCount ||
      text.length === 0
    ) {
      return notes;
    }

    const now = new Date().toISOString();
    const authorEmail =
      typeof candidate.authorEmail === "string"
        ? candidate.authorEmail.trim().toLowerCase().slice(0, 254)
        : "";
    const authorName =
      typeof candidate.authorName === "string"
        ? candidate.authorName.trim().slice(0, 120)
        : "";
    const mentions = normalizeCellCommentMentions(candidate.mentions);
    const replies = normalizeCellCommentReplies(candidate.replies);
    const status = candidate.status === "resolved" ? "resolved" : "open";

    notes.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      cellKey: noteCellKey,
      text: text.slice(0, 2000),
      authorName: authorName || authorEmail || "Unknown user",
      authorEmail,
      mentions,
      status,
      replies,
      resolvedAt:
        status === "resolved" && typeof candidate.resolvedAt === "string"
          ? candidate.resolvedAt
          : undefined,
      resolvedByName:
        status === "resolved" && typeof candidate.resolvedByName === "string"
          ? candidate.resolvedByName.trim().slice(0, 120)
          : undefined,
      resolvedByEmail:
        status === "resolved" && typeof candidate.resolvedByEmail === "string"
          ? candidate.resolvedByEmail.trim().toLowerCase().slice(0, 254)
          : undefined,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return notes;
  }, []);
}

function normalizeCellCommentMentions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const mentions = new Map<string, { email: string; label: string }>();

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const candidate = item as { email?: unknown; label?: unknown };
    const email =
      typeof candidate.email === "string"
        ? candidate.email.trim().toLowerCase().slice(0, 254)
        : "";

    if (!email) {
      continue;
    }

    mentions.set(email, {
      email,
      label:
        typeof candidate.label === "string"
          ? candidate.label.trim().slice(0, 120) || `@${email}`
          : `@${email}`,
    });
  }

  return Array.from(mentions.values());
}

function normalizeCellCommentReplies(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<CellNote["replies"]>((replies, item) => {
    if (typeof item !== "object" || item === null) {
      return replies;
    }

    const candidate = item as Partial<CellNote["replies"][number]>;
    const text = typeof candidate.text === "string" ? candidate.text.trim() : "";

    if (typeof candidate.id !== "string" || !text) {
      return replies;
    }

    const now = new Date().toISOString();
    const authorEmail =
      typeof candidate.authorEmail === "string"
        ? candidate.authorEmail.trim().toLowerCase().slice(0, 254)
        : "";
    const authorName =
      typeof candidate.authorName === "string"
        ? candidate.authorName.trim().slice(0, 120)
        : "";

    replies.push({
      id: candidate.id,
      text: text.slice(0, 2000),
      authorName: authorName || authorEmail || "Unknown user",
      authorEmail,
      mentions: normalizeCellCommentMentions(candidate.mentions),
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return replies;
  }, []);
}

function normalizeCommentNotifications(
  value: unknown,
  sheets: SheetData[],
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<WorkbookCommentNotification[]>((notifications, item) => {
    if (typeof item !== "object" || item === null) {
      return notifications;
    }

    const candidate = item as Partial<WorkbookCommentNotification>;
    const notificationCellKey =
      typeof candidate.cellKey === "string" ? candidate.cellKey : null;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const position = notificationCellKey ? parseCellKey(notificationCellKey) : null;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !sheet ||
      !notificationCellKey ||
      !position ||
      position.rowIndex >= sheet.rowCount ||
      position.columnIndex >= sheet.columnCount ||
      typeof candidate.noteId !== "string" ||
      typeof candidate.mentionEmail !== "string" ||
      typeof candidate.text !== "string"
    ) {
      return notifications;
    }

    notifications.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      cellKey: notificationCellKey,
      noteId: candidate.noteId,
      replyId:
        typeof candidate.replyId === "string" ? candidate.replyId : undefined,
      mentionEmail: candidate.mentionEmail.trim().toLowerCase().slice(0, 254),
      authorName:
        typeof candidate.authorName === "string"
          ? candidate.authorName.trim().slice(0, 120)
          : "Unknown user",
      authorEmail:
        typeof candidate.authorEmail === "string"
          ? candidate.authorEmail.trim().toLowerCase().slice(0, 254)
          : "",
      text: candidate.text.trim().slice(0, 500),
      createdAt:
        typeof candidate.createdAt === "string"
          ? candidate.createdAt
          : new Date().toISOString(),
      readAt: typeof candidate.readAt === "string" ? candidate.readAt : undefined,
    });

    return notifications;
  }, []);
}

function normalizeCellLinks(value: unknown, sheets: SheetData[]): CellLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<CellLink[]>((links, item) => {
    if (typeof item !== "object" || item === null) {
      return links;
    }

    const candidate = item as Partial<CellLink>;
    const linkCellKey =
      typeof candidate.cellKey === "string" ? candidate.cellKey : null;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const position = linkCellKey ? parseCellKey(linkCellKey) : null;
    const url =
      typeof candidate.url === "string"
        ? normalizeCellLinkUrl(candidate.url)
        : null;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !sheet ||
      !linkCellKey ||
      !position ||
      position.rowIndex >= sheet.rowCount ||
      position.columnIndex >= sheet.columnCount ||
      !url
    ) {
      return links;
    }

    const now = new Date().toISOString();

    links.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      cellKey: linkCellKey,
      url,
      label:
        typeof candidate.label === "string"
          ? candidate.label.trim().slice(0, 200)
          : "",
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return links;
  }, []);
}

function normalizeNamedRangeName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_.]/g, "")
    .replace(/^[^A-Za-z_]+/, "")
    .slice(0, 80);
}

function normalizeNamedRanges(value: unknown, sheets: SheetData[]): NamedRange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<NamedRange[]>((namedRanges, item) => {
    if (typeof item !== "object" || item === null) {
      return namedRanges;
    }

    const candidate = item as Partial<NamedRange>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const range = sheet ? normalizeRange(candidate.range, sheet) : null;
    const candidateRanges =
      sheet && Array.isArray(candidate.ranges)
        ? candidate.ranges
            .map((candidateRange) => normalizeRange(candidateRange, sheet))
            .filter((candidateRange): candidateRange is ChartRange =>
              Boolean(candidateRange),
            )
        : [];
    const normalizedRanges = sheet
      ? normalizeMultiRangeAreas(
          sheet,
          candidateRanges.length > 0 ? candidateRanges : range ? [range] : [],
        )
      : [];
    const primaryRange = normalizedRanges[0] ?? null;
    const name = normalizeNamedRangeName(candidate.name);

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !primaryRange ||
      !name
    ) {
      return namedRanges;
    }

    const now = new Date().toISOString();

    namedRanges.push({
      id: candidate.id,
      sheetId: candidate.sheetId,
      name,
      range: primaryRange,
      ranges: normalizedRanges.length > 1 ? normalizedRanges : undefined,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return namedRanges;
  }, []);
}

function normalizeSheetProtections(
  value: unknown,
  sheets: SheetData[],
): SheetProtection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const protectedSheetIds = new Set<string>();

  return value.reduce<SheetProtection[]>((protections, item) => {
    if (typeof item !== "object" || item === null) {
      return protections;
    }

    const candidate = item as Partial<SheetProtection>;

    if (
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      protectedSheetIds.has(candidate.sheetId)
    ) {
      return protections;
    }

    protectedSheetIds.add(candidate.sheetId);
    protections.push({
      sheetId: candidate.sheetId,
      protectedAt:
        typeof candidate.protectedAt === "string"
          ? candidate.protectedAt
          : new Date().toISOString(),
    });

    return protections;
  }, []);
}

function normalizeWorkbookProtection(value: unknown): WorkbookProtection | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<WorkbookProtection>;
  const importedFormats = new Set<NonNullable<WorkbookProtection["importedFrom"]>>([
    "xlsx",
    "xlsm",
    "xltx",
    "xltm",
    "xls",
    "ods",
  ]);
  const sources = new Set<NonNullable<WorkbookProtection["source"]>>([
    "manual",
    "imported-ooxml",
    "encrypted-package",
  ]);
  const spinCount = Math.max(0, Math.floor(Number(candidate.spinCount) || 0));

  return {
    protectedAt:
      typeof candidate.protectedAt === "string"
        ? candidate.protectedAt
        : new Date().toISOString(),
    ...(typeof candidate.algorithmName === "string" && candidate.algorithmName.trim()
      ? { algorithmName: candidate.algorithmName.trim().slice(0, 80) }
      : {}),
    ...(typeof candidate.hashValue === "string" && candidate.hashValue.trim()
      ? { hashValue: candidate.hashValue.trim().slice(0, 300) }
      : {}),
    ...(candidate.importedFrom && importedFormats.has(candidate.importedFrom)
      ? { importedFrom: candidate.importedFrom }
      : {}),
    ...(typeof candidate.legacyPasswordHash === "string" &&
    candidate.legacyPasswordHash.trim()
      ? { legacyPasswordHash: candidate.legacyPasswordHash.trim().slice(0, 80) }
      : {}),
    ...(typeof candidate.lockStructure === "boolean"
      ? { lockStructure: candidate.lockStructure }
      : {}),
    ...(typeof candidate.lockWindows === "boolean"
      ? { lockWindows: candidate.lockWindows }
      : {}),
    ...(typeof candidate.saltValue === "string" && candidate.saltValue.trim()
      ? { saltValue: candidate.saltValue.trim().slice(0, 300) }
      : {}),
    ...(candidate.source && sources.has(candidate.source)
      ? { source: candidate.source }
      : {}),
    ...(spinCount > 0 ? { spinCount } : {}),
  };
}

function normalizeSheetPrintSettings(
  value: unknown,
  sheets: SheetData[],
): SheetPrintSettings[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const configuredSheetIds = new Set<string>();

  return value.reduce<SheetPrintSettings[]>((settings, item) => {
    if (typeof item !== "object" || item === null) {
      return settings;
    }

    const candidate = item as Partial<SheetPrintSettings>;

    if (
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      configuredSheetIds.has(candidate.sheetId)
    ) {
      return settings;
    }

    configuredSheetIds.add(candidate.sheetId);
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const printArea = sheet ? normalizeRange(candidate.printArea, sheet) : null;

    settings.push(
      getEffectiveSheetPrintSettings(candidate.sheetId, {
        ...candidate,
        printArea: printArea ?? undefined,
        rowPageBreaks: sheet
          ? normalizeIndexes(candidate.rowPageBreaks, sheet.rowCount).filter(
              (rowIndex) => rowIndex > 0,
            )
          : [],
        columnPageBreaks: sheet
          ? normalizeIndexes(candidate.columnPageBreaks, sheet.columnCount).filter(
              (columnIndex) => columnIndex > 0,
            )
          : [],
        updatedAt:
          typeof candidate.updatedAt === "string"
            ? candidate.updatedAt
            : new Date().toISOString(),
      }),
    );

    return settings;
  }, []);
}

function normalizeCustomViews(value: unknown, sheets: SheetData[]) {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value.reduce<WorkbookDocument["customViews"]>((views, item) => {
    if (typeof item !== "object" || item === null) {
      return views;
    }

    const candidate = item as Partial<WorkbookDocument["customViews"][number]>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);

    if (
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !sheet
    ) {
      return views;
    }

    const selectedRange = normalizeRange(candidate.selectedRange, sheet) ?? {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 0,
      endColumnIndex: 0,
    };
    const now = new Date().toISOString();
    const viewMode =
      candidate.viewMode === "pageLayout" ||
      candidate.viewMode === "pageBreakPreview"
        ? candidate.viewMode
        : "normal";
    const splitPaneMode =
      candidate.splitPaneMode === "vertical" ||
      candidate.splitPaneMode === "horizontal" ||
      candidate.splitPaneMode === "quad"
        ? candidate.splitPaneMode
        : "none";

    views.push({
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id.slice(0, 80)
          : `view_${crypto.randomUUID()}`,
      sheetId: candidate.sheetId,
      name:
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim().slice(0, 80)
          : "Custom view",
      viewMode,
      zoomPercent: Math.min(
        Math.max(Math.round(Number(candidate.zoomPercent) || 100), 75),
        150,
      ),
      frozenColumnCount: Math.min(
        Math.max(Math.round(Number(candidate.frozenColumnCount) || 0), 0),
        sheet.columnCount - 1,
      ),
      frozenRowCount: Math.min(
        Math.max(Math.round(Number(candidate.frozenRowCount) || 0), 0),
        sheet.rowCount - 1,
      ),
      splitPaneMode,
      rightToLeft: candidate.rightToLeft === true,
      showPageBreaks: candidate.showPageBreaks === true,
      selectedRange,
      hiddenRows: normalizeIndexes(candidate.hiddenRows, sheet.rowCount),
      hiddenColumns: normalizeIndexes(candidate.hiddenColumns, sheet.columnCount),
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return views;
  }, []);
}

function normalizeFormulaWatches(
  value: unknown,
  sheets: SheetData[],
): FormulaWatch[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const watchedCells = new Set<string>();

  return value.reduce<FormulaWatch[]>((watches, item) => {
    if (typeof item !== "object" || item === null) {
      return watches;
    }

    const candidate = item as Partial<FormulaWatch>;
    const watchCellKey =
      typeof candidate.cellKey === "string" ? candidate.cellKey : null;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const position = watchCellKey ? parseCellKey(watchCellKey) : null;

    if (
      typeof candidate.sheetId !== "string" ||
      !sheetIds.has(candidate.sheetId) ||
      !sheet ||
      !watchCellKey ||
      !position ||
      position.rowIndex < 0 ||
      position.columnIndex < 0 ||
      position.rowIndex >= sheet.rowCount ||
      position.columnIndex >= sheet.columnCount ||
      !sheet.cells[watchCellKey]?.raw.startsWith("=")
    ) {
      return watches;
    }

    const key = `${candidate.sheetId}:${watchCellKey}`;

    if (watchedCells.has(key)) {
      return watches;
    }

    watchedCells.add(key);
    watches.push({
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id.slice(0, 80)
          : `watch_${crypto.randomUUID()}`,
      sheetId: candidate.sheetId,
      cellKey: watchCellKey,
      createdAt:
        typeof candidate.createdAt === "string"
          ? candidate.createdAt
          : new Date().toISOString(),
    });

    return watches;
  }, []);
}

function normalizeWhatIfScenarios(
  value: unknown,
  sheets: SheetData[],
): WhatIfScenario[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));
  const scenariosBySheet = new Map<string, Set<string>>();

  return value.reduce<WhatIfScenario[]>((scenarios, item) => {
    if (typeof item !== "object" || item === null) {
      return scenarios;
    }

    const candidate = item as Partial<WhatIfScenario>;
    const sheet = sheets.find((itemSheet) => itemSheet.id === candidate.sheetId);
    const sheetId =
      typeof candidate.sheetId === "string" ? candidate.sheetId : "";

    if (
      typeof candidate.id !== "string" ||
      !sheetId ||
      !sheetIds.has(sheetId) ||
      !sheet
    ) {
      return scenarios;
    }

    const scenarioNames =
      scenariosBySheet.get(sheetId) ?? new Set<string>();
    const name =
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name.trim().replace(/\s+/g, " ").slice(0, 80)
        : `Scenario ${scenarioNames.size + 1}`;
    const normalizedName = scenarioNames.has(name.toLowerCase())
      ? `${name.slice(0, 72)} ${scenarioNames.size + 1}`
      : name;
    const usedCells = new Set<string>();
    const values = Array.isArray(candidate.values)
      ? candidate.values
          .flatMap((value) => {
            if (typeof value !== "object" || value === null) {
              return [];
            }

            const scenarioValue = value as Partial<WhatIfScenario["values"][number]>;
            const key =
              typeof scenarioValue.cellKey === "string"
                ? scenarioValue.cellKey.trim().toUpperCase()
                : "";
            const position = parseCellKey(key);

            if (
              !key ||
              usedCells.has(key) ||
              !position ||
              position.rowIndex < 0 ||
              position.columnIndex < 0 ||
              position.rowIndex >= sheet.rowCount ||
              position.columnIndex >= sheet.columnCount
            ) {
              return [];
            }

            usedCells.add(key);
            return [
              {
                cellKey: key,
                value:
                  typeof scenarioValue.value === "string"
                    ? scenarioValue.value.slice(0, 5000)
                    : "",
              },
            ];
          })
          .slice(0, 32)
      : [];

    if (values.length === 0) {
      return scenarios;
    }

    const now = new Date().toISOString();

    scenarioNames.add(normalizedName.toLowerCase());
    scenariosBySheet.set(sheetId, scenarioNames);
    scenarios.push({
      id: candidate.id.slice(0, 80),
      sheetId,
      name: normalizedName,
      values,
      createdAt:
        typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    });

    return scenarios;
  }, []).slice(0, 100);
}

function normalizeQueryCredentialMetadata(
  value: unknown,
): WorkbookQueryCredentialMetadata {
  if (typeof value !== "object" || value === null) {
    return {
      kind: "manual",
      label: "No credentials stored.",
      hasStoredSecret: false,
      status: "required",
      updatedAt: "",
    };
  }

  const candidate = value as Partial<WorkbookQueryCredentialMetadata>;
  const kind =
    candidate.kind === "none" ||
    candidate.kind === "manual" ||
    candidate.kind === "environment"
      ? candidate.kind
      : "manual";
  const status =
    candidate.status && WORKBOOK_QUERY_CREDENTIAL_STATUSES.has(candidate.status)
      ? candidate.status
      : kind === "none"
        ? "notRequired"
        : kind === "environment"
          ? "environment"
          : "required";

  return {
    kind,
    label:
      typeof candidate.label === "string"
        ? candidate.label.trim().slice(0, 160)
        : "No credentials stored.",
    hasStoredSecret: false,
    status,
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt.slice(0, 40)
        : "",
  };
}

function isSafeQueryRefreshUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.username || url.password) {
      return false;
    }

    return !Array.from(url.searchParams.keys()).some((key) => {
      const normalizedKey = key.toLowerCase();

      return QUERY_SENSITIVE_URL_KEYS.some((sensitiveKey) =>
        normalizedKey.includes(sensitiveKey),
      );
    });
  } catch {
    return false;
  }
}

function normalizeQuerySource(value: unknown): WorkbookQuerySource | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<WorkbookQuerySource>;

  if (candidate.type === "url") {
    const refreshUrl =
      typeof candidate.refreshUrl === "string" &&
      isSafeQueryRefreshUrl(candidate.refreshUrl)
        ? candidate.refreshUrl.trim().slice(0, 500)
        : undefined;

    return {
      type: "url",
      displayUrl:
        typeof candidate.displayUrl === "string"
          ? candidate.displayUrl.trim().slice(0, 500)
          : "",
      refreshUrl,
      credential: normalizeQueryCredentialMetadata(candidate.credential),
    };
  }

  if (candidate.type === "database") {
    return {
      type: "database",
      connectionName:
        typeof candidate.connectionName === "string"
          ? candidate.connectionName.trim().slice(0, 120)
          : "Database result",
      credential: normalizeQueryCredentialMetadata(candidate.credential),
    };
  }

  return null;
}

function normalizeQueryRefreshHistory(
  value: unknown,
): WorkbookQueryRefreshHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item, index) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookQueryRefreshHistoryEntry>;
      const status: WorkbookQueryRefreshHistoryEntry["status"] =
        candidate.status === "error" ? "error" : "success";
      const diagnosticCode =
        candidate.diagnosticCode &&
        WORKBOOK_QUERY_REFRESH_DIAGNOSTIC_CODES.has(candidate.diagnosticCode)
          ? candidate.diagnosticCode
          : undefined;

      return [
        {
          attempt: Math.max(1, Math.floor(Number(candidate.attempt) || 1)),
          diagnosticCode,
          id:
            typeof candidate.id === "string" && candidate.id.trim()
              ? candidate.id.trim().slice(0, 80)
              : `refresh_${index}`,
          nextRetryAt:
            typeof candidate.nextRetryAt === "string"
              ? candidate.nextRetryAt.slice(0, 40)
              : undefined,
          refreshedAt:
            typeof candidate.refreshedAt === "string"
              ? candidate.refreshedAt.slice(0, 40)
              : "",
          retryable: status === "error" && candidate.retryable === true,
          status,
          message:
            typeof candidate.message === "string"
              ? candidate.message.trim().slice(0, 240)
              : status === "error"
                ? "Refresh failed."
                : "Refresh completed.",
          rowCount: Math.max(0, Math.floor(Number(candidate.rowCount) || 0)),
          columnCount: Math.max(0, Math.floor(Number(candidate.columnCount) || 0)),
          durationMs: Math.max(0, Math.floor(Number(candidate.durationMs) || 0)),
        },
      ];
    })
    .slice(0, 20);
}

function normalizeWorkbookQueries(
  value: unknown,
  sheets: SheetData[],
): WorkbookQueryDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetIds = new Set(sheets.map((sheet) => sheet.id));

  return value
    .flatMap((item, index) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookQueryDefinition>;
      const sheetId = typeof candidate.sheetId === "string" ? candidate.sheetId : "";

      if (!sheetIds.has(sheetId)) {
        return [];
      }

      const source = normalizeQuerySource(candidate.source);

      if (!source) {
        return [];
      }

      const format: WorkbookQueryFormat =
        candidate.format && WORKBOOK_QUERY_FORMATS.has(candidate.format)
          ? candidate.format
          : "auto";
      const refreshMode: WorkbookQueryDefinition["refreshMode"] =
        candidate.refreshMode === "url" &&
        source.type === "url" &&
        Boolean(source.refreshUrl)
          ? "url"
          : "manual";
      const lastRefreshStatus: WorkbookQueryDefinition["lastRefreshStatus"] =
        candidate.lastRefreshStatus === "error"
          ? "error"
          : candidate.lastRefreshStatus === "success"
            ? "success"
            : undefined;
      const lastRefreshDiagnosticCode =
        candidate.lastRefreshDiagnosticCode &&
        WORKBOOK_QUERY_REFRESH_DIAGNOSTIC_CODES.has(
          candidate.lastRefreshDiagnosticCode,
        )
          ? candidate.lastRefreshDiagnosticCode
          : undefined;

      return [
        {
          id:
            typeof candidate.id === "string" && candidate.id.trim()
              ? candidate.id.trim().slice(0, 80)
              : `query_${index}`,
          name:
            typeof candidate.name === "string" && candidate.name.trim()
              ? candidate.name.trim().slice(0, 80)
              : `Query ${index + 1}`,
          sheetId,
          sourceName:
            typeof candidate.sourceName === "string"
              ? candidate.sourceName.trim().slice(0, 80)
              : "Imported data",
          source,
          format,
          transformSteps: normalizeImportConnectorTransformSteps(
            candidate.transformSteps,
          ),
          refreshMode,
          lastRefreshAt:
            typeof candidate.lastRefreshAt === "string"
              ? candidate.lastRefreshAt.slice(0, 40)
              : undefined,
          lastRefreshStatus,
          lastRefreshMessage:
            typeof candidate.lastRefreshMessage === "string"
              ? candidate.lastRefreshMessage.trim().slice(0, 240)
              : undefined,
          lastRefreshDiagnosticCode,
          nextRetryAt:
            lastRefreshStatus === "error" &&
            typeof candidate.nextRetryAt === "string"
              ? candidate.nextRetryAt.slice(0, 40)
              : undefined,
          refreshHistory: normalizeQueryRefreshHistory(candidate.refreshHistory),
          createdAt:
            typeof candidate.createdAt === "string"
              ? candidate.createdAt.slice(0, 40)
              : "",
          updatedAt:
            typeof candidate.updatedAt === "string"
              ? candidate.updatedAt.slice(0, 40)
              : "",
        },
      ];
    })
    .slice(0, 100);
}

export function normalizeWorkbookDocument(value: unknown): WorkbookDocument {
  if (typeof value !== "object" || value === null) {
    return {
      version: 1,
      metadata: {
        description: "",
        favorite: false,
        folderName: "",
        isTemplate: false,
        lastOpenedAt: "",
        tags: [],
        updatedAt: "",
      },
      calculationSettings: createDefaultWorkbookCalculationSettings(),
      activeSheetId: "",
      versionHistory: [],
      versionRestores: [],
      protectedRanges: [],
      trackedChanges: [],
      customViews: [],
      formulaWatches: [],
      whatIfScenarios: [],
      theme: defaultWorkbookTheme,
      cellStyles: [],
      queries: [],
      macroProjects: [],
      unsupportedParts: [],
      nativeObjects: [],
      automationScripts: [],
      customFunctions: [],
      addIns: [],
      workbookProtection: null,
      sheets: [createBlankSheet()],
      charts: [],
      sparklines: [],
      insertedObjects: [],
      tables: [],
      dataModelRelationships: [],
      dataModelHierarchies: [],
      dataModelKpis: [],
      dataModelPerspectives: [],
      dataModelStorage: defaultLargeDataModelStorageSettings,
      tableSlicers: [],
      tableTimelines: [],
      pivotTables: [],
      conditionalFormats: [],
      dataValidations: [],
      filters: [],
      filterPresets: [],
      cellNotes: [],
      commentNotifications: [],
      cellLinks: [],
      namedRanges: [],
      sheetProtections: [],
      sheetPrintSettings: [],
    };
  }

  const candidate = value as Partial<WorkbookDocument>;
  const sheets = Array.isArray(candidate.sheets)
    ? candidate.sheets.map((sheet, index) => normalizeSheet(sheet, `Sheet ${index + 1}`))
    : [createBlankSheet()];
  const firstSheet = sheets[0] ?? createBlankSheet();
  const activeSheetId =
    typeof candidate.activeSheetId === "string" &&
    sheets.some((sheet) => sheet.id === candidate.activeSheetId)
      ? candidate.activeSheetId
      : firstSheet.id;

  const tables = normalizeTables(candidate.tables, sheets);
  const dataModelRelationships = normalizeDataModelRelationships(
    candidate.dataModelRelationships,
    tables,
  );
  const dataModelHierarchies = normalizeDataModelHierarchies(
    candidate.dataModelHierarchies,
    tables,
  );
  const dataModelKpis = normalizeDataModelKpis(candidate.dataModelKpis, tables);
  const dataModelPerspectives = normalizeDataModelPerspectives(
    candidate.dataModelPerspectives,
    tables,
  );
  const pivotTables = normalizePivotTables(candidate.pivotTables, sheets, tables);

  return {
    version: 1,
    metadata: normalizeWorkbookMetadata(candidate.metadata),
    calculationSettings: normalizeWorkbookCalculationSettings(
      candidate.calculationSettings,
    ),
    activeSheetId,
    versionHistory: normalizeVersionHistory(candidate.versionHistory),
    versionRestores: normalizeVersionRestores(candidate.versionRestores),
    protectedRanges: normalizeProtectedRanges(candidate.protectedRanges, sheets),
    trackedChanges: normalizeTrackedChanges(candidate.trackedChanges, sheets),
    customViews: normalizeCustomViews(candidate.customViews, sheets),
    formulaWatches: normalizeFormulaWatches(candidate.formulaWatches, sheets),
    whatIfScenarios: normalizeWhatIfScenarios(
      candidate.whatIfScenarios,
      sheets,
    ),
    theme: normalizeWorkbookTheme(candidate.theme),
    cellStyles: normalizeWorkbookCellStyles(candidate.cellStyles),
    queries: normalizeWorkbookQueries(candidate.queries, sheets),
    macroProjects: normalizeMacroProjects(candidate.macroProjects),
    unsupportedParts: normalizeUnsupportedWorkbookParts(candidate.unsupportedParts),
    nativeObjects: normalizeNativeWorkbookObjects(candidate.nativeObjects, sheets),
    automationScripts: normalizeAutomationScripts(candidate.automationScripts),
    customFunctions: normalizeCustomFunctions(candidate.customFunctions),
    addIns: normalizeAddIns(candidate.addIns),
    workbookProtection: normalizeWorkbookProtection(candidate.workbookProtection),
    sheets: sheets.length > 0 ? sheets : [firstSheet],
    charts: normalizeCharts(candidate.charts, sheets, pivotTables),
    sparklines: normalizeSparklines(candidate.sparklines, sheets),
    insertedObjects: normalizeInsertedObjects(
      candidate.insertedObjects,
      sheets,
    ),
    tables,
    dataModelRelationships,
    dataModelHierarchies,
    dataModelKpis,
    dataModelPerspectives,
    dataModelStorage: normalizeDataModelStorage(candidate.dataModelStorage),
    tableSlicers: normalizeTableSlicers(candidate.tableSlicers, sheets, tables),
    tableTimelines: normalizeTableTimelines(
      candidate.tableTimelines,
      sheets,
      tables,
    ),
    pivotTables,
    conditionalFormats: normalizeConditionalFormats(
      candidate.conditionalFormats,
      sheets,
      pivotTables,
    ),
    dataValidations: normalizeDataValidations(candidate.dataValidations, sheets),
    filters: normalizeFilters(candidate.filters, sheets),
    filterPresets: normalizeFilterPresets(candidate.filterPresets, sheets),
    cellNotes: normalizeCellNotes(candidate.cellNotes, sheets),
    commentNotifications: normalizeCommentNotifications(
      candidate.commentNotifications,
      sheets,
    ),
    cellLinks: normalizeCellLinks(candidate.cellLinks, sheets),
    namedRanges: normalizeNamedRanges(candidate.namedRanges, sheets),
    sheetProtections: normalizeSheetProtections(
      candidate.sheetProtections,
      sheets,
    ),
    sheetPrintSettings: normalizeSheetPrintSettings(
      candidate.sheetPrintSettings,
      sheets,
    ),
  };
}

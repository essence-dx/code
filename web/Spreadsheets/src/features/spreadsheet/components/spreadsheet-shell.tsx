"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FindBar } from "@/features/spreadsheet/components/find-bar";
import {
  createChartFileName,
  workbookChartToSvg,
} from "@/features/spreadsheet/chart-export";
import { canAddSparkline } from "@/features/spreadsheet/state/chart-state";
import { getConditionalCellStyles } from "@/features/spreadsheet/conditional-formatting";
import { resolvePivotConditionalFormatRules } from "@/features/spreadsheet/pivot/pivot-conditional-formatting";
import { getInvalidCellIssues } from "@/features/spreadsheet/data-validation";
import { getExternalLinkIssues } from "@/features/spreadsheet/external-link-review";
import { FormulaBar } from "@/features/spreadsheet/components/formula-bar";
import { getFilterColumnLabels } from "@/features/spreadsheet/filter-column-labels";
import { SheetSidePanel } from "@/features/spreadsheet/components/sheet-side-panel";
import { SheetTabs } from "@/features/spreadsheet/components/sheet-tabs";
import {
  getFormulaReferenceKeys,
  getFormulaReferences,
} from "@/features/spreadsheet/formula-audit";
import { getFormulaCheckingIssues } from "@/features/spreadsheet/formula-checking";
import { getFormulaConsistencyIssues } from "@/features/spreadsheet/formula-consistency";
import { getDataModelRelationshipIssues } from "@/features/spreadsheet/data-model";
import {
  getFormulaTrace,
  getFormulaTraceKeys,
  getWorkbookCircularReferenceIssues,
  type CircularReferenceIssue,
} from "@/features/spreadsheet/formula-dependency-graph";
import { getFormulaErrorIssues } from "@/features/spreadsheet/formula-errors";
import {
  getFormulaWatchableCellCount,
  getFormulaWatchRows,
} from "@/features/spreadsheet/formula-watch";
import { getSheetDynamicArrayState } from "@/features/spreadsheet/dynamic-arrays";
import {
  getGoToSpecialTargets,
  resolveGoToReference,
  type GoToSpecialTarget,
} from "@/features/spreadsheet/go-to";
import { htmlTableToClipboardPayload } from "@/features/spreadsheet/clipboard";
import { getFilterValueOptionsByColumn } from "@/features/spreadsheet/filter-values";
import { getStyleCriterionOptionsByColumn } from "@/features/spreadsheet/style-criteria";
import type { FormulaReference } from "@/features/spreadsheet/formula-audit";
import type { AuditLogRow } from "@/features/audit/audit-log-service";
import { getSpreadsheetScreenReaderAnnouncement } from "@/features/spreadsheet/screen-reader-announcements";
import { getSelectionSummary } from "@/features/spreadsheet/selection-summary";
import { getVisibleRowIndexes } from "@/features/spreadsheet/sheet-filtering";
import { createTableSlicerFilterRules } from "@/features/spreadsheet/table-slicers";
import { createTableTimelineFilterRules } from "@/features/spreadsheet/table-timelines";
import {
  getShortcutCommandForEvent,
  type SpreadsheetShortcutCommand,
} from "@/features/spreadsheet/keyboard-shortcuts";
import { createAutoSumFormula } from "@/features/spreadsheet/autosum";
import { getWorkbookAccessibilityIssues } from "@/features/spreadsheet/workbook-accessibility";
import {
  compareWorkbookDocuments,
  mergeWorkbookCompareItems,
  type WorkbookCompareItem,
} from "@/features/spreadsheet/workbook-compare";
import {
  getNamedRangeAreas,
  normalizeMultiRangeAreas,
} from "@/features/spreadsheet/multi-range-selection";
import { getWorkbookCompatibilityIssues } from "@/features/spreadsheet/workbook-compatibility";
import { getWorkbookInspectionIssues } from "@/features/spreadsheet/workbook-inspection";
import { getWorkbookSpellCheckIssues } from "@/features/spreadsheet/workbook-spell-check";
import { getWorkbookStatistics } from "@/features/spreadsheet/workbook-statistics";
import {
  createInsertedImageInputFromClipboard,
  getClipboardImageFile,
  validateWorksheetImageFile,
} from "@/features/spreadsheet/clipboard-image";
import { rangeToPngBlob } from "@/features/spreadsheet/range-image";
import {
  SpreadsheetGridPanes,
  type SplitPaneMode,
  type WorkbookWindowPaneDefinition,
} from "@/features/spreadsheet/components/spreadsheet-grid-panes";
import type { SpreadsheetGridProps } from "@/features/spreadsheet/components/spreadsheet-grid";
import { WorkbookSaveConflictAlert } from "@/features/spreadsheet/components/workbook-save-conflict-alert";
import { SpreadsheetToolbar } from "@/features/spreadsheet/components/spreadsheet-toolbar";
import { WorkbookPresenceBar } from "@/features/spreadsheet/components/workbook-presence-bar";
import type {
  TextConnectorImportRequest,
  UrlConnectorImportRequest,
} from "@/features/spreadsheet/components/spreadsheet-import-connectors-dialog";
import { findCellMatches } from "@/features/spreadsheet/search";
import { useKeyboardShortcutPreferences } from "@/features/spreadsheet/use-keyboard-shortcut-preferences";
import { useWorkbookPresence } from "@/features/spreadsheet/use-workbook-presence";
import { useSpreadsheetState } from "@/features/spreadsheet/use-spreadsheet-state";
import { createWorkbookWindowGridState } from "@/features/spreadsheet/workbook-window-grid-state";
import {
  activateWorkbookWindow,
  areWorkbookWindowStatesEqual,
  closeWorkbookWindow,
  createInitialWorkbookWindowState,
  createWorkbookWindowViewModels,
  openWorkbookWindow,
  setWorkbookWindowSheet,
  type WorkbookWindowState,
} from "@/features/spreadsheet/workbook-window-views";
import { parseCellKey } from "@/features/workbooks/addresses";
import { createSpreadsheetVisibleRowsClipboardPayload } from "@/features/spreadsheet/cell-clipboard";
import type {
  PasteSpecialMode,
  SpreadsheetClipboardPayload,
} from "@/features/spreadsheet/cell-clipboard";
import type {
  CellRange,
  CellSelection,
} from "@/features/spreadsheet/state/selection-state";
import {
  deleteWorkbookAction,
  createWorkbookImportReservationAction,
  logWorkbookExportAction,
  logWorkbookImportAction,
  saveWorkbookAction,
} from "@/features/workbooks/actions";
import { WorkbookTitleForm } from "@/features/workbooks/components/workbook-title-form";
import {
  canCommentWorkbook,
  canEditWorkbook,
} from "@/features/workbooks/sharing-permissions";
import {
  csvToSheet,
  sheetToCsv,
  sheetToTsv,
  tsvToSheet,
} from "@/features/workbooks/csv";
import { sheetToHtml, sheetToPrintPreviewPages } from "@/features/workbooks/html";
import { getImportRateLimitMessage } from "@/features/workbooks/import-rate-limit-message";
import {
  getImportSanitizationNotice,
  sanitizeImportedSheet,
  sanitizeWorkbookImportDocument,
  type ImportSanitizationReport,
} from "@/features/workbooks/import-sanitizer";
import {
  parseImportConnectorText,
  type ImportConnectorResult,
} from "@/features/workbooks/import-connectors";
import {
  openWorkbookFromLocalFile,
  saveWorkbookToLocalFile,
} from "@/features/workbooks/local-workbook-file";
import { createWorkbookQueryDefinition } from "@/features/workbooks/query-definitions";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import { useOfflineWorkbookCache } from "@/features/workbooks/use-offline-workbook-cache";
import {
  createWorkbookBackupFileName,
  parseWorkbookBackup,
  workbookDocumentToBackupJson,
} from "@/features/workbooks/workbook-backup";
import { getWorkbookCellStylePresets } from "@/features/workbooks/workbook-themes";
import { sheetToPdf } from "@/features/workbooks/pdf";
import { sheetToXml } from "@/features/workbooks/xml";
import {
  odsToWorkbookDocument,
  recoverWorkbookDocumentFromBuffer,
  workbookDocumentToXlsm,
  workbookDocumentToOds,
  workbookDocumentToXls,
  workbookDocumentToXltm,
  workbookDocumentToXltx,
  workbookDocumentToXlsx,
  xlsmToWorkbookDocument,
  xlsToWorkbookDocument,
  xltmToWorkbookDocument,
  xltxToWorkbookDocument,
  xlsxToWorkbookDocument,
} from "@/features/workbooks/xlsx";
import type {
  CellStyle,
  ChartDefinition,
  PersistedWorkbook,
  SheetViewMode,
  WorkbookTrackedChange,
  WorkbookDocument,
  WorkbookQueryDefinition,
} from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

type HtmlTextClipboardPayload = {
  html: string;
  text: string;
};

type WorkbookImportFileFormat =
  | "xlsx"
  | "xlsm"
  | "xltx"
  | "xltm"
  | "xls"
  | "ods";

async function writeHtmlTextClipboard(payload: HtmlTextClipboardPayload) {
  if (!navigator.clipboard) {
    return;
  }

  if ("ClipboardItem" in window && "write" in navigator.clipboard) {
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          "text/html": new Blob([payload.html], { type: "text/html" }),
          "text/plain": new Blob([payload.text], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      await navigator.clipboard.writeText(payload.text);
      return;
    }
  }

  await navigator.clipboard.writeText(payload.text);
}

async function writeSpreadsheetClipboard(payload: SpreadsheetClipboardPayload) {
  await writeHtmlTextClipboard(payload);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function printHtmlDocument(html: string) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 100);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Image file could not be read."));
    });
    reader.addEventListener("error", () => {
      reject(new Error("Image file could not be read."));
    });
    reader.readAsDataURL(file);
  });
}

async function readWorkbookComparisonDocument(
  file: File,
): Promise<WorkbookDocument> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".xltx")) {
    return xltxToWorkbookDocument(await file.arrayBuffer());
  }

  if (lowerName.endsWith(".xltm")) {
    return xltmToWorkbookDocument(await file.arrayBuffer());
  }

  if (lowerName.endsWith(".xlsx")) {
    return xlsxToWorkbookDocument(await file.arrayBuffer());
  }

  if (lowerName.endsWith(".xlsm")) {
    return xlsmToWorkbookDocument(await file.arrayBuffer());
  }

  if (lowerName.endsWith(".xls")) {
    return xlsToWorkbookDocument(await file.arrayBuffer());
  }

  if (lowerName.endsWith(".ods")) {
    return odsToWorkbookDocument(await file.arrayBuffer());
  }

  if (lowerName.endsWith(".json")) {
    const text = await file.text();

    try {
      return parseWorkbookBackup(text).document;
    } catch {
      return normalizeWorkbookDocument(JSON.parse(text));
    }
  }

  throw new Error(
    "Select a JSON, Essence backup, XLSX, XLSM, XLTX, XLTM, XLS, or ODS workbook.",
  );
}

function getWorkbookImportFileFormat(fileName: string): WorkbookImportFileFormat | null {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".xltx")) {
    return "xltx";
  }

  if (lowerName.endsWith(".xltm")) {
    return "xltm";
  }

  if (lowerName.endsWith(".xlsx")) {
    return "xlsx";
  }

  if (lowerName.endsWith(".xlsm")) {
    return "xlsm";
  }

  if (lowerName.endsWith(".xls")) {
    return "xls";
  }

  if (lowerName.endsWith(".ods")) {
    return "ods";
  }

  return null;
}

function toSyncToken(value: Date | string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

type UrlConnectorResponse =
  | ({ ok: true } & ImportConnectorResult)
  | {
      error: string;
      ok: false;
    };

export function SpreadsheetShell({
  embedded = false,
  workbook,
  activityLogs,
  currentUser,
}: {
  embedded?: boolean;
  workbook: PersistedWorkbook;
  activityLogs: AuditLogRow[];
  currentUser: {
    email: string;
    name: string;
  };
}) {
  const state = useSpreadsheetState(workbook.document, {
    accessRole: workbook.accessRole,
    currentUser,
  });
  const keyboardShortcuts = useKeyboardShortcutPreferences();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [findQuery, setFindQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [frozenColumnCount, setFrozenColumnCount] = useState(0);
  const [frozenRowCount, setFrozenRowCount] = useState(0);
  const [splitPaneMode, setSplitPaneMode] = useState<SplitPaneMode>("none");
  const [workbookWindowState, setWorkbookWindowState] = useState(() =>
    createInitialWorkbookWindowState(
      workbook.document.sheets,
      workbook.document.activeSheetId,
    ),
  );
  const [sheetViewMode, setSheetViewMode] = useState<SheetViewMode>("normal");
  const [isRightToLeft, setIsRightToLeft] = useState(false);
  const [showPageBreaks, setShowPageBreaks] = useState(false);
  const [filterReapplyVersion, setFilterReapplyVersion] = useState(0);
  const [formatPainterStyle, setFormatPainterStyle] =
    useState<CellStyle | null>(null);
  const [multiRangeAreas, setMultiRangeAreas] = useState<CellRange[]>([]);
  const [activeFindIndex, setActiveFindIndex] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [workbookCompareDocument, setWorkbookCompareDocument] =
    useState<WorkbookDocument | null>(null);
  const [workbookCompareError, setWorkbookCompareError] = useState<string | null>(
    null,
  );
  const [workbookCompareFileName, setWorkbookCompareFileName] = useState("");
  const [workbookCompareNotice, setWorkbookCompareNotice] = useState<
    string | null
  >(null);
  const [saveConflictUpdatedAt, setSaveConflictUpdatedAt] = useState<
    string | null
  >(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(() =>
    toSyncToken(workbook.updatedAt),
  );
  const [clipboardPayload, setClipboardPayload] =
    useState<SpreadsheetClipboardPayload | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const editorRef = useRef<HTMLElement>(null);
  const latestDocument = useRef(state.document);
  const canEditCurrentWorkbook = canEditWorkbook(workbook.accessRole);
  const canCommentCurrentWorkbook = canCommentWorkbook(workbook.accessRole);
  const isReadOnlyAccess = !canEditCurrentWorkbook;
  const isOwnerAccess = workbook.accessRole === "owner";
  const presence = useWorkbookPresence({
    enabled: !embedded,
    isDirty: state.isDirty,
    selected: state.selected,
    selectedRange: state.selectedRange,
    sheetId: state.activeSheet.id,
    sheetName: state.activeSheet.name,
    user: currentUser,
    workbookId: workbook.id,
  });

  latestDocument.current = state.document;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setMultiRangeAreas([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state.activeSheet.id]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setWorkbookWindowState((current) => {
        const next = setWorkbookWindowSheet({
          ...current,
          sheetId: state.document.activeSheetId,
          sheets: state.document.sheets,
          windowId: current.activeWindowId,
        });

        return areWorkbookWindowStatesEqual(current, next) ? current : next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [state.document.activeSheetId, state.document.sheets]);

  const workbookWindowViews = useMemo(
    () =>
      createWorkbookWindowViewModels({
        ...workbookWindowState,
        sheets: state.document.sheets,
      }),
    [state.document.sheets, workbookWindowState],
  );

  const workbookStatistics = useMemo(
    () => getWorkbookStatistics(state.document),
    [state.document],
  );
  const cellStylePresets = useMemo(
    () =>
      getWorkbookCellStylePresets(
        state.document.theme,
        state.document.cellStyles ?? [],
      ),
    [state.document.cellStyles, state.document.theme],
  );
  const workbookInspectionIssues = useMemo(
    () => getWorkbookInspectionIssues(state.document),
    [state.document],
  );
  const workbookAccessibilityIssues = useMemo(
    () => getWorkbookAccessibilityIssues(state.document),
    [state.document],
  );
  const workbookCompatibilityIssues = useMemo(
    () => getWorkbookCompatibilityIssues(state.document),
    [state.document],
  );
  const workbookCompareResult = useMemo(
    () =>
      workbookCompareDocument
        ? compareWorkbookDocuments({
            base: state.document,
            incoming: workbookCompareDocument,
            incomingName: workbookCompareFileName,
          })
        : null,
    [state.document, workbookCompareDocument, workbookCompareFileName],
  );
  const workbookSpellCheckIssues = useMemo(
    () => getWorkbookSpellCheckIssues(state.document),
    [state.document],
  );
  const {
    cacheCurrentWorkbookSnapshot,
    clearOfflineCache,
    deleteOfflineRecoveryCheckpoint,
    offlineCacheMeta,
    offlineNotice,
    offlineRecoveryCheckpoints,
    offlineSyncPlan,
    restoreOfflineCache,
    setOfflineNotice,
  } = useOfflineWorkbookCache({
    document: state.document,
    isDirty: state.isDirty,
    isReadOnlyAccess,
    serverUpdatedAt: lastSyncedAt,
    workbookId: workbook.id,
    workbookName: workbook.name,
  });
  const goToSpecialTargets = useMemo(
    () => getGoToSpecialTargets(state.document),
    [state.document],
  );
  const findMatches = useMemo(
    () =>
      findCellMatches(state.activeSheet, state.computedValues, findQuery, {
        hideHiddenFormulas: state.isActiveSheetProtected,
      }),
    [
      findQuery,
      state.activeSheet,
      state.computedValues,
      state.isActiveSheetProtected,
    ],
  );
  const activeFindMatch = findMatches[activeFindIndex] ?? null;
  const formulaReferences = useMemo(
    () =>
      getFormulaReferences({
        formula: state.isSelectedFormulaHidden ? "" : state.selectedRaw,
        activeSheet: state.activeSheet,
        cellPosition: state.selected,
        document: state.document,
        sheets: state.document.sheets,
      }),
    [
      state.activeSheet,
      state.document,
      state.document.sheets,
      state.isSelectedFormulaHidden,
      state.selected,
      state.selectedRaw,
    ],
  );
  const formulaReferenceKeys = useMemo(
    () => getFormulaReferenceKeys(formulaReferences, state.activeSheet.id),
    [formulaReferences, state.activeSheet.id],
  );
  const formulaTrace = useMemo(
    () =>
      getFormulaTrace({
        document: state.document,
        key: state.selectedKey,
        sheetId: state.activeSheet.id,
      }),
    [state.activeSheet.id, state.document, state.selectedKey],
  );
  const circularReferences = useMemo(
    () => getWorkbookCircularReferenceIssues(state.document),
    [state.document],
  );
  const formulaTraceKeys = useMemo(
    () =>
      getFormulaTraceKeys(
        [...formulaTrace.precedents, ...formulaTrace.dependents],
        state.activeSheet.id,
      ),
    [formulaTrace.dependents, formulaTrace.precedents, state.activeSheet.id],
  );
  const activeSheetPrintHtml = useMemo(
    () =>
      sheetToHtml(
        state.activeSheet,
        state.computedValues,
        state.activePrintSettings,
        { fileName: workbook.name },
      ),
    [
      state.activePrintSettings,
      state.activeSheet,
      state.computedValues,
      workbook.name,
    ],
  );
  const activeSheetPrintPreviewPages = useMemo(
    () =>
      sheetToPrintPreviewPages(
        state.activeSheet,
        state.computedValues,
        state.activePrintSettings,
        { fileName: workbook.name },
      ),
    [
      state.activePrintSettings,
      state.activeSheet,
      state.computedValues,
      workbook.name,
    ],
  );
  const highlightedKeys = useMemo(
    () =>
      new Set([
        ...findMatches.map((match) => match.key),
        ...formulaReferenceKeys,
        ...formulaTraceKeys,
      ]),
    [findMatches, formulaReferenceKeys, formulaTraceKeys],
  );
  const activeCharts = useMemo(
    () =>
      state.document.charts.filter(
        (chart) => chart.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.charts],
  );
  const activeSparklines = useMemo(
    () =>
      (state.document.sparklines ?? []).filter(
        (sparkline) => sparkline.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.sparklines],
  );
  const activeInsertedObjects = useMemo(
    () =>
      (state.document.insertedObjects ?? []).filter(
        (object) => object.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.insertedObjects],
  );
  const activeTables = useMemo(
    () =>
      (state.document.tables ?? []).filter(
        (table) => table.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.tables],
  );
  const dataModelIssues = useMemo(
    () =>
      getDataModelRelationshipIssues({
        activeSheetId: state.activeSheet.id,
        computedValues: state.computedValues,
        document: state.document,
      }),
    [state.activeSheet.id, state.computedValues, state.document],
  );
  const activeTableSlicers = useMemo(
    () =>
      (state.document.tableSlicers ?? []).filter(
        (slicer) => slicer.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.tableSlicers],
  );
  const activeTableTimelines = useMemo(
    () =>
      (state.document.tableTimelines ?? []).filter(
        (timeline) => timeline.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.tableTimelines],
  );
  const activePivotTables = useMemo(
    () =>
      (state.document.pivotTables ?? []).filter(
        (pivotTable) => pivotTable.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.pivotTables],
  );
  const activeWhatIfScenarios = useMemo(
    () =>
      (state.document.whatIfScenarios ?? []).filter(
        (scenario) => scenario.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.whatIfScenarios],
  );
  const activeConditionalFormats = useMemo(
    () =>
      resolvePivotConditionalFormatRules({
        pivotTables: state.document.pivotTables ?? [],
        rules: state.document.conditionalFormats ?? [],
      }).filter(
        (rule) => rule.sheetId === state.activeSheet.id,
      ),
    [
      state.activeSheet.id,
      state.document.conditionalFormats,
      state.document.pivotTables,
    ],
  );
  const activeDataValidations = useMemo(
    () =>
      (state.document.dataValidations ?? []).filter(
        (rule) => rule.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.dataValidations],
  );
  const activeManualFilters = useMemo(
    () =>
      (state.document.filters ?? []).filter(
        (rule) => rule.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.filters],
  );
  const activeSlicerFilters = useMemo(
    () =>
      createTableSlicerFilterRules({
        slicers: activeTableSlicers,
        tables: activeTables,
      }),
    [activeTableSlicers, activeTables],
  );
  const activeTimelineFilters = useMemo(
    () =>
      createTableTimelineFilterRules({
        timelines: activeTableTimelines,
        tables: activeTables,
        sheet: state.activeSheet,
        computedValues: state.computedValues,
      }),
    [activeTableTimelines, activeTables, state.activeSheet, state.computedValues],
  );
  const activeFilters = useMemo(
    () => [
      ...activeManualFilters,
      ...activeSlicerFilters,
      ...activeTimelineFilters,
    ],
    [activeManualFilters, activeSlicerFilters, activeTimelineFilters],
  );
  const activeFilterPresets = useMemo(
    () =>
      (state.document.filterPresets ?? []).filter(
        (preset) => preset.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.filterPresets],
  );
  const activeNamedRanges = useMemo(
    () =>
      (state.document.namedRanges ?? []).filter(
        (range) => range.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.namedRanges],
  );
  const activeCustomViews = useMemo(
    () =>
      (state.document.customViews ?? []).filter(
        (view) => view.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.customViews],
  );
  const activeNotes = useMemo(
    () =>
      (state.document.cellNotes ?? []).filter(
        (note) => note.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.cellNotes],
  );
  const activeCommentNotifications = useMemo(
    () =>
      (state.document.commentNotifications ?? []).filter(
        (notification) =>
          notification.sheetId === state.activeSheet.id &&
          notification.mentionEmail === currentUser.email.toLowerCase(),
      ),
    [
      currentUser.email,
      state.activeSheet.id,
      state.document.commentNotifications,
    ],
  );
  const activeLinks = useMemo(
    () =>
      (state.document.cellLinks ?? []).filter(
        (link) => link.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.cellLinks],
  );
  const activeLinkIssues = useMemo(
    () => getExternalLinkIssues(activeLinks),
    [activeLinks],
  );
  const selectedNote = activeNotes.find(
    (note) => note.cellKey === state.selectedKey,
  );
  const selectedLink = activeLinks.find(
    (link) => link.cellKey === state.selectedKey,
  );
  const linkedKeys = useMemo(
    () => new Set(activeLinks.map((link) => link.cellKey)),
    [activeLinks],
  );
  const notedKeys = useMemo(
    () => new Set(activeNotes.map((note) => note.cellKey)),
    [activeNotes],
  );
  const conditionalStyles = useMemo(
    () =>
      getConditionalCellStyles({
        sheet: state.activeSheet,
        rules: activeConditionalFormats,
        computedValues: state.computedValues,
      }),
    [activeConditionalFormats, state.activeSheet, state.computedValues],
  );
  const dataValidationIssues = useMemo(
    () =>
      getInvalidCellIssues({
        sheet: state.activeSheet,
        rules: activeDataValidations,
        computedValues: state.computedValues,
      }),
    [activeDataValidations, state.activeSheet, state.computedValues],
  );
  const formulaErrorIssues = useMemo(
    () =>
      getFormulaErrorIssues({
        sheet: state.activeSheet,
        computedValues: state.computedValues,
        hideHiddenFormulas: state.isActiveSheetProtected,
      }),
    [state.activeSheet, state.computedValues, state.isActiveSheetProtected],
  );
  const formulaCheckingIssues = useMemo(
    () =>
      getFormulaCheckingIssues({
        document: state.document,
        sheet: state.activeSheet,
        sheets: state.document.sheets,
        computedValues: state.computedValues,
        hideHiddenFormulas: state.isActiveSheetProtected,
      }),
    [
      state.activeSheet,
      state.computedValues,
      state.document,
      state.document.sheets,
      state.isActiveSheetProtected,
    ],
  );
  const formulaConsistencyIssues = useMemo(
    () =>
      getFormulaConsistencyIssues({
        sheet: state.activeSheet,
        hideHiddenFormulas: state.isActiveSheetProtected,
      }),
    [state.activeSheet, state.isActiveSheetProtected],
  );
  const formulaWatches = useMemo(
    () =>
      getFormulaWatchRows({
        document: state.document,
        activeSheetId: state.activeSheet.id,
        computedValues: state.computedValues,
      }),
    [state.activeSheet.id, state.computedValues, state.document],
  );
  const dynamicArrayState = useMemo(
    () =>
      getSheetDynamicArrayState({
        sheet: state.activeSheet,
        computedValues: state.computedValues,
      }),
    [state.activeSheet, state.computedValues],
  );
  const selectedFormulaWatchCount = useMemo(
    () =>
      getFormulaWatchableCellCount({
        document: state.document,
        sheetId: state.activeSheet.id,
        range: state.selectedRange,
      }),
    [state.activeSheet.id, state.document, state.selectedRange],
  );
  const invalidKeys = useMemo(
    () =>
      new Set(
        dataValidationIssues
          .filter((issue) => issue.circleInvalid)
          .map((issue) => issue.key),
      ),
    [dataValidationIssues],
  );
  const formulaErrorKeys = useMemo(
    () => new Set(formulaErrorIssues.map((issue) => issue.key)),
    [formulaErrorIssues],
  );
  const visibleRowIndexes = useMemo(
    () =>
      getVisibleRowIndexes({
        sheet: state.activeSheet,
        filters: activeFilters,
        computedValues: state.computedValues,
      }),
    [activeFilters, filterReapplyVersion, state.activeSheet, state.computedValues],
  );
  const filterValueOptions = useMemo(
    () =>
      getFilterValueOptionsByColumn({
        sheet: state.activeSheet,
        range: state.selectedRange,
        computedValues: state.computedValues,
      }),
    [filterReapplyVersion, state.activeSheet, state.computedValues, state.selectedRange],
  );
  const styleFilterOptions = useMemo(
    () =>
      getStyleCriterionOptionsByColumn({
        sheet: state.activeSheet,
        range: state.selectedRange,
      }),
    [filterReapplyVersion, state.activeSheet, state.selectedRange],
  );
  const filterColumnLabels = useMemo(
    () =>
      getFilterColumnLabels({
        sheet: state.activeSheet,
        range: state.selectedRange,
        computedValues: state.computedValues,
      }),
    [state.activeSheet, state.computedValues, state.selectedRange],
  );
  const selectionSummary = useMemo(
    () =>
      getSelectionSummary({
        sheet: state.activeSheet,
        selectedRange: state.selectedRange,
        computedValues: state.computedValues,
      }),
    [state.activeSheet, state.computedValues, state.selectedRange],
  );
  const screenReaderAnnouncement = useMemo(
    () =>
      getSpreadsheetScreenReaderAnnouncement({
        sheet: state.activeSheet,
        selectedRange: state.selectedRange,
        computedValues: state.computedValues,
        dataValidationIssues,
        formulaErrorIssues,
        selectionSummary,
        tables: activeTables,
      }),
    [
      activeTables,
      dataValidationIssues,
      formulaErrorIssues,
      selectionSummary,
      state.activeSheet,
      state.computedValues,
      state.selectedRange,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setActiveFindIndex(0);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [findQuery, state.activeSheet.id]);

  useEffect(() => {
    if (state.isActiveSheetProtected) {
      let cancelled = false;

      queueMicrotask(() => {
        if (!cancelled) {
          setEditingKey(null);
          setFormatPainterStyle(null);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [state.isActiveSheetProtected]);

  useEffect(() => {
    if (focusModeActive) {
      editorRef.current?.focus();
    }
  }, [focusModeActive]);

  useEffect(() => {
    if (activeFindMatch) {
      state.selectCell({
        rowIndex: activeFindMatch.rowIndex,
        columnIndex: activeFindMatch.columnIndex,
      });
    }
  }, [activeFindMatch]);

  function replaceActiveMatch() {
    if (!activeFindMatch) {
      return;
    }

    state.replaceCellText(
      {
        rowIndex: activeFindMatch.rowIndex,
        columnIndex: activeFindMatch.columnIndex,
      },
      findQuery,
      replaceValue,
    );
  }

  function replaceAllMatches() {
    state.replaceAllText(findQuery, replaceValue);
    setActiveFindIndex(0);
  }

  function setClampedZoom(nextZoomPercent: number) {
    setZoomPercent(Math.min(Math.max(nextZoomPercent, 75), 150));
  }

  function handleSetSheetViewMode(mode: SheetViewMode) {
    setSheetViewMode(mode);

    if (mode === "pageBreakPreview") {
      setShowPageBreaks(true);
    }
  }

  function handleSaveCustomView(name: string) {
    state.saveCustomView({
      name,
      viewMode: sheetViewMode,
      zoomPercent,
      frozenColumnCount,
      frozenRowCount,
      splitPaneMode,
      rightToLeft: isRightToLeft,
      showPageBreaks: effectiveShowPageBreaks,
      selectedRange: state.selectedRange,
    });
  }

  function handleApplyCustomView(viewId: string) {
    const view = state.applyCustomView(viewId);

    if (!view) {
      return;
    }

    setSheetViewMode(view.viewMode);
    setZoomPercent(view.zoomPercent);
    setFrozenColumnCount(view.frozenColumnCount);
    setFrozenRowCount(view.frozenRowCount);
    setSplitPaneMode(view.splitPaneMode);
    setIsRightToLeft(view.rightToLeft);
    setShowPageBreaks(
      view.showPageBreaks || view.viewMode === "pageBreakPreview",
    );
  }

  function freezePanesAtSelection() {
    setFrozenRowCount(
      Math.min(Math.max(state.selected.rowIndex, 0), state.activeSheet.rowCount),
    );
    setFrozenColumnCount(
      Math.min(
        Math.max(state.selected.columnIndex, 0),
        state.activeSheet.columnCount,
      ),
    );
  }

  function unfreezePanes() {
    setFrozenRowCount(0);
    setFrozenColumnCount(0);
  }

  function handleToggleFormatPainter() {
    if (state.isActiveSheetProtected) {
      return;
    }

    setFormatPainterStyle((current) =>
      current ? null : structuredClone(state.selectedStyle),
    );
  }

  function handleSelectionCommit(range: CellRange) {
    if (!formatPainterStyle || state.isActiveSheetProtected) {
      return;
    }

    state.paintRangeStyle(range, formatPainterStyle);
    setFormatPainterStyle(null);
  }

  function setNextWorkbookWindowState(
    createNextState: (current: WorkbookWindowState) => WorkbookWindowState,
  ) {
    setWorkbookWindowState((current) => {
      const next = createNextState(current);

      return areWorkbookWindowStatesEqual(current, next) ? current : next;
    });
  }

  function handleOpenWorkbookWindow(sheetId: string) {
    const next = openWorkbookWindow({
      ...workbookWindowState,
      sheetId,
      sheets: state.document.sheets,
    });
    const activeWindow = next.views.find(
      (view) => view.id === next.activeWindowId,
    );

    setNextWorkbookWindowState(() => next);

    if (activeWindow) {
      if (next.views.length > 1) {
        setSplitPaneMode("none");
      }
      state.setActiveSheet(activeWindow.sheetId);
    }
  }

  function handleActivateWorkbookWindow(windowId: string) {
    const view = workbookWindowState.views.find(
      (windowView) => windowView.id === windowId,
    );

    setNextWorkbookWindowState((current) =>
      activateWorkbookWindow({
        ...current,
        sheets: state.document.sheets,
        windowId,
      }),
    );

    if (view) {
      state.setActiveSheet(view.sheetId);
    }
  }

  function handleCloseWorkbookWindow(windowId: string) {
    const next = closeWorkbookWindow({
      ...workbookWindowState,
      sheets: state.document.sheets,
      windowId,
    });
    const activeWindow = next.views.find(
      (view) => view.id === next.activeWindowId,
    );

    setNextWorkbookWindowState(() => next);

    if (activeWindow) {
      state.setActiveSheet(activeWindow.sheetId);
    }
  }

  function handleSetActiveSheet(sheetId: string) {
    setNextWorkbookWindowState((current) =>
      setWorkbookWindowSheet({
        ...current,
        sheetId,
        sheets: state.document.sheets,
        windowId: current.activeWindowId,
      }),
    );
    state.setActiveSheet(sheetId);
  }

  function handleSelectWorkbookWindowRange(
    windowId: string,
    sheetId: string,
    range: CellRange,
  ) {
    setNextWorkbookWindowState((current) =>
      activateWorkbookWindow({
        ...current,
        sheets: state.document.sheets,
        windowId,
      }),
    );
    state.selectRange(sheetId, range);
  }

  function handleSelectCell(
    selection: CellSelection,
    options?: { extend?: boolean },
  ) {
    state.selectCell(selection, options);
  }

  function handleSelectRange(range: CellRange) {
    state.selectRange(state.activeSheet.id, range);
  }

  function handleSelectFormulaReference(reference: FormulaReference) {
    state.selectRange(reference.sheetId, reference.range);
  }

  function handleSelectCircularReference(issue: CircularReferenceIssue) {
    state.selectRange(issue.sheetId, issue.range);
  }

  function handleSelectFormulaWatch(watch: {
    sheetId: string;
    range: CellRange;
  }) {
    state.selectRange(watch.sheetId, watch.range);
  }

  function handleSelectTrackedChange(change: WorkbookTrackedChange) {
    const position = parseCellKey(change.cellKey);

    if (!position) {
      return;
    }

    state.selectRange(change.sheetId, {
      startRowIndex: position.rowIndex,
      startColumnIndex: position.columnIndex,
      endRowIndex: position.rowIndex,
      endColumnIndex: position.columnIndex,
    });
  }

  function handleGoToReference(input: string) {
    const target = resolveGoToReference({
      document: state.document,
      activeSheetId: state.document.activeSheetId,
      input,
    });

    if (!target) {
      return "Enter a valid cell, range, sheet reference, or named range.";
    }

    state.selectRange(target.sheetId, target.range);

    return null;
  }

  function handleGoToSpecialTarget(target: GoToSpecialTarget) {
    state.selectRange(target.sheetId, target.range);
  }

  function commentAuthor() {
    return {
      email: currentUser.email,
      name: currentUser.name,
    };
  }

  function handleSaveCellNote(text: string) {
    state.upsertCellNote({
      author: commentAuthor(),
      text,
    });
  }

  function handleAddCellNoteReply(noteId: string, text: string) {
    state.addCellNoteReply(noteId, {
      author: commentAuthor(),
      text,
    });
  }

  function handleSetCellNoteStatus(
    noteId: string,
    status: "open" | "resolved",
  ) {
    state.setCellNoteStatus(noteId, {
      author: commentAuthor(),
      status,
    });
  }

  useEffect(() => {
    if (embedded) {
      return;
    }

    if (!state.isDirty) {
      return;
    }

    if (isReadOnlyAccess) {
      return;
    }

    if (saveConflictUpdatedAt) {
      return;
    }

    if (state.createAutomaticVersionSnapshot()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsAutoSaving(true);
      saveWorkbookAction(workbook.id, latestDocument.current, lastSyncedAt)
        .then((result) => {
          if (result.ok) {
            presence.publishEvent({
              kind: "documentSaved",
              payload: {
                baseUpdatedAt: lastSyncedAt,
                documentUpdatedAt: result.savedAt,
                summary: "Autosave synced workbook",
              },
            });
            setLastSyncedAt(result.savedAt);
            setSaveConflictUpdatedAt(null);
            state.markSaved();
            cacheCurrentWorkbookSnapshot(result.savedAt, {
              recoveryKind: "checkpoint",
              recoveryLabel: "Autosave server checkpoint",
            }).catch(() => {
              setOfflineNotice("Server save worked, but offline cache update failed.");
            });
            return;
          }

          if (result.conflict && result.serverUpdatedAt) {
            cacheCurrentWorkbookSnapshot(lastSyncedAt, {
              conflictServerUpdatedAt: result.serverUpdatedAt,
              recoveryKind: "conflict",
              recoveryLabel: "Autosave conflict recovery",
            }).catch(() => {
              setOfflineNotice(
                "Autosave found a conflict, but the local recovery checkpoint could not be updated.",
              );
            });
            presence.publishEvent({
              kind: "mergeConflict",
              payload: {
                baseUpdatedAt: lastSyncedAt,
                documentUpdatedAt: result.serverUpdatedAt,
                summary: "Autosave found a newer server copy",
              },
            });
            setSaveConflictUpdatedAt(result.serverUpdatedAt);
            return;
          }

          if (result.forbidden) {
            setImportError("You need editor access to save this workbook.");
          }
        })
        .catch(() => {
          setOfflineNotice(
            "Server autosave failed. Your encrypted offline cache is still available on this device.",
          );
          cacheCurrentWorkbookSnapshot(lastSyncedAt, {
            recoveryKind: "draft",
            recoveryLabel: "Autosave failed draft",
          }).catch(() => {
            setOfflineNotice(
              "Server autosave failed, and the encrypted offline cache could not be updated.",
            );
          });
        })
        .finally(() => setIsAutoSaving(false));
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [
    embedded,
    isReadOnlyAccess,
    lastSyncedAt,
    saveConflictUpdatedAt,
    state.document,
    state.isDirty,
    presence.publishEvent,
    workbook.id,
  ]);

  function ensureWorkbookEditorAccess(action: string) {
    if (!isReadOnlyAccess) {
      return true;
    }

    setImportError(`You need editor access to ${action}.`);
    return false;
  }

  function handleSave() {
    if (isReadOnlyAccess) {
      setImportError("You need editor access to save this workbook.");
      return;
    }

    if (embedded) {
      state.markSaved();
      setOfflineNotice("Saved in the embedded editor session.");
      return;
    }

    startSaving(async () => {
      let result: Awaited<ReturnType<typeof saveWorkbookAction>>;

      try {
        result = await saveWorkbookAction(
          workbook.id,
          state.document,
          lastSyncedAt,
          saveConflictUpdatedAt !== null,
        );
      } catch {
        setOfflineNotice(
          "Server save failed. The encrypted offline cache keeps your current workbook on this device.",
        );
        await cacheCurrentWorkbookSnapshot(lastSyncedAt, {
          recoveryKind: "draft",
          recoveryLabel: "Manual save failed draft",
        }).catch(() => {
          setOfflineNotice(
            "Server save failed, and the encrypted offline cache could not be updated.",
          );
        });
        return;
      }

      if (result.ok) {
        presence.publishEvent({
          kind: saveConflictUpdatedAt ? "offlineReplay" : "documentSaved",
          payload: {
            baseUpdatedAt: lastSyncedAt,
            documentUpdatedAt: result.savedAt,
            summary: saveConflictUpdatedAt
              ? "Manual save overwrote a workbook conflict"
              : "Manual save synced workbook",
          },
        });
        setLastSyncedAt(result.savedAt);
        setSaveConflictUpdatedAt(null);
        state.markSaved();
        await cacheCurrentWorkbookSnapshot(result.savedAt, {
          recoveryKind: "checkpoint",
          recoveryLabel: saveConflictUpdatedAt
            ? "Conflict overwrite checkpoint"
            : "Manual save checkpoint",
        }).catch(() => {
          setOfflineNotice("Server save worked, but offline cache update failed.");
        });
        return;
      }

      if (result.conflict && result.serverUpdatedAt) {
        await cacheCurrentWorkbookSnapshot(lastSyncedAt, {
          conflictServerUpdatedAt: result.serverUpdatedAt,
          recoveryKind: "conflict",
          recoveryLabel: "Manual save conflict recovery",
        }).catch(() => {
          setOfflineNotice(
            "Manual save found a conflict, but the local recovery checkpoint could not be updated.",
          );
        });
        presence.publishEvent({
          kind: "mergeConflict",
          payload: {
            baseUpdatedAt: lastSyncedAt,
            documentUpdatedAt: result.serverUpdatedAt,
            summary: "Manual save found a newer server copy",
          },
        });
        setSaveConflictUpdatedAt(result.serverUpdatedAt);
        return;
      }

      if (result.forbidden) {
        setImportError("You need editor access to save this workbook.");
      }
    });
  }

  function auditWorkbookExport(format: string) {
    if (embedded) {
      return;
    }

    void logWorkbookExportAction(workbook.id, format);
  }

  function recordSelectionCommand(
    command: string,
    label: string,
    valuePreview?: string,
  ) {
    state.recordScriptStep({
      command,
      label,
      targetSheetId: state.activeSheet.id,
      targetRange: state.selectedRange,
      valuePreview,
    });
  }

  async function reserveWorkbookImport() {
    if (embedded) {
      return "embedded-import";
    }

    const result = await createWorkbookImportReservationAction();

    if (!result.ok) {
      setImportError(getImportRateLimitMessage(result.retryAfterSeconds));
      return null;
    }

    return result.reservationId;
  }

  function setSanitizationNotice(report: ImportSanitizationReport) {
    setImportNotice(getImportSanitizationNotice(report));
  }

  async function auditWorkbookImport(
    format: string,
    reservationId: string,
    sanitizationReport?: ImportSanitizationReport,
  ) {
    if (embedded) {
      return;
    }

    const result = await logWorkbookImportAction(
      workbook.id,
      format,
      reservationId,
      sanitizationReport,
    );

    if (!result.ok) {
      setImportError(getImportRateLimitMessage(result.retryAfterSeconds));
    }
  }

  function handleExportCsv() {
    const csv = sheetToCsv(state.activeSheet);

    downloadBlob(
      new Blob([csv], { type: "text/csv" }),
      `${workbook.name}-${state.activeSheet.name}.csv`,
    );
    auditWorkbookExport("csv");
  }

  function handleExportTsv() {
    const tsv = sheetToTsv(state.activeSheet);

    downloadBlob(
      new Blob([tsv], { type: "text/tab-separated-values" }),
      `${workbook.name}-${state.activeSheet.name}.tsv`,
    );
    auditWorkbookExport("tsv");
  }

  function handleExportHtml() {
    downloadBlob(
      new Blob([activeSheetPrintHtml], { type: "text/html" }),
      `${workbook.name}-${state.activeSheet.name}.html`,
    );
    auditWorkbookExport("html");
  }

  function handlePrintSheet() {
    printHtmlDocument(activeSheetPrintHtml);
  }

  function handleExportPdf() {
    const pdf = sheetToPdf({
      computedValues: state.computedValues,
      printSettings: state.activePrintSettings,
      sheet: state.activeSheet,
      workbookName: workbook.name,
    });

    downloadBlob(
      new Blob([pdf], { type: "application/pdf" }),
      `${workbook.name}-${state.activeSheet.name}.pdf`,
    );
    auditWorkbookExport("pdf");
  }

  function handleExportXml() {
    const xml = sheetToXml(state.activeSheet, state.computedValues);

    downloadBlob(
      new Blob([xml], { type: "application/xml" }),
      `${workbook.name}-${state.activeSheet.name}.xml`,
    );
    auditWorkbookExport("xml");
  }

  function handleExportXlsx() {
    const buffer = workbookDocumentToXlsx(state.document);

    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${workbook.name}.xlsx`,
    );
    auditWorkbookExport("xlsx");
  }

  function handleExportOds() {
    const buffer = workbookDocumentToOds(state.document);

    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.oasis.opendocument.spreadsheet",
      }),
      `${workbook.name}.ods`,
    );
    auditWorkbookExport("ods");
  }

  function handleExportXlsm() {
    const buffer = workbookDocumentToXlsm(state.document);

    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.ms-excel.sheet.macroEnabled.12",
      }),
      `${workbook.name}.xlsm`,
    );
    auditWorkbookExport("xlsm");
  }

  function handleExportXltx() {
    const buffer = workbookDocumentToXltx(state.document);

    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
      }),
      `${workbook.name}.xltx`,
    );
    auditWorkbookExport("xltx");
  }

  function handleExportXltm() {
    const buffer = workbookDocumentToXltm(state.document);

    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.ms-excel.template.macroEnabled.12",
      }),
      `${workbook.name}.xltm`,
    );
    auditWorkbookExport("xltm");
  }

  function handleExportXls() {
    const buffer = workbookDocumentToXls(state.document);

    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.ms-excel",
      }),
      `${workbook.name}.xls`,
    );
    auditWorkbookExport("xls");
  }

  function handleExportJson() {
    downloadBlob(
      new Blob([JSON.stringify(state.document, null, 2)], {
        type: "application/json",
      }),
      `${workbook.name}.json`,
    );
    auditWorkbookExport("json");
  }

  function handleExportBackup() {
    downloadBlob(
      new Blob([
        workbookDocumentToBackupJson({
          workbookName: workbook.name,
          document: state.document,
        }),
      ], { type: "application/json" }),
      createWorkbookBackupFileName(workbook.name),
    );
    auditWorkbookExport("backup");
  }

  async function handleSaveLocalWorkbook() {
    setImportError(null);
    setOfflineNotice(null);

    try {
      const result = await saveWorkbookToLocalFile({
        document: state.document,
        workbookName: workbook.name,
      });

      if (result.kind === "download") {
        downloadBlob(result.blob, result.fileName);
      }

      const cacheUpdated = await cacheCurrentWorkbookSnapshot(lastSyncedAt, {
        recoveryKind: "checkpoint",
        recoveryLabel: "Local file save checkpoint",
      })
        .then(() => true)
        .catch(() => false);

      setOfflineNotice(
        cacheUpdated
          ? `Saved local workbook copy: ${result.fileName}.`
          : `Saved local workbook copy: ${result.fileName}. Encrypted offline cache could not be updated.`,
      );
      auditWorkbookExport("local-backup");
    } catch {
      setImportError("Could not save this workbook to a local file.");
    }
  }

  async function handleOpenLocalWorkbook(file: File) {
    setImportError(null);
    setImportNotice(null);
    setOfflineNotice(null);

    if (!ensureWorkbookEditorAccess("open a local workbook copy")) {
      return;
    }

    try {
      const localWorkbook = await openWorkbookFromLocalFile(file);
      const sanitized = sanitizeWorkbookImportDocument(localWorkbook.document);
      const sanitizationNotice = getImportSanitizationNotice(sanitized.report);

      state.replaceDocument(sanitized.document);
      setSaveConflictUpdatedAt(null);
      setImportNotice(
        [
          `Opened local workbook copy ${localWorkbook.workbookName || file.name}.`,
          sanitizationNotice,
        ]
          .filter(Boolean)
          .join(" "),
      );
      setOfflineNotice("Local workbook is ready to sync when you save.");
      window.setTimeout(() => {
        cacheCurrentWorkbookSnapshot(lastSyncedAt, {
          recoveryKind: "checkpoint",
          recoveryLabel: "Opened local workbook checkpoint",
        }).catch(() => {
          setOfflineNotice("Local workbook opened, but offline cache update failed.");
        });
      }, 0);
    } catch {
      setImportError("Could not open this local Essence Excel workbook.");
    }
  }

  async function handleRestoreOfflineCache(checkpointId?: string) {
    setImportError(null);
    setImportNotice(null);
    setOfflineNotice(null);

    if (!ensureWorkbookEditorAccess("restore the offline cache")) {
      return;
    }

    try {
      const snapshot = await restoreOfflineCache(checkpointId);
      const sanitized = sanitizeWorkbookImportDocument(snapshot.document);
      const sanitizationNotice = getImportSanitizationNotice(sanitized.report);
      const restoredConflictUpdatedAt =
        "kind" in snapshot.meta && snapshot.meta.kind === "conflict"
          ? snapshot.meta.conflictServerUpdatedAt
          : null;

      state.replaceDocument(sanitized.document);
      setSaveConflictUpdatedAt(restoredConflictUpdatedAt ?? null);
      setImportNotice(
        [
          `Restored encrypted offline ${checkpointId ? "checkpoint" : "cache"} from ${new Date(
            snapshot.meta.localUpdatedAt,
          ).toLocaleString()}.`,
          sanitizationNotice,
        ]
          .filter(Boolean)
          .join(" "),
      );
      setOfflineNotice(
        restoredConflictUpdatedAt
          ? "Review the restored conflict snapshot, then choose reload or overwrite from the conflict banner."
          : "Review the restored workbook, then save to sync it.",
      );
    } catch {
      setImportError("Could not restore the encrypted offline cache.");
    }
  }

  async function handleClearOfflineCache() {
    try {
      await clearOfflineCache();
    } catch {
      setImportError("Could not clear the encrypted offline cache.");
    }
  }

  function handleExportChart(chart: ChartDefinition) {
    downloadBlob(
      new Blob([
        workbookChartToSvg({
          sheet: state.activeSheet,
          computedValues: state.computedValues,
          chart,
        }),
      ], { type: "image/svg+xml" }),
      createChartFileName(chart),
    );
    auditWorkbookExport("chart-svg");
  }

  async function handleInsertImageObject(file: File) {
    setImportError(null);
    setImportNotice(null);

    const validation = validateWorksheetImageFile(file);

    if (!validation.ok) {
      setImportError(validation.message);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const input = createInsertedImageInputFromClipboard({ dataUrl, file });

      if (!input) {
        setImportError("Image file could not be inserted safely.");
        return;
      }

      state.addInsertedObject(input);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Image file could not be inserted.",
      );
    }
  }

  async function handlePasteImageObject(file: File) {
    setImportError(null);
    setImportNotice(null);

    const validation = validateWorksheetImageFile(file);

    if (!validation.ok) {
      setImportError(validation.message);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const input = createInsertedImageInputFromClipboard({
        dataUrl,
        file: {
          name: file.name || "Pasted image",
          size: file.size,
          type: file.type,
        },
      });

      if (!input) {
        setImportError("Clipboard image could not be inserted safely.");
        return;
      }

      state.addInsertedObject(input);
      setImportNotice("Pasted image object into the worksheet.");
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Clipboard image could not be inserted.",
      );
    }
  }

  async function handleImportCsv(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const text = await file.text();
    const sanitized = sanitizeImportedSheet(
      csvToSheet(text, file.name.replace(/\.csv$/i, "")),
    );

    state.importSheet(sanitized.sheet);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("csv", reservationId, sanitized.report);
  }

  async function handleImportTsv(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const text = await file.text();
    const sanitized = sanitizeImportedSheet(
      tsvToSheet(text, file.name.replace(/\.tsv$/i, "")),
    );

    state.importSheet(sanitized.sheet);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("tsv", reservationId, sanitized.report);
  }

  async function handleImportXlsx(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const buffer = await file.arrayBuffer();
    const sanitized = sanitizeWorkbookImportDocument(
      xlsxToWorkbookDocument(buffer),
    );

    state.replaceDocument(sanitized.document);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("xlsx", reservationId, sanitized.report);
  }

  async function handleImportXlsm(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const buffer = await file.arrayBuffer();
    const sanitized = sanitizeWorkbookImportDocument(
      xlsmToWorkbookDocument(buffer),
    );

    state.replaceDocument(sanitized.document);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("xlsm", reservationId, sanitized.report);
  }

  async function handleImportXltx(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const buffer = await file.arrayBuffer();
    const sanitized = sanitizeWorkbookImportDocument(
      xltxToWorkbookDocument(buffer),
    );

    state.replaceDocument(sanitized.document);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("xltx", reservationId, sanitized.report);
  }

  async function handleImportXltm(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const buffer = await file.arrayBuffer();
    const sanitized = sanitizeWorkbookImportDocument(
      xltmToWorkbookDocument(buffer),
    );

    state.replaceDocument(sanitized.document);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("xltm", reservationId, sanitized.report);
  }

  async function handleImportOds(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const buffer = await file.arrayBuffer();
    const sanitized = sanitizeWorkbookImportDocument(
      odsToWorkbookDocument(buffer),
    );

    state.replaceDocument(sanitized.document);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("ods", reservationId, sanitized.report);
  }

  async function handleImportXls(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const buffer = await file.arrayBuffer();
    const sanitized = sanitizeWorkbookImportDocument(xlsToWorkbookDocument(buffer));

    state.replaceDocument(sanitized.document);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("xls", reservationId, sanitized.report);
  }

  async function handleImportJson(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import files")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const text = await file.text();
    const sanitized = sanitizeWorkbookImportDocument(
      normalizeWorkbookDocument(JSON.parse(text)),
    );

    state.replaceDocument(sanitized.document);
    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport("json", reservationId, sanitized.report);
  }

  async function handleRecoverWorkbookImport(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("recover this workbook")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const recovered =
      lowerName.endsWith(".json") || lowerName.endsWith(".essence-backup.json")
        ? (() => {
            return file.text().then((text) => {
              try {
                return {
                  document: parseWorkbookBackup(text).document,
                  recoveredSheetCount: 0,
                  usedPackageRecovery: false,
                };
              } catch {
                return {
                  document: normalizeWorkbookDocument(JSON.parse(text)),
                  recoveredSheetCount: 0,
                  usedPackageRecovery: false,
                };
              }
            });
          })()
        : (async () => {
            const sourceFormat = getWorkbookImportFileFormat(file.name);

            if (!sourceFormat) {
              throw new Error("Unsupported recovery file.");
            }

            return recoverWorkbookDocumentFromBuffer({
              buffer: await file.arrayBuffer(),
              sourceFormat,
            });
          })();
    const result = await recovered;
    const sanitized = sanitizeWorkbookImportDocument(result.document);
    const sanitizationNotice = getImportSanitizationNotice(sanitized.report);

    state.replaceDocument(sanitized.document);
    setImportNotice(
      [
        result.usedPackageRecovery
          ? `Recovered ${result.recoveredSheetCount} worksheet${
              result.recoveredSheetCount === 1 ? "" : "s"
            } from ${file.name}.`
          : `Opened ${file.name} through the recovery flow.`,
        sanitizationNotice,
      ]
        .filter(Boolean)
        .join(" "),
    );
    void auditWorkbookImport("recovery", reservationId, sanitized.report);
  }

  async function handleImportBackup(file: File) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("restore a workbook backup")) {
      return;
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      return;
    }

    const backup = parseWorkbookBackup(await file.text());

    state.replaceDocument(backup.document);
    void auditWorkbookImport("backup", reservationId);
  }

  async function handleSelectWorkbookCompareFile(file: File) {
    setWorkbookCompareError(null);
    setWorkbookCompareNotice(null);

    try {
      const document = await readWorkbookComparisonDocument(file);
      const sanitized = sanitizeWorkbookImportDocument(document);
      const sanitizationNotice = getImportSanitizationNotice(sanitized.report);

      setWorkbookCompareDocument(sanitized.document);
      setWorkbookCompareFileName(file.name);
      setWorkbookCompareNotice(
        sanitizationNotice ?? `Loaded ${file.name} for workbook comparison.`,
      );
    } catch (error) {
      setWorkbookCompareDocument(null);
      setWorkbookCompareFileName("");
      setWorkbookCompareError(
        error instanceof Error
          ? error.message
          : "The comparison workbook could not be read.",
      );
    }
  }

  function handleClearWorkbookCompare() {
    setWorkbookCompareDocument(null);
    setWorkbookCompareError(null);
    setWorkbookCompareFileName("");
    setWorkbookCompareNotice(null);
  }

  function handleApplyWorkbookCompareItems(itemIds: string[]) {
    if (
      !workbookCompareDocument ||
      itemIds.length === 0 ||
      isReadOnlyAccess ||
      state.isWorkbookProtected ||
      state.isActiveSheetProtected
    ) {
      return;
    }

    const nextDocument = mergeWorkbookCompareItems({
      base: state.document,
      incoming: workbookCompareDocument,
      itemIds,
    });

    state.replaceDocument(nextDocument);
    setWorkbookCompareNotice(
      `Applied ${itemIds.length} incoming ${itemIds.length === 1 ? "change" : "changes"}.`,
    );
  }

  function handleSelectWorkbookCompareItem(item: WorkbookCompareItem) {
    if (item.sheetId && item.range) {
      state.selectRange(item.sheetId, item.range);
      return;
    }

    if (item.sheetId) {
      state.setActiveSheet(item.sheetId);
    }
  }

  function handleAddSelectedRangeToMultiRange() {
    setMultiRangeAreas((currentRanges) =>
      normalizeMultiRangeAreas(state.activeSheet, [
        ...currentRanges,
        state.selectedRange,
      ]),
    );
  }

  function handleRemoveMultiRangeArea(index: number) {
    setMultiRangeAreas((currentRanges) =>
      currentRanges.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  function handleSelectMultiRangeArea(range: CellRange) {
    state.selectRange(state.activeSheet.id, range);
  }

  async function handleCopyMultiRangeSelection() {
    const payload = state.getMultiRangeClipboardPayload(multiRangeAreas);

    if (!payload) {
      setImportError("Add at least one multi-range area before copying.");
      return;
    }

    await writeHtmlTextClipboard(payload);
    setImportNotice(
      `Copied ${multiRangeAreas.length} multi-range ${multiRangeAreas.length === 1 ? "area" : "areas"}.`,
    );
  }

  async function handlePasteMultiRangeSelection() {
    if (!navigator.clipboard?.readText) {
      setImportError("Clipboard text paste is not available in this browser.");
      return;
    }

    const text = await navigator.clipboard.readText();
    const pastedCellCount = state.pasteTextIntoMultiRanges(
      multiRangeAreas,
      text,
    );

    if (pastedCellCount === 0) {
      setImportError("Clipboard text could not be pasted into those areas.");
      return;
    }

    setImportNotice(
      `Pasted clipboard text into ${pastedCellCount.toLocaleString()} multi-range cells.`,
    );
  }

  function handleNameMultiRangeSelection(name: string) {
    const didSave = state.addNamedMultiRange(name, multiRangeAreas);

    if (!didSave) {
      setImportError("The multi-range selection could not be saved.");
      return;
    }

    setImportNotice("Saved the multi-area named range.");
  }

  function handleApplyStyleToMultiRange() {
    const didUpdate = state.updateMultiRangeCellStyle(
      multiRangeAreas,
      state.selectedStyle,
    );

    if (!didUpdate) {
      setImportError("The selected style could not be applied to those areas.");
      return;
    }

    setImportNotice("Applied the selected cell style to the multi-range areas.");
  }

  function handleClearMultiRangeFormatting() {
    const didClear = state.clearMultiRangeFormatting(multiRangeAreas);

    if (!didClear) {
      setImportError("Formatting could not be cleared for those areas.");
      return;
    }

    setImportNotice("Cleared formatting from the multi-range areas.");
  }

  function importConnectorSheet(
    result: ImportConnectorResult,
    reservationId: string,
    createQuery?: (sheet: ImportConnectorResult["sheet"]) => WorkbookQueryDefinition,
  ) {
    const sanitized = sanitizeImportedSheet(result.sheet);

    if (createQuery) {
      state.importQuerySheet(sanitized.sheet, createQuery(sanitized.sheet));
    } else {
      state.importSheet(sanitized.sheet);
    }

    setSanitizationNotice(sanitized.report);
    void auditWorkbookImport(
      `connector-${result.sourceType}-${result.format}`,
      reservationId,
      sanitized.report,
    );
  }

  async function handleImportConnectorDatabaseResult({
    format,
    name,
    text,
    transformSteps,
  }: TextConnectorImportRequest) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import connector data")) {
      throw new Error("Editor access is required.");
    }
    const parsed = parseImportConnectorText({
      format,
      name: name || "Database result",
      sourceType: "database",
      text,
      transformSteps,
    });

    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      throw new Error("Import limit reached.");
    }

    importConnectorSheet(parsed, reservationId, (sheet) =>
      createWorkbookQueryDefinition({
        format,
        name: name || "Database result",
        sheet,
        sourceType: "database",
        transformSteps,
      }),
    );
  }

  async function handleImportConnectorUrl(request: UrlConnectorImportRequest) {
    setImportError(null);
    setImportNotice(null);
    if (!ensureWorkbookEditorAccess("import connector data")) {
      throw new Error("Editor access is required.");
    }
    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      throw new Error("Import limit reached.");
    }

    const response = await fetch("/api/import-connectors/url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const result = (await response.json()) as UrlConnectorResponse;

    if (!response.ok) {
      throw new Error(
        result.ok ? "Connector import failed." : result.error,
      );
    }

    if (!result.ok) {
      throw new Error(result.error);
    }

    importConnectorSheet(result, reservationId, (sheet) =>
      createWorkbookQueryDefinition({
        format: request.format,
        name: request.name || result.sourceName,
        sheet,
        sourceType: "url",
        transformSteps: request.transformSteps,
        url: request.url,
      }),
    );
  }

  async function handleRefreshConnectorQuery(queryId: string) {
    setImportError(null);
    setImportNotice(null);

    const query = state.document.queries.find((item) => item.id === queryId);
    const startedAt = performance.now();

    if (!query) {
      throw new Error("Saved query was not found.");
    }

    if (
      query.source.type !== "url" ||
      query.refreshMode !== "url" ||
      !query.source.refreshUrl
    ) {
      const message = "This query does not store refresh credentials or a safe refresh URL.";

      state.recordQueryRefreshFailure(
        query.id,
        message,
        performance.now() - startedAt,
      );
      throw new Error(message);
    }

    const reservationId = await reserveWorkbookImport();

    if (!reservationId) {
      throw new Error("Import limit reached.");
    }

    try {
      const response = await fetch("/api/import-connectors/url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          format: query.format,
          name: query.sourceName,
          transformSteps: query.transformSteps,
          url: query.source.refreshUrl,
        }),
      });
      const result = (await response.json()) as UrlConnectorResponse;

      if (!response.ok) {
        throw new Error(result.ok ? "Connector refresh failed." : result.error);
      }

      if (!result.ok) {
        throw new Error(result.error);
      }

      const sanitized = sanitizeImportedSheet(result.sheet);

      state.refreshQuerySheet(
        query.id,
        sanitized.sheet,
        performance.now() - startedAt,
      );
      setSanitizationNotice(sanitized.report);
      void auditWorkbookImport(
        `connector-refresh-${result.sourceType}-${result.format}`,
        reservationId,
        sanitized.report,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connector refresh failed.";

      state.recordQueryRefreshFailure(
        query.id,
        message,
        performance.now() - startedAt,
      );
      throw error;
    }
  }

  async function handleCopyRangeImage() {
    setImportError(null);

    if (!("ClipboardItem" in window) || !navigator.clipboard?.write) {
      setImportError("Image clipboard export is not supported in this browser.");
      return;
    }

    const blob = await rangeToPngBlob(
      state.activeSheet,
      state.selectedRange,
      state.computedValues,
    );

    if (!blob) {
      setImportError("Selected range is too large to copy as an image.");
      return;
    }

    await navigator.clipboard.write([
      new window.ClipboardItem({
        "image/png": blob,
      }),
    ]);
  }

  async function handleCopyVisibleRange() {
    setImportError(null);

    const payload = getVisibleRangeClipboardPayload();

    if (!payload) {
      setImportError("No visible cells are available in the selected range.");
      return;
    }

    setClipboardPayload(payload);
    await writeSpreadsheetClipboard(payload);
  }

  function getVisibleRangeClipboardPayload() {
    return createSpreadsheetVisibleRowsClipboardPayload({
      sheet: state.activeSheet,
      range: state.selectedRange,
      computedValues: state.computedValues,
      visibleRowIndexes,
      options: { hideHiddenFormulas: state.isActiveSheetProtected },
    });
  }

  function handleCopyVisibleRangeToNextColumns() {
    setImportError(null);

    const payload = getVisibleRangeClipboardPayload();

    if (!payload) {
      setImportError("No visible cells are available in the selected range.");
      return;
    }

    if (!state.copyVisibleCellsToNextColumns(payload)) {
      setImportError(
        "There is not enough editable space to copy visible cells to the right.",
      );
    }
  }

  function handleApplyCriteriaRangeFilter() {
    setImportError(null);

    const message = state.applyCriteriaRangeFilter();

    if (message) {
      setImportError(message);
    }
  }

  function handleCopyCriteriaRangeToLocation(destinationReference: string) {
    setImportError(null);

    const message = state.copyCriteriaRangeToLocation(destinationReference);

    if (message) {
      setImportError(message);
    }

    return message;
  }

  function handlePasteTransposed() {
    if (state.isActiveSheetProtected) {
      return;
    }

    navigator.clipboard
      ?.readText()
      .then((text) => {
        if (text) {
          state.pasteText(text, { transpose: true });
        }
      })
      .catch(() => undefined);
  }

  function handlePasteSpecial(mode: PasteSpecialMode) {
    if (state.isActiveSheetProtected || !clipboardPayload) {
      return;
    }

    state.pasteCells(clipboardPayload, { mode });
  }

  function selectRelativeWorksheet(delta: number) {
    const sheets = state.document.sheets;

    if (sheets.length <= 1) {
      return;
    }

    const activeIndex = sheets.findIndex((sheet) => sheet.id === state.activeSheet.id);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const nextIndex = (currentIndex + delta + sheets.length) % sheets.length;
    const nextSheet = sheets[nextIndex];

    if (nextSheet && nextSheet.id !== state.activeSheet.id) {
      state.setActiveSheet(nextSheet.id);
    }
  }

  function insertAutoSumFormula() {
    if (state.isSelectedCellProtected) {
      return;
    }

    const formula = createAutoSumFormula({
      computedValues: state.computedValues,
      selection: state.selected,
      sheet: state.activeSheet,
    });

    if (formula) {
      state.updateSelectedCell(formula);
      setEditingKey(state.selectedKey);
    }
  }

  function executeShortcutCommand(command: SpreadsheetShortcutCommand) {
    switch (command) {
      case "workbook.save":
        handleSave();
        return;
      case "workbook.previousSheet":
        selectRelativeWorksheet(-1);
        return;
      case "workbook.nextSheet":
        selectRelativeWorksheet(1);
        return;
      case "history.undo":
        state.undo();
        return;
      case "history.redo":
        state.redo();
        return;
      case "clipboard.copy": {
        const payload = state.getSelectedClipboardPayload();
        setClipboardPayload(payload);
        writeSpreadsheetClipboard(payload).catch(() => undefined);
        return;
      }
      case "selection.selectAll":
      case "selection.selectSheet":
        state.selectRange(state.activeSheet.id, {
          startRowIndex: 0,
          startColumnIndex: 0,
          endRowIndex: state.activeSheet.rowCount - 1,
          endColumnIndex: state.activeSheet.columnCount - 1,
        });
        return;
      case "selection.selectColumn":
        state.selectRange(state.activeSheet.id, {
          startRowIndex: 0,
          startColumnIndex: state.selectedRange.startColumnIndex,
          endRowIndex: state.activeSheet.rowCount - 1,
          endColumnIndex: state.selectedRange.endColumnIndex,
        });
        return;
      case "selection.selectRow":
        state.selectRange(state.activeSheet.id, {
          startRowIndex: state.selectedRange.startRowIndex,
          startColumnIndex: 0,
          endRowIndex: state.selectedRange.endRowIndex,
          endColumnIndex: state.activeSheet.columnCount - 1,
        });
        return;
      case "edit.editCell":
        if (!state.isSelectedCellProtected) {
          setEditingKey(state.selectedKey);
        }
        return;
      case "edit.clearSelection":
        if (!state.isSelectedRangeProtected) {
          state.clearSelection();
        }
        return;
      case "edit.fillSelection":
        if (!state.isSelectedRangeProtected) {
          state.updateSelectedRange(state.selectedRaw);
        }
        return;
      case "edit.fillDown":
        if (!state.isSelectedRangeProtected) {
          state.fillDown();
        }
        return;
      case "edit.fillRight":
        if (!state.isSelectedRangeProtected) {
          state.fillRight();
        }
        return;
      case "edit.flashFill":
        if (!state.isSelectedRangeProtected && state.canFlashFill) {
          state.flashFill();
        }
        return;
      case "edit.autoSum":
        insertAutoSumFormula();
        return;
      case "edit.insertDate":
        if (!state.isSelectedCellProtected) {
          state.updateSelectedCell(new Date().toISOString().slice(0, 10));
        }
        return;
      case "edit.insertTime":
        if (!state.isSelectedCellProtected) {
          state.updateSelectedCell(
            new Date().toLocaleTimeString(undefined, {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          );
        }
        return;
      case "format.bold":
        if (!state.isActiveSheetProtected) {
          state.updateCellStyle({ bold: !state.selectedStyle.bold });
        }
        return;
      case "format.italic":
        if (!state.isActiveSheetProtected) {
          state.updateCellStyle({ italic: !state.selectedStyle.italic });
        }
        return;
      case "format.underline":
        if (!state.isActiveSheetProtected) {
          state.updateCellStyle({ underline: !state.selectedStyle.underline });
        }
        return;
      case "format.strikethrough":
        if (!state.isActiveSheetProtected) {
          state.updateCellStyle({
            strikethrough: !state.selectedStyle.strikethrough,
          });
        }
        return;
      case "format.numberGeneral":
        if (!state.isActiveSheetProtected) {
          state.updateCellStyle({ numberFormat: "general" });
        }
        return;
      case "format.numberCurrency":
        if (!state.isActiveSheetProtected) {
          state.updateCellStyle({ numberFormat: "currency" });
        }
        return;
      case "format.numberPercent":
        if (!state.isActiveSheetProtected) {
          state.updateCellStyle({ numberFormat: "percent" });
        }
        return;
      case "format.numberDate":
        if (!state.isActiveSheetProtected) {
          state.updateCellStyle({ numberFormat: "date" });
        }
        return;
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const isCommandKey = event.metaKey || event.ctrlKey;

    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return;
    }

    const shortcutCommand = getShortcutCommandForEvent(
      event,
      keyboardShortcuts.preferences,
    );

    if (shortcutCommand) {
      event.preventDefault();
      executeShortcutCommand(shortcutCommand);
      return;
    }

    if (isCommandKey && event.key.toLowerCase() === "f") {
      event.preventDefault();
      return;
    }

    const isSelectedCellEditingBlocked = state.isSelectedCellProtected;
    const visualLeftColumnDelta = isRightToLeft ? 1 : -1;
    const visualRightColumnDelta = isRightToLeft ? -1 : 1;
    const visualLeftJump = isRightToLeft ? "right" : "left";
    const visualRightJump = isRightToLeft ? "left" : "right";

    if (event.key === "Escape") {
      event.preventDefault();
      if (focusModeActive) {
        setFocusModeActive(false);
        return;
      }
      state.selectCell(state.selected);
    } else if (event.key === "Home") {
      event.preventDefault();
      state.moveSelectionToBoundary(
        event.ctrlKey || event.metaKey ? "sheetStart" : "rowStart",
        { extend: event.shiftKey },
      );
    } else if (event.key === "End") {
      event.preventDefault();
      state.moveSelectionToBoundary(
        event.ctrlKey || event.metaKey ? "usedEnd" : "rowEnd",
        { extend: event.shiftKey },
      );
    } else if (event.key === "PageUp") {
      event.preventDefault();
      state.moveSelection(-20, 0, { extend: event.shiftKey });
    } else if (event.key === "PageDown") {
      event.preventDefault();
      state.moveSelection(20, 0, { extend: event.shiftKey });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        state.jumpSelection("up", { extend: event.shiftKey });
      } else {
        state.moveSelection(-1, 0, { extend: event.shiftKey });
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        state.jumpSelection("down", { extend: event.shiftKey });
      } else {
        state.moveSelection(1, 0, { extend: event.shiftKey });
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        state.jumpSelection(visualLeftJump, { extend: event.shiftKey });
      } else {
        state.moveSelection(0, visualLeftColumnDelta, {
          extend: event.shiftKey,
        });
      }
    } else if (event.key === "ArrowRight" || event.key === "Tab") {
      event.preventDefault();
      if (event.key === "ArrowRight" && (event.ctrlKey || event.metaKey)) {
        state.jumpSelection(visualRightJump, { extend: event.shiftKey });
      } else {
        const tabDelta = event.shiftKey ? -1 : 1;
        state.moveSelection(
          0,
          event.key === "Tab" ? tabDelta : visualRightColumnDelta,
          {
            extend: event.shiftKey && event.key !== "Tab",
          },
        );
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!isSelectedCellEditingBlocked) {
        setEditingKey(state.selectedKey);
      }
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!isSelectedCellEditingBlocked) {
        state.updateSelectedCell(event.key);
        setEditingKey(state.selectedKey);
      }
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return;
    }

    const text = event.clipboardData.getData("text/plain");
    const html = event.clipboardData.getData("text/html");
    const imageFile = getClipboardImageFile(event.clipboardData);

    if (!text && !html && !imageFile) {
      return;
    }

    event.preventDefault();
    if (state.isSelectedCellProtected) {
      return;
    }

    if (imageFile && !text && !html) {
      void handlePasteImageObject(imageFile);
      return;
    }

    if (clipboardPayload && text === clipboardPayload.text) {
      state.pasteCells(clipboardPayload);
      return;
    }

    const tablePayload = html ? htmlTableToClipboardPayload(html) : null;

    if (tablePayload) {
      state.pasteCells({
        text: tablePayload.text,
        html,
        sourceSheetId: "external-html",
        sourceRange: {
          startRowIndex: state.selected.rowIndex,
          startColumnIndex: state.selected.columnIndex,
          endRowIndex: state.selected.rowIndex + tablePayload.cells.length - 1,
          endColumnIndex:
            state.selected.columnIndex +
            Math.max(0, ...tablePayload.cells.map((row) => row.length)) -
            1,
        },
        cells: tablePayload.cells,
      });
      return;
    }

    if (!text) {
      return;
    }

    state.pasteText(text);
  }

  const effectiveShowPageBreaks =
    showPageBreaks || sheetViewMode === "pageBreakPreview";
  const gridFrameClassName = cn(
    "flex min-h-0 min-w-0 flex-1 overflow-hidden",
    sheetViewMode === "pageLayout" && "bg-muted/50 p-4",
    sheetViewMode === "pageBreakPreview" && "bg-primary/5 p-2",
  );
  const gridSurfaceClassName = cn(
    "flex min-h-0 min-w-0 flex-1 overflow-hidden",
    sheetViewMode === "pageLayout" &&
      "mx-auto w-full max-w-[1180px] rounded-sm border bg-background shadow-sm",
    sheetViewMode === "pageBreakPreview" &&
      "rounded-sm border border-primary/30 bg-background",
  );
  const secondaryWorkbookWindowGridStates = useMemo(() => {
    if (workbookWindowViews.length <= 1) {
      return new Map<string, ReturnType<typeof createWorkbookWindowGridState>>();
    }

    return new Map(
      workbookWindowViews
        .filter((view) => view.sheetId !== state.activeSheet.id)
        .map((view) => {
          const sheet = state.document.sheets.find(
            (candidate) => candidate.id === view.sheetId,
          );

          return sheet
            ? [view.sheetId, createWorkbookWindowGridState({ document: state.document, sheet })]
            : null;
        })
        .filter(
          (
            entry,
          ): entry is [
            string,
            ReturnType<typeof createWorkbookWindowGridState>,
          ] => entry !== null,
        ),
    );
  }, [state.activeSheet.id, state.document, workbookWindowViews]);
  const activeGridProps: SpreadsheetGridProps = {
    activeHighlightKey: activeFindMatch?.key ?? null,
    computedValues: state.computedValues,
    conditionalStyles,
    dataValidations: activeDataValidations,
    editingKey,
    filters: activeFilters,
    formulaErrorKeys,
    frozenColumnCount,
    frozenRowCount,
    charts: activeCharts,
    highlightedKeys,
    insertedObjects: activeInsertedObjects,
    invalidKeys,
    isCellProtected: isReadOnlyAccess ? () => true : state.isCellProtected,
    isProtected: state.isActiveSheetProtected || isReadOnlyAccess,
    isRightToLeft,
    linkedKeys,
    notedKeys,
    onApplyColumnValueFilter: isReadOnlyAccess
      ? () => undefined
      : state.applyColumnValueFilter,
    onClearColumnFilters: isReadOnlyAccess
      ? () => undefined
      : state.clearColumnFilters,
    onEditKeyChange: setEditingKey,
    onFillRange: isReadOnlyAccess ? () => undefined : state.fillRange,
    onMoveColumnPageBreak: isReadOnlyAccess
      ? undefined
      : state.moveColumnPageBreak,
    onMoveRowPageBreak: isReadOnlyAccess ? undefined : state.moveRowPageBreak,
    onResizeColumn: isReadOnlyAccess ? () => undefined : state.setColumnWidth,
    onSelectCell: handleSelectCell,
    onSelectObject: state.selectInsertedObject,
    onUpdateChartAnchor: isReadOnlyAccess
      ? () => undefined
      : state.updateChartAnchor,
    onSelectRange: handleSelectRange,
    onSelectionCommit: handleSelectionCommit,
    onToggleColumnGroup: isReadOnlyAccess
      ? () => undefined
      : state.toggleColumnOutlineGroup,
    onToggleColumnPageBreak: isReadOnlyAccess
      ? undefined
      : state.toggleColumnPageBreak,
    onToggleRowGroup: isReadOnlyAccess
      ? () => undefined
      : state.toggleRowOutlineGroup,
    onToggleRowPageBreak: isReadOnlyAccess
      ? undefined
      : state.toggleRowPageBreak,
    onUpdateCell: isReadOnlyAccess
      ? () => undefined
      : (value) => {
          recordSelectionCommand("cell.setValue", `Set ${state.selectedKey} value`, value);
          state.updateSelectedCell(value);
        },
    onUpdateObject: isReadOnlyAccess ? () => undefined : state.updateInsertedObject,
    onUpdateRange: isReadOnlyAccess
      ? () => undefined
      : (value) => {
          recordSelectionCommand("range.setValue", "Set selected range value", value);
          state.updateSelectedRange(value);
        },
    printSettings: state.activePrintSettings,
    selected: state.selected,
    selectedObjectId: state.selectedObjectId,
    selectedRange: state.selectedRange,
    sheet: state.activeSheet,
    showPageBreaks: effectiveShowPageBreaks,
    sparklines: activeSparklines,
    spillAnchorKeys: dynamicArrayState.spillAnchorKeys,
    spillBlockedKeys: dynamicArrayState.spillBlockedKeys,
    spillKeys: dynamicArrayState.spillKeys,
    tables: activeTables,
    visibleRowIndexes,
    zoomPercent,
  };
  const workbookWindowPanes = useMemo<WorkbookWindowPaneDefinition[] | undefined>(
    () => {
      if (workbookWindowViews.length <= 1) {
        return undefined;
      }

      return workbookWindowViews.flatMap((view) => {
        const sheet = state.document.sheets.find(
          (candidate) => candidate.id === view.sheetId,
        );

        if (!sheet) {
          return [];
        }

        if (sheet.id === state.activeSheet.id) {
          return [
            {
              gridProps: activeGridProps,
              id: view.id,
              isActive: view.isActive,
              label: `${view.sheetName} worksheet window`,
              onActivate: () => handleActivateWorkbookWindow(view.id),
            },
          ];
        }

        const gridState = secondaryWorkbookWindowGridStates.get(sheet.id);

        if (!gridState) {
          return [];
        }

        const selected = { columnIndex: 0, rowIndex: 0 };
        const selectedRange = {
          endColumnIndex: 0,
          endRowIndex: 0,
          startColumnIndex: 0,
          startRowIndex: 0,
        };

        return [
          {
            gridProps: {
              ...gridState,
              activeHighlightKey: null,
              editingKey: null,
              frozenColumnCount,
              frozenRowCount,
              highlightedKeys: new Set<string>(),
              isCellProtected: () => true,
              isProtected: true,
              isRightToLeft,
              onApplyColumnValueFilter: () => undefined,
              onClearColumnFilters: () => undefined,
              onEditKeyChange: () => undefined,
              onFillRange: () => undefined,
              onResizeColumn: () => undefined,
              onSelectCell: (selection) =>
                handleSelectWorkbookWindowRange(view.id, sheet.id, {
                  endColumnIndex: selection.columnIndex,
                  endRowIndex: selection.rowIndex,
                  startColumnIndex: selection.columnIndex,
                  startRowIndex: selection.rowIndex,
                }),
              onSelectObject: () => handleActivateWorkbookWindow(view.id),
              onUpdateChartAnchor: () => undefined,
              onSelectRange: (range) =>
                handleSelectWorkbookWindowRange(view.id, sheet.id, range),
              onSelectionCommit: (range) =>
                handleSelectWorkbookWindowRange(view.id, sheet.id, range),
              onToggleColumnGroup: () => undefined,
              onToggleRowGroup: () => undefined,
              onUpdateCell: () => undefined,
              onUpdateObject: () => undefined,
              onUpdateRange: () => undefined,
              selected,
              selectedObjectId: null,
              selectedRange,
              sheet,
              showPageBreaks: effectiveShowPageBreaks,
              zoomPercent,
            },
            id: view.id,
            isActive: view.isActive,
            label: `${view.sheetName} worksheet window`,
            onActivate: () => handleActivateWorkbookWindow(view.id),
          },
        ];
      });
    },
    [
      activeGridProps,
      effectiveShowPageBreaks,
      frozenColumnCount,
      frozenRowCount,
      isRightToLeft,
      secondaryWorkbookWindowGridStates,
      state.activeSheet.id,
      state.document.sheets,
      workbookWindowViews,
      zoomPercent,
    ],
  );

  return (
    <main
      ref={editorRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col bg-background",
        embedded && "h-dvh overflow-hidden",
        focusModeActive && "fixed inset-0 z-50 h-screen",
      )}
      style={embedded ? { height: "100dvh", maxHeight: "100dvh" } : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {screenReaderAnnouncement}
      </div>
      {!focusModeActive && !embedded ? (
        <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <WorkbookTitleForm
                workbookId={workbook.id}
                defaultName={workbook.name}
                disabled={!isOwnerAccess}
              />
              <Badge variant={isOwnerAccess ? "secondary" : "outline"} className="capitalize">
                {workbook.accessRole}
              </Badge>
            </div>
            <p className="truncate font-mono text-xs text-muted-foreground max-sm:hidden">
              {state.activeSheet.rowCount} x {state.activeSheet.columnCount}
              {!isOwnerAccess ? ` - Owner ${workbook.ownerEmail}` : ""}
            </p>
          </div>
          {isOwnerAccess ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0">
                  <Trash2 />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this workbook?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the workbook and returns you to the workbook list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <form action={deleteWorkbookAction}>
                    <input type="hidden" name="workbookId" value={workbook.id} />
                    <input type="hidden" name="redirectTo" value="/workbooks" />
                    <AlertDialogAction asChild>
                      <button type="submit">Delete</button>
                    </AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      ) : null}
      <SpreadsheetToolbar
        embedded={embedded}
        calculationDirtyCellCount={state.calculationDirtyCellCount}
        calculationError={state.calculationError}
        calculationMode={state.calculationMode}
        calculationStrategy={state.calculationStrategy}
        isDirty={isReadOnlyAccess ? false : state.isDirty}
        isSaving={isSaving || isAutoSaving}
        isCalculating={state.isCalculating}
        isSheetProtected={state.isActiveSheetProtected}
        isWorkbookProtected={state.isWorkbookProtected}
        readOnly={isReadOnlyAccess}
        canEditWorkbook={canEditCurrentWorkbook}
        canComment={canCommentCurrentWorkbook}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
        bold={Boolean(state.selectedStyle.bold)}
        italic={Boolean(state.selectedStyle.italic)}
        underline={Boolean(state.selectedStyle.underline)}
        strikethrough={Boolean(state.selectedStyle.strikethrough)}
        wrap={Boolean(state.selectedStyle.wrap)}
        selectedCellsUnlocked={state.isSelectedRangeUnlocked}
        selectedFormulasHidden={state.isSelectedRangeFormulaHidden}
        align={state.selectedStyle.align}
        verticalAlign={state.selectedStyle.verticalAlign}
        textRotation={state.selectedStyle.textRotation}
        verticalText={Boolean(state.selectedStyle.verticalText)}
        shrinkToFit={Boolean(state.selectedStyle.shrinkToFit)}
        hasRichTextRuns={Boolean(
          state.activeSheet.cells[state.selectedKey]?.richTextRuns?.length,
        )}
        fontFamily={state.selectedStyle.fontFamily}
        fontSize={state.selectedStyle.fontSize}
        indent={state.selectedStyle.indent}
        numberFormat={state.selectedStyle.numberFormat}
        zoomPercent={zoomPercent}
        focusModeActive={focusModeActive}
        frozenColumnCount={frozenColumnCount}
        frozenRowCount={frozenRowCount}
        splitPaneMode={splitPaneMode}
        workbookWindowSheetOptions={state.document.sheets}
        workbookWindowViews={workbookWindowViews}
        sheetViewMode={sheetViewMode}
        isRightToLeft={isRightToLeft}
        showPageBreaks={effectiveShowPageBreaks}
        showGridlines={state.showGridlines}
        customViews={activeCustomViews}
        cellStylePresets={cellStylePresets}
        managedCellStyles={state.document.cellStyles ?? []}
        selectedStyle={state.selectedStyle}
        customNumberFormat={state.selectedStyle.customNumberFormat}
        customNumberFormatPreviewValue={
          state.computedValues[state.selectedKey] || state.selectedRaw || "1234.56"
        }
        formatPainterActive={formatPainterStyle !== null}
        selectedAddress={state.selectedKey}
        selectedLink={selectedLink}
        selectedNote={selectedNote}
        selectedRange={state.selectedRange}
        goToSpecialTargets={goToSpecialTargets}
        filterColumnLabels={filterColumnLabels}
        filterValueOptions={filterValueOptions}
        styleFilterOptions={styleFilterOptions}
        printPreviewHtml={activeSheetPrintHtml}
        printPreviewPages={activeSheetPrintPreviewPages}
        printPreviewSheetName={state.activeSheet.name}
        offlineStatusLabel={offlineSyncPlan.label}
        offlineStatusDescription={offlineSyncPlan.detail}
        offlineRecoveryCheckpoints={offlineRecoveryCheckpoints}
        canOpenLocalWorkbook={!isReadOnlyAccess}
        canRestoreOfflineCache={!isReadOnlyAccess && offlineCacheMeta !== null}
        onSave={handleSave}
        onSaveLocalWorkbook={handleSaveLocalWorkbook}
        onOpenLocalWorkbook={(file) => {
          handleOpenLocalWorkbook(file).catch(() => {
            setImportError("Could not open this local workbook copy.");
          });
        }}
        onRestoreOfflineCache={() => {
          handleRestoreOfflineCache().catch(() => {
            setImportError("Could not restore the encrypted offline cache.");
          });
        }}
        onRestoreOfflineCheckpoint={(checkpointId) => {
          handleRestoreOfflineCache(checkpointId).catch(() => {
            setImportError("Could not restore the encrypted offline checkpoint.");
          });
        }}
        onDeleteOfflineCheckpoint={deleteOfflineRecoveryCheckpoint}
        onClearOfflineCache={handleClearOfflineCache}
        onToggleSheetProtection={state.toggleActiveSheetProtection}
        onToggleWorkbookProtection={state.toggleWorkbookProtection}
        onToggleSelectedCellsLocked={() =>
          state.setSelectedCellsLocked(state.isSelectedRangeUnlocked)
        }
        onToggleSelectedFormulasHidden={() =>
          state.setSelectedFormulasHidden(!state.isSelectedRangeFormulaHidden)
        }
        onUndo={state.undo}
        onRedo={state.redo}
        onGoToReference={handleGoToReference}
        onGoToSpecialTarget={handleGoToSpecialTarget}
        onZoomOut={() => setClampedZoom(zoomPercent - 10)}
        onZoomIn={() => setClampedZoom(zoomPercent + 10)}
        onZoomChange={setClampedZoom}
        onToggleFocusMode={() =>
          setFocusModeActive((currentValue) => !currentValue)
        }
        onToggleFreezeFirstColumn={() =>
          setFrozenColumnCount((currentValue) => (currentValue > 0 ? 0 : 1))
        }
        onToggleFreezeFirstRow={() =>
          setFrozenRowCount((currentValue) => (currentValue > 0 ? 0 : 1))
        }
        onFreezePanesAtSelection={freezePanesAtSelection}
        onUnfreezePanes={unfreezePanes}
        onSetSplitPaneMode={setSplitPaneMode}
        onActivateWorkbookWindow={handleActivateWorkbookWindow}
        onCloseWorkbookWindow={handleCloseWorkbookWindow}
        onOpenWorkbookWindow={handleOpenWorkbookWindow}
        onSetSheetViewMode={handleSetSheetViewMode}
        onToggleRightToLeft={() =>
          setIsRightToLeft((currentValue) => !currentValue)
        }
        onSaveCustomView={handleSaveCustomView}
        onApplyCustomView={handleApplyCustomView}
        onDeleteCustomView={state.deleteCustomView}
        onTogglePageBreaks={() =>
          setShowPageBreaks((currentValue) => !currentValue)
        }
        onToggleGridlines={state.toggleActiveSheetGridlines}
        onToggleFormatPainter={handleToggleFormatPainter}
        onToggleBold={() => {
          recordSelectionCommand("format.bold", "Toggle bold formatting");
          state.updateCellStyle({ bold: !state.selectedStyle.bold });
        }}
        onToggleItalic={() => {
          recordSelectionCommand("format.italic", "Toggle italic formatting");
          state.updateCellStyle({ italic: !state.selectedStyle.italic });
        }}
        onToggleUnderline={() => {
          recordSelectionCommand("format.underline", "Toggle underline formatting");
          state.updateCellStyle({ underline: !state.selectedStyle.underline });
        }}
        onToggleStrikethrough={() =>
          state.updateCellStyle({
            strikethrough: !state.selectedStyle.strikethrough,
          })
        }
        onToggleWrap={() => state.updateCellStyle({ wrap: !state.selectedStyle.wrap })}
        onClearFormatting={state.clearSelectedFormatting}
        onApplyCellStylePreset={(style) =>
          state.paintRangeStyle(state.selectedRange, style)
        }
        onDeleteManagedCellStyle={state.deleteManagedCellStyle}
        onSaveManagedCellStyle={state.saveManagedCellStyle}
        onUpdateManagedCellStyle={state.updateManagedCellStyle}
        onSetAlign={(align) => state.updateCellStyle({ align })}
        onSetVerticalAlign={(verticalAlign) =>
          state.updateCellStyle({ verticalAlign })
        }
        onSetTextRotation={(textRotation) =>
          state.updateCellStyle({
            textRotation: textRotation === 0 ? undefined : textRotation,
          })
        }
        onToggleVerticalText={() =>
          state.updateCellStyle({
            verticalText: !state.selectedStyle.verticalText,
            textRotation: undefined,
          })
        }
        onToggleShrinkToFit={() =>
          state.updateCellStyle({ shrinkToFit: !state.selectedStyle.shrinkToFit })
        }
        onApplyRichTextRuns={state.applyRichTextRunsToSelectedCells}
        onClearRichTextRuns={state.clearSelectedRichTextRuns}
        onSetFontFamily={(fontFamily) => state.updateCellStyle({ fontFamily })}
        onSetFontSize={(fontSize) => state.updateCellStyle({ fontSize })}
        onDecreaseIndent={() =>
          state.updateCellStyle({
            indent: Math.max((state.selectedStyle.indent ?? 0) - 1, 0),
          })
        }
        onIncreaseIndent={() =>
          state.updateCellStyle({
            indent: Math.min((state.selectedStyle.indent ?? 0) + 1, 6),
          })
        }
        onSetNumberFormat={(numberFormat) => {
          recordSelectionCommand(
            "format.number",
            `Set number format to ${numberFormat}`,
          );
          state.updateCellStyle({ customNumberFormat: undefined, numberFormat });
        }}
        onSetCustomNumberFormat={(customNumberFormat) =>
          state.updateCellStyle({
            customNumberFormat,
            numberFormat: "custom",
          })
        }
        onSetFill={(background) => {
          recordSelectionCommand("format.fill", `Set fill color ${background}`);
          state.updateCellStyle({ background });
        }}
        onSetTextColor={(foreground) => {
          recordSelectionCommand("format.textColor", `Set text color ${foreground}`);
          state.updateCellStyle({ foreground });
        }}
        onSetAllBorders={() => state.updateCellBorders("all")}
        onSetOutlineBorders={() => state.updateCellBorders("outline")}
        onClearBorders={() => state.updateCellBorders("clear")}
        onMergeCells={state.mergeSelectedCells}
        onUnmergeCells={state.unmergeSelectedCells}
        onSaveCellLink={state.upsertCellLink}
        onSaveCellNote={handleSaveCellNote}
        onAddCellNoteReply={handleAddCellNoteReply}
        onSetCellNoteStatus={handleSetCellNoteStatus}
        onInsertRows={() => {
          recordSelectionCommand("structure.insertRows", "Insert selected rows");
          state.insertRows();
        }}
        onDeleteRows={() => {
          recordSelectionCommand("structure.deleteRows", "Delete selected rows");
          state.deleteRows();
        }}
        onHideRows={state.hideSelectedRows}
        onGroupRows={state.groupSelectedRows}
        onInsertColumns={() => {
          recordSelectionCommand(
            "structure.insertColumns",
            "Insert selected columns",
          );
          state.insertColumns();
        }}
        onDeleteColumns={() => {
          recordSelectionCommand(
            "structure.deleteColumns",
            "Delete selected columns",
          );
          state.deleteColumns();
        }}
        onHideColumns={state.hideSelectedColumns}
        onGroupColumns={state.groupSelectedColumns}
        onUngroupSelection={state.ungroupSelectedOutline}
        onUnhideRowsAndColumns={state.unhideRowsAndColumns}
        onAddBarChart={() => state.addChart("bar")}
        onAddLineChart={() => state.addChart("line")}
        onAddAreaChart={() => state.addChart("area")}
        onAddPieChart={() => state.addChart("pie")}
        onAddScatterChart={() => state.addChart("scatter")}
        onAddBubbleChart={() => state.addChart("bubble")}
        onAddRadarChart={() => state.addChart("radar")}
        onAddComboChart={() => state.addChart("combo")}
        onAddStockChart={() => state.addChart("stock")}
        onAddStackedBarChart={() => state.addChart("stacked-bar")}
        onAddStacked100BarChart={() => state.addChart("stacked-100-bar")}
        onAddWaterfallChart={() => state.addChart("waterfall")}
        onAddFunnelChart={() => state.addChart("funnel")}
        onAddHistogramChart={() => state.addChart("histogram")}
        onAddBoxWhiskerChart={() => state.addChart("box-whisker")}
        onAddTreemapChart={() => state.addChart("treemap")}
        onAddSunburstChart={() => state.addChart("sunburst")}
        onAddSurfaceChart={() => state.addChart("surface")}
        onAddMapChart={() => state.addChart("map")}
        onAddSparkline={state.addSparkline}
        canAddSparkline={canAddSparkline(state.activeSheet, state.selectedRange)}
        onAddShapeObject={(shapeType) =>
          state.addInsertedObject({ kind: "shape", shapeType })
        }
        onAddTextBoxObject={() =>
          state.addInsertedObject({ kind: "textBox", text: "Text box" })
        }
        onInsertImageObject={(file) => {
          handleInsertImageObject(file).catch(() => {
            setImportError("Image file could not be inserted.");
          });
        }}
        onAddConditionalFormat={state.addConditionalFormat}
        onAddDataValidation={state.addDataValidation}
        onAddFilter={state.addFilter}
        onApplyCriteriaRangeFilter={handleApplyCriteriaRangeFilter}
        onCopyCriteriaRangeToLocation={handleCopyCriteriaRangeToLocation}
        onAddTable={state.addTable}
        onAddNamedRange={state.addNamedRange}
        onCustomSort={({ columnIndex, direction, customOrder, sortOn, secondary }) =>
          state.sortSelectedRange(
            direction,
            columnIndex,
            secondary ? [secondary] : [],
            customOrder,
            sortOn,
          )
        }
        onSortAsc={() => {
          recordSelectionCommand("data.sortAsc", "Sort selected range ascending");
          state.sortSelectedRange("asc");
        }}
        onSortDesc={() => {
          recordSelectionCommand("data.sortDesc", "Sort selected range descending");
          state.sortSelectedRange("desc");
        }}
        onRemoveDuplicates={() => {
          recordSelectionCommand("data.removeDuplicates", "Remove duplicate rows");
          state.removeDuplicates();
        }}
        onFillDown={state.fillDown}
        onFillRight={state.fillRight}
        onFillSeries={state.fillSeries}
        onFlashFill={state.flashFill}
        canFlashFill={state.canFlashFill}
        canPasteSpecial={clipboardPayload !== null}
        onCopyVisibleRange={() => {
          handleCopyVisibleRange().catch(() => {
            setImportError("Could not copy the visible selected cells.");
          });
        }}
        onCopyVisibleRangeToNextColumns={handleCopyVisibleRangeToNextColumns}
        onCopyRangeImage={() => {
          handleCopyRangeImage().catch(() => {
            setImportError("Could not copy the selected range as an image.");
          });
        }}
        onPasteSpecial={handlePasteSpecial}
        onPasteTransposed={handlePasteTransposed}
        onExportCsv={handleExportCsv}
        onImportCsv={(file) => {
          handleImportCsv(file).catch(() => {
            setImportError("CSV import failed.");
          });
        }}
        onExportTsv={handleExportTsv}
        onImportTsv={(file) => {
          handleImportTsv(file).catch(() => {
            setImportError("TSV import failed.");
          });
        }}
        onExportHtml={handleExportHtml}
        onPrintSheet={handlePrintSheet}
        onExportPdf={handleExportPdf}
        onExportXml={handleExportXml}
        onExportXlsx={handleExportXlsx}
        onImportXlsx={(file) => {
          handleImportXlsx(file).catch(() => {
            setImportError("XLSX import failed.");
          });
        }}
        onExportXlsm={handleExportXlsm}
        onImportXlsm={(file) => {
          handleImportXlsm(file).catch(() => {
            setImportError("XLSM import failed.");
          });
        }}
        onExportXltx={handleExportXltx}
        onImportXltx={(file) => {
          handleImportXltx(file).catch(() => {
            setImportError("XLTX import failed.");
          });
        }}
        onExportXltm={handleExportXltm}
        onImportXltm={(file) => {
          handleImportXltm(file).catch(() => {
            setImportError("XLTM import failed.");
          });
        }}
        onExportXls={handleExportXls}
        onImportXls={(file) => {
          handleImportXls(file).catch(() => {
            setImportError("XLS import failed.");
          });
        }}
        onExportOds={handleExportOds}
        onImportOds={(file) => {
          handleImportOds(file).catch(() => {
            setImportError("ODS import failed.");
          });
        }}
        onExportJson={handleExportJson}
        onImportJson={(file) => {
          handleImportJson(file).catch(() => {
            setImportError("JSON import failed.");
          });
        }}
        onExportBackup={handleExportBackup}
        onImportBackup={(file) => {
          handleImportBackup(file).catch(() => {
            setImportError("Could not restore this backup.");
          });
        }}
        onRecoverWorkbookImport={(file) => {
          handleRecoverWorkbookImport(file).catch(() => {
            setImportError("Workbook recovery failed.");
          });
        }}
        onImportConnectorDatabaseResult={handleImportConnectorDatabaseResult}
        onImportConnectorUrl={handleImportConnectorUrl}
        onDeleteConnectorQuery={state.deleteWorkbookQuery}
        onRefreshConnectorQuery={handleRefreshConnectorQuery}
        connectorQueries={state.document.queries ?? []}
      />
      <FormulaBar
        address={state.selectedKey}
        customFunctions={state.document.customFunctions ?? []}
        disabled={state.isSelectedCellProtected || isReadOnlyAccess}
        isRightToLeft={isRightToLeft}
        namedRanges={activeNamedRanges}
        sheets={state.document.sheets}
        value={state.selectedFormulaBarValue}
        onChange={(value) => {
          recordSelectionCommand(
            "cell.setValue",
            `Set ${state.selectedKey} value`,
            value,
          );
          state.updateSelectedCell(value);
        }}
      />
      {!embedded ? (
        <WorkbookPresenceBar
          current={presence.current}
          peers={presence.peers}
          queuedEventCount={presence.queuedEventCount}
          transportStatus={presence.transportStatus}
        />
      ) : null}
      <FindBar
        disabled={state.isActiveSheetProtected || isReadOnlyAccess}
        query={findQuery}
        matchCount={findMatches.length}
        activeIndex={activeFindIndex}
        replaceValue={replaceValue}
        onQueryChange={setFindQuery}
        onReplaceValueChange={setReplaceValue}
        onReplaceActive={replaceActiveMatch}
        onReplaceAll={replaceAllMatches}
        onPrevious={() => {
          setActiveFindIndex((index) =>
            findMatches.length ? (index - 1 + findMatches.length) % findMatches.length : 0,
          );
        }}
        onNext={() => {
          setActiveFindIndex((index) =>
            findMatches.length ? (index + 1) % findMatches.length : 0,
          );
        }}
      />
      {importError ? (
        <Alert variant="destructive" className="m-3 w-auto">
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      ) : null}
      {importNotice ? (
        <Alert className="m-3 w-auto">
          <AlertDescription>{importNotice}</AlertDescription>
        </Alert>
      ) : null}
      {offlineNotice ? (
        <Alert className="m-3 w-auto">
          <AlertDescription>{offlineNotice}</AlertDescription>
        </Alert>
      ) : null}
      {offlineSyncPlan.status === "diverged" ? (
        <Alert variant="destructive" className="m-3 w-auto">
          <AlertDescription>
            {offlineSyncPlan.detail} Restore the encrypted cache only after you
            decide which copy should win.
          </AlertDescription>
        </Alert>
      ) : null}
      {saveConflictUpdatedAt ? (
        <WorkbookSaveConflictAlert
          disabled={isSaving}
          onReload={() => window.location.reload()}
          onOverwrite={handleSave}
          serverUpdatedAt={saveConflictUpdatedAt}
        />
      ) : null}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 overflow-hidden",
          embedded && !focusModeActive && "pb-14",
        )}
      >
        <div className={gridFrameClassName}>
          <div className={gridSurfaceClassName}>
            <SpreadsheetGridPanes
              splitPaneMode={splitPaneMode}
              workbookWindowPanes={workbookWindowPanes}
              {...activeGridProps}
            />
          </div>
        </div>
        {!focusModeActive ? (
          <SheetSidePanel
            sheet={state.activeSheet}
            document={state.document}
            charts={activeCharts}
            sparklines={activeSparklines}
            insertedObjects={activeInsertedObjects}
            selectedObjectId={state.selectedObjectId}
            tables={activeTables}
            tableSlicers={activeTableSlicers}
            tableTimelines={activeTableTimelines}
            pivotTables={activePivotTables}
            whatIfScenarios={activeWhatIfScenarios}
            conditionalFormats={activeConditionalFormats}
            dataValidations={activeDataValidations}
            dataValidationIssues={dataValidationIssues}
            dataModelIssues={dataModelIssues}
            dataModelRelationships={state.document.dataModelRelationships ?? []}
            formulaCheckingIssues={formulaCheckingIssues}
            formulaConsistencyIssues={formulaConsistencyIssues}
            formulaErrorIssues={formulaErrorIssues}
            formulaWatches={formulaWatches}
            filters={activeManualFilters}
            filterPresets={activeFilterPresets}
            calculationSettings={state.calculationSettings}
            circularReferences={circularReferences}
            formulaDependents={formulaTrace.dependents}
            formulaReferences={formulaReferences}
            commentsDisabled={
              state.isActiveSheetProtected || !canCommentCurrentWorkbook
            }
            collaborators={workbook.sharing?.collaborators ?? []}
            currentUserEmail={currentUser.email}
            multiRangeAreas={multiRangeAreas}
            isSheetProtected={state.isActiveSheetProtected || isReadOnlyAccess}
            namedRanges={activeNamedRanges}
            printSettings={state.activePrintSettings}
            selectedRange={state.selectedRange}
            selectedKey={state.selectedKey}
            selectedRaw={state.selectedRaw}
            selectedFormulaCount={selectedFormulaWatchCount}
            links={activeLinks}
            linkIssues={activeLinkIssues}
            notes={activeNotes}
            commentNotifications={activeCommentNotifications}
            workbookAccessibilityIssues={workbookAccessibilityIssues}
            workbookAccessRole={workbook.accessRole}
            workbookActivityLogs={activityLogs}
            workbookId={workbook.id}
            workbookName={workbook.name}
            workbookOwnerEmail={workbook.ownerEmail}
            workbookSharing={workbook.sharing}
            protectedRangeManagementDisabled={
              !isOwnerAccess || isReadOnlyAccess
            }
            protectedRanges={state.document.protectedRanges ?? []}
            trackedChanges={state.document.trackedChanges ?? []}
            workbookCompareError={workbookCompareError}
            workbookCompareFileName={workbookCompareFileName}
            workbookCompareMergeDisabled={
              isReadOnlyAccess ||
              state.isWorkbookProtected ||
              state.isActiveSheetProtected
            }
            workbookCompareNotice={workbookCompareNotice}
            workbookCompareResult={workbookCompareResult}
            workbookCompatibilityIssues={workbookCompatibilityIssues}
            workbookInspectionIssues={workbookInspectionIssues}
            workbookSpellCheckIssues={workbookSpellCheckIssues}
            workbookStatistics={workbookStatistics}
            workbookTheme={state.document.theme}
            workbookCellStyles={state.document.cellStyles ?? []}
            shortcutPreferences={keyboardShortcuts.preferences}
            shortcuts={keyboardShortcuts.shortcuts}
            macroProjects={state.document.macroProjects ?? []}
            automationScripts={state.document.automationScripts ?? []}
            customFunctions={state.document.customFunctions ?? []}
            addIns={state.document.addIns ?? []}
            versionHistory={state.document.versionHistory ?? []}
            versionRestores={state.document.versionRestores ?? []}
            computedValues={state.computedValues}
            onDeleteChart={state.deleteChart}
            onRenameChart={state.renameChart}
            onToggleChartAxes={state.toggleChartAxes}
            onToggleChartDataLabels={state.toggleChartDataLabels}
            onToggleChartLegend={state.toggleChartLegend}
            onUpdateChartFormat={state.updateChartFormat}
            onUpdateChartTemplate={state.updateChartTemplate}
            onExportChart={handleExportChart}
            onDeleteSparkline={state.deleteSparkline}
            onDeleteInsertedObject={state.deleteInsertedObject}
            onMoveInsertedObjectToSelection={state.moveInsertedObjectToSelection}
            onReorderInsertedObject={state.reorderInsertedObject}
            onSelectInsertedObject={state.selectInsertedObject}
            onUpdateInsertedObject={state.updateInsertedObject}
            onDeleteTable={state.deleteTable}
            onDeleteDataModelHierarchy={state.deleteDataModelHierarchy}
            onDeleteDataModelKpi={state.deleteDataModelKpi}
            onDeleteDataModelPerspective={state.deleteDataModelPerspective}
            onDeleteDataModelRelationship={state.deleteDataModelRelationship}
            onDeleteTableSlicer={state.deleteTableSlicer}
            onDeleteTableTimeline={state.deleteTableTimeline}
            onDeletePivotTable={state.deletePivotTable}
            onDeleteLink={state.deleteCellLink}
            onRepairLink={state.repairCellLink}
            onDeleteNote={state.deleteCellNote}
            onMarkCommentNotificationRead={state.markCommentNotificationRead}
            onSetNoteStatus={handleSetCellNoteStatus}
            onAddConditionalFormat={state.addConditionalFormat}
            onAddPivotTableConditionalFormat={
              state.addPivotTableConditionalFormat
            }
            onAddDataValidation={state.addDataValidation}
            onDeleteConditionalFormat={state.deleteConditionalFormat}
            onDeleteDataValidation={state.deleteDataValidation}
            onDeleteFilter={state.deleteFilter}
            onDeleteFilterPreset={state.deleteFilterPreset}
            onDuplicateConditionalFormat={state.duplicateConditionalFormat}
            onDeleteFormulaWatch={state.deleteFormulaWatch}
            onDeleteWhatIfScenario={state.deleteWhatIfScenario}
            onDeleteNamedRange={state.deleteNamedRange}
            onAddSelectedRangeToMultiRange={handleAddSelectedRangeToMultiRange}
            onAddProtectedRange={state.addProtectedRange}
            onApplyStyleToMultiRange={handleApplyStyleToMultiRange}
            onClearMultiRangeFormatting={handleClearMultiRangeFormatting}
            onClearMultiRangeSelection={() => setMultiRangeAreas([])}
            onCopyMultiRangeSelection={() => {
              handleCopyMultiRangeSelection().catch(() => {
                setImportError("The multi-range selection could not be copied.");
              });
            }}
            onNameMultiRangeSelection={handleNameMultiRangeSelection}
            onPasteMultiRangeSelection={() => {
              handlePasteMultiRangeSelection().catch(() => {
                setImportError("Clipboard text could not be pasted into those areas.");
              });
            }}
            onRemoveMultiRangeArea={handleRemoveMultiRangeArea}
            onDeleteScriptRecording={state.deleteScriptRecording}
            onDeleteWorkbookAddIn={state.deleteWorkbookAddIn}
            onDeleteWorkbookCustomFunction={state.deleteWorkbookCustomFunction}
            onDeleteProtectedRange={state.deleteProtectedRange}
            onReviewTrackedChange={state.reviewTrackedChange}
            onRegisterWorkbookAddIn={state.registerWorkbookAddIn}
            onRunWorkbookAddIn={state.runWorkbookAddIn}
            onRunScriptRecording={state.runScriptRecording}
            onSaveCustomFunction={state.saveCustomFunction}
            onSetWorkbookAddInEnabled={state.setWorkbookAddInEnabled}
            onResetAllShortcuts={keyboardShortcuts.resetAllShortcuts}
            onResetShortcut={keyboardShortcuts.resetShortcut}
            onUpdateShortcut={keyboardShortcuts.updateShortcut}
            onApplyFilterPreset={(presetId) => {
              const message = state.applyFilterPreset(presetId);

              if (!message) {
                setFilterReapplyVersion((currentValue) => currentValue + 1);
              }

              return message;
            }}
            onMoveConditionalFormat={state.moveConditionalFormat}
            onReapplyFilters={() =>
              setFilterReapplyVersion((currentValue) => currentValue + 1)
            }
            onResizeConditionalFormatToSelection={
              state.resizeConditionalFormatToSelection
            }
            onResizeDataValidationToSelection={
              state.resizeDataValidationToSelection
            }
            onResizeFilterToSelection={state.resizeFilterToSelection}
            onSelectConditionalFormat={state.selectConditionalFormat}
            onSelectDataValidation={state.selectDataValidation}
            onSelectFilter={state.selectFilter}
            onUpdateConditionalFormatVisualOptions={
              state.updateConditionalFormatVisualOptions
            }
            onSelectFormulaWatch={handleSelectFormulaWatch}
            onAddSelectedFormulaWatches={state.addSelectedFormulaWatches}
            onAddWhatIfScenario={state.addWhatIfScenario}
            onSaveFilterPreset={state.saveFilterPreset}
            onSelectNamedRange={(namedRange) => {
              setMultiRangeAreas(getNamedRangeAreas(namedRange));
              state.selectNamedRange(namedRange);
            }}
            onSelectTable={state.selectTable}
            onSelectPivotTable={state.selectPivotTable}
            onSelectCircularReference={handleSelectCircularReference}
            onSelectFormulaDependent={handleSelectFormulaReference}
            onSelectFormulaReference={handleSelectFormulaReference}
            onSelectMultiRangeArea={handleSelectMultiRangeArea}
            onSelectWorkbookAccessibilityIssue={(issue) => {
              if (issue.sheetId && issue.range) {
                state.selectRange(issue.sheetId, issue.range);
              }
            }}
            onApplyWorkbookCompareItems={handleApplyWorkbookCompareItems}
            onClearWorkbookCompare={handleClearWorkbookCompare}
            onSelectWorkbookCompareFile={handleSelectWorkbookCompareFile}
            onSelectWorkbookCompareItem={handleSelectWorkbookCompareItem}
            onSelectWorkbookCompatibilityIssue={(issue) => {
              if (issue.sheetId && issue.range) {
                state.selectRange(issue.sheetId, issue.range);
              }
            }}
            onSelectWorkbookInspectionIssue={(issue) => {
              if (issue.sheetId && issue.range) {
                state.selectRange(issue.sheetId, issue.range);
              }
            }}
            onSelectWorkbookSpellCheckIssue={(issue) => {
              state.selectRange(issue.sheetId, issue.range);
            }}
            onSelectTrackedChange={handleSelectTrackedChange}
            onSelectCell={state.selectCell}
            onRenameTable={state.renameTable}
            onAddPivotChart={state.addPivotChart}
            onAddPivotTableDrillDownSheet={state.addPivotTableDrillDownSheet}
            onAddPivotTable={state.addPivotTable}
            onAddTableSlicer={state.addTableSlicer}
            onAddTableTimeline={state.addTableTimeline}
            onRefreshPivotTable={state.refreshPivotTable}
            onUpdatePivotTableLayout={state.updatePivotTableLayout}
            onResizeTableToSelection={state.resizeTableToSelection}
            onUpdateTableSlicerValues={state.updateTableSlicerValues}
            onUpdateTableTimeline={state.updateTableTimeline}
            onToggleTableFilterButtons={state.toggleTableFilterButtons}
            onToggleTableHeaderRow={state.toggleTableHeaderRow}
            onToggleTableTotals={state.toggleTableTotals}
            onCreateDataModelHierarchy={state.addDataModelHierarchy}
            onCreateDataModelKpi={state.addDataModelKpi}
            onCreateDataModelPerspective={state.addDataModelPerspective}
            onCreateDataModelRelationship={state.addDataModelRelationship}
            onUpdateTableStyle={state.updateTableStyle}
            onUpdatePrintSettings={state.updateActiveSheetPrintSettings}
            onUpdateCalculationSettings={state.updateCalculationSettings}
            onCreateVersion={state.createVersionSnapshot}
            onDeleteVersion={state.deleteVersionSnapshot}
            onRestoreVersion={state.restoreVersionSnapshot}
            onApplyCellStylePreset={state.updateCellStyle}
            onDeleteManagedCellStyle={state.deleteManagedCellStyle}
            onSaveManagedCellStyle={state.saveManagedCellStyle}
            onUpdateManagedCellStyle={state.updateManagedCellStyle}
            onUpdateWorkbookTheme={state.updateWorkbookTheme}
            onStartScriptRecording={state.startScriptRecording}
            onStopScriptRecording={state.stopScriptRecording}
            onRunGoalSeek={state.runGoalSeek}
            onRunSolver={state.runSolver}
            onApplyWhatIfScenario={state.applyWhatIfScenario}
            onCreateDataTable={state.createOneVariableDataTable}
            onCreateCorrelation={state.createCorrelationTable}
            onCreateDescriptiveStatistics={
              state.createDescriptiveStatisticsTable
            }
            onCreateExponentialSmoothing={
              state.createExponentialSmoothingTable
            }
            onCreateForecastSheet={state.createForecastSheetTable}
            onCreateHistogram={state.createHistogramTable}
            onCreateMovingAverage={state.createMovingAverageTable}
            onCreateRegression={state.createRegressionTable}
            onCreateSampling={state.createSamplingTable}
            onEnableExcelScale={state.enableActiveSheetExcelScale}
          />
        ) : null}
      </div>
      {!focusModeActive ? (
        <SheetTabs
          sheets={state.document.sheets}
          activeSheetId={state.document.activeSheetId}
          isWorkbookProtected={state.isWorkbookProtected}
          readOnly={isReadOnlyAccess}
          isActiveSheetProtected={state.isActiveSheetProtected}
          className={
            embedded
              ? "fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-8px_24px_rgba(0,0,0,0.16)] backdrop-blur supports-[backdrop-filter]:bg-card/85"
              : undefined
          }
          onSelect={handleSetActiveSheet}
          onAdd={state.addSheet}
          onRename={state.renameSheet}
          onSetTabColor={state.setSheetTabColor}
          onDuplicate={state.duplicateSheet}
          onDelete={state.deleteSheet}
          selectionSummary={selectionSummary}
        />
      ) : null}
    </main>
  );
}

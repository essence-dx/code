"use client";

import { useMemo, useRef, useState } from "react";
import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import { getEffectiveSheetPrintSettings } from "@/features/workbooks/print-settings";
import type {
  PasteSpecialMode,
  SpreadsheetClipboardPayload,
} from "@/features/spreadsheet/cell-clipboard";
import type { SortCustomOrder } from "@/features/spreadsheet/sort-orders";
import { useWorkbookEvaluation } from "@/features/spreadsheet/use-workbook-evaluation";
import {
  addNamedMultiRangeToDocument,
  addNamedRangeToDocument,
  addCellNoteReplyInDocument,
  deleteCellLinkFromDocument,
  deleteCellNoteFromDocument,
  deleteNamedRangeFromDocument,
  markCommentNotificationReadInDocument,
  repairCellLinkInDocument,
  setCellNoteStatusInDocument,
  upsertCellLinkInDocument,
  upsertCellNoteInDocument,
} from "@/features/spreadsheet/state/annotation-state";
import {
  addChartToDocument,
  addSparklineToDocument,
  canAddSparkline,
  deleteChartFromDocument,
  deleteSparklineFromDocument,
  renameChartInDocument,
  toggleChartAxesInDocument,
  toggleChartDataLabelsInDocument,
  toggleChartLegendInDocument,
  updateChartAnchorInDocument,
  updateChartFormatInDocument,
  updateChartTemplateInDocument,
} from "@/features/spreadsheet/state/chart-state";
import type { ChartFormatUpdate } from "@/features/spreadsheet/chart-formatting";
import type {
  InsertedObjectCreateInput,
  InsertedObjectLayerAction,
  InsertedObjectUpdate,
} from "@/features/spreadsheet/inserted-objects";
import {
  addInsertedObjectToDocument,
  deleteInsertedObjectFromDocument,
  moveInsertedObjectToSelectionInDocument,
  reorderInsertedObjectInDocument,
  updateInsertedObjectInDocument,
} from "@/features/spreadsheet/state/object-state";
import {
  copyVisibleCellsIntoSheet,
  createClipboardCellsPastePlan,
  createClipboardTextPastePlan,
  createVisibleCellsCopyPlan,
  getRangeClipboardPayload,
  getRangeClipboardText,
  pasteClipboardCellsIntoSheet,
  pasteClipboardTextRowsIntoSheet,
} from "@/features/spreadsheet/state/clipboard-state";
import {
  createMultiRangeClipboardPayload,
  normalizeMultiRangeAreas,
  pasteClipboardTextIntoMultiRanges,
  type MultiRangeClipboardPayload,
} from "@/features/spreadsheet/multi-range-selection";
import {
  cloneDocument,
  getActiveSheet,
} from "@/features/spreadsheet/state/document-state";
import {
  addDataModelRelationshipToDocument,
  deleteDataModelRelationshipFromDocument,
  type DataModelRelationshipDraft,
} from "@/features/spreadsheet/data-model";
import {
  addDataModelHierarchyToDocument,
  addDataModelKpiToDocument,
  addDataModelPerspectiveToDocument,
  deleteDataModelHierarchyFromDocument,
  deleteDataModelKpiFromDocument,
  deleteDataModelPerspectiveFromDocument,
  type DataModelHierarchyDraft,
  type DataModelKpiDraft,
  type DataModelPerspectiveDraft,
} from "@/features/spreadsheet/data-model-view";
import { createDefaultWorkbookCalculationSettings } from "@/features/workbooks/default-workbook";
import {
  clearRangeContentFromDocument,
  getSingleCellEditRange,
  replaceAllTextInSheet,
  replaceCellTextInSheet,
  updateCellRaw,
  updateRangeRaw,
} from "@/features/spreadsheet/state/edit-state";
import {
  getDuplicateRowCountInRange,
  removeDuplicateRowsInRange,
} from "@/features/spreadsheet/state/duplicate-state";
import {
  createCorrelationPlan,
  createDescriptiveStatisticsPlan,
  createExponentialSmoothingPlan,
  createForecastSheetPlan,
  createHistogramPlan,
  createMovingAveragePlan,
  createRegressionPlan,
  createSamplingPlan,
  writeCorrelationToDocument,
  writeExponentialSmoothingToDocument,
  writeForecastSheetToDocument,
  writeHistogramToDocument,
  writeMovingAverageToDocument,
  writeRegressionToDocument,
  writeSamplingToDocument,
  writeDescriptiveStatisticsToDocument,
  type AnalysisToolpakResult,
} from "@/features/spreadsheet/analysis-toolpak";
import {
  canFillRange,
  fillSheetRange,
} from "@/features/spreadsheet/state/fill-state";
import {
  applyFlashFillToSheet,
  createFlashFillPlan,
} from "@/features/spreadsheet/flash-fill";
import { getFormulaWatchableCellCount } from "@/features/spreadsheet/formula-watch";
import {
  createOneVariableDataTablePlan,
  writeOneVariableDataTableToDocument,
  type DataTableRequest,
  type DataTableResult,
} from "@/features/spreadsheet/what-if-data-table";
import {
  formatGoalSeekValue,
  solveGoalSeek,
  type GoalSeekRequest,
  type GoalSeekResult,
} from "@/features/spreadsheet/what-if-goal-seek";
import {
  solveBoundedVariables,
  type SolverRequest,
  type SolverResult,
} from "@/features/spreadsheet/what-if-solver";
import { formatSolverValue } from "@/features/spreadsheet/what-if-solver-evaluation";
import {
  runSolverInWorker,
  shouldRunSolverInWorker,
} from "@/features/spreadsheet/solver-worker-client";
import {
  addFormulaWatchesForRange,
  deleteFormulaWatchFromDocument,
} from "@/features/spreadsheet/state/formula-watch-state";
import {
  getRedoFutureState,
  getUndoHistoryState,
  pushRedoFuture,
  pushUndoHistory,
} from "@/features/spreadsheet/state/history-state";
import {
  mergeRangeInDocument,
  unmergeRangeInDocument,
} from "@/features/spreadsheet/state/merge-state";
import {
  addFilterToDocument,
  applyColumnValueFilterToDocument,
  applyCriteriaFiltersToDocument,
  applyFilterPresetToDocument,
  clearColumnFiltersInDocument,
  createCriteriaFilterPlan,
  deleteFilterFromDocument,
  deleteFilterPresetFromDocument,
  getFilterPresetApplyError,
  prepareFilterPresetSave,
  resizeFilterInDocument,
  saveFilterPresetToDocument,
} from "@/features/spreadsheet/state/filter-state";
import {
  copyAdvancedFilterRowsToSheet,
  createAdvancedFilterCopyPlan,
} from "@/features/spreadsheet/advanced-filter-copy";
import {
  applyRichTextRunsToRange,
  clearRangeFormatting,
  clearRangeRichTextRuns,
  paintRangeStyle as paintStyleInRange,
  setRangeCellsLocked,
  setRangeFormulasHidden,
  updateRangeBorders,
  updateRangeCellStyle,
} from "@/features/spreadsheet/state/format-state";
import {
  addProtectedRangeToDocument,
  canEditCellWithProtectionRules,
  deleteProtectedRangeFromDocument,
  isCellFormulaHidden,
  isRangeEditableWithProtectionRules,
  isRangeFormulaHidden,
  isRangeUnlocked,
  isSheetProtected,
  toggleActiveSheetProtectionInDocument,
  toggleWorkbookProtectionInDocument,
  type WorkbookProtectionIdentity,
} from "@/features/spreadsheet/state/protection-state";
import {
  recordTrackedChangesForDocuments,
  reviewTrackedChangeInDocument,
  type WorkbookChangeActor,
  type WorkbookTrackedChangeDecision,
} from "@/features/spreadsheet/state/track-changes-state";
import {
  addPivotChartToDocument,
  addPivotTableDrillDownSheetToDocument,
  addPivotTableToDocument,
  deletePivotTableFromDocument,
  getPivotTableCreateError,
  refreshPivotTablesForTableControlsInDocument,
  updatePivotTableLayoutInDocument,
  refreshPivotTableInDocument,
  type PivotTableLayoutUpdate,
} from "@/features/spreadsheet/state/pivot-table-state";
import {
  addQuerySheetToDocument,
  deleteWorkbookQueryFromDocument,
  recordWorkbookQueryRefreshFailureInDocument,
  replaceWorkbookQuerySheetInDocument,
} from "@/features/spreadsheet/state/query-state";
import { updateActiveSheetPrintSettingsInDocument } from "@/features/spreadsheet/state/print-state";
import {
  clampSelection,
  getBoundarySelection,
  getMovedSelection,
  getRangeSelectionPlan,
  jumpToFilledBoundary,
  nearestVisibleIndex,
  normalizeRange,
  selectionToRange,
} from "@/features/spreadsheet/state/selection-state";
import type {
  CellRange,
  CellSelection,
  FillRangeMode,
  SelectionBoundary,
  SelectionJumpDirection,
  SortCriterion,
} from "@/features/spreadsheet/state/selection-state";
import {
  addConditionalFormatToDocument,
  addPivotTableConditionalFormatToDocument,
  addDataValidationToDocument,
  deleteConditionalFormatFromDocument,
  deleteDataValidationFromDocument,
  duplicateConditionalFormatInDocument,
  moveConditionalFormatInDocument,
  resizeConditionalFormatInDocument,
  resizeDataValidationInDocument,
  updateConditionalFormatVisualOptionsInDocument,
  type ConditionalFormatVisualOptionsUpdate,
} from "@/features/spreadsheet/state/rule-state";
import {
  deleteColumnsForRange,
  deleteRowsForRange,
  getHiddenColumnsAfterHiding,
  getHiddenRowsAfterHiding,
  hideColumnsInRange,
  hideRowsInRange,
  insertColumnsForRange,
  insertRowsForRange,
  setSheetColumnWidth,
  unhideSheetRowsAndColumns,
} from "@/features/spreadsheet/state/sheet-structure-state";
import {
  groupColumnsForRange,
  groupRowsForRange,
  toggleColumnGroupCollapsed,
  toggleRowGroupCollapsed,
  ungroupOutlineForRange,
} from "@/features/spreadsheet/state/outline-state";
import {
  addSheetToDocument,
  deleteSheetFromDocument,
  duplicateSheetInDocument,
  enableActiveSheetExcelScaleInDocument,
  importSheetIntoDocument,
  renameSheetInDocument,
  replaceWorkbookDocument,
  setActiveSheetInDocument,
  setSheetTabColorInDocument,
  toggleActiveSheetGridlinesInDocument,
} from "@/features/spreadsheet/state/sheet-state";
import { sortRangeInSheet } from "@/features/spreadsheet/state/sort-state";
import {
  addTableSlicerToDocument,
  deleteTableSlicerFromDocument,
  updateTableSlicerValuesInDocument,
} from "@/features/spreadsheet/state/slicer-state";
import {
  addTableTimelineToDocument,
  deleteTableTimelineFromDocument,
  updateTableTimelineInDocument,
} from "@/features/spreadsheet/state/timeline-state";
import {
  addTableToDocument,
  autofillCalculatedColumnInDocument,
  deleteTableFromDocument,
  renameTableInDocument,
  resizeTableInDocument,
  toggleTableFilterButtonsInDocument,
  toggleTableHeaderRowInDocument,
  toggleTableTotalsInDocument,
  updateTableStyleInDocument,
} from "@/features/spreadsheet/state/table-state";
import {
  deleteWorkbookCellStyleFromDocument,
  saveWorkbookCellStyleInDocument,
  updateWorkbookCellStyleInDocument,
  updateWorkbookThemeInDocument,
} from "@/features/spreadsheet/state/theme-state";
import type { WorkbookThemeUpdate } from "@/features/workbooks/workbook-themes";
import {
  addAutomaticVersionSnapshotToDocument,
  addVersionSnapshotToDocument,
  deleteVersionSnapshotFromDocument,
  restoreVersionSnapshotInDocument,
  shouldCreateAutomaticVersionSnapshot,
} from "@/features/spreadsheet/state/version-state";
import {
  addWhatIfScenarioToDocument,
  applyWhatIfScenarioToDocument,
  createWhatIfScenarioPlan,
  deleteWhatIfScenarioFromDocument,
} from "@/features/spreadsheet/state/what-if-state";
import {
  applyCustomViewToDocument,
  deleteCustomViewFromDocument,
  saveCustomViewToDocument,
  type CustomViewApplyResult,
  type CustomViewSnapshotInput,
} from "@/features/spreadsheet/state/view-state";
import {
  deleteAutomationScript,
  recordAutomationScriptStep,
  startAutomationScript,
  stopAutomationScript,
  type AutomationStepInput,
} from "@/features/workbooks/workbook-automation";
import {
  deleteAddInManifest,
  deleteCustomFunction,
  registerAddInManifest,
  setAddInEnabled,
  upsertCustomFunction,
} from "@/features/workbooks/workbook-extensions";
import {
  runWorkbookAutomationScript,
  type WorkbookAutomationRunResult,
} from "@/features/spreadsheet/automation-runtime";
import {
  runWorkbookAddInPackage,
  type WorkbookAddInSandboxResult,
} from "@/features/spreadsheet/add-in-sandbox";
import type {
  ChartDefinition,
  CellStyle,
  ConditionalFormatOperator,
  ConditionalFormatRule,
  ConditionalFormatStyle,
  DataValidationErrorStyle,
  DataValidationListSource,
  DataValidationRule,
  DataValidationRuleType,
  InsertedObjectAnchor,
  NamedRange,
  PivotTableConditionalFormatScope,
  PivotTableDefinition,
  SheetFilterRule,
  SheetPrintSettings,
  SheetData,
  TableDefinition,
  TableTimelineMode,
  WorkbookQueryDefinition,
  WorkbookCalculationSettings,
  WorkbookAutomationPermission,
  WorkbookDocument,
  WorkbookRole,
} from "@/features/workbooks/types";

export type {
  CellRange,
  CellSelection,
  FillRangeMode,
  SelectionBoundary,
  SelectionJumpDirection,
  SortCriterion,
} from "@/features/spreadsheet/state/selection-state";

function toggleBreakIndex(indexes: number[], index: number) {
  const nextIndexes = new Set(indexes);

  if (nextIndexes.has(index)) {
    nextIndexes.delete(index);
  } else {
    nextIndexes.add(index);
  }

  return Array.from(nextIndexes).sort((left, right) => left - right);
}

function moveBreakIndex(indexes: number[], fromIndex: number, toIndex: number) {
  if (fromIndex <= 0 || toIndex <= 0) {
    return indexes;
  }

  const nextIndexes = new Set(indexes);

  if (!nextIndexes.has(fromIndex)) {
    return indexes;
  }

  nextIndexes.delete(fromIndex);
  nextIndexes.add(toIndex);

  return Array.from(nextIndexes).sort((left, right) => left - right);
}

export function useSpreadsheetState(
  initialDocument: WorkbookDocument,
  context: {
    accessRole?: WorkbookRole;
    currentUser?: WorkbookChangeActor;
  } = {},
) {
  const solverRequestIdRef = useRef(0);
  const [document, setDocument] = useState(initialDocument);
  const [history, setHistory] = useState<WorkbookDocument[]>([]);
  const [future, setFuture] = useState<WorkbookDocument[]>([]);
  const [selected, setSelected] = useState<CellSelection>({
    rowIndex: 0,
    columnIndex: 0,
  });
  const [rangeAnchor, setRangeAnchor] = useState<CellSelection>({
    rowIndex: 0,
    columnIndex: 0,
  });
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const activeSheet = getActiveSheet(document);
  const selectedKey = cellKey(selected.rowIndex, selected.columnIndex);
  const selectedStyle = activeSheet.cells[selectedKey]?.style ?? {};
  const selectedRange = useMemo(
    () => normalizeRange(rangeAnchor, selected),
    [rangeAnchor, selected],
  );
  const workbookEvaluation = useWorkbookEvaluation(document, activeSheet.id);
  const computedValues = workbookEvaluation.values;
  const flashFillPlan = useMemo(
    () =>
      createFlashFillPlan({
        computedValues,
        range: selectedRange,
        sheet: activeSheet,
      }),
    [activeSheet, computedValues, selectedRange],
  );
  const activePrintSettings = useMemo(
    () =>
      getEffectiveSheetPrintSettings(
        activeSheet.id,
        document.sheetPrintSettings?.find(
          (settings) => settings.sheetId === activeSheet.id,
        ),
      ),
    [activeSheet.id, document.sheetPrintSettings],
  );
  const isActiveSheetProtected = isSheetProtected(document, activeSheet.id);
  const isWorkbookProtected = document.workbookProtection !== null;
  const isSelectedRangeUnlocked = useMemo(
    () => isRangeUnlocked(activeSheet, selectedRange),
    [activeSheet, selectedRange],
  );
  const isSelectedRangeFormulaHidden = useMemo(
    () => isRangeFormulaHidden(activeSheet, selectedRange),
    [activeSheet, selectedRange],
  );
  function getProtectionIdentity(): WorkbookProtectionIdentity {
    return {
      email: context.currentUser?.email,
      role: context.accessRole ?? "owner",
    };
  }

  function getChangeActor(): WorkbookChangeActor {
    return {
      email: context.currentUser?.email ?? "local@essence.excel",
      name: context.currentUser?.name ?? "Local editor",
    };
  }

  const isSelectedFormulaHidden =
    isActiveSheetProtected &&
    isCellFormulaHidden(activeSheet, selected.rowIndex, selected.columnIndex);
  const isSelectedCellProtected = !canEditCellWithProtectionRules({
    columnIndex: selected.columnIndex,
    document,
    identity: getProtectionIdentity(),
    rowIndex: selected.rowIndex,
    sheet: activeSheet,
  });
  const isSelectedRangeProtected = !isRangeEditableWithProtectionRules({
    document,
    identity: getProtectionIdentity(),
    range: selectedRange,
    sheet: activeSheet,
  });

  function isCellProtected(rowIndex: number, columnIndex: number) {
    return !canEditCellWithProtectionRules({
      columnIndex,
      document,
      identity: getProtectionIdentity(),
      rowIndex,
      sheet: activeSheet,
    });
  }

  function commit(
    mutator: (draft: WorkbookDocument) => void,
    options: { trackChanges?: boolean } = {},
  ) {
    setDocument((current) => {
      const draft = cloneDocument(current);
      mutator(draft);
      if (options.trackChanges) {
        recordTrackedChangesForDocuments({
          actor: getChangeActor(),
          after: draft,
          before: current,
        });
      }
      setHistory((items) => pushUndoHistory(items, current));
      setFuture([]);
      setIsDirty(true);
      return draft;
    });
  }

  function updateAutomationMetadata(
    mutator: (draft: WorkbookDocument) => void,
  ) {
    setDocument((current) => {
      const draft = cloneDocument(current);
      mutator(draft);
      setIsDirty(true);
      return draft;
    });
  }

  function commitSheetEdit(
    mutator: (draft: WorkbookDocument) => void,
    options: { unlockedRange?: CellRange } = {},
  ) {
    if (
      isActiveSheetProtected &&
      (!options.unlockedRange ||
        !isRangeEditableWithProtectionRules({
          document,
          identity: getProtectionIdentity(),
          range: options.unlockedRange,
          sheet: activeSheet,
        }))
    ) {
      return false;
    }

    if (
      options.unlockedRange &&
      !isRangeEditableWithProtectionRules({
        document,
        identity: getProtectionIdentity(),
        range: options.unlockedRange,
        sheet: activeSheet,
      })
    ) {
      return false;
    }

    commit(mutator, { trackChanges: true });
    return true;
  }

  function updateSelectedCell(raw: string) {
    commitSheetEdit((draft) => {
      updateCellRaw(getActiveSheet(draft), selected, raw);

      if (!isActiveSheetProtected) {
        autofillCalculatedColumnInDocument(draft, selected);
      }
    }, { unlockedRange: getSingleCellEditRange(selected) });
  }

  function runGoalSeek(request: GoalSeekRequest): GoalSeekResult {
    const result = solveGoalSeek({
      ...request,
      activeSheetId: document.activeSheetId,
      document,
    });
    const changingPosition = parseCellKey(result.changingCellKey);

    if (!result.success || !changingPosition || result.changingValue === undefined) {
      return result;
    }

    if (
      !canEditCellWithProtectionRules({
        columnIndex: changingPosition.columnIndex,
        document,
        identity: getProtectionIdentity(),
        rowIndex: changingPosition.rowIndex,
        sheet: activeSheet,
      })
    ) {
      return {
        ...result,
        message: "The changing cell is protected.",
        success: false,
      };
    }

    commit((draft) => {
      updateCellRaw(
        getActiveSheet(draft),
        changingPosition,
        formatGoalSeekValue(result.changingValue ?? 0),
      );
    }, { trackChanges: true });

    return result;
  }

  async function runSolver(request: SolverRequest): Promise<SolverResult> {
    const requestId = solverRequestIdRef.current + 1;

    solverRequestIdRef.current = requestId;

    let result: SolverResult;

    try {
      const useWorker = shouldRunSolverInWorker(request);

      result = useWorker
        ? await runSolverInWorker({
            activeSheetId: document.activeSheetId,
            document,
            request,
            requestId,
          })
        : solveBoundedVariables({
            ...request,
            activeSheetId: document.activeSheetId,
            document,
          });
      result = {
        ...result,
        executionMode: useWorker ? "worker" : "sync",
      };
    } catch (error) {
      result = {
        changingCellKey: request.variables[0]?.cellKey ?? "",
        engine: request.engine ?? "grid",
        executionMode: shouldRunSolverInWorker(request) ? "worker" : "sync",
        iterations: 0,
        message: error instanceof Error ? error.message : "Solver failed.",
        objective: request.objective,
        success: false,
        targetCellKey: request.targetCellKey,
      };
    }

    if (requestId !== solverRequestIdRef.current) {
      return {
        ...result,
        message: "A newer Solver run replaced this result.",
        success: false,
      };
    }

    const variableValues = result.variableValues ?? [];
    const variablePositions = variableValues.map((value) => ({
      ...value,
      position: parseCellKey(value.cellKey),
    }));

    if (
      !result.success ||
      variablePositions.length === 0 ||
      variablePositions.some((value) => !value.position)
    ) {
      return result;
    }

    if (
      variablePositions.some(
        (value) =>
          !value.position ||
          !canEditCellWithProtectionRules({
            columnIndex: value.position.columnIndex,
            document,
            identity: getProtectionIdentity(),
            rowIndex: value.position.rowIndex,
            sheet: activeSheet,
          }),
      )
    ) {
      return {
        ...result,
        message: "One or more variable cells are protected.",
        success: false,
      };
    }

    commit((draft) => {
      const sheet = getActiveSheet(draft);

      for (const value of variablePositions) {
        if (!value.position) {
          continue;
        }

        updateCellRaw(sheet, value.position, formatSolverValue(value.value));
      }
    }, { trackChanges: true });

    return result;
  }

  function addWhatIfScenario(name: string) {
    const plan = createWhatIfScenarioPlan({
      document,
      name,
      range: selectedRange,
    });

    if (plan.error || !plan.scenario) {
      return plan.error;
    }

    commit((draft) => {
      addWhatIfScenarioToDocument(draft, plan.scenario);
    });

    return null;
  }

  function applyWhatIfScenario(scenarioId: string) {
    const scenario = (document.whatIfScenarios ?? []).find(
      (item) => item.id === scenarioId && item.sheetId === document.activeSheetId,
    );

    if (!scenario) {
      return "Scenario was not found on this sheet.";
    }

    const lockedValue = scenario.values.find((value) => {
      const position = parseCellKey(value.cellKey);

      return (
        !position ||
        !canEditCellWithProtectionRules({
          columnIndex: position.columnIndex,
          document,
          identity: getProtectionIdentity(),
          rowIndex: position.rowIndex,
          sheet: activeSheet,
        })
      );
    });

    if (lockedValue) {
      return "One or more scenario cells are protected.";
    }

    let message: string | null = null;

    commit((draft) => {
      message = applyWhatIfScenarioToDocument(draft, scenarioId);
    }, { trackChanges: true });

    return message;
  }

  function deleteWhatIfScenario(scenarioId: string) {
    commit((draft) => {
      deleteWhatIfScenarioFromDocument(draft, scenarioId);
    });
  }

  function createOneVariableDataTable(
    request: DataTableRequest,
  ): DataTableResult {
    const result = createOneVariableDataTablePlan({
      ...request,
      activeSheetId: document.activeSheetId,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeOneVariableDataTableToDocument(draft, result.plan);
    });

    return {
      message: `Created a data table with ${result.plan.rows.length} input values.`,
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function createDescriptiveStatisticsTable(): AnalysisToolpakResult {
    if (isActiveSheetProtected) {
      return {
        message: "Sheet protection blocks analysis output.",
        rowCount: 0,
        success: false,
      };
    }

    const result = createDescriptiveStatisticsPlan({
      computedValues,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeDescriptiveStatisticsToDocument(draft, result.plan);
    });

    return {
      message: `Created descriptive statistics for ${result.plan.rows.length} metrics.`,
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function createHistogramTable(): AnalysisToolpakResult {
    if (isActiveSheetProtected) {
      return {
        message: "Sheet protection blocks analysis output.",
        rowCount: 0,
        success: false,
      };
    }

    const result = createHistogramPlan({
      computedValues,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeHistogramToDocument(draft, result.plan);
    });

    return {
      message: `Created a histogram with ${result.plan.rows.length} bins.`,
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function createCorrelationTable(): AnalysisToolpakResult {
    if (isActiveSheetProtected) {
      return {
        message: "Sheet protection blocks analysis output.",
        rowCount: 0,
        success: false,
      };
    }

    const result = createCorrelationPlan({
      computedValues,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeCorrelationToDocument(draft, result.plan);
    });

    return {
      message: `Created a correlation matrix with ${result.plan.rows.length} variables.`,
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function createRegressionTable(): AnalysisToolpakResult {
    if (isActiveSheetProtected) {
      return {
        message: "Sheet protection blocks analysis output.",
        rowCount: 0,
        success: false,
      };
    }

    const result = createRegressionPlan({
      computedValues,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeRegressionToDocument(draft, result.plan);
    });

    return {
      message: "Created a linear regression summary from the first two numeric columns.",
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function createSamplingTable(): AnalysisToolpakResult {
    if (isActiveSheetProtected) {
      return {
        message: "Sheet protection blocks analysis output.",
        rowCount: 0,
        success: false,
      };
    }

    const result = createSamplingPlan({
      computedValues,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeSamplingToDocument(draft, result.plan);
    });

    return {
      message: `Created sampling output with ${result.plan.rows.length} rows.`,
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function createMovingAverageTable(): AnalysisToolpakResult {
    if (isActiveSheetProtected) {
      return {
        message: "Sheet protection blocks analysis output.",
        rowCount: 0,
        success: false,
      };
    }

    const result = createMovingAveragePlan({
      computedValues,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeMovingAverageToDocument(draft, result.plan);
    });

    return {
      message: `Created moving average output with ${result.plan.rows.length} periods.`,
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function createExponentialSmoothingTable(): AnalysisToolpakResult {
    if (isActiveSheetProtected) {
      return {
        message: "Sheet protection blocks analysis output.",
        rowCount: 0,
        success: false,
      };
    }

    const result = createExponentialSmoothingPlan({
      computedValues,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeExponentialSmoothingToDocument(draft, result.plan);
    });

    return {
      message: `Created exponential smoothing output with ${result.plan.rows.length} periods.`,
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function createForecastSheetTable(): AnalysisToolpakResult {
    if (isActiveSheetProtected) {
      return {
        message: "Sheet protection blocks forecast output.",
        rowCount: 0,
        success: false,
      };
    }

    const result = createForecastSheetPlan({
      computedValues,
      document,
      sourceRange: selectedRange,
    });

    if (result.error || !result.plan) {
      return {
        message: result.error,
        rowCount: 0,
        success: false,
      };
    }

    let outputRange = result.plan.outputRange;

    commit((draft) => {
      outputRange = writeForecastSheetToDocument(draft, result.plan);
    });

    return {
      message: `Created a forecast sheet output with ${result.plan.rows.length} periods.`,
      outputRange,
      rowCount: result.plan.rows.length,
      success: true,
    };
  }

  function updateSelectedRange(raw: string) {
    commitSheetEdit((draft) => {
      updateRangeRaw(getActiveSheet(draft), selectedRange, raw, selected);
    }, { unlockedRange: selectedRange });
  }

  function replaceCellText(
    target: CellSelection,
    query: string,
    replacement: string,
  ) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    commitSheetEdit((draft) => {
      replaceCellTextInSheet({
        sheet: getActiveSheet(draft),
        target,
        query: normalizedQuery,
        replacement,
      });
    }, { unlockedRange: getSingleCellEditRange(target) });
  }

  function replaceAllText(query: string, replacement: string) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    commitSheetEdit((draft) => {
      replaceAllTextInSheet({
        sheet: getActiveSheet(draft),
        query: normalizedQuery,
        replacement,
      });
    });
  }

  function updateCellStyle(style: Partial<CellStyle>) {
    commitSheetEdit((draft) => {
      updateRangeCellStyle(getActiveSheet(draft), selectedRange, style);
    }, { unlockedRange: selectedRange });
  }

  function setSelectedCellsLocked(locked: boolean) {
    commitSheetEdit((draft) => {
      setRangeCellsLocked(getActiveSheet(draft), selectedRange, locked);
    }, { unlockedRange: selectedRange });
  }

  function setSelectedFormulasHidden(hidden: boolean) {
    commitSheetEdit((draft) => {
      setRangeFormulasHidden(getActiveSheet(draft), selectedRange, hidden);
    }, { unlockedRange: selectedRange });
  }

  function clearSelectedFormatting() {
    commitSheetEdit((draft) => {
      clearRangeFormatting(getActiveSheet(draft), selectedRange);
    }, { unlockedRange: selectedRange });
  }

  function applyRichTextRunsToSelectedCells() {
    commitSheetEdit((draft) => {
      applyRichTextRunsToRange({
        sheet: getActiveSheet(draft),
        range: selectedRange,
        style: selectedStyle,
        computedValues,
      });
    }, { unlockedRange: selectedRange });
  }

  function clearSelectedRichTextRuns() {
    commitSheetEdit((draft) => {
      clearRangeRichTextRuns(getActiveSheet(draft), selectedRange);
    }, { unlockedRange: selectedRange });
  }

  function paintRangeStyle(range: CellRange, style: CellStyle) {
    commitSheetEdit((draft) => {
      paintStyleInRange(getActiveSheet(draft), range, style);
    }, { unlockedRange: range });
  }

  function updateCellBorders(kind: "all" | "outline" | "clear") {
    commitSheetEdit((draft) => {
      updateRangeBorders(getActiveSheet(draft), selectedRange, kind);
    }, { unlockedRange: selectedRange });
  }

  function updateWorkbookTheme(updates: WorkbookThemeUpdate) {
    commit((draft) => {
      updateWorkbookThemeInDocument(draft, updates);
    });
  }

  function updateCalculationSettings(
    updates: Partial<WorkbookCalculationSettings["iterativeCalculation"]> & {
      calendarSystem?: WorkbookCalculationSettings["calendarSystem"];
    },
  ) {
    commit((draft) => {
      const current =
        draft.calculationSettings ?? createDefaultWorkbookCalculationSettings();

      draft.calculationSettings = {
        calendarSystem: updates.calendarSystem ?? current.calendarSystem,
        iterativeCalculation: {
          ...current.iterativeCalculation,
          ...updates,
          maxIterations:
            typeof updates.maxIterations === "number" &&
            Number.isFinite(updates.maxIterations)
              ? Math.min(Math.max(Math.round(updates.maxIterations), 1), 10000)
              : current.iterativeCalculation.maxIterations,
          maxChange:
            typeof updates.maxChange === "number" &&
            Number.isFinite(updates.maxChange)
              ? Math.min(Math.max(updates.maxChange, 0.000000001), 1)
              : current.iterativeCalculation.maxChange,
        },
      };
    });
  }

  function saveManagedCellStyle(name: string) {
    let styleId: string | null = null;

    commit((draft) => {
      styleId = saveWorkbookCellStyleInDocument(draft, name, selectedStyle);
    });

    return styleId;
  }

  function deleteManagedCellStyle(styleId: string) {
    commit((draft) => {
      deleteWorkbookCellStyleFromDocument(draft, styleId);
    });
  }

  function updateManagedCellStyle(styleId: string, name?: string) {
    commit((draft) => {
      updateWorkbookCellStyleInDocument(draft, styleId, {
        name,
        style: selectedStyle,
      });
    });
  }

  function mergeSelectedCells() {
    commitSheetEdit((draft) => {
      mergeRangeInDocument(draft, selectedRange);
    });
  }

  function unmergeSelectedCells() {
    commitSheetEdit((draft) => {
      unmergeRangeInDocument(draft, selectedRange);
    });
  }

  function addChart(type: ChartDefinition["type"]) {
    commitSheetEdit((draft) => {
      addChartToDocument(draft, type, selectedRange);
    });
  }

  function deleteChart(chartId: string) {
    commitSheetEdit((draft) => {
      deleteChartFromDocument(draft, chartId);
    });
  }

  function updateChartTemplate(
    chartId: string,
    template: NonNullable<ChartDefinition["template"]>,
  ) {
    commitSheetEdit((draft) => {
      updateChartTemplateInDocument(draft, chartId, template);
    });
  }

  function updateChartFormat(chartId: string, updates: ChartFormatUpdate) {
    commitSheetEdit((draft) => {
      updateChartFormatInDocument(draft, chartId, updates);
    });
  }

  function updateChartAnchor(
    chartId: string,
    anchor: Partial<InsertedObjectAnchor>,
  ) {
    commitSheetEdit((draft) => {
      updateChartAnchorInDocument(draft, chartId, anchor);
    });
  }

  function renameChart(chartId: string, title: string) {
    commitSheetEdit((draft) => {
      renameChartInDocument(draft, chartId, title);
    });
  }

  function toggleChartDataLabels(chartId: string) {
    commitSheetEdit((draft) => {
      toggleChartDataLabelsInDocument(draft, chartId);
    });
  }

  function toggleChartAxes(chartId: string) {
    commitSheetEdit((draft) => {
      toggleChartAxesInDocument(draft, chartId);
    });
  }

  function toggleChartLegend(chartId: string) {
    commitSheetEdit((draft) => {
      toggleChartLegendInDocument(draft, chartId);
    });
  }

  function addSparkline() {
    if (!canAddSparkline(activeSheet, selectedRange)) {
      return;
    }

    commitSheetEdit((draft) => {
      addSparklineToDocument(draft, selectedRange);
    });
  }

  function deleteSparkline(sparklineId: string) {
    commitSheetEdit((draft) => {
      deleteSparklineFromDocument(draft, sparklineId);
    });
  }

  function addInsertedObject(input: InsertedObjectCreateInput) {
    let objectId: string | null = null;
    const didCommit = commitSheetEdit((draft) => {
      objectId = addInsertedObjectToDocument(draft, selected, input);
    });

    if (didCommit && objectId) {
      setSelectedObjectId(objectId);
    }
  }

  function updateInsertedObject(
    objectId: string,
    updates: InsertedObjectUpdate,
  ) {
    commitSheetEdit((draft) => {
      updateInsertedObjectInDocument(draft, objectId, updates);
    });
  }

  function deleteInsertedObject(objectId: string) {
    commitSheetEdit((draft) => {
      deleteInsertedObjectFromDocument(draft, objectId);
    });

    setSelectedObjectId((currentId) =>
      currentId === objectId ? null : currentId,
    );
  }

  function moveInsertedObjectToSelection(objectId: string) {
    commitSheetEdit((draft) => {
      moveInsertedObjectToSelectionInDocument(draft, objectId, selected);
    });
  }

  function reorderInsertedObject(
    objectId: string,
    action: InsertedObjectLayerAction,
  ) {
    commitSheetEdit((draft) => {
      reorderInsertedObjectInDocument(draft, objectId, action);
    });
  }

  function addTable() {
    commitSheetEdit((draft) => {
      addTableToDocument(draft, selectedRange);
    });
  }

  function deleteTable(tableId: string) {
    commitSheetEdit((draft) => {
      deleteTableFromDocument(draft, tableId);
    });
  }

  function addDataModelRelationship(draft: DataModelRelationshipDraft) {
    let message: string | null = null;

    commitSheetEdit((documentDraft) => {
      message = addDataModelRelationshipToDocument({
        activeSheetId: activeSheet.id,
        computedValues,
        document: documentDraft,
        draft,
      });
    });

    return message;
  }

  function deleteDataModelRelationship(relationshipId: string) {
    commitSheetEdit((draft) => {
      deleteDataModelRelationshipFromDocument(draft, relationshipId);
    });
  }

  function addDataModelHierarchy(draft: DataModelHierarchyDraft) {
    let message: string | null = null;

    commitSheetEdit((documentDraft) => {
      message = addDataModelHierarchyToDocument({
        document: documentDraft,
        draft,
      });
    });

    return message;
  }

  function deleteDataModelHierarchy(hierarchyId: string) {
    commitSheetEdit((draft) => {
      deleteDataModelHierarchyFromDocument(draft, hierarchyId);
    });
  }

  function addDataModelKpi(draft: DataModelKpiDraft) {
    let message: string | null = null;

    commitSheetEdit((documentDraft) => {
      message = addDataModelKpiToDocument({
        document: documentDraft,
        draft,
      });
    });

    return message;
  }

  function deleteDataModelKpi(kpiId: string) {
    commitSheetEdit((draft) => {
      deleteDataModelKpiFromDocument(draft, kpiId);
    });
  }

  function addDataModelPerspective(draft: DataModelPerspectiveDraft) {
    let message: string | null = null;

    commitSheetEdit((documentDraft) => {
      message = addDataModelPerspectiveToDocument({
        document: documentDraft,
        draft,
      });
    });

    return message;
  }

  function deleteDataModelPerspective(perspectiveId: string) {
    commitSheetEdit((draft) => {
      deleteDataModelPerspectiveFromDocument(draft, perspectiveId);
    });
  }

  function addTableSlicer(tableId: string, columnIndex: number) {
    commitSheetEdit((draft) => {
      const changedTableId = addTableSlicerToDocument({
        document: draft,
        tableId,
        columnIndex,
        computedValues,
      });

      if (changedTableId) {
        refreshPivotTablesForTableControlsInDocument({
          computedValues,
          document: draft,
          tableId: changedTableId,
        });
      }
    });
  }

  function updateTableSlicerValues(
    slicerId: string,
    selectedValues: string[],
  ) {
    commitSheetEdit((draft) => {
      const changedTableId = updateTableSlicerValuesInDocument(
        draft,
        slicerId,
        selectedValues,
      );

      if (changedTableId) {
        refreshPivotTablesForTableControlsInDocument({
          computedValues,
          document: draft,
          tableId: changedTableId,
        });
      }
    });
  }

  function deleteTableSlicer(slicerId: string) {
    commitSheetEdit((draft) => {
      const changedTableId = deleteTableSlicerFromDocument(draft, slicerId);

      if (changedTableId) {
        refreshPivotTablesForTableControlsInDocument({
          computedValues,
          document: draft,
          tableId: changedTableId,
        });
      }
    });
  }

  function addTableTimeline(tableId: string, columnIndex: number) {
    commitSheetEdit((draft) => {
      const changedTableId = addTableTimelineToDocument({
        document: draft,
        tableId,
        columnIndex,
        computedValues,
      });

      if (changedTableId) {
        refreshPivotTablesForTableControlsInDocument({
          computedValues,
          document: draft,
          tableId: changedTableId,
        });
      }
    });
  }

  function updateTableTimeline(
    timelineId: string,
    updates: { mode?: TableTimelineMode; selectedPeriods?: string[] },
  ) {
    commitSheetEdit((draft) => {
      const changedTableId = updateTableTimelineInDocument(
        draft,
        timelineId,
        updates,
      );

      if (changedTableId) {
        refreshPivotTablesForTableControlsInDocument({
          computedValues,
          document: draft,
          tableId: changedTableId,
        });
      }
    });
  }

  function deleteTableTimeline(timelineId: string) {
    commitSheetEdit((draft) => {
      const changedTableId = deleteTableTimelineFromDocument(draft, timelineId);

      if (changedTableId) {
        refreshPivotTablesForTableControlsInDocument({
          computedValues,
          document: draft,
          tableId: changedTableId,
        });
      }
    });
  }

  function addPivotTable() {
    const validationMessage = getPivotTableCreateError({
      computedValues,
      document,
      selectedRange,
    });
    let message: string | null = null;

    if (validationMessage) {
      return validationMessage;
    }

    commitSheetEdit((draft) => {
      message = addPivotTableToDocument({
        computedValues,
        document: draft,
        selectedRange,
      });
    }, { unlockedRange: selectedRange });

    return message;
  }

  function refreshPivotTable(pivotTableId: string) {
    let message: string | null = null;

    commitSheetEdit((draft) => {
      message = refreshPivotTableInDocument({
        computedValues,
        document: draft,
        pivotTableId,
      });
    });

    return message;
  }

  function updatePivotTableLayout(
    pivotTableId: string,
    updates: PivotTableLayoutUpdate,
  ) {
    let message: string | null = null;

    commitSheetEdit((draft) => {
      message = updatePivotTableLayoutInDocument({
        computedValues,
        document: draft,
        pivotTableId,
        updates,
      });
    });

    return message;
  }

  function addPivotChart(pivotTableId: string) {
    let message: string | null = null;

    commitSheetEdit((draft) => {
      message = addPivotChartToDocument(draft, pivotTableId);
    });

    return message;
  }

  function addPivotTableDrillDownSheet(pivotTableId: string) {
    let message: string | null = null;

    if (document.workbookProtection) {
      return "Workbook structure is protected.";
    }

    if (
      !(document.pivotTables ?? []).some(
        (item) => item.id === pivotTableId && item.sheetId === activeSheet.id,
      )
    ) {
      return "PivotTable was not found on this sheet.";
    }

    commit((draft) => {
      message = addPivotTableDrillDownSheetToDocument({
        computedValues,
        document: draft,
        pivotTableId,
      });
    });

    if (!message) {
      setRangeAnchor({ rowIndex: 0, columnIndex: 0 });
      setSelected({ rowIndex: 0, columnIndex: 0 });
    }

    return message;
  }

  function deletePivotTable(pivotTableId: string) {
    commitSheetEdit((draft) => {
      deletePivotTableFromDocument(draft, pivotTableId);
    });
  }

  function renameTable(tableId: string, name: string) {
    commitSheetEdit((draft) => {
      renameTableInDocument(draft, tableId, name);
    });
  }

  function resizeTableToSelection(tableId: string) {
    commitSheetEdit((draft) => {
      resizeTableInDocument(draft, tableId, selectedRange);
    });
  }

  function updateTableStyle(tableId: string, style: TableDefinition["style"]) {
    commitSheetEdit((draft) => {
      updateTableStyleInDocument(draft, tableId, style);
    });
  }

  function toggleTableTotals(tableId: string) {
    commitSheetEdit((draft) => {
      toggleTableTotalsInDocument(draft, tableId);
    });
  }

  function toggleTableFilterButtons(tableId: string) {
    commitSheetEdit((draft) => {
      toggleTableFilterButtonsInDocument(draft, tableId);
    });
  }

  function toggleTableHeaderRow(tableId: string) {
    commitSheetEdit((draft) => {
      toggleTableHeaderRowInDocument(draft, tableId);
    });
  }

  function selectTable(table: TableDefinition) {
    selectRange(table.sheetId, table.range);
  }

  function selectPivotTable(pivotTable: PivotTableDefinition) {
    selectRange(pivotTable.sheetId, pivotTable.outputRange);
  }

  function addConditionalFormat(rule: {
    operator: ConditionalFormatOperator;
    value: string;
    style: ConditionalFormatStyle;
  }) {
    commitSheetEdit((draft) => {
      addConditionalFormatToDocument(draft, selectedRange, rule);
    });
  }

  function addPivotTableConditionalFormat(
    pivotTableId: string,
    rule: {
      operator: ConditionalFormatOperator;
      value: string;
      style: ConditionalFormatStyle;
    },
    scope: PivotTableConditionalFormatScope = "values",
  ) {
    let message: string | null = null;

    commitSheetEdit((draft) => {
      message = addPivotTableConditionalFormatToDocument(
        draft,
        pivotTableId,
        rule,
        scope,
      );
    });

    return message;
  }

  function deleteConditionalFormat(ruleId: string) {
    commitSheetEdit((draft) => {
      deleteConditionalFormatFromDocument(draft, ruleId);
    });
  }

  function duplicateConditionalFormat(ruleId: string) {
    commitSheetEdit((draft) => {
      duplicateConditionalFormatInDocument(draft, ruleId);
    });
  }

  function selectConditionalFormat(rule: ConditionalFormatRule) {
    selectRange(rule.sheetId, rule.range);
  }

  function resizeConditionalFormatToSelection(ruleId: string) {
    commitSheetEdit((draft) => {
      resizeConditionalFormatInDocument(draft, ruleId, selectedRange);
    });
  }

  function moveConditionalFormat(
    ruleId: string,
    direction: "up" | "down" | "top" | "bottom",
  ) {
    commitSheetEdit((draft) => {
      moveConditionalFormatInDocument(draft, ruleId, direction);
    });
  }

  function updateConditionalFormatVisualOptions(
    ruleId: string,
    updates: ConditionalFormatVisualOptionsUpdate,
  ) {
    commitSheetEdit((draft) => {
      updateConditionalFormatVisualOptionsInDocument(draft, ruleId, updates);
    });
  }

  function addDataValidation(rule: {
    type: DataValidationRuleType;
    value: string;
    listSource?: DataValidationListSource;
    dependentCell?: string;
    inputMessage?: string;
    errorMessage?: string;
    showInputMessage?: boolean;
    showErrorAlert?: boolean;
    errorStyle?: DataValidationErrorStyle;
    ignoreBlank?: boolean;
    circleInvalid?: boolean;
  }) {
    commitSheetEdit((draft) => {
      addDataValidationToDocument(draft, selectedRange, rule);
    });
  }

  function deleteDataValidation(ruleId: string) {
    commitSheetEdit((draft) => {
      deleteDataValidationFromDocument(draft, ruleId);
    });
  }

  function selectDataValidation(rule: DataValidationRule) {
    selectRange(rule.sheetId, rule.range);
  }

  function resizeDataValidationToSelection(ruleId: string) {
    commitSheetEdit((draft) => {
      resizeDataValidationInDocument(draft, ruleId, selectedRange);
    });
  }

  function addFilter(rule: {
    columnIndex: number;
    headerName?: string;
    type: SheetFilterRule["type"];
    value: string;
    values?: string[];
    joiner?: "and" | "or";
    conditions?: SheetFilterRule["conditions"];
    criteriaGroups?: SheetFilterRule["criteriaGroups"];
  }) {
    commitSheetEdit((draft) => {
      addFilterToDocument(draft, selectedRange, rule);
    });
  }

  function applyCriteriaRangeFilter() {
    const result = createCriteriaFilterPlan({
      sheet: activeSheet,
      criteriaRange: selectedRange,
      computedValues,
    });

    if (result.filters.length === 0) {
      return result.message ?? "No criteria filters were created.";
    }

    const didApply = commitSheetEdit((draft) => {
      applyCriteriaFiltersToDocument(draft, result.filters);
    });

    return didApply ? null : "The active sheet is protected.";
  }

  function copyCriteriaRangeToLocation(destinationReference: string) {
    const target = parseCellKey(destinationReference);

    if (!target) {
      return "Enter a destination cell such as J1.";
    }

    const result = createAdvancedFilterCopyPlan({
      sheet: activeSheet,
      criteriaRange: selectedRange,
      target,
      computedValues,
    });

    if (!result.ok) {
      return result.message;
    }

    const didCopy = commitSheetEdit((draft) => {
      copyAdvancedFilterRowsToSheet({
        sheet: getActiveSheet(draft),
        computedValues,
        plan: result.plan,
      });
    }, { unlockedRange: result.plan.targetRange });

    if (!didCopy) {
      return "The output range is protected.";
    }

    selectRange(activeSheet.id, result.plan.targetRange);

    return null;
  }

  function applyColumnValueFilter(input: {
    range: CellRange;
    columnIndex: number;
    headerName?: string;
    values: string[];
  }) {
    commitSheetEdit((draft) => {
      applyColumnValueFilterToDocument(draft, input);
    });
  }

  function clearColumnFilters(input: {
    range: CellRange;
    columnIndex: number;
  }) {
    commitSheetEdit((draft) => {
      clearColumnFiltersInDocument(draft, input);
    });
  }

  function deleteFilter(ruleId: string) {
    commitSheetEdit((draft) => {
      deleteFilterFromDocument(draft, ruleId);
    });
  }

  function selectFilter(rule: SheetFilterRule) {
    selectRange(rule.sheetId, rule.range);
  }

  function resizeFilterToSelection(ruleId: string) {
    commitSheetEdit((draft) => {
      resizeFilterInDocument(draft, ruleId, selectedRange);
    });
  }

  function saveFilterPreset(name: string) {
    const preset = prepareFilterPresetSave(document, activeSheet.id, name);

    if (!preset.ok) {
      return preset.error;
    }

    const didSave = commitSheetEdit((draft) => {
      saveFilterPresetToDocument(draft, preset.presetName);
    });

    return didSave ? null : "The active sheet is protected.";
  }

  function applyFilterPreset(presetId: string) {
    const error = getFilterPresetApplyError(document, activeSheet.id, presetId);

    if (error) {
      return error;
    }

    const didApply = commitSheetEdit((draft) => {
      applyFilterPresetToDocument(draft, presetId);
    });

    return didApply ? null : "The active sheet is protected.";
  }

  function deleteFilterPreset(presetId: string) {
    commitSheetEdit((draft) => {
      deleteFilterPresetFromDocument(draft, presetId);
    });
  }

  function addNamedRange(name: string) {
    commitSheetEdit((draft) => {
      addNamedRangeToDocument(draft, name, selectedRange);
    });
  }

  function normalizeCurrentSheetMultiRanges(ranges: CellRange[]) {
    return normalizeMultiRangeAreas(activeSheet, ranges);
  }

  function areMultiRangesEditableWhenProtected(ranges: CellRange[]) {
    return ranges.every((range) =>
      isRangeEditableWithProtectionRules({
        document,
        identity: getProtectionIdentity(),
        range,
        sheet: activeSheet,
      }),
    );
  }

  function addProtectedRange(name: string, allowedEmails: string[]) {
    if ((context.accessRole ?? "owner") !== "owner") {
      return null;
    }

    const normalizedEmails = Array.from(
      new Set(
        allowedEmails
          .map((email) => email.trim().toLowerCase())
          .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)),
      ),
    );

    if (!normalizedEmails.length) {
      return null;
    }

    let protectedRangeId: string | null = null;
    const actor = getChangeActor();

    commit((draft) => {
      protectedRangeId = addProtectedRangeToDocument(draft, getActiveSheet(draft), {
        allowedEmails: normalizedEmails,
        createdByEmail: actor.email,
        createdByName: actor.name,
        name,
        range: selectedRange,
      });
    });

    return protectedRangeId;
  }

  function deleteProtectedRange(protectedRangeId: string) {
    if ((context.accessRole ?? "owner") !== "owner") {
      return false;
    }

    if (
      !(document.protectedRanges ?? []).some(
        (item) => item.id === protectedRangeId,
      )
    ) {
      return false;
    }

    commit((draft) => {
      deleteProtectedRangeFromDocument(draft, protectedRangeId);
    });

    return true;
  }

  function reviewTrackedChange(
    trackedChangeId: string,
    decision: WorkbookTrackedChangeDecision,
  ) {
    if ((context.accessRole ?? "owner") !== "owner") {
      return false;
    }

    if (
      !(document.trackedChanges ?? []).some(
        (item) => item.id === trackedChangeId && item.status === "pending",
      )
    ) {
      return false;
    }

    let didReview = false;

    commit((draft) => {
      didReview = reviewTrackedChangeInDocument({
        actor: getChangeActor(),
        decision,
        document: draft,
        trackedChangeId,
      });
    });

    return didReview;
  }

  function addNamedMultiRange(name: string, ranges: CellRange[]) {
    const normalizedRanges = normalizeCurrentSheetMultiRanges(ranges);

    if (
      normalizedRanges.length === 0 ||
      !areMultiRangesEditableWhenProtected(normalizedRanges)
    ) {
      return false;
    }

    commit((draft) => {
      addNamedMultiRangeToDocument(draft, name, normalizedRanges);
    });

    return true;
  }

  function updateMultiRangeCellStyle(
    ranges: CellRange[],
    style: Partial<CellStyle>,
  ) {
    const normalizedRanges = normalizeCurrentSheetMultiRanges(ranges);

    if (
      normalizedRanges.length === 0 ||
      !areMultiRangesEditableWhenProtected(normalizedRanges)
    ) {
      return false;
    }

    commit((draft) => {
      const sheet = getActiveSheet(draft);

      for (const range of normalizedRanges) {
        updateRangeCellStyle(sheet, range, style);
      }
    });

    return true;
  }

  function clearMultiRangeFormatting(ranges: CellRange[]) {
    const normalizedRanges = normalizeCurrentSheetMultiRanges(ranges);

    if (
      normalizedRanges.length === 0 ||
      !areMultiRangesEditableWhenProtected(normalizedRanges)
    ) {
      return false;
    }

    commit((draft) => {
      const sheet = getActiveSheet(draft);

      for (const range of normalizedRanges) {
        clearRangeFormatting(sheet, range);
      }
    });

    return true;
  }

  function getMultiRangeClipboardPayload(
    ranges: CellRange[],
  ): MultiRangeClipboardPayload | null {
    return createMultiRangeClipboardPayload({
      sheet: activeSheet,
      ranges,
      computedValues,
      hideHiddenFormulas: isActiveSheetProtected,
    });
  }

  function pasteTextIntoMultiRanges(ranges: CellRange[], text: string) {
    const normalizedRanges = normalizeCurrentSheetMultiRanges(ranges);

    if (
      normalizedRanges.length === 0 ||
      !areMultiRangesEditableWhenProtected(normalizedRanges)
    ) {
      return 0;
    }

    let pastedCellCount = 0;

    commit((draft) => {
      pastedCellCount = pasteClipboardTextIntoMultiRanges({
        sheet: getActiveSheet(draft),
        ranges: normalizedRanges,
        text,
      });
    });

    return pastedCellCount;
  }

  function deleteNamedRange(rangeId: string) {
    commitSheetEdit((draft) => {
      deleteNamedRangeFromDocument(draft, rangeId);
    });
  }

  function upsertCellNote(input: {
    author: {
      email: string;
      name: string;
    };
    text: string;
  }) {
    commitSheetEdit((draft) => {
      upsertCellNoteInDocument(draft, selectedKey, input);
    });
  }

  function addCellNoteReply(
    noteId: string,
    input: {
      author: {
        email: string;
        name: string;
      };
      text: string;
    },
  ) {
    commitSheetEdit((draft) => {
      addCellNoteReplyInDocument(draft, noteId, input);
    });
  }

  function setCellNoteStatus(
    noteId: string,
    input: {
      author: {
        email: string;
        name: string;
      };
      status: "open" | "resolved";
    },
  ) {
    commitSheetEdit((draft) => {
      setCellNoteStatusInDocument(draft, noteId, input.status, input.author);
    });
  }

  function deleteCellNote(noteId: string) {
    commitSheetEdit((draft) => {
      deleteCellNoteFromDocument(draft, noteId);
    });
  }

  function markCommentNotificationRead(notificationId: string) {
    commitSheetEdit((draft) => {
      markCommentNotificationReadInDocument(draft, notificationId);
    });
  }

  function upsertCellLink(input: { url: string; label: string }) {
    commitSheetEdit((draft) => {
      upsertCellLinkInDocument(draft, selectedKey, input);
    });
  }

  function deleteCellLink(linkId: string) {
    commitSheetEdit((draft) => {
      deleteCellLinkFromDocument(draft, linkId);
    });
  }

  function addSelectedFormulaWatches() {
    if (
      getFormulaWatchableCellCount({
        document,
        sheetId: activeSheet.id,
        range: selectedRange,
      }) === 0
    ) {
      return;
    }

    commit((draft) => {
      addFormulaWatchesForRange(draft, selectedRange);
    });
  }

  function deleteFormulaWatch(watchId: string) {
    if (!(document.formulaWatches ?? []).some((watch) => watch.id === watchId)) {
      return;
    }

    commit((draft) => {
      deleteFormulaWatchFromDocument(draft, watchId);
    });
  }

  function repairCellLink(linkId: string, url: string) {
    commitSheetEdit((draft) => {
      repairCellLinkInDocument(draft, linkId, url);
    });
  }

  function setColumnWidth(columnIndex: number, width: number) {
    commitSheetEdit((draft) => {
      setSheetColumnWidth(getActiveSheet(draft), columnIndex, width);
    });
  }

  function hideSelectedRows() {
    const hiddenRows = getHiddenRowsAfterHiding(activeSheet, selectedRange);

    if (!hiddenRows) {
      return;
    }

    commitSheetEdit((draft) => {
      hideRowsInRange(getActiveSheet(draft), selectedRange);
    });

    const nextSelection = {
      rowIndex: nearestVisibleIndex(
        selectedRange.endRowIndex + 1,
        activeSheet.rowCount,
        hiddenRows,
      ),
      columnIndex: nearestVisibleIndex(
        selectedRange.startColumnIndex,
        activeSheet.columnCount,
        activeSheet.hiddenColumns ?? [],
      ),
    };

    setSelected(nextSelection);
    setRangeAnchor(nextSelection);
  }

  function hideSelectedColumns() {
    const hiddenColumns = getHiddenColumnsAfterHiding(activeSheet, selectedRange);

    if (!hiddenColumns) {
      return;
    }

    commitSheetEdit((draft) => {
      hideColumnsInRange(getActiveSheet(draft), selectedRange);
    });

    const nextSelection = {
      rowIndex: nearestVisibleIndex(
        selectedRange.startRowIndex,
        activeSheet.rowCount,
        activeSheet.hiddenRows ?? [],
      ),
      columnIndex: nearestVisibleIndex(
        selectedRange.endColumnIndex + 1,
        activeSheet.columnCount,
        hiddenColumns,
      ),
    };

    setSelected(nextSelection);
    setRangeAnchor(nextSelection);
  }

  function unhideRowsAndColumns() {
    commitSheetEdit((draft) => {
      unhideSheetRowsAndColumns(getActiveSheet(draft));
    });
  }

  function groupSelectedRows() {
    commitSheetEdit((draft) => {
      groupRowsForRange(getActiveSheet(draft), selectedRange);
    });
  }

  function groupSelectedColumns() {
    commitSheetEdit((draft) => {
      groupColumnsForRange(getActiveSheet(draft), selectedRange);
    });
  }

  function ungroupSelectedOutline() {
    commitSheetEdit((draft) => {
      ungroupOutlineForRange(getActiveSheet(draft), selectedRange);
    });
  }

  function toggleRowOutlineGroup(groupId: string) {
    commitSheetEdit((draft) => {
      toggleRowGroupCollapsed(getActiveSheet(draft), groupId);
    });
  }

  function toggleColumnOutlineGroup(groupId: string) {
    commitSheetEdit((draft) => {
      toggleColumnGroupCollapsed(getActiveSheet(draft), groupId);
    });
  }

  function insertRows() {
    commitSheetEdit((draft) => {
      insertRowsForRange(getActiveSheet(draft), selectedRange);
    });

    selectCell({
      rowIndex: selectedRange.startRowIndex,
      columnIndex: selectedRange.startColumnIndex,
    });
  }

  function deleteRows() {
    commitSheetEdit((draft) => {
      deleteRowsForRange(getActiveSheet(draft), selectedRange);
    });

    selectCell({
      rowIndex: selectedRange.startRowIndex,
      columnIndex: selectedRange.startColumnIndex,
    });
  }

  function removeDuplicates() {
    const duplicateCount = getDuplicateRowCountInRange({
      computedValues,
      range: selectedRange,
      sheet: activeSheet,
    });

    if (duplicateCount === 0) {
      return;
    }

    commitSheetEdit((draft) => {
      removeDuplicateRowsInRange({
        computedValues,
        range: selectedRange,
        sheet: getActiveSheet(draft),
      });
    }, { unlockedRange: selectedRange });
  }

  function insertColumns() {
    commitSheetEdit((draft) => {
      insertColumnsForRange(getActiveSheet(draft), selectedRange);
    });

    selectCell({
      rowIndex: selectedRange.startRowIndex,
      columnIndex: selectedRange.startColumnIndex,
    });
  }

  function deleteColumns() {
    commitSheetEdit((draft) => {
      deleteColumnsForRange(getActiveSheet(draft), selectedRange);
    });

    selectCell({
      rowIndex: selectedRange.startRowIndex,
      columnIndex: selectedRange.startColumnIndex,
    });
  }

  function clearSelection() {
    commitSheetEdit((draft) => {
      clearRangeContentFromDocument(draft, selectedRange);
    }, { unlockedRange: selectedRange });
  }

  function fillRange(range: CellRange, mode: FillRangeMode) {
    if (!canFillRange(range, mode)) {
      return;
    }

    commitSheetEdit((draft) => {
      fillSheetRange(getActiveSheet(draft), range, mode);
    }, { unlockedRange: range });
  }

  function fillDown() {
    fillRange(selectedRange, "down");
  }

  function fillRight() {
    fillRange(selectedRange, "right");
  }

  function fillSeries() {
    fillRange(selectedRange, "series");
  }

  function flashFill() {
    if (!flashFillPlan) {
      return;
    }

    commitSheetEdit((draft) => {
      applyFlashFillToSheet({
        computedValues,
        range: selectedRange,
        sheet: getActiveSheet(draft),
      });
    }, { unlockedRange: selectedRange });
  }

  function sortSelectedRange(
    direction: "asc" | "desc",
    sortColumnIndex = selectedRange.startColumnIndex,
    secondaryCriteria: SortCriterion[] = [],
    customOrder: SortCustomOrder = "none",
    sortOn: SortCriterion["sortOn"] = "values",
  ) {
    commitSheetEdit((draft) => {
      sortRangeInSheet({
        sheet: getActiveSheet(draft),
        range: selectedRange,
        direction,
        sortColumnIndex,
        secondaryCriteria,
        customOrder,
        sortOn,
      });
    });
  }

  function pasteText(
    text: string,
    options: { transpose?: boolean } = {},
  ) {
    const pastePlan = createClipboardTextPastePlan(
      activeSheet,
      selected,
      text,
      options,
    );

    if (!pastePlan) {
      return;
    }

    const didPaste = commitSheetEdit((draft) => {
      pasteClipboardTextRowsIntoSheet(
        getActiveSheet(draft),
        selected,
        pastePlan.rows,
      );
    }, { unlockedRange: pastePlan.targetRange });

    if (!didPaste) {
      return;
    }

    selectCell(
      pastePlan.endSelection,
      { extend: true },
    );
  }

  function pasteCells(
    payload: SpreadsheetClipboardPayload,
    options: { mode?: PasteSpecialMode } = {},
  ) {
    const pastePlan = createClipboardCellsPastePlan(
      activeSheet,
      selected,
      payload,
    );

    if (!pastePlan) {
      return;
    }

    const didPaste = commitSheetEdit((draft) => {
      pasteClipboardCellsIntoSheet({
        document: draft,
        sheet: getActiveSheet(draft),
        selection: selected,
        payload,
        displayValues: pastePlan.displayValues,
        mode: options.mode ?? "all",
      });
    }, { unlockedRange: pastePlan.targetRange });

    if (!didPaste) {
      return;
    }

    selectCell(
      pastePlan.endSelection,
      { extend: true },
    );
  }

  function copyVisibleCellsToNextColumns(payload: SpreadsheetClipboardPayload) {
    const copyPlan = createVisibleCellsCopyPlan(
      activeSheet,
      selectedRange,
      payload,
    );

    if (!copyPlan) {
      return false;
    }

    const didCopy = commitSheetEdit((draft) => {
      copyVisibleCellsIntoSheet({
        sheet: getActiveSheet(draft),
        payload,
        plan: copyPlan,
      });
    }, { unlockedRange: copyPlan.targetRange });

    if (!didCopy) {
      return false;
    }

    selectCell(
      {
        rowIndex: copyPlan.targetRange.endRowIndex,
        columnIndex: copyPlan.targetRange.endColumnIndex,
      },
      { extend: true },
    );

    return true;
  }

  function getSelectedClipboardText() {
    return getRangeClipboardText({
      sheet: activeSheet,
      range: selectedRange,
      computedValues,
      hideHiddenFormulas: isActiveSheetProtected,
    });
  }

  function getSelectedClipboardPayload(): SpreadsheetClipboardPayload {
    return getRangeClipboardPayload({
      document,
      sheet: activeSheet,
      range: selectedRange,
      computedValues,
      hideHiddenFormulas: isActiveSheetProtected,
    });
  }

  function selectCell(
    next: CellSelection,
    options: { extend?: boolean } = {},
  ) {
    const clamped = clampSelection(next, activeSheet);

    setSelected(clamped);

    if (!options.extend) {
      setRangeAnchor(clamped);
    }
  }

  function selectRange(sheetId: string, range: CellRange) {
    const selectionPlan = getRangeSelectionPlan(document, sheetId, range);

    if (!selectionPlan) {
      return;
    }

    setDocument((current) =>
      current.activeSheetId === sheetId
        ? current
        : {
            ...current,
            activeSheetId: sheetId,
          },
    );
    setRangeAnchor(selectionPlan.rangeAnchor);
    setSelected(selectionPlan.selected);
  }

  function selectNamedRange(namedRange: NamedRange) {
    selectRange(namedRange.sheetId, namedRange.range);
  }

  function moveSelection(
    rowDelta: number,
    columnDelta: number,
    options: { extend?: boolean } = {},
  ) {
    selectCell(getMovedSelection(selected, rowDelta, columnDelta), options);
  }

  function moveSelectionToBoundary(
    boundary: SelectionBoundary,
    options: { extend?: boolean } = {},
  ) {
    selectCell(getBoundarySelection(activeSheet, selected, boundary), options);
  }

  function jumpSelection(
    direction: SelectionJumpDirection,
    options: { extend?: boolean } = {},
  ) {
    selectCell(jumpToFilledBoundary(activeSheet, selected, direction), options);
  }

  function setActiveSheet(sheetId: string) {
    commit((draft) => {
      setActiveSheetInDocument(draft, sheetId);
    });
  }

  function toggleActiveSheetProtection() {
    commit((draft) => {
      toggleActiveSheetProtectionInDocument(draft);
    });
  }

  function toggleWorkbookProtection() {
    commit((draft) => {
      toggleWorkbookProtectionInDocument(draft);
    });
  }

  function createVersionSnapshot(label: string) {
    commit((draft) => {
      addVersionSnapshotToDocument(draft, label);
    });
  }

  function createAutomaticVersionSnapshot() {
    if (!shouldCreateAutomaticVersionSnapshot(document)) {
      return false;
    }

    commit((draft) => {
      addAutomaticVersionSnapshotToDocument(draft);
    });

    return true;
  }

  function restoreVersionSnapshot(versionId: string) {
    commit((draft) => {
      restoreVersionSnapshotInDocument(draft, versionId);
    });
  }

  function deleteVersionSnapshot(versionId: string) {
    commit((draft) => {
      deleteVersionSnapshotFromDocument(draft, versionId);
    });
  }

  function updateActiveSheetPrintSettings(
    updates: Partial<Omit<SheetPrintSettings, "sheetId" | "updatedAt">>,
  ) {
    commitSheetEdit((draft) => {
      updateActiveSheetPrintSettingsInDocument(draft, updates);
    });
  }

  function toggleRowPageBreak(rowIndex: number) {
    if (rowIndex <= 0) {
      return;
    }

    const rowPageBreaks = toggleBreakIndex(
      activePrintSettings.rowPageBreaks,
      rowIndex,
    );

    updateActiveSheetPrintSettings({ rowPageBreaks });
  }

  function toggleColumnPageBreak(columnIndex: number) {
    if (columnIndex <= 0) {
      return;
    }

    const columnPageBreaks = toggleBreakIndex(
      activePrintSettings.columnPageBreaks,
      columnIndex,
    );

    updateActiveSheetPrintSettings({ columnPageBreaks });
  }

  function moveRowPageBreak(fromRowIndex: number, toRowIndex: number) {
    const rowPageBreaks = moveBreakIndex(
      activePrintSettings.rowPageBreaks,
      fromRowIndex,
      toRowIndex,
    );

    updateActiveSheetPrintSettings({ rowPageBreaks });
  }

  function moveColumnPageBreak(
    fromColumnIndex: number,
    toColumnIndex: number,
  ) {
    const columnPageBreaks = moveBreakIndex(
      activePrintSettings.columnPageBreaks,
      fromColumnIndex,
      toColumnIndex,
    );

    updateActiveSheetPrintSettings({ columnPageBreaks });
  }

  function saveCustomView(input: CustomViewSnapshotInput) {
    commit((draft) => {
      saveCustomViewToDocument(draft, input);
    });
  }

  function deleteCustomView(viewId: string) {
    commit((draft) => {
      deleteCustomViewFromDocument(draft, viewId);
    });
  }

  function applyCustomView(viewId: string): CustomViewApplyResult {
    const view = (document.customViews ?? []).find((item) => item.id === viewId);
    const sheet = view
      ? document.sheets.find((item) => item.id === view.sheetId)
      : null;

    if (!view || !sheet) {
      return null;
    }

    const result = {
      viewMode: view.viewMode,
      zoomPercent: view.zoomPercent,
      frozenColumnCount: view.frozenColumnCount,
      frozenRowCount: view.frozenRowCount,
      splitPaneMode: view.splitPaneMode,
      rightToLeft: view.rightToLeft,
      showPageBreaks: view.showPageBreaks,
      selectedRange: view.selectedRange,
    } satisfies NonNullable<CustomViewApplyResult>;

    commit((draft) => {
      applyCustomViewToDocument(draft, viewId);
    });

    setRangeAnchor({
      rowIndex: result.selectedRange.endRowIndex,
      columnIndex: result.selectedRange.endColumnIndex,
    });
    setSelected({
      rowIndex: result.selectedRange.startRowIndex,
      columnIndex: result.selectedRange.startColumnIndex,
    });

    return result;
  }

  function addSheet() {
    commit((draft) => {
      addSheetToDocument(draft);
    });
  }

  function renameSheet(sheetId: string, name: string) {
    commit((draft) => {
      renameSheetInDocument(draft, sheetId, name);
    });
  }

  function setSheetTabColor(sheetId: string, color?: string) {
    commit((draft) => {
      setSheetTabColorInDocument(draft, sheetId, color);
    });
  }

  function toggleActiveSheetGridlines() {
    commit((draft) => {
      toggleActiveSheetGridlinesInDocument(draft);
    });
  }

  function enableActiveSheetExcelScale() {
    commit((draft) => {
      enableActiveSheetExcelScaleInDocument(draft);
    });
  }

  function duplicateSheet(sheetId: string) {
    commit((draft) => {
      duplicateSheetInDocument(draft, sheetId);
    });
  }

  function deleteSheet(sheetId: string) {
    commit((draft) => {
      deleteSheetFromDocument(draft, sheetId);
    });
  }

  function importSheet(sheet: SheetData) {
    commit((draft) => {
      importSheetIntoDocument(draft, sheet);
    });
  }

  function importQuerySheet(sheet: SheetData, query: WorkbookQueryDefinition) {
    commit((draft) => {
      addQuerySheetToDocument(draft, sheet, query);
    });
  }

  function refreshQuerySheet(
    queryId: string,
    sheet: SheetData,
    durationMs: number,
  ) {
    commit((draft) => {
      replaceWorkbookQuerySheetInDocument({
        document: draft,
        durationMs,
        queryId,
        sheet,
      });
    });
  }

  function recordQueryRefreshFailure(
    queryId: string,
    message: string,
    durationMs: number,
  ) {
    commit((draft) => {
      recordWorkbookQueryRefreshFailureInDocument({
        document: draft,
        durationMs,
        message,
        queryId,
      });
    });
  }

  function deleteWorkbookQuery(queryId: string) {
    commit((draft) => {
      deleteWorkbookQueryFromDocument(draft, queryId);
    });
  }

  function startScriptRecording(name: string) {
    updateAutomationMetadata((draft) => {
      draft.automationScripts = startAutomationScript(
        draft.automationScripts,
        name,
      );
    });
  }

  function stopScriptRecording(scriptId: string) {
    updateAutomationMetadata((draft) => {
      draft.automationScripts = stopAutomationScript(
        draft.automationScripts,
        scriptId,
      );
    });
  }

  function deleteScriptRecording(scriptId: string) {
    updateAutomationMetadata((draft) => {
      draft.automationScripts = deleteAutomationScript(
        draft.automationScripts,
        scriptId,
      );
    });
  }

  function runScriptRecording(
    scriptId: string,
  ): WorkbookAutomationRunResult | null {
    if ((context.accessRole ?? "owner") !== "owner" && context.accessRole !== "editor") {
      return null;
    }

    let result: WorkbookAutomationRunResult | null = null;

    commit((draft) => {
      result = runWorkbookAutomationScript({
        document: draft,
        policy: {
          maxSteps: 100,
          permissions: [
            "readWorkbook",
            "writeCells",
            "formatCells",
            "manageStructure",
            "sortAndClean",
          ],
        },
        scriptId,
      });
    }, { trackChanges: true });

    return result;
  }

  function saveCustomFunction(
    name: string,
    expression: string,
    description?: string,
  ) {
    if ((context.accessRole ?? "owner") !== "owner") {
      return;
    }

    updateAutomationMetadata((draft) => {
      draft.customFunctions = upsertCustomFunction(
        draft.customFunctions ?? [],
        { description, expression, name },
      );
    });
  }

  function deleteWorkbookCustomFunction(functionId: string) {
    if ((context.accessRole ?? "owner") !== "owner") {
      return;
    }

    updateAutomationMetadata((draft) => {
      draft.customFunctions = deleteCustomFunction(
        draft.customFunctions ?? [],
        functionId,
      );
    });
  }

  function registerWorkbookAddIn(
    name: string,
    provider: string,
    permissions: WorkbookAutomationPermission[],
    description?: string,
  ) {
    if ((context.accessRole ?? "owner") !== "owner") {
      return;
    }

    updateAutomationMetadata((draft) => {
      draft.addIns = registerAddInManifest(draft.addIns ?? [], {
        description,
        name,
        permissions,
        provider,
      });
    });
  }

  function setWorkbookAddInEnabled(addInId: string, enabled: boolean) {
    if ((context.accessRole ?? "owner") !== "owner") {
      return;
    }

    updateAutomationMetadata((draft) => {
      draft.addIns = setAddInEnabled(draft.addIns ?? [], addInId, enabled);
    });
  }

  function runWorkbookAddIn(addInId: string): WorkbookAddInSandboxResult | null {
    if ((context.accessRole ?? "owner") !== "owner" && context.accessRole !== "editor") {
      return null;
    }

    let result: WorkbookAddInSandboxResult | null = null;

    commit((draft) => {
      result = runWorkbookAddInPackage({
        addInId,
        document: draft,
        policy: {
          maxCommands: 50,
          permissions: [
            "readWorkbook",
            "writeCells",
            "formatCells",
            "manageStructure",
            "sortAndClean",
            "registerExtensions",
          ],
        },
      });
    }, { trackChanges: true });

    return result;
  }

  function deleteWorkbookAddIn(addInId: string) {
    if ((context.accessRole ?? "owner") !== "owner") {
      return;
    }

    updateAutomationMetadata((draft) => {
      draft.addIns = deleteAddInManifest(draft.addIns ?? [], addInId);
    });
  }

  function recordScriptStep(step: AutomationStepInput) {
    if (
      !document.automationScripts.some(
        (script) => script.status === "recording",
      )
    ) {
      return;
    }

    updateAutomationMetadata((draft) => {
      draft.automationScripts = recordAutomationScriptStep(
        draft.automationScripts,
        step,
      );
    });
  }

  function replaceDocument(nextDocument: WorkbookDocument) {
    commit((draft) => {
      replaceWorkbookDocument(draft, nextDocument);
    });

    const activeSheet = nextDocument.sheets.find(
      (sheet) => sheet.id === nextDocument.activeSheetId,
    );

    if (activeSheet) {
      selectCell({ rowIndex: 0, columnIndex: 0 });
    }
  }

  function undo() {
    setHistory((items) => {
      const undoState = getUndoHistoryState(items);

      if (!undoState) {
        return items;
      }

      setFuture((futureItems) => pushRedoFuture(futureItems, document));
      setDocument(undoState.previous);
      setIsDirty(true);
      return undoState.history;
    });
  }

  function redo() {
    setFuture((items) => {
      const redoState = getRedoFutureState(items);

      if (!redoState) {
        return items;
      }

      setHistory((historyItems) => pushUndoHistory(historyItems, document));
      setDocument(redoState.next);
      setIsDirty(true);
      return redoState.future;
    });
  }

  function markSaved() {
    setIsDirty(false);
  }

  return {
    document,
    activeSheet,
    activePrintSettings,
    calculationSettings:
      document.calculationSettings ?? createDefaultWorkbookCalculationSettings(),
    selected,
    selectedRange,
    selectedKey,
    selectedRaw: activeSheet.cells[selectedKey]?.raw ?? "",
    selectedFormulaBarValue: isSelectedFormulaHidden
      ? ""
      : (activeSheet.cells[selectedKey]?.raw ?? ""),
    selectedStyle,
    showGridlines: activeSheet.showGridlines,
    computedValues,
    calculationError: workbookEvaluation.error,
    calculationDirtyCellCount: workbookEvaluation.recalculationPlan.dirtyCellCount,
    calculationMode: workbookEvaluation.mode,
    calculationStrategy: workbookEvaluation.recalculationPlan.kind,
    isCalculating: workbookEvaluation.isCalculating,
    isDirty,
    isActiveSheetProtected,
    isCellProtected,
    isSelectedCellProtected,
    isSelectedFormulaHidden,
    isSelectedRangeFormulaHidden,
    isSelectedRangeProtected,
    isSelectedRangeUnlocked,
    isWorkbookProtected,
    selectedObjectId,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    addChart,
    addConditionalFormat,
    addPivotTableConditionalFormat,
    addDataModelHierarchy,
    addDataModelKpi,
    addDataModelPerspective,
    addDataModelRelationship,
    addDataValidation,
    addFilter,
    addInsertedObject,
    addNamedRange,
    addNamedMultiRange,
    addProtectedRange,
    addSheet,
    addSelectedFormulaWatches,
    addSparkline,
    addTable,
    addPivotChart,
    addPivotTableDrillDownSheet,
    addPivotTable,
    addTableSlicer,
    addTableTimeline,
    addWhatIfScenario,
    applyCustomView,
    applyColumnValueFilter,
    applyCriteriaRangeFilter,
    applyFilterPreset,
    applyRichTextRunsToSelectedCells,
    applyWhatIfScenario,
    clearColumnFilters,
    clearMultiRangeFormatting,
    clearSelectedRichTextRuns,
    clearSelection,
    clearSelectedFormatting,
    copyVisibleCellsToNextColumns,
    copyCriteriaRangeToLocation,
    addCellNoteReply,
    deleteChart,
    deleteCellLink,
    deleteCellNote,
    deleteConditionalFormat,
    deleteDataModelHierarchy,
    deleteDataModelKpi,
    deleteDataModelPerspective,
    deleteDataModelRelationship,
    deleteDataValidation,
    deleteFilter,
    deleteFilterPreset,
    deleteFormulaWatch,
    deleteCustomView,
    deleteInsertedObject,
    deleteManagedCellStyle,
    deleteNamedRange,
    deletePivotTable,
    deleteProtectedRange,
    deleteSparkline,
    deleteTable,
    deleteTableSlicer,
    deleteTableTimeline,
    deleteVersionSnapshot,
    deleteWhatIfScenario,
    deleteWorkbookQuery,
    deleteScriptRecording,
    deleteWorkbookAddIn,
    deleteWorkbookCustomFunction,
    deleteColumns,
    deleteRows,
    deleteSheet,
    duplicateConditionalFormat,
    duplicateSheet,
    enableActiveSheetExcelScale,
    canFlashFill: flashFillPlan !== null,
    flashFill,
    fillDown,
    fillRange,
    fillRight,
    fillSeries,
    getSelectedClipboardText,
    getSelectedClipboardPayload,
    getMultiRangeClipboardPayload,
    groupSelectedColumns,
    groupSelectedRows,
    hideSelectedColumns,
    hideSelectedRows,
    importSheet,
    importQuerySheet,
    insertColumns,
    insertRows,
    markCommentNotificationRead,
    markSaved,
    mergeSelectedCells,
    moveConditionalFormat,
    moveColumnPageBreak,
    moveInsertedObjectToSelection,
    moveRowPageBreak,
    moveSelection,
    moveSelectionToBoundary,
    jumpSelection,
    pasteText,
    pasteTextIntoMultiRanges,
    pasteCells,
    redo,
    replaceAllText,
    replaceCellText,
    replaceDocument,
    refreshQuerySheet,
    reviewTrackedChange,
    recordQueryRefreshFailure,
    recordScriptStep,
    registerWorkbookAddIn,
    refreshPivotTable,
    removeDuplicates,
    repairCellLink,
    runGoalSeek,
    runSolver,
    paintRangeStyle,
    renameChart,
    renameSheet,
    renameTable,
    reorderInsertedObject,
    restoreVersionSnapshot,
    runWorkbookAddIn,
    runScriptRecording,
    resizeConditionalFormatToSelection,
    resizeDataValidationToSelection,
    resizeFilterToSelection,
    resizeTableToSelection,
    saveFilterPreset,
    saveManagedCellStyle,
    saveCustomView,
    saveCustomFunction,
    setWorkbookAddInEnabled,
    selectCell,
    selectConditionalFormat,
    selectDataValidation,
    selectFilter,
    selectInsertedObject: setSelectedObjectId,
    selectTable,
    selectPivotTable,
    selectNamedRange,
    selectRange,
    setColumnWidth,
    setActiveSheet,
    setSheetTabColor,
    setCellNoteStatus,
    setSelectedCellsLocked,
    setSelectedFormulasHidden,
    sortSelectedRange,
    startScriptRecording,
    stopScriptRecording,
    toggleActiveSheetGridlines,
    toggleActiveSheetProtection,
    toggleWorkbookProtection,
    toggleColumnPageBreak,
    toggleRowPageBreak,
    updateActiveSheetPrintSettings,
    toggleChartAxes,
    toggleChartDataLabels,
    toggleChartLegend,
    toggleTableFilterButtons,
    toggleTableHeaderRow,
    toggleColumnOutlineGroup,
    toggleRowOutlineGroup,
    createAutomaticVersionSnapshot,
    createCorrelationTable,
    createDescriptiveStatisticsTable,
    createExponentialSmoothingTable,
    createForecastSheetTable,
    createHistogramTable,
    createMovingAverageTable,
    createOneVariableDataTable,
    createRegressionTable,
    createSamplingTable,
    createVersionSnapshot,
    undo,
    ungroupSelectedOutline,
    unmergeSelectedCells,
    unhideRowsAndColumns,
    updateCellBorders,
    updateChartAnchor,
    updateChartFormat,
    updateChartTemplate,
    updateCellStyle,
    updateConditionalFormatVisualOptions,
    updateCalculationSettings,
    updateManagedCellStyle,
    updateMultiRangeCellStyle,
    updateInsertedObject,
    updateWorkbookTheme,
    updateTableStyle,
    updatePivotTableLayout,
    updateTableSlicerValues,
    updateTableTimeline,
    updateSelectedCell,
    updateSelectedRange,
    toggleTableTotals,
    upsertCellLink,
    upsertCellNote,
  };
}

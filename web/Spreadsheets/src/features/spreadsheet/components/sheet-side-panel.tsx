"use client";

import { AnalysisToolpakPanel } from "@/features/spreadsheet/components/analysis-toolpak-panel";
import { ChartPanel } from "@/features/spreadsheet/components/chart-panel";
import { DataModelPanel } from "@/features/spreadsheet/components/data-model-panel";
import { DataValidationIssuesPanel } from "@/features/spreadsheet/components/data-validation-issues-panel";
import { ExternalLinkReviewPanel } from "@/features/spreadsheet/components/external-link-review-panel";
import { FormulaAuditPanel } from "@/features/spreadsheet/components/formula-audit-panel";
import { FormulaCheckingPanel } from "@/features/spreadsheet/components/formula-checking-panel";
import { FormulaConsistencyPanel } from "@/features/spreadsheet/components/formula-consistency-panel";
import { FormulaErrorsPanel } from "@/features/spreadsheet/components/formula-errors-panel";
import { FormulaWatchPanel } from "@/features/spreadsheet/components/formula-watch-panel";
import { InsertedObjectsPanel } from "@/features/spreadsheet/components/inserted-objects-panel";
import { KeyboardShortcutsPanel } from "@/features/spreadsheet/components/keyboard-shortcuts-panel";
import { MultiRangeSelectionPanel } from "@/features/spreadsheet/components/multi-range-selection-panel";
import { NamedRangesPanel } from "@/features/spreadsheet/components/named-ranges-panel";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import { PivotTablesPanel } from "@/features/spreadsheet/components/pivot-tables-panel";
import { PrintSettingsPanel } from "@/features/spreadsheet/components/print-settings-panel";
import { ProtectedRangesPanel } from "@/features/spreadsheet/components/protected-ranges-panel";
import { ScenarioManagerPanel } from "@/features/spreadsheet/components/scenario-manager-panel";
import { SheetLinksPanel } from "@/features/spreadsheet/components/sheet-links-panel";
import { SheetNotesPanel } from "@/features/spreadsheet/components/sheet-notes-panel";
import { SheetRulesPanel } from "@/features/spreadsheet/components/sheet-rules-panel";
import { SheetScalePanel } from "@/features/spreadsheet/components/sheet-scale-panel";
import { SolverPanel } from "@/features/spreadsheet/components/solver-panel";
import { SparklinesPanel } from "@/features/spreadsheet/components/sparklines-panel";
import { TablesPanel } from "@/features/spreadsheet/components/tables-panel";
import { TableSlicersPanel } from "@/features/spreadsheet/components/table-slicers-panel";
import { TableTimelinesPanel } from "@/features/spreadsheet/components/table-timelines-panel";
import { TrackedChangesPanel } from "@/features/spreadsheet/components/tracked-changes-panel";
import { WhatIfDataTablePanel } from "@/features/spreadsheet/components/what-if-data-table-panel";
import { VersionHistoryPanel } from "@/features/spreadsheet/components/version-history-panel";
import { WorkbookAccessibilityPanel } from "@/features/spreadsheet/components/workbook-accessibility-panel";
import { WorkbookActivityPanel } from "@/features/spreadsheet/components/workbook-activity-panel";
import { WorkbookAutomationPanel } from "@/features/spreadsheet/components/workbook-automation-panel";
import { WorkbookComparePanel } from "@/features/spreadsheet/components/workbook-compare-panel";
import { WorkbookCompatibilityPanel } from "@/features/spreadsheet/components/workbook-compatibility-panel";
import { WorkbookInspectionPanel } from "@/features/spreadsheet/components/workbook-inspection-panel";
import { WorkbookSpellCheckPanel } from "@/features/spreadsheet/components/workbook-spell-check-panel";
import { WorkbookStatisticsPanel } from "@/features/spreadsheet/components/workbook-statistics-panel";
import { WorkbookThemePanel } from "@/features/spreadsheet/components/workbook-theme-panel";
import { WhatIfAnalysisPanel } from "@/features/spreadsheet/components/what-if-analysis-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExternalLinkIssue } from "@/features/spreadsheet/external-link-review";
import type { ChartFormatUpdate } from "@/features/spreadsheet/chart-formatting";
import type {
  InsertedObjectLayerAction,
  InsertedObjectUpdate,
} from "@/features/spreadsheet/inserted-objects";
import type { WorkbookThemeUpdate } from "@/features/workbooks/workbook-themes";
import type { AuditLogRow } from "@/features/audit/audit-log-service";
import type { FormulaReference } from "@/features/spreadsheet/formula-audit";
import type { FormulaCheckingIssue } from "@/features/spreadsheet/formula-checking";
import type { FormulaConsistencyIssue } from "@/features/spreadsheet/formula-consistency";
import type { CircularReferenceIssue } from "@/features/spreadsheet/formula-dependency-graph";
import type { FormulaErrorIssue } from "@/features/spreadsheet/formula-errors";
import type { FormulaWatchRow } from "@/features/spreadsheet/formula-watch";
import type {
  DataModelRelationshipDraft,
  DataModelRelationshipIssue,
} from "@/features/spreadsheet/data-model";
import type {
  DataModelHierarchyDraft,
  DataModelKpiDraft,
  DataModelPerspectiveDraft,
} from "@/features/spreadsheet/data-model-view";
import type {
  EffectiveSpreadsheetShortcut,
  SpreadsheetShortcutBinding,
  SpreadsheetShortcutCommand,
  SpreadsheetShortcutPreference,
} from "@/features/spreadsheet/keyboard-shortcuts";
import type { AnalysisToolpakResult } from "@/features/spreadsheet/analysis-toolpak";
import type {
  DataTableRequest,
  DataTableResult,
} from "@/features/spreadsheet/what-if-data-table";
import type {
  GoalSeekRequest,
  GoalSeekResult,
} from "@/features/spreadsheet/what-if-goal-seek";
import type {
  SolverRequest,
  SolverResult,
} from "@/features/spreadsheet/what-if-solver";
import type { DataValidationIssue } from "@/features/spreadsheet/data-validation";
import type {
  CellRange,
  CellSelection,
} from "@/features/spreadsheet/state/selection-state";
import type {
  ConditionalFormatInput,
  ConditionalFormatVisualOptionsUpdate,
  DataValidationInput,
} from "@/features/spreadsheet/state/rule-state";
import type { WorkbookAccessibilityIssue } from "@/features/spreadsheet/workbook-accessibility";
import type { WorkbookCompatibilityIssue } from "@/features/spreadsheet/workbook-compatibility";
import type { WorkbookInspectionIssue } from "@/features/spreadsheet/workbook-inspection";
import type { WorkbookSpellCheckIssue } from "@/features/spreadsheet/workbook-spell-check";
import type { WorkbookStatistics } from "@/features/spreadsheet/workbook-statistics";
import type {
  WorkbookCompareItem,
  WorkbookCompareResult,
} from "@/features/spreadsheet/workbook-compare";
import type {
  CellLink,
  CellCommentStatus,
  CellNote,
  CellStyle,
  ChartDefinition,
  ChartRange,
  ConditionalFormatRule,
  DataValidationRule,
  InsertedObjectDefinition,
  NamedRange,
  PivotTableConditionalFormatScope,
  PivotTableDefinition,
  SheetData,
  SheetFilterPreset,
  SheetFilterRule,
  SheetPrintSettings,
  SparklineDefinition,
  TableDefinition,
  TableSlicer,
  TableTimeline,
  TableTimelineMode,
  WhatIfScenario,
  WorkbookVersionRestore,
  WorkbookVersionSnapshot,
  WorkbookCommentNotification,
  WorkbookCellStyleDefinition,
  WorkbookCalculationSettings,
  WorkbookDataModelRelationship,
  WorkbookDocument,
  WorkbookTheme,
  WorkbookAddInManifest,
  WorkbookAutomationPermission,
  WorkbookAutomationScript,
  WorkbookCollaboratorSummary,
  WorkbookCustomFunction,
  WorkbookMacroProject,
  WorkbookProtectedRange,
  WorkbookRole,
  WorkbookSharingSummary,
  WorkbookTrackedChange,
} from "@/features/workbooks/types";
import type { WorkbookAutomationRunResult } from "@/features/spreadsheet/automation-runtime";
import type { WorkbookAddInSandboxResult } from "@/features/spreadsheet/add-in-sandbox";

export function SheetSidePanel({
  sheet,
  document,
  charts,
  sparklines,
  insertedObjects,
  selectedObjectId,
  tables,
  tableSlicers,
  tableTimelines,
  pivotTables,
  conditionalFormats,
  dataValidations,
  dataValidationIssues,
  formulaCheckingIssues,
  formulaConsistencyIssues,
  formulaErrorIssues,
  formulaWatches,
  whatIfScenarios,
  filters,
  filterPresets,
  calculationSettings,
  circularReferences,
  dataModelIssues,
  dataModelRelationships,
  formulaDependents,
  formulaReferences,
  commentsDisabled,
  collaborators,
  currentUserEmail,
  multiRangeAreas,
  isSheetProtected,
  namedRanges,
  printSettings,
  selectedRange,
  selectedKey,
  selectedRaw,
  selectedFormulaCount,
  links,
  linkIssues,
  notes,
  commentNotifications,
  workbookAccessibilityIssues,
  workbookAccessRole,
  workbookActivityLogs,
  workbookId,
  workbookName,
  workbookOwnerEmail,
  workbookSharing,
  protectedRangeManagementDisabled,
  protectedRanges,
  trackedChanges,
  workbookCompareError,
  workbookCompareFileName,
  workbookCompareMergeDisabled,
  workbookCompareNotice,
  workbookCompareResult,
  workbookCompatibilityIssues,
  workbookInspectionIssues,
  workbookSpellCheckIssues,
  workbookStatistics,
  workbookTheme,
  workbookCellStyles,
  shortcutPreferences,
  shortcuts,
  macroProjects,
  automationScripts,
  customFunctions,
  addIns,
  versionHistory,
  versionRestores,
  computedValues,
  onDeleteChart,
  onRenameChart,
  onToggleChartAxes,
  onToggleChartDataLabels,
  onToggleChartLegend,
  onUpdateChartFormat,
  onUpdateChartTemplate,
  onExportChart,
  onDeleteSparkline,
  onDeleteInsertedObject,
  onMoveInsertedObjectToSelection,
  onReorderInsertedObject,
  onSelectInsertedObject,
  onUpdateInsertedObject,
  onDeleteTable,
  onDeleteDataModelHierarchy,
  onDeleteDataModelKpi,
  onDeleteDataModelPerspective,
  onDeleteDataModelRelationship,
  onDeleteTableSlicer,
  onDeleteTableTimeline,
  onDeletePivotTable,
  onDeleteLink,
  onRepairLink,
  onDeleteNote,
  onMarkCommentNotificationRead,
  onSetNoteStatus,
  onAddConditionalFormat,
  onAddPivotTableConditionalFormat,
  onAddDataValidation,
  onDeleteConditionalFormat,
  onDeleteDataValidation,
  onDeleteFilter,
  onDeleteFilterPreset,
  onDuplicateConditionalFormat,
  onDeleteFormulaWatch,
  onDeleteWhatIfScenario,
  onDeleteNamedRange,
  onAddSelectedRangeToMultiRange,
  onAddProtectedRange,
  onApplyStyleToMultiRange,
  onClearMultiRangeFormatting,
  onClearMultiRangeSelection,
  onCopyMultiRangeSelection,
  onNameMultiRangeSelection,
  onPasteMultiRangeSelection,
  onRemoveMultiRangeArea,
  onApplyFilterPreset,
  onMoveConditionalFormat,
  onReapplyFilters,
  onResizeConditionalFormatToSelection,
  onResizeDataValidationToSelection,
  onResizeFilterToSelection,
  onSelectConditionalFormat,
  onSelectDataValidation,
  onSelectFilter,
  onSelectFormulaWatch,
  onUpdateConditionalFormatVisualOptions,
  onAddSelectedFormulaWatches,
  onAddWhatIfScenario,
  onSaveFilterPreset,
  onSelectNamedRange,
  onSelectTable,
  onSelectPivotTable,
  onSelectCircularReference,
  onSelectFormulaDependent,
  onSelectFormulaReference,
  onSelectMultiRangeArea,
  onSelectWorkbookAccessibilityIssue,
  onApplyWorkbookCompareItems,
  onClearWorkbookCompare,
  onSelectWorkbookCompareFile,
  onSelectWorkbookCompareItem,
  onSelectWorkbookCompatibilityIssue,
  onSelectWorkbookInspectionIssue,
  onSelectWorkbookSpellCheckIssue,
  onSelectTrackedChange,
  onSelectCell,
  onRenameTable,
  onAddPivotChart,
  onAddPivotTableDrillDownSheet,
  onAddPivotTable,
  onAddTableSlicer,
  onAddTableTimeline,
  onRefreshPivotTable,
  onUpdatePivotTableLayout,
  onResizeTableToSelection,
  onUpdateTableSlicerValues,
  onUpdateTableTimeline,
  onToggleTableFilterButtons,
  onToggleTableHeaderRow,
  onToggleTableTotals,
  onCreateDataModelHierarchy,
  onCreateDataModelKpi,
  onCreateDataModelPerspective,
  onCreateDataModelRelationship,
  onUpdateTableStyle,
  onUpdatePrintSettings,
  onUpdateCalculationSettings,
  onCreateVersion,
  onDeleteVersion,
  onRestoreVersion,
  onApplyCellStylePreset,
  onDeleteManagedCellStyle,
  onSaveManagedCellStyle,
  onUpdateManagedCellStyle,
  onUpdateWorkbookTheme,
  onResetAllShortcuts,
  onResetShortcut,
  onUpdateShortcut,
  onDeleteScriptRecording,
  onDeleteWorkbookAddIn,
  onDeleteWorkbookCustomFunction,
  onDeleteProtectedRange,
  onReviewTrackedChange,
  onRegisterWorkbookAddIn,
  onRunWorkbookAddIn,
  onRunScriptRecording,
  onSaveCustomFunction,
  onSetWorkbookAddInEnabled,
  onStartScriptRecording,
  onStopScriptRecording,
  onRunGoalSeek,
  onRunSolver,
  onApplyWhatIfScenario,
  onCreateDataTable,
  onCreateCorrelation,
  onCreateDescriptiveStatistics,
  onCreateExponentialSmoothing,
  onCreateForecastSheet,
  onCreateHistogram,
  onCreateMovingAverage,
  onCreateRegression,
  onCreateSampling,
  onEnableExcelScale,
}: {
  sheet: SheetData;
  document: WorkbookDocument;
  charts: ChartDefinition[];
  sparklines: SparklineDefinition[];
  insertedObjects: InsertedObjectDefinition[];
  selectedObjectId: string | null;
  tables: TableDefinition[];
  tableSlicers: TableSlicer[];
  tableTimelines: TableTimeline[];
  pivotTables: PivotTableDefinition[];
  conditionalFormats: ConditionalFormatRule[];
  dataValidations: DataValidationRule[];
  dataValidationIssues: DataValidationIssue[];
  formulaCheckingIssues: FormulaCheckingIssue[];
  formulaConsistencyIssues: FormulaConsistencyIssue[];
  formulaErrorIssues: FormulaErrorIssue[];
  formulaWatches: FormulaWatchRow[];
  whatIfScenarios: WhatIfScenario[];
  filters: SheetFilterRule[];
  filterPresets: SheetFilterPreset[];
  calculationSettings: WorkbookCalculationSettings;
  circularReferences: CircularReferenceIssue[];
  dataModelIssues: DataModelRelationshipIssue[];
  dataModelRelationships: WorkbookDataModelRelationship[];
  formulaDependents: FormulaReference[];
  formulaReferences: FormulaReference[];
  commentsDisabled: boolean;
  collaborators: WorkbookCollaboratorSummary[];
  currentUserEmail: string;
  multiRangeAreas: CellRange[];
  isSheetProtected: boolean;
  namedRanges: NamedRange[];
  printSettings: SheetPrintSettings;
  selectedRange: ChartRange;
  selectedKey: string;
  selectedRaw: string;
  selectedFormulaCount: number;
  links: CellLink[];
  linkIssues: ExternalLinkIssue[];
  notes: CellNote[];
  commentNotifications: WorkbookCommentNotification[];
  workbookAccessibilityIssues: WorkbookAccessibilityIssue[];
  workbookAccessRole: WorkbookRole;
  workbookActivityLogs: AuditLogRow[];
  workbookId: string;
  workbookName: string;
  workbookOwnerEmail: string;
  workbookSharing?: WorkbookSharingSummary;
  protectedRangeManagementDisabled: boolean;
  protectedRanges: WorkbookProtectedRange[];
  trackedChanges: WorkbookTrackedChange[];
  workbookCompareError: string | null;
  workbookCompareFileName: string;
  workbookCompareMergeDisabled: boolean;
  workbookCompareNotice: string | null;
  workbookCompareResult: WorkbookCompareResult | null;
  workbookCompatibilityIssues: WorkbookCompatibilityIssue[];
  workbookInspectionIssues: WorkbookInspectionIssue[];
  workbookSpellCheckIssues: WorkbookSpellCheckIssue[];
  workbookStatistics: WorkbookStatistics;
  workbookTheme: WorkbookTheme;
  workbookCellStyles: WorkbookCellStyleDefinition[];
  shortcutPreferences: SpreadsheetShortcutPreference[];
  shortcuts: EffectiveSpreadsheetShortcut[];
  macroProjects: WorkbookMacroProject[];
  automationScripts: WorkbookAutomationScript[];
  customFunctions: WorkbookCustomFunction[];
  addIns: WorkbookAddInManifest[];
  versionHistory: WorkbookVersionSnapshot[];
  versionRestores: WorkbookVersionRestore[];
  computedValues: Record<string, string>;
  onDeleteChart: (chartId: string) => void;
  onRenameChart: (chartId: string, title: string) => void;
  onToggleChartAxes: (chartId: string) => void;
  onToggleChartDataLabels: (chartId: string) => void;
  onToggleChartLegend: (chartId: string) => void;
  onUpdateChartFormat: (chartId: string, updates: ChartFormatUpdate) => void;
  onUpdateChartTemplate: (
    chartId: string,
    template: NonNullable<ChartDefinition["template"]>,
  ) => void;
  onExportChart: (chart: ChartDefinition) => void;
  onDeleteSparkline: (sparklineId: string) => void;
  onDeleteInsertedObject: (objectId: string) => void;
  onMoveInsertedObjectToSelection: (objectId: string) => void;
  onReorderInsertedObject: (
    objectId: string,
    action: InsertedObjectLayerAction,
  ) => void;
  onSelectInsertedObject: (objectId: string | null) => void;
  onUpdateInsertedObject: (
    objectId: string,
    updates: InsertedObjectUpdate,
  ) => void;
  onDeleteTable: (tableId: string) => void;
  onDeleteDataModelHierarchy: (hierarchyId: string) => void;
  onDeleteDataModelKpi: (kpiId: string) => void;
  onDeleteDataModelPerspective: (perspectiveId: string) => void;
  onDeleteDataModelRelationship: (relationshipId: string) => void;
  onDeleteTableSlicer: (slicerId: string) => void;
  onDeleteTableTimeline: (timelineId: string) => void;
  onDeletePivotTable: (pivotTableId: string) => void;
  onDeleteLink: (linkId: string) => void;
  onRepairLink: (linkId: string, url: string) => void;
  onDeleteNote: (noteId: string) => void;
  onMarkCommentNotificationRead: (notificationId: string) => void;
  onSetNoteStatus: (noteId: string, status: CellCommentStatus) => void;
  onAddConditionalFormat: (rule: ConditionalFormatInput) => void;
  onAddPivotTableConditionalFormat: (
    pivotTableId: string,
    rule: ConditionalFormatInput,
    scope?: PivotTableConditionalFormatScope,
  ) => string | null;
  onAddDataValidation: (rule: DataValidationInput) => void;
  onDeleteConditionalFormat: (ruleId: string) => void;
  onDeleteDataValidation: (ruleId: string) => void;
  onDeleteFilter: (ruleId: string) => void;
  onDeleteFilterPreset: (presetId: string) => void;
  onDuplicateConditionalFormat: (ruleId: string) => void;
  onDeleteFormulaWatch: (watchId: string) => void;
  onDeleteWhatIfScenario: (scenarioId: string) => void;
  onDeleteNamedRange: (rangeId: string) => void;
  onDeleteProtectedRange: (protectedRangeId: string) => void;
  onAddSelectedRangeToMultiRange: () => void;
  onAddProtectedRange: (name: string, allowedEmails: string[]) => string | null;
  onApplyStyleToMultiRange: () => void;
  onClearMultiRangeFormatting: () => void;
  onClearMultiRangeSelection: () => void;
  onCopyMultiRangeSelection: () => void;
  onNameMultiRangeSelection: (name: string) => void;
  onPasteMultiRangeSelection: () => void;
  onRemoveMultiRangeArea: (index: number) => void;
  onApplyFilterPreset: (presetId: string) => string | null;
  onMoveConditionalFormat: (
    ruleId: string,
    direction: "up" | "down" | "top" | "bottom",
  ) => void;
  onReapplyFilters: () => void;
  onResizeConditionalFormatToSelection: (ruleId: string) => void;
  onResizeDataValidationToSelection: (ruleId: string) => void;
  onResizeFilterToSelection: (ruleId: string) => void;
  onSelectConditionalFormat: (rule: ConditionalFormatRule) => void;
  onSelectDataValidation: (rule: DataValidationRule) => void;
  onSelectFilter: (rule: SheetFilterRule) => void;
  onUpdateConditionalFormatVisualOptions: (
    ruleId: string,
    updates: ConditionalFormatVisualOptionsUpdate,
  ) => void;
  onSelectFormulaWatch: (watch: FormulaWatchRow) => void;
  onAddSelectedFormulaWatches: () => void;
  onAddWhatIfScenario: (name: string) => string | null;
  onSaveFilterPreset: (name: string) => string | null;
  onSelectNamedRange: (namedRange: NamedRange) => void;
  onSelectTable: (table: TableDefinition) => void;
  onSelectPivotTable: (pivotTable: PivotTableDefinition) => void;
  onSelectCircularReference: (issue: CircularReferenceIssue) => void;
  onSelectFormulaDependent: (reference: FormulaReference) => void;
  onSelectFormulaReference: (reference: FormulaReference) => void;
  onSelectMultiRangeArea: (range: CellRange) => void;
  onSelectWorkbookAccessibilityIssue: (issue: WorkbookAccessibilityIssue) => void;
  onApplyWorkbookCompareItems: (itemIds: string[]) => void;
  onClearWorkbookCompare: () => void;
  onSelectWorkbookCompareFile: (file: File) => void;
  onSelectWorkbookCompareItem: (item: WorkbookCompareItem) => void;
  onSelectWorkbookCompatibilityIssue: (issue: WorkbookCompatibilityIssue) => void;
  onSelectWorkbookInspectionIssue: (issue: WorkbookInspectionIssue) => void;
  onSelectWorkbookSpellCheckIssue: (issue: WorkbookSpellCheckIssue) => void;
  onSelectTrackedChange: (change: WorkbookTrackedChange) => void;
  onSelectCell: (selection: CellSelection) => void;
  onRenameTable: (tableId: string, name: string) => void;
  onAddPivotChart: (pivotTableId: string) => string | null;
  onAddPivotTableDrillDownSheet: (pivotTableId: string) => string | null;
  onAddPivotTable: () => string | null;
  onAddTableSlicer: (tableId: string, columnIndex: number) => void;
  onAddTableTimeline: (tableId: string, columnIndex: number) => void;
  onRefreshPivotTable: (pivotTableId: string) => string | null;
  onUpdatePivotTableLayout: (
    pivotTableId: string,
    updates: PivotTableLayoutUpdate,
  ) => string | null;
  onResizeTableToSelection: (tableId: string) => void;
  onUpdateTableSlicerValues: (
    slicerId: string,
    selectedValues: string[],
  ) => void;
  onUpdateTableTimeline: (
    timelineId: string,
    updates: { mode?: TableTimelineMode; selectedPeriods?: string[] },
  ) => void;
  onToggleTableFilterButtons: (tableId: string) => void;
  onToggleTableHeaderRow: (tableId: string) => void;
  onToggleTableTotals: (tableId: string) => void;
  onCreateDataModelHierarchy: (
    draft: DataModelHierarchyDraft,
  ) => string | null;
  onCreateDataModelKpi: (draft: DataModelKpiDraft) => string | null;
  onCreateDataModelPerspective: (
    draft: DataModelPerspectiveDraft,
  ) => string | null;
  onCreateDataModelRelationship: (
    draft: DataModelRelationshipDraft,
  ) => string | null;
  onUpdateTableStyle: (
    tableId: string,
    style: TableDefinition["style"],
  ) => void;
  onUpdatePrintSettings: (
    updates: Partial<Omit<SheetPrintSettings, "sheetId" | "updatedAt">>,
  ) => void;
  onUpdateCalculationSettings: (
    settings: Partial<WorkbookCalculationSettings["iterativeCalculation"]>,
  ) => void;
  onCreateVersion: (label: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onRestoreVersion: (versionId: string) => void;
  onApplyCellStylePreset: (style: CellStyle) => void;
  onDeleteManagedCellStyle: (styleId: string) => void;
  onSaveManagedCellStyle: (name: string) => void;
  onUpdateManagedCellStyle: (styleId: string) => void;
  onUpdateWorkbookTheme: (updates: WorkbookThemeUpdate) => void;
  onResetAllShortcuts: () => void;
  onResetShortcut: (command: SpreadsheetShortcutCommand) => void;
  onUpdateShortcut: (
    command: SpreadsheetShortcutCommand,
    binding: SpreadsheetShortcutBinding | null,
  ) => void;
  onDeleteScriptRecording: (scriptId: string) => void;
  onDeleteWorkbookAddIn: (addInId: string) => void;
  onDeleteWorkbookCustomFunction: (functionId: string) => void;
  onReviewTrackedChange: (
    trackedChangeId: string,
    decision: "accepted" | "rejected",
  ) => void;
  onRegisterWorkbookAddIn: (
    name: string,
    provider: string,
    permissions: WorkbookAutomationPermission[],
    description?: string,
  ) => void;
  onRunWorkbookAddIn: (addInId: string) => WorkbookAddInSandboxResult | null;
  onRunScriptRecording: (
    scriptId: string,
  ) => WorkbookAutomationRunResult | null;
  onSaveCustomFunction: (
    name: string,
    expression: string,
    description?: string,
  ) => void;
  onSetWorkbookAddInEnabled: (addInId: string, enabled: boolean) => void;
  onStartScriptRecording: (name: string) => void;
  onStopScriptRecording: (scriptId: string) => void;
  onRunGoalSeek: (request: GoalSeekRequest) => GoalSeekResult;
  onRunSolver: (request: SolverRequest) => Promise<SolverResult>;
  onApplyWhatIfScenario: (scenarioId: string) => string | null;
  onCreateDataTable: (request: DataTableRequest) => DataTableResult;
  onCreateCorrelation: () => AnalysisToolpakResult;
  onCreateDescriptiveStatistics: () => AnalysisToolpakResult;
  onCreateExponentialSmoothing: () => AnalysisToolpakResult;
  onCreateForecastSheet: () => AnalysisToolpakResult;
  onCreateHistogram: () => AnalysisToolpakResult;
  onCreateMovingAverage: () => AnalysisToolpakResult;
  onCreateRegression: () => AnalysisToolpakResult;
  onCreateSampling: () => AnalysisToolpakResult;
  onEnableExcelScale: () => void;
}) {
  return (
    <aside
      aria-label="Workbook tools and accessibility panels"
      role="complementary"
      className="spreadsheet-side-panel hidden h-full min-h-0 w-80 shrink-0 overflow-hidden border-l bg-card/60 xl:block"
    >
      <ScrollArea className="h-full" viewportClassName="p-3">
        <div className="space-y-5">
      <WorkbookStatisticsPanel statistics={workbookStatistics} />
      <SheetScalePanel
        disabled={isSheetProtected}
        sheet={sheet}
        onEnableExcelScale={onEnableExcelScale}
      />
      <WorkbookThemePanel
        disabled={isSheetProtected}
        managedStyles={workbookCellStyles}
        selectedStyle={sheet.cells[selectedKey]?.style ?? {}}
        theme={workbookTheme}
        onApplyStyle={onApplyCellStylePreset}
        onDeleteManagedStyle={onDeleteManagedCellStyle}
        onSaveManagedStyle={onSaveManagedCellStyle}
        onUpdateManagedStyle={onUpdateManagedCellStyle}
        onUpdateTheme={onUpdateWorkbookTheme}
      />
      <WorkbookCompatibilityPanel
        issues={workbookCompatibilityIssues}
        onSelectIssue={onSelectWorkbookCompatibilityIssue}
      />
      <WorkbookComparePanel
        compareError={workbookCompareError}
        compareNotice={workbookCompareNotice}
        disabled={workbookCompareMergeDisabled}
        fileName={workbookCompareFileName}
        result={workbookCompareResult}
        onApplyItems={onApplyWorkbookCompareItems}
        onClearComparison={onClearWorkbookCompare}
        onSelectFile={onSelectWorkbookCompareFile}
        onSelectItem={onSelectWorkbookCompareItem}
      />
      <WorkbookInspectionPanel
        issues={workbookInspectionIssues}
        onSelectIssue={onSelectWorkbookInspectionIssue}
      />
      <WorkbookSpellCheckPanel
        issues={workbookSpellCheckIssues}
        onSelectIssue={onSelectWorkbookSpellCheckIssue}
      />
      <WorkbookAccessibilityPanel
        issues={workbookAccessibilityIssues}
        onSelectIssue={onSelectWorkbookAccessibilityIssue}
      />
      <WorkbookActivityPanel
        accessRole={workbookAccessRole}
        logs={workbookActivityLogs}
        ownerEmail={workbookOwnerEmail}
        sharing={workbookSharing}
        workbookId={workbookId}
        workbookName={workbookName}
      />
      <ProtectedRangesPanel
        collaborators={collaborators}
        currentUserEmail={currentUserEmail}
        disabled={protectedRangeManagementDisabled}
        protectedRanges={protectedRanges}
        selectedRange={selectedRange}
        sheet={sheet}
        onAddProtectedRange={onAddProtectedRange}
        onDeleteProtectedRange={onDeleteProtectedRange}
        onSelectRange={onSelectMultiRangeArea}
      />
      <TrackedChangesPanel
        canReview={!protectedRangeManagementDisabled}
        changes={trackedChanges}
        onReviewChange={onReviewTrackedChange}
        onSelectChange={onSelectTrackedChange}
      />
      <KeyboardShortcutsPanel
        preferences={shortcutPreferences}
        shortcuts={shortcuts}
        onResetAllShortcuts={onResetAllShortcuts}
        onResetShortcut={onResetShortcut}
        onUpdateShortcut={onUpdateShortcut}
      />
      <WorkbookAutomationPanel
        addIns={addIns}
        customFunctions={customFunctions}
        disabled={isSheetProtected}
        macroProjects={macroProjects}
        scripts={automationScripts}
        onDeleteAddIn={onDeleteWorkbookAddIn}
        onDeleteCustomFunction={onDeleteWorkbookCustomFunction}
        onDeleteScript={onDeleteScriptRecording}
        onRegisterAddIn={onRegisterWorkbookAddIn}
        onRunAddIn={onRunWorkbookAddIn}
        onRunScript={onRunScriptRecording}
        onSaveCustomFunction={onSaveCustomFunction}
        onSetAddInEnabled={onSetWorkbookAddInEnabled}
        onStartRecording={onStartScriptRecording}
        onStopRecording={onStopScriptRecording}
      />
      <ChartPanel
        sheet={sheet}
        charts={charts}
        computedValues={computedValues}
        disabled={isSheetProtected}
        onDeleteChart={onDeleteChart}
        onRenameChart={onRenameChart}
        onToggleChartAxes={onToggleChartAxes}
        onToggleChartDataLabels={onToggleChartDataLabels}
        onToggleChartLegend={onToggleChartLegend}
        onUpdateChartFormat={onUpdateChartFormat}
        onUpdateChartTemplate={onUpdateChartTemplate}
        onExportChart={onExportChart}
      />
      <SparklinesPanel
        disabled={isSheetProtected}
        sparklines={sparklines}
        onDeleteSparkline={onDeleteSparkline}
        onSelectCell={onSelectCell}
      />
      <InsertedObjectsPanel
        disabled={isSheetProtected}
        objects={insertedObjects}
        selectedObjectId={selectedObjectId}
        onDeleteObject={onDeleteInsertedObject}
        onMoveObjectToSelection={onMoveInsertedObjectToSelection}
        onReorderObject={onReorderInsertedObject}
        onSelectObject={onSelectInsertedObject}
        onUpdateObject={onUpdateInsertedObject}
      />
      <TablesPanel
        disabled={isSheetProtected}
        tables={tables}
        onDeleteTable={onDeleteTable}
        onRenameTable={onRenameTable}
        onResizeTableToSelection={onResizeTableToSelection}
        onSelectTable={onSelectTable}
        onToggleTableFilterButtons={onToggleTableFilterButtons}
        onToggleTableHeaderRow={onToggleTableHeaderRow}
        onToggleTableTotals={onToggleTableTotals}
        onUpdateTableStyle={onUpdateTableStyle}
      />
      <DataModelPanel
        activeSheetId={document.activeSheetId}
        computedValues={computedValues}
        disabled={isSheetProtected}
        document={document}
        issues={dataModelIssues}
        relationships={dataModelRelationships}
        onCreateHierarchy={onCreateDataModelHierarchy}
        onCreateKpi={onCreateDataModelKpi}
        onCreatePerspective={onCreateDataModelPerspective}
        onCreateRelationship={onCreateDataModelRelationship}
        onDeleteHierarchy={onDeleteDataModelHierarchy}
        onDeleteKpi={onDeleteDataModelKpi}
        onDeletePerspective={onDeleteDataModelPerspective}
        onDeleteRelationship={onDeleteDataModelRelationship}
        onSelectTable={onSelectTable}
      />
      <TableSlicersPanel
        disabled={isSheetProtected}
        sheet={sheet}
        tables={tables}
        slicers={tableSlicers}
        computedValues={computedValues}
        onAddSlicer={onAddTableSlicer}
        onDeleteSlicer={onDeleteTableSlicer}
        onSelectTable={onSelectTable}
        onUpdateSlicerValues={onUpdateTableSlicerValues}
      />
      <TableTimelinesPanel
        disabled={isSheetProtected}
        sheet={sheet}
        tables={tables}
        timelines={tableTimelines}
        computedValues={computedValues}
        onAddTimeline={onAddTableTimeline}
        onDeleteTimeline={onDeleteTableTimeline}
        onSelectTable={onSelectTable}
        onUpdateTimeline={onUpdateTableTimeline}
      />
      <PivotTablesPanel
        disabled={isSheetProtected}
        document={document}
        sheet={sheet}
        pivotTables={pivotTables}
        conditionalFormats={conditionalFormats}
        computedValues={computedValues}
        onAddPivotTable={onAddPivotTable}
        onAddPivotChart={onAddPivotChart}
        onAddPivotTableDrillDownSheet={onAddPivotTableDrillDownSheet}
        onAddPivotTableConditionalFormat={onAddPivotTableConditionalFormat}
        onDeletePivotTable={onDeletePivotTable}
        onRefreshPivotTable={onRefreshPivotTable}
        onSelectPivotTable={onSelectPivotTable}
        onUpdatePivotTableLayout={onUpdatePivotTableLayout}
      />
      <WhatIfAnalysisPanel
        disabled={isSheetProtected}
        selectedKey={selectedKey}
        selectedRaw={selectedRaw}
        onRunGoalSeek={onRunGoalSeek}
      />
      <SolverPanel
        disabled={isSheetProtected}
        selectedKey={selectedKey}
        selectedRaw={selectedRaw}
        onRunSolver={onRunSolver}
      />
      <WhatIfDataTablePanel
        disabled={isSheetProtected}
        selectedKey={selectedKey}
        selectedRaw={selectedRaw}
        onCreateDataTable={onCreateDataTable}
      />
      <ScenarioManagerPanel
        disabled={isSheetProtected}
        scenarios={whatIfScenarios}
        onAddScenario={onAddWhatIfScenario}
        onApplyScenario={onApplyWhatIfScenario}
        onDeleteScenario={onDeleteWhatIfScenario}
      />
      <AnalysisToolpakPanel
        disabled={isSheetProtected}
        onCreateCorrelation={onCreateCorrelation}
        onCreateDescriptiveStatistics={onCreateDescriptiveStatistics}
        onCreateExponentialSmoothing={onCreateExponentialSmoothing}
        onCreateForecastSheet={onCreateForecastSheet}
        onCreateHistogram={onCreateHistogram}
        onCreateMovingAverage={onCreateMovingAverage}
        onCreateRegression={onCreateRegression}
        onCreateSampling={onCreateSampling}
      />
      <FormulaAuditPanel
        calculationSettings={calculationSettings}
        circularReferences={circularReferences}
        dependents={formulaDependents}
        references={formulaReferences}
        onSelectCircularReference={onSelectCircularReference}
        onSelectDependent={onSelectFormulaDependent}
        onSelectReference={onSelectFormulaReference}
        onUpdateCalculationSettings={onUpdateCalculationSettings}
      />
      <FormulaWatchPanel
        watches={formulaWatches}
        selectedFormulaCount={selectedFormulaCount}
        onAddSelectedWatches={onAddSelectedFormulaWatches}
        onDeleteWatch={onDeleteFormulaWatch}
        onSelectWatch={onSelectFormulaWatch}
      />
      <FormulaCheckingPanel
        issues={formulaCheckingIssues}
        onSelectCell={onSelectCell}
      />
      <DataValidationIssuesPanel
        issues={dataValidationIssues}
        onSelectCell={onSelectCell}
      />
      <FormulaConsistencyPanel
        issues={formulaConsistencyIssues}
        onSelectCell={onSelectCell}
      />
      <FormulaErrorsPanel
        issues={formulaErrorIssues}
        onSelectCell={onSelectCell}
      />
      <PrintSettingsPanel
        disabled={isSheetProtected}
        selectedRange={selectedRange}
        settings={printSettings}
        sheet={sheet}
        onUpdateSettings={onUpdatePrintSettings}
      />
      <VersionHistoryPanel
        disabled={isSheetProtected}
        versions={versionHistory}
        restoreLog={versionRestores}
        onCreateVersion={onCreateVersion}
        onDeleteVersion={onDeleteVersion}
        onRestoreVersion={onRestoreVersion}
      />
      <MultiRangeSelectionPanel
        disabled={isSheetProtected}
        ranges={multiRangeAreas}
        selectedRange={selectedRange}
        onAddSelectedRange={onAddSelectedRangeToMultiRange}
        onApplySelectedStyle={onApplyStyleToMultiRange}
        onClearFormatting={onClearMultiRangeFormatting}
        onClearRanges={onClearMultiRangeSelection}
        onCopyRanges={onCopyMultiRangeSelection}
        onNameRanges={onNameMultiRangeSelection}
        onPasteRanges={onPasteMultiRangeSelection}
        onRemoveRange={onRemoveMultiRangeArea}
        onSelectRange={onSelectMultiRangeArea}
      />
      <NamedRangesPanel
        disabled={isSheetProtected}
        namedRanges={namedRanges}
        onDeleteNamedRange={onDeleteNamedRange}
        onSelectNamedRange={onSelectNamedRange}
      />
      <SheetNotesPanel
        disabled={commentsDisabled}
        notes={notes}
        notifications={commentNotifications}
        onDeleteNote={onDeleteNote}
        onMarkNotificationRead={onMarkCommentNotificationRead}
        onSetNoteStatus={onSetNoteStatus}
        onSelectCell={onSelectCell}
      />
      <SheetLinksPanel
        disabled={isSheetProtected}
        links={links}
        onDeleteLink={onDeleteLink}
        onSelectCell={onSelectCell}
      />
      <ExternalLinkReviewPanel
        disabled={isSheetProtected}
        issues={linkIssues}
        onDeleteLink={onDeleteLink}
        onRepairLink={onRepairLink}
        onSelectCell={onSelectCell}
      />
      <SheetRulesPanel
        disabled={isSheetProtected}
        conditionalFormats={conditionalFormats}
        dataValidations={dataValidations}
        dataValidationIssues={dataValidationIssues}
        filters={filters}
        filterPresets={filterPresets}
        onApplyFilterPreset={onApplyFilterPreset}
        onCreateConditionalFormatPreset={onAddConditionalFormat}
        onCreateDataValidationPreset={onAddDataValidation}
        onDeleteConditionalFormat={onDeleteConditionalFormat}
        onDeleteDataValidation={onDeleteDataValidation}
        onDeleteFilter={onDeleteFilter}
        onDeleteFilterPreset={onDeleteFilterPreset}
        onDuplicateConditionalFormat={onDuplicateConditionalFormat}
        onMoveConditionalFormat={onMoveConditionalFormat}
        onReapplyFilters={onReapplyFilters}
        onResizeConditionalFormatToSelection={
          onResizeConditionalFormatToSelection
        }
        onResizeDataValidationToSelection={
          onResizeDataValidationToSelection
        }
        onResizeFilterToSelection={onResizeFilterToSelection}
        onSelectConditionalFormat={onSelectConditionalFormat}
        onSelectDataValidation={onSelectDataValidation}
        onSelectFilter={onSelectFilter}
        onSaveFilterPreset={onSaveFilterPreset}
        onUpdateConditionalFormatVisualOptions={
          onUpdateConditionalFormatVisualOptions
        }
      />
        </div>
      </ScrollArea>
    </aside>
  );
}

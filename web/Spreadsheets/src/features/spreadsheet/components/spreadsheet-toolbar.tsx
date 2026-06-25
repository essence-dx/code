"use client";

import { useRef, useState } from "react";
import {
  Activity,
  Bold,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownAZ,
  ArrowRight,
  ArrowUpAZ,
  CandlestickChart,
  ChartArea,
  ChartBarStacked,
  ChartColumn,
  ChartColumnIncreasing,
  ChartColumnStacked,
  ChartLine,
  ChartNoAxesCombined,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  ChartScatter,
  ClipboardCopy,
  ClipboardPaste,
  CircleDot,
  Columns3,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  FileJson,
  FileText,
  FileUp,
  FileSpreadsheet,
  Grid2X2,
  Boxes,
  Funnel,
  Image as ImageIcon,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  ListFilter,
  ListPlus,
  Lock,
  Map,
  Maximize2,
  Minimize2,
  Paintbrush,
  PanelLeft,
  PanelRight,
  Printer,
  Radar,
  Redo2,
  RemoveFormatting,
  Rows3,
  Save,
  Shield,
  ShieldOff,
  Shapes,
  Sparkles,
  Square,
  Strikethrough,
  Table2,
  TableCellsMerge,
  TableCellsSplit,
  TableColumnsSplit,
  TableRowsSplit,
  Eraser,
  Trash2,
  Type,
  Underline,
  Undo2,
  Unlock,
  WrapText,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CellLinkDialog } from "@/features/spreadsheet/components/cell-link-dialog";
import { CellNoteDialog } from "@/features/spreadsheet/components/cell-note-dialog";
import { CellStyleManagerDropdown } from "@/features/spreadsheet/components/cell-style-manager-dropdown";
import { AdvancedFilterCopyDialog } from "@/features/spreadsheet/components/advanced-filter-copy-dialog";
import { ConditionalFormatDialog } from "@/features/spreadsheet/components/conditional-format-dialog";
import { CustomNumberFormatDialog } from "@/features/spreadsheet/components/custom-number-format-dialog";
import { CustomSortDialog } from "@/features/spreadsheet/components/custom-sort-dialog";
import { DataValidationDialog } from "@/features/spreadsheet/components/data-validation-dialog";
import { GoToDialog } from "@/features/spreadsheet/components/go-to-dialog";
import { NamedRangeDialog } from "@/features/spreadsheet/components/named-range-dialog";
import { PrintPreviewDialog } from "@/features/spreadsheet/components/print-preview-dialog";
import { SheetFilterDialog } from "@/features/spreadsheet/components/sheet-filter-dialog";
import {
  SpreadsheetImportConnectorsDialog,
  type TextConnectorImportRequest,
  type UrlConnectorImportRequest,
} from "@/features/spreadsheet/components/spreadsheet-import-connectors-dialog";
import type { SplitPaneMode } from "@/features/spreadsheet/components/spreadsheet-grid-panes";
import { cn } from "@/lib/utils";
import { cellFontFamilyOptions } from "@/features/workbooks/font-families";
import type { SheetPrintPreviewPage } from "@/features/workbooks/html";
import type { CellStylePreset } from "@/features/workbooks/workbook-themes";
import type { FilterColumnLabels } from "@/features/spreadsheet/filter-column-labels";
import type { FilterValueOption } from "@/features/spreadsheet/filter-values";
import type { StyleCriterionOptions } from "@/features/spreadsheet/style-criteria";
import type {
  SortCustomOrder,
  SortOn,
} from "@/features/spreadsheet/sort-orders";
import type {
  CellRange,
  SortCriterion,
} from "@/features/spreadsheet/state/selection-state";
import type { WorkbookWindowViewModel } from "@/features/spreadsheet/workbook-window-views";
import type { PasteSpecialMode } from "@/features/spreadsheet/cell-clipboard";
import type { GoToSpecialTarget } from "@/features/spreadsheet/go-to";
import {
  describeOfflineRecoveryCheckpoint,
  type OfflineWorkbookRecoveryCheckpointMeta,
} from "@/features/workbooks/offline-sync";
import type {
  CellStyle,
  ConditionalFormatOperator,
  ConditionalFormatStyle,
  DataValidationErrorStyle,
  DataValidationListSource,
  DataValidationRuleType,
  InsertedObjectDefinition,
  SheetData,
  SheetFilterCondition,
  SheetFilterRuleType,
  SheetViewMode,
  WorkbookCellStyleDefinition,
  WorkbookCustomView,
  WorkbookQueryDefinition,
  CellCommentStatus,
  CellNote,
} from "@/features/workbooks/types";

const fillSwatches = ["#fef3c7", "#dcfce7", "#dbeafe", "#fae8ff", "#fee2e2"];
const textSwatches = ["#f8fafc", "#111827", "#166534", "#1d4ed8", "#b91c1c"];
const zoomOptions = [75, 90, 100, 125, 150];
const textRotationOptions = [0, 45, 90, -45, -90];
const verticalAlignOptions = [
  { label: "Top", value: "top" },
  { label: "Middle", value: "middle" },
  { label: "Bottom", value: "bottom" },
] satisfies Array<{
  label: string;
  value: NonNullable<CellStyle["verticalAlign"]>;
}>;
const viewModeLabels: Record<SheetViewMode, string> = {
  normal: "Normal",
  pageLayout: "Page layout",
  pageBreakPreview: "Page break preview",
};

function ToolButton({
  label,
  children,
  active,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon-sm"
          className={cn(active && "text-primary")}
          {...props}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarMenu({
  label,
  children,
  icon,
  active,
  disabled,
  contentClassName,
}: {
  label: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  contentClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="sm"
          className="gap-2"
          disabled={disabled}
          aria-label={`${label} menu`}
        >
          {icon}
          <span className="hidden xl:inline">{label}</span>
          <span className="sr-only xl:hidden">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={contentClassName}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SpreadsheetToolbar({
  embedded = false,
  calculationDirtyCellCount,
  calculationError,
  calculationMode,
  calculationStrategy,
  isDirty,
  isSaving,
  isCalculating,
  isSheetProtected,
  isWorkbookProtected,
  readOnly = false,
  canEditWorkbook,
  canComment,
  selectedCellsUnlocked,
  selectedFormulasHidden,
  canUndo,
  canRedo,
  bold,
  italic,
  underline,
  strikethrough,
  align,
  verticalAlign,
  textRotation,
  verticalText,
  shrinkToFit,
  hasRichTextRuns,
  wrap,
  fontFamily,
  fontSize,
  indent,
  numberFormat,
  zoomPercent,
  focusModeActive,
  frozenColumnCount,
  frozenRowCount,
  splitPaneMode,
  workbookWindowSheetOptions,
  workbookWindowViews,
  sheetViewMode,
  isRightToLeft,
  showPageBreaks,
  showGridlines,
  customViews,
  cellStylePresets,
  managedCellStyles,
  selectedStyle,
  customNumberFormat,
  customNumberFormatPreviewValue,
  formatPainterActive,
  selectedAddress,
  selectedLink,
  selectedNote,
  selectedRange,
  goToSpecialTargets,
  filterColumnLabels,
  filterValueOptions,
  styleFilterOptions,
  printPreviewHtml,
  printPreviewPages,
  printPreviewSheetName,
  offlineStatusLabel,
  offlineStatusDescription,
  offlineRecoveryCheckpoints,
  canOpenLocalWorkbook,
  canRestoreOfflineCache,
  onSave,
  onSaveLocalWorkbook,
  onOpenLocalWorkbook,
  onRestoreOfflineCache,
  onRestoreOfflineCheckpoint,
  onDeleteOfflineCheckpoint,
  onClearOfflineCache,
  onToggleSheetProtection,
  onToggleWorkbookProtection,
  onToggleSelectedCellsLocked,
  onToggleSelectedFormulasHidden,
  onUndo,
  onRedo,
  onGoToReference,
  onGoToSpecialTarget,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onToggleFocusMode,
  onToggleFreezeFirstColumn,
  onToggleFreezeFirstRow,
  onFreezePanesAtSelection,
  onUnfreezePanes,
  onSetSplitPaneMode,
  onActivateWorkbookWindow,
  onCloseWorkbookWindow,
  onOpenWorkbookWindow,
  onSetSheetViewMode,
  onToggleRightToLeft,
  onSaveCustomView,
  onApplyCustomView,
  onDeleteCustomView,
  onTogglePageBreaks,
  onToggleGridlines,
  onToggleFormatPainter,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleStrikethrough,
  onToggleWrap,
  onSetVerticalAlign,
  onSetTextRotation,
  onToggleVerticalText,
  onToggleShrinkToFit,
  onApplyRichTextRuns,
  onClearRichTextRuns,
  onClearFormatting,
  onApplyCellStylePreset,
  onDeleteManagedCellStyle,
  onSaveManagedCellStyle,
  onUpdateManagedCellStyle,
  onSetAlign,
  onSetFontFamily,
  onSetFontSize,
  onDecreaseIndent,
  onIncreaseIndent,
  onSetNumberFormat,
  onSetCustomNumberFormat,
  onSetFill,
  onSetTextColor,
  onSetAllBorders,
  onSetOutlineBorders,
  onClearBorders,
  onMergeCells,
  onUnmergeCells,
  onSaveCellLink,
  onAddCellNoteReply,
  onSaveCellNote,
  onSetCellNoteStatus,
  onInsertRows,
  onDeleteRows,
  onHideRows,
  onGroupRows,
  onInsertColumns,
  onDeleteColumns,
  onHideColumns,
  onGroupColumns,
  onUngroupSelection,
  onUnhideRowsAndColumns,
  onAddBarChart,
  onAddLineChart,
  onAddAreaChart,
  onAddPieChart,
  onAddScatterChart,
  onAddBubbleChart,
  onAddRadarChart,
  onAddComboChart,
  onAddStockChart,
  onAddStackedBarChart,
  onAddStacked100BarChart,
  onAddWaterfallChart,
  onAddFunnelChart,
  onAddHistogramChart,
  onAddBoxWhiskerChart,
  onAddTreemapChart,
  onAddSunburstChart,
  onAddSurfaceChart,
  onAddMapChart,
  onAddSparkline,
  canAddSparkline,
  onAddShapeObject,
  onAddTextBoxObject,
  onInsertImageObject,
  onAddConditionalFormat,
  onAddDataValidation,
  onAddFilter,
  onApplyCriteriaRangeFilter,
  onCopyCriteriaRangeToLocation,
  onAddTable,
  onAddNamedRange,
  onCustomSort,
  onSortAsc,
  onSortDesc,
  onRemoveDuplicates,
  onFillDown,
  onFillRight,
  onFillSeries,
  onFlashFill,
  canFlashFill,
  canPasteSpecial,
  onPasteSpecial,
  onPasteTransposed,
  onCopyVisibleRange,
  onCopyVisibleRangeToNextColumns,
  onCopyRangeImage,
  onExportCsv,
  onImportCsv,
  onExportTsv,
  onImportTsv,
  onExportHtml,
  onPrintSheet,
  onExportPdf,
  onExportXml,
  onExportXlsx,
  onImportXlsx,
  onExportXlsm,
  onImportXlsm,
  onExportXltx,
  onImportXltx,
  onExportXltm,
  onImportXltm,
  onExportXls,
  onImportXls,
  onExportOds,
  onImportOds,
  onExportJson,
  onImportJson,
  onExportBackup,
  onImportBackup,
  onRecoverWorkbookImport,
  onImportConnectorDatabaseResult,
  onImportConnectorUrl,
  onDeleteConnectorQuery,
  onRefreshConnectorQuery,
  connectorQueries,
}: {
  embedded?: boolean;
  calculationDirtyCellCount: number;
  calculationError: string | null;
  calculationMode: "sync" | "worker";
  calculationStrategy: "full" | "incremental";
  isDirty: boolean;
  isSaving: boolean;
  isCalculating: boolean;
  isSheetProtected: boolean;
  isWorkbookProtected: boolean;
  readOnly?: boolean;
  canEditWorkbook: boolean;
  canComment: boolean;
  selectedCellsUnlocked: boolean;
  selectedFormulasHidden: boolean;
  canUndo: boolean;
  canRedo: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  wrap: boolean;
  align?: CellStyle["align"];
  verticalAlign?: CellStyle["verticalAlign"];
  textRotation?: number;
  verticalText: boolean;
  shrinkToFit: boolean;
  hasRichTextRuns: boolean;
  fontFamily?: CellStyle["fontFamily"];
  fontSize?: number;
  indent?: number;
  numberFormat?: CellStyle["numberFormat"];
  zoomPercent: number;
  focusModeActive: boolean;
  frozenColumnCount: number;
  frozenRowCount: number;
  splitPaneMode: SplitPaneMode;
  workbookWindowSheetOptions: Pick<SheetData, "id" | "name">[];
  workbookWindowViews: WorkbookWindowViewModel[];
  sheetViewMode: SheetViewMode;
  isRightToLeft: boolean;
  showPageBreaks: boolean;
  showGridlines: boolean;
  customViews: WorkbookCustomView[];
  cellStylePresets: CellStylePreset[];
  managedCellStyles: WorkbookCellStyleDefinition[];
  selectedStyle: CellStyle;
  customNumberFormat?: string;
  customNumberFormatPreviewValue: string;
  formatPainterActive: boolean;
  selectedAddress: string;
  selectedLink?: { url: string; label: string };
  selectedNote?: CellNote;
  selectedRange: CellRange;
  goToSpecialTargets: GoToSpecialTarget[];
  filterColumnLabels: FilterColumnLabels;
  filterValueOptions: Record<number, FilterValueOption[]>;
  styleFilterOptions: Record<number, StyleCriterionOptions>;
  printPreviewHtml: string;
  printPreviewPages: SheetPrintPreviewPage[];
  printPreviewSheetName: string;
  offlineStatusLabel: string;
  offlineStatusDescription: string;
  offlineRecoveryCheckpoints: OfflineWorkbookRecoveryCheckpointMeta[];
  canOpenLocalWorkbook: boolean;
  canRestoreOfflineCache: boolean;
  onSave: () => void;
  onSaveLocalWorkbook: () => void;
  onOpenLocalWorkbook: (file: File) => void;
  onRestoreOfflineCache: () => void;
  onRestoreOfflineCheckpoint: (checkpointId: string) => void;
  onDeleteOfflineCheckpoint: (checkpointId: string) => void;
  onClearOfflineCache: () => void;
  onToggleSheetProtection: () => void;
  onToggleWorkbookProtection: () => void;
  onToggleSelectedCellsLocked: () => void;
  onToggleSelectedFormulasHidden: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onGoToReference: (input: string) => string | null;
  onGoToSpecialTarget: (target: GoToSpecialTarget) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoomPercent: number) => void;
  onToggleFocusMode: () => void;
  onToggleFreezeFirstColumn: () => void;
  onToggleFreezeFirstRow: () => void;
  onFreezePanesAtSelection: () => void;
  onUnfreezePanes: () => void;
  onSetSplitPaneMode: (mode: SplitPaneMode) => void;
  onActivateWorkbookWindow: (windowId: string) => void;
  onCloseWorkbookWindow: (windowId: string) => void;
  onOpenWorkbookWindow: (sheetId: string) => void;
  onSetSheetViewMode: (mode: SheetViewMode) => void;
  onToggleRightToLeft: () => void;
  onSaveCustomView: (name: string) => void;
  onApplyCustomView: (viewId: string) => void;
  onDeleteCustomView: (viewId: string) => void;
  onTogglePageBreaks: () => void;
  onToggleGridlines: () => void;
  onToggleFormatPainter: () => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleStrikethrough: () => void;
  onToggleWrap: () => void;
  onSetVerticalAlign: (verticalAlign: CellStyle["verticalAlign"]) => void;
  onSetTextRotation: (textRotation: number) => void;
  onToggleVerticalText: () => void;
  onToggleShrinkToFit: () => void;
  onApplyRichTextRuns: () => void;
  onClearRichTextRuns: () => void;
  onClearFormatting: () => void;
  onApplyCellStylePreset: (style: CellStyle) => void;
  onDeleteManagedCellStyle: (styleId: string) => void;
  onSaveManagedCellStyle: (name: string) => void;
  onUpdateManagedCellStyle: (styleId: string, name?: string) => void;
  onSetAlign: (align: CellStyle["align"]) => void;
  onSetFontFamily: (fontFamily: CellStyle["fontFamily"]) => void;
  onSetFontSize: (fontSize: number) => void;
  onDecreaseIndent: () => void;
  onIncreaseIndent: () => void;
  onSetNumberFormat: (numberFormat: CellStyle["numberFormat"]) => void;
  onSetCustomNumberFormat: (format: string) => void;
  onSetFill: (background: string) => void;
  onSetTextColor: (foreground: string) => void;
  onSetAllBorders: () => void;
  onSetOutlineBorders: () => void;
  onClearBorders: () => void;
  onMergeCells: () => void;
  onUnmergeCells: () => void;
  onSaveCellLink: (input: { url: string; label: string }) => void;
  onSaveCellNote: (text: string) => void;
  onAddCellNoteReply: (noteId: string, text: string) => void;
  onSetCellNoteStatus: (noteId: string, status: CellCommentStatus) => void;
  onInsertRows: () => void;
  onDeleteRows: () => void;
  onHideRows: () => void;
  onGroupRows: () => void;
  onInsertColumns: () => void;
  onDeleteColumns: () => void;
  onHideColumns: () => void;
  onGroupColumns: () => void;
  onUngroupSelection: () => void;
  onUnhideRowsAndColumns: () => void;
  onAddBarChart: () => void;
  onAddLineChart: () => void;
  onAddAreaChart: () => void;
  onAddPieChart: () => void;
  onAddScatterChart: () => void;
  onAddBubbleChart: () => void;
  onAddRadarChart: () => void;
  onAddComboChart: () => void;
  onAddStockChart: () => void;
  onAddStackedBarChart: () => void;
  onAddStacked100BarChart: () => void;
  onAddWaterfallChart: () => void;
  onAddFunnelChart: () => void;
  onAddHistogramChart: () => void;
  onAddBoxWhiskerChart: () => void;
  onAddTreemapChart: () => void;
  onAddSunburstChart: () => void;
  onAddSurfaceChart: () => void;
  onAddMapChart: () => void;
  onAddSparkline: () => void;
  canAddSparkline: boolean;
  onAddShapeObject: (
    shapeType: NonNullable<InsertedObjectDefinition["shapeType"]>,
  ) => void;
  onAddTextBoxObject: () => void;
  onInsertImageObject: (file: File) => void;
  onAddConditionalFormat: (rule: {
    operator: ConditionalFormatOperator;
    value: string;
    style: ConditionalFormatStyle;
  }) => void;
  onAddDataValidation: (rule: {
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
  }) => void;
  onAddFilter: (rule: {
    columnIndex: number;
    headerName?: string;
    type: SheetFilterRuleType;
    value: string;
    values?: string[];
    joiner?: "and" | "or";
    conditions?: SheetFilterCondition[];
  }) => void;
  onApplyCriteriaRangeFilter: () => void;
  onCopyCriteriaRangeToLocation: (destinationReference: string) => string | null;
  onAddTable: () => void;
  onAddNamedRange: (name: string) => void;
  onCustomSort: (options: {
    columnIndex: number;
    direction: "asc" | "desc";
    customOrder: SortCustomOrder;
    sortOn: SortOn;
    secondary?: SortCriterion;
  }) => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onRemoveDuplicates: () => void;
  onFillDown: () => void;
  onFillRight: () => void;
  onFillSeries: () => void;
  onFlashFill: () => void;
  canFlashFill: boolean;
  canPasteSpecial: boolean;
  onPasteSpecial: (mode: PasteSpecialMode) => void;
  onPasteTransposed: () => void;
  onCopyVisibleRange: () => void;
  onCopyVisibleRangeToNextColumns: () => void;
  onCopyRangeImage: () => void;
  onExportCsv: () => void;
  onImportCsv: (file: File) => void;
  onExportTsv: () => void;
  onImportTsv: (file: File) => void;
  onExportHtml: () => void;
  onPrintSheet: () => void;
  onExportPdf: () => void;
  onExportXml: () => void;
  onExportXlsx: () => void;
  onImportXlsx: (file: File) => void;
  onExportXlsm: () => void;
  onImportXlsm: (file: File) => void;
  onExportXltx: () => void;
  onImportXltx: (file: File) => void;
  onExportXltm: () => void;
  onImportXltm: (file: File) => void;
  onExportXls: () => void;
  onImportXls: (file: File) => void;
  onExportOds: () => void;
  onImportOds: (file: File) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onRecoverWorkbookImport: (file: File) => void;
  onImportConnectorDatabaseResult: (
    request: TextConnectorImportRequest,
  ) => Promise<void>;
  onImportConnectorUrl: (request: UrlConnectorImportRequest) => Promise<void>;
  onDeleteConnectorQuery: (queryId: string) => void;
  onRefreshConnectorQuery: (queryId: string) => Promise<void>;
  connectorQueries: WorkbookQueryDefinition[];
}) {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const tsvInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const xlsmInputRef = useRef<HTMLInputElement>(null);
  const xltxInputRef = useRef<HTMLInputElement>(null);
  const xltmInputRef = useRef<HTMLInputElement>(null);
  const xlsInputRef = useRef<HTMLInputElement>(null);
  const odsInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const recoveryInputRef = useRef<HTMLInputElement>(null);
  const localWorkbookInputRef = useRef<HTMLInputElement>(null);
  const objectImageInputRef = useRef<HTMLInputElement>(null);
  const [customViewName, setCustomViewName] = useState("");
  const canGroupRows =
    selectedRange.endRowIndex > selectedRange.startRowIndex;
  const canGroupColumns =
    selectedRange.endColumnIndex > selectedRange.startColumnIndex;
  const sheetActionsDisabled = isSheetProtected || readOnly;
  const fileImportDisabled = readOnly || !canEditWorkbook;
  const calculationLabel = calculationError
    ? `Formula calculation error: ${calculationError}`
    : isCalculating
      ? "Calculating formulas"
      : calculationStrategy === "incremental"
        ? calculationDirtyCellCount > 0
          ? `Formula worker ready, recalculated ${calculationDirtyCellCount} dirty cells`
          : "Formula worker ready, no dirty cells"
      : calculationMode === "worker"
        ? "Formula worker ready"
        : "Formula calculation ready";
  const visibleRecoveryCheckpoints = offlineRecoveryCheckpoints.slice(0, 4);
  const openWindowSheetIds = new Set(
    workbookWindowViews.map((view) => view.sheetId),
  );

  return (
    <div className="flex shrink-0 items-center border-b bg-card">
      <ScrollArea
        className="min-w-0 flex-1 overflow-hidden"
        viewportClassName="h-12"
        showHorizontalScrollBar
        showVerticalScrollBar={false}
      >
        <div className="flex h-12 w-max min-w-full items-center gap-1 px-3">
      <ToolButton label="Save" onClick={onSave} disabled={!isDirty || isSaving}>
        <Save />
      </ToolButton>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={canRestoreOfflineCache ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                aria-label="Storage menu"
              >
                <Download />
                <span className="hidden xl:inline">Storage</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Local and offline workbook</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>{offlineStatusLabel}</DropdownMenuLabel>
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            {offlineStatusDescription}
          </p>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSaveLocalWorkbook}>
            Save local workbook copy
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canOpenLocalWorkbook}
            onSelect={(event) => {
              event.preventDefault();
              localWorkbookInputRef.current?.click();
            }}
          >
            Open local workbook copy
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canRestoreOfflineCache}
            onSelect={onRestoreOfflineCache}
          >
            Restore encrypted offline cache
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canRestoreOfflineCache}
            onSelect={onClearOfflineCache}
          >
            Clear encrypted offline cache
          </DropdownMenuItem>
          {visibleRecoveryCheckpoints.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Recovery checkpoints</DropdownMenuLabel>
              {visibleRecoveryCheckpoints.map((checkpoint) => (
                <DropdownMenuItem
                  key={checkpoint.checkpointId}
                  onSelect={() =>
                    onRestoreOfflineCheckpoint(checkpoint.checkpointId)
                  }
                >
                  <span className="min-w-0">
                    <span className="block truncate">{checkpoint.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {describeOfflineRecoveryCheckpoint(checkpoint)}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                className="text-muted-foreground"
                onSelect={() =>
                  visibleRecoveryCheckpoints[0]
                    ? onDeleteOfflineCheckpoint(
                        visibleRecoveryCheckpoints[0].checkpointId,
                      )
                    : undefined
                }
              >
                Forget latest recovery checkpoint
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolbarMenu
        label="Formulas"
        icon={<Activity />}
        active={isCalculating || calculationError !== null}
        contentClassName="w-72"
      >
        <DropdownMenuLabel>Calculation status</DropdownMenuLabel>
        <p className="px-2 py-1.5 text-sm text-muted-foreground">
          {calculationLabel}
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Engine</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <Activity />
            {calculationMode === "worker" ? "Worker formulas" : "Synchronous formulas"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Grid2X2 />
            {calculationStrategy === "incremental"
              ? "Incremental recalculation"
              : "Full recalculation"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </ToolbarMenu>
      <ToolbarMenu
        label="Review"
        icon={isSheetProtected || isWorkbookProtected ? <ShieldOff /> : <Shield />}
        active={isSheetProtected || isWorkbookProtected}
        contentClassName="w-64"
      >
        <DropdownMenuLabel>Workbook protection</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={readOnly} onSelect={onToggleSheetProtection}>
            {isSheetProtected ? <Unlock /> : <Lock />}
            {isSheetProtected ? "Unprotect sheet" : "Protect sheet"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={readOnly} onSelect={onToggleWorkbookProtection}>
            {isWorkbookProtected ? <ShieldOff /> : <Shield />}
            {isWorkbookProtected ? "Unprotect workbook" : "Protect workbook"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Selection protection</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={sheetActionsDisabled}
            onSelect={onToggleSelectedCellsLocked}
          >
            {selectedCellsUnlocked ? <Unlock /> : <Lock />}
            {selectedCellsUnlocked ? "Lock selected cells" : "Unlock selected cells"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={sheetActionsDisabled}
            onSelect={onToggleSelectedFormulasHidden}
          >
            {selectedFormulasHidden ? <Eye /> : <EyeOff />}
            {selectedFormulasHidden ? "Show selected formulas" : "Hide selected formulas"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </ToolbarMenu>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolButton label="Undo" onClick={onUndo} disabled={!canUndo}>
        <Undo2 />
      </ToolButton>
      <ToolButton label="Redo" onClick={onRedo} disabled={!canRedo}>
        <Redo2 />
      </ToolButton>
      <GoToDialog
        currentAddress={selectedAddress}
        specialTargets={goToSpecialTargets}
        onGoToReference={onGoToReference}
        onGoToSpecialTarget={onGoToSpecialTarget}
      />
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarMenu
        label="View"
        icon={<Eye />}
        active={
          focusModeActive ||
          frozenColumnCount > 0 ||
          frozenRowCount > 0 ||
          splitPaneMode !== "none" ||
          sheetViewMode !== "normal" ||
          isRightToLeft ||
          showPageBreaks ||
          !showGridlines
        }
        contentClassName="w-80"
      >
        <DropdownMenuLabel>Zoom</DropdownMenuLabel>
        <div className="flex items-center gap-1 px-2 py-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onZoomOut}
            disabled={zoomPercent <= 75}
          >
            <ZoomOut />
            <span className="sr-only">Zoom out</span>
          </Button>
          <select
            value={zoomPercent}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            aria-label="Zoom"
            className="h-8 min-w-20 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {zoomOptions.map((zoom) => (
              <option key={zoom} value={zoom}>
                {zoom}%
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onZoomIn}
            disabled={zoomPercent >= 150}
          >
            <ZoomIn />
            <span className="sr-only">Zoom in</span>
          </Button>
          <Button
            type="button"
            variant={focusModeActive ? "secondary" : "outline"}
            size="sm"
            className="ml-auto gap-2"
            onClick={onToggleFocusMode}
          >
            {focusModeActive ? <Minimize2 /> : <Maximize2 />}
            {focusModeActive ? "Exit focus" : "Focus"}
          </Button>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Sheet view</DropdownMenuLabel>
        <DropdownMenuGroup>
          {(Object.keys(viewModeLabels) as SheetViewMode[]).map((mode) => (
            <DropdownMenuItem
              key={mode}
              onSelect={() => onSetSheetViewMode(mode)}
              className={cn(sheetViewMode === mode && "text-primary")}
            >
              <FileSpreadsheet />
              {viewModeLabels[mode]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={onToggleRightToLeft}>
            <PanelRight />
            {isRightToLeft ? "Left-to-right sheet" : "Right-to-left sheet"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onTogglePageBreaks}>
            <Grid2X2 />
            {showPageBreaks ? "Hide page breaks" : "Show page breaks"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleGridlines}>
            <Eye />
            {showGridlines ? "Hide gridlines" : "Show gridlines"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Panes</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onToggleFreezeFirstColumn}>
            <PanelLeft />
            {frozenColumnCount > 0 ? "Unfreeze columns" : "Freeze first column"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleFreezeFirstRow}>
            <Rows3 />
            {frozenRowCount > 0 ? "Unfreeze rows" : "Freeze first row"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onFreezePanesAtSelection}>
            <TableCellsSplit />
            Freeze panes at selection
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={frozenRowCount === 0 && frozenColumnCount === 0}
            onSelect={onUnfreezePanes}
          >
            <TableRowsSplit />
            Unfreeze panes
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              onSetSplitPaneMode(splitPaneMode === "vertical" ? "none" : "vertical")
            }
          >
            <TableColumnsSplit />
            {splitPaneMode === "vertical" ? "Clear vertical split" : "Split vertically"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              onSetSplitPaneMode(
                splitPaneMode === "horizontal" ? "none" : "horizontal",
              )
            }
          >
            <TableRowsSplit />
            {splitPaneMode === "horizontal"
              ? "Clear horizontal split"
              : "Split horizontally"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              onSetSplitPaneMode(splitPaneMode === "quad" ? "none" : "quad")
            }
          >
            <Grid2X2 />
            {splitPaneMode === "quad" ? "Clear four-pane split" : "Split four panes"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Workbook windows</DropdownMenuLabel>
          {workbookWindowViews.map((view) => (
            <div key={view.id} className="flex items-center gap-1 px-2 py-1">
              <button
                type="button"
                className={cn(
                  "min-w-0 flex-1 rounded-sm px-2 py-1 text-left text-sm hover:bg-accent",
                  view.isActive && "bg-accent text-accent-foreground",
                )}
                onClick={() => onActivateWorkbookWindow(view.id)}
              >
                <span className="block truncate">{view.sheetName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {view.isActive ? "Active window" : "Open window"}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={workbookWindowViews.length <= 1}
                onClick={() => onCloseWorkbookWindow(view.id)}
              >
                <Minimize2 />
                <span className="sr-only">Close {view.sheetName} window</span>
              </Button>
            </div>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Open sheet</DropdownMenuLabel>
          {workbookWindowSheetOptions.map((sheet) => {
            const isOpen = openWindowSheetIds.has(sheet.id);

            return (
              <DropdownMenuItem
                key={sheet.id}
                disabled={workbookWindowViews.length >= 4 && !isOpen}
                onSelect={() => onOpenWorkbookWindow(sheet.id)}
                className={cn(isOpen && "text-primary")}
              >
                {sheet.name}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Custom views</DropdownMenuLabel>
          <div className="flex gap-2 p-2">
            <Input
              value={customViewName}
              aria-label="Custom view name"
              placeholder="View name"
              onChange={(event) => setCustomViewName(event.target.value)}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onSaveCustomView(customViewName);
                setCustomViewName("");
              }}
            >
              Save
            </Button>
          </div>
          {customViews.length > 0 ? (
            customViews.map((view) => (
              <div
                key={view.id}
                className="flex items-center gap-1 px-2 py-1"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-sm px-2 py-1 text-left text-sm hover:bg-accent"
                  onClick={() => onApplyCustomView(view.id)}
                >
                  <span className="block truncate">{view.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {viewModeLabels[view.viewMode]} - {view.zoomPercent}%
                  </span>
                </button>
                <ConfirmDestructiveButton
                  title="Delete this custom view?"
                  description="This removes the saved view settings. Current worksheet layout is not changed."
                  label={`Delete custom view ${view.name}`}
                  onConfirm={() => onDeleteCustomView(view.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmDestructiveButton>
              </div>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No custom views saved.
            </p>
          )}
      </ToolbarMenu>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarMenu
        label="Format"
        icon={<Paintbrush />}
        active={
          bold ||
          italic ||
          underline ||
          strikethrough ||
          wrap ||
          verticalText ||
          shrinkToFit ||
          formatPainterActive ||
          Boolean(indent)
        }
        disabled={sheetActionsDisabled}
        contentClassName="w-[360px]"
      >
        <DropdownMenuLabel>Cell styles</DropdownMenuLabel>
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
          <CellStyleManagerDropdown
            disabled={sheetActionsDisabled}
            cellStylePresets={cellStylePresets}
            managedStyles={managedCellStyles}
            selectedStyle={selectedStyle}
            onApplyStyle={onApplyCellStylePreset}
            onDeleteManagedStyle={onDeleteManagedCellStyle}
            onSaveManagedStyle={onSaveManagedCellStyle}
            onUpdateManagedStyle={onUpdateManagedCellStyle}
          />
          <Button
            type="button"
            variant={formatPainterActive ? "secondary" : "outline"}
            size="sm"
            className="gap-2"
            onClick={onToggleFormatPainter}
          >
            <Paintbrush />
            Format painter
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onClearFormatting}>
            <RemoveFormatting />
            Clear
          </Button>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Font</DropdownMenuLabel>
        <div className="grid grid-cols-[1fr_auto] gap-2 px-2 py-1.5">
          <select
            value={fontFamily ?? "arial"}
            onChange={(event) =>
              onSetFontFamily(event.target.value as CellStyle["fontFamily"])
            }
            aria-label="Font family"
            className="h-8 min-w-0 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {cellFontFamilyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={fontSize ?? 14}
            onChange={(event) => onSetFontSize(Number(event.target.value))}
            aria-label="Font size"
            className="h-8 w-20 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[11, 12, 14, 16, 18, 24, 32].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <div className="col-span-2 flex flex-wrap gap-1">
            <Button type="button" variant={bold ? "secondary" : "outline"} size="icon-sm" onClick={onToggleBold}>
              <Bold />
              <span className="sr-only">Bold</span>
            </Button>
            <Button type="button" variant={italic ? "secondary" : "outline"} size="icon-sm" onClick={onToggleItalic}>
              <Italic />
              <span className="sr-only">Italic</span>
            </Button>
            <Button type="button" variant={underline ? "secondary" : "outline"} size="icon-sm" onClick={onToggleUnderline}>
              <Underline />
              <span className="sr-only">Underline</span>
            </Button>
            <Button type="button" variant={strikethrough ? "secondary" : "outline"} size="icon-sm" onClick={onToggleStrikethrough}>
              <Strikethrough />
              <span className="sr-only">Strikethrough</span>
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Alignment</DropdownMenuLabel>
        <div className="grid gap-2 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" variant={align === "left" ? "secondary" : "outline"} size="icon-sm" onClick={() => onSetAlign("left")}>
              <AlignLeft />
              <span className="sr-only">Align left</span>
            </Button>
            <Button type="button" variant={align === "center" ? "secondary" : "outline"} size="icon-sm" onClick={() => onSetAlign("center")}>
              <AlignCenter />
              <span className="sr-only">Align center</span>
            </Button>
            <Button type="button" variant={align === "right" ? "secondary" : "outline"} size="icon-sm" onClick={() => onSetAlign("right")}>
              <AlignRight />
              <span className="sr-only">Align right</span>
            </Button>
            <Button type="button" variant={wrap ? "secondary" : "outline"} size="icon-sm" onClick={onToggleWrap}>
              <WrapText />
              <span className="sr-only">Wrap text</span>
            </Button>
            <Button type="button" variant={verticalText ? "secondary" : "outline"} size="icon-sm" onClick={onToggleVerticalText}>
              <Type />
              <span className="sr-only">Vertical text</span>
            </Button>
            <Button type="button" variant={shrinkToFit ? "secondary" : "outline"} size="icon-sm" onClick={onToggleShrinkToFit}>
              <Minimize2 />
              <span className="sr-only">Shrink to fit</span>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={verticalAlign ?? "top"}
              onChange={(event) =>
                onSetVerticalAlign(event.target.value as CellStyle["verticalAlign"])
              }
              aria-label="Vertical align"
              className="h-8 min-w-0 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {verticalAlignOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={textRotation ?? 0}
              onChange={(event) => onSetTextRotation(Number(event.target.value))}
              aria-label="Text rotation"
              className="h-8 min-w-0 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {textRotationOptions.map((rotation) => (
                <option key={rotation} value={rotation}>
                  {rotation === 0 ? "0 deg" : `${rotation} deg`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onDecreaseIndent} disabled={!indent}>
              <IndentDecrease />
              Outdent
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onIncreaseIndent} disabled={(indent ?? 0) >= 6}>
              <IndentIncrease />
              Indent
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Number and rich text</DropdownMenuLabel>
        <div className="grid gap-2 px-2 py-1.5">
          <select
            value={numberFormat ?? "general"}
            onChange={(event) =>
              onSetNumberFormat(event.target.value as CellStyle["numberFormat"])
            }
            aria-label="Number format"
            className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="general">General</option>
            <option value="currency">Currency</option>
            <option value="accounting">Accounting</option>
            <option value="percent">Percent</option>
            <option value="date">Date</option>
            <option value="custom">Custom</option>
          </select>
          <div className="flex flex-wrap gap-1">
            <CustomNumberFormatDialog
              disabled={sheetActionsDisabled}
              format={customNumberFormat}
              sampleValue={customNumberFormatPreviewValue}
              onSave={onSetCustomNumberFormat}
            />
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onApplyRichTextRuns}>
              <FileText />
              Apply rich text
            </Button>
            <Button
              type="button"
              variant={hasRichTextRuns ? "secondary" : "outline"}
              size="sm"
              className="gap-2"
              disabled={!hasRichTextRuns}
              onClick={onClearRichTextRuns}
            >
              <Eraser />
              Clear rich text
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Color</DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-3 px-2 py-1.5">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Fill</p>
            <div className="flex flex-wrap gap-1">
              {fillSwatches.map((color) => (
                <Button
                  key={color}
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onSetFill(color)}
                  aria-label={`Fill ${color}`}
                >
                  <span className="size-4 rounded-sm border" style={{ backgroundColor: color }} />
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Text</p>
            <div className="flex flex-wrap gap-1">
              {textSwatches.map((color) => (
                <Button
                  key={color}
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onSetTextColor(color)}
                  aria-label={`Text ${color}`}
                >
                  <span
                    className="grid size-4 place-items-center rounded-sm border text-[10px] font-semibold"
                    style={{ color }}
                  >
                    A
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Borders and merge</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onSetAllBorders}>
            <Grid2X2 />
            All borders
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSetOutlineBorders}>
            <Square />
            Outline border
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onClearBorders}>
            <Eraser />
            Clear borders
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onMergeCells}>
            <TableCellsMerge />
            Merge selected cells
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onUnmergeCells}>
            <TableCellsSplit />
            Unmerge selected cells
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </ToolbarMenu>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarMenu
        label="Sheet"
        icon={<Table2 />}
        disabled={sheetActionsDisabled}
        contentClassName="w-72"
      >
        <DropdownMenuLabel>Rows</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onInsertRows}>
            <TableRowsSplit />
            Insert selected rows
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onHideRows}>
            <EyeOff />
            Hide selected rows
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canGroupRows} onSelect={onGroupRows}>
            <IndentIncrease />
            Group selected rows
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <div className="px-2 py-1">
          <ConfirmDestructiveButton
            title="Delete selected rows?"
            description="This shifts worksheet data upward and can change formulas, charts, tables, and rules that depend on these rows."
            label="Delete selected rows"
            onConfirm={onDeleteRows}
          >
            <Rows3 />
          </ConfirmDestructiveButton>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onInsertColumns}>
            <TableColumnsSplit />
            Insert selected columns
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onHideColumns}>
            <EyeOff />
            Hide selected columns
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canGroupColumns} onSelect={onGroupColumns}>
            <IndentIncrease />
            Group selected columns
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <div className="px-2 py-1">
          <ConfirmDestructiveButton
            title="Delete selected columns?"
            description="This shifts worksheet data left and can change formulas, charts, tables, and rules that depend on these columns."
            label="Delete selected columns"
            onConfirm={onDeleteColumns}
          >
            <Columns3 />
          </ConfirmDestructiveButton>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Outline</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onUngroupSelection}>
            <IndentDecrease />
            Ungroup selected rows or columns
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onUnhideRowsAndColumns}>
            <Eye />
            Unhide rows and columns
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </ToolbarMenu>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarMenu
        label="Insert"
        icon={<ListPlus />}
        disabled={sheetActionsDisabled}
        contentClassName="w-[340px]"
      >
        <DropdownMenuLabel>Objects</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onAddTable}>
            <Table2 />
            Create table
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => objectImageInputRef.current?.click()}>
            <ImagePlus />
            Insert image object
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddTextBoxObject}>
            <Type />
            Insert text box
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canAddSparkline} onSelect={onAddSparkline}>
            <Activity />
            Create line sparkline
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Shapes</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onAddShapeObject("rectangle")}>
            <Shapes />
            Rectangle
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAddShapeObject("roundedRectangle")}>
            <Shapes />
            Rounded rectangle
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAddShapeObject("ellipse")}>
            <Shapes />
            Ellipse
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAddShapeObject("diamond")}>
            <Shapes />
            Diamond
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAddShapeObject("connector")}>
            <Shapes />
            Connector
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Charts</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onAddBarChart}>
            <ChartColumn /> Bar chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddLineChart}>
            <ChartLine /> Line chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddAreaChart}>
            <ChartArea /> Area chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddPieChart}>
            <ChartPie /> Pie chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddScatterChart}>
            <ChartScatter /> Scatter chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddComboChart}>
            <ChartNoAxesCombined /> Combo chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddBubbleChart}>
            <CircleDot /> Bubble chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddRadarChart}>
            <Radar /> Radar chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddStockChart}>
            <CandlestickChart /> Stock chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddStackedBarChart}>
            <ChartColumnStacked /> Stacked bar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddStacked100BarChart}>
            <ChartBarStacked /> 100% stacked bar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddWaterfallChart}>
            <ChartColumnIncreasing /> Waterfall chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddFunnelChart}>
            <Funnel /> Funnel chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddHistogramChart}>
            <ChartNoAxesColumnIncreasing /> Histogram chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddBoxWhiskerChart}>
            <Boxes /> Box and whisker
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddTreemapChart}>
            <Grid2X2 /> Treemap chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddSunburstChart}>
            <ChartPie /> Sunburst chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddSurfaceChart}>
            <Grid2X2 /> Surface chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddMapChart}>
            <Map /> Map chart
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>References</DropdownMenuLabel>
        <div className="flex flex-wrap gap-1 px-2 py-1.5">
          <NamedRangeDialog disabled={sheetActionsDisabled} selectedRange={selectedRange} onCreate={onAddNamedRange} />
          <CellNoteDialog
            address={selectedAddress}
            disabled={!canComment}
            note={selectedNote}
            onAddReply={onAddCellNoteReply}
            onSaveThread={onSaveCellNote}
            onSetStatus={onSetCellNoteStatus}
          />
          <CellLinkDialog
            address={selectedAddress}
            disabled={sheetActionsDisabled}
            link={selectedLink}
            onSave={onSaveCellLink}
          />
        </div>
      </ToolbarMenu>
      <ToolbarMenu
        label="Data"
        icon={<ListFilter />}
        disabled={sheetActionsDisabled}
        contentClassName="w-80"
      >
        <DropdownMenuLabel>Sort and filter</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onSortAsc}>
            <ArrowUpAZ />
            Sort selected range ascending
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSortDesc}>
            <ArrowDownAZ />
            Sort selected range descending
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isSheetProtected || selectedRange.endRowIndex <= selectedRange.startRowIndex}
            onSelect={onRemoveDuplicates}
          >
            <Rows3 />
            Remove duplicate rows
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onApplyCriteriaRangeFilter}>
            <ListFilter />
            Apply criteria range filter
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <div className="flex flex-wrap gap-1 px-2 py-1.5">
          <CustomSortDialog disabled={sheetActionsDisabled} selectedRange={selectedRange} onSort={onCustomSort} />
          <SheetFilterDialog
            disabled={sheetActionsDisabled}
            columnLabels={filterColumnLabels}
            filterValueOptions={filterValueOptions}
            styleFilterOptions={styleFilterOptions}
            selectedRange={selectedRange}
            onCreate={onAddFilter}
          />
          <AdvancedFilterCopyDialog
            disabled={sheetActionsDisabled}
            selectedRange={selectedRange}
            onCopy={onCopyCriteriaRangeToLocation}
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Rules</DropdownMenuLabel>
        <div className="flex flex-wrap gap-1 px-2 py-1.5">
          <ConditionalFormatDialog disabled={sheetActionsDisabled} onCreate={onAddConditionalFormat} />
          <DataValidationDialog disabled={sheetActionsDisabled} onCreate={onAddDataValidation} />
        </div>
      </ToolbarMenu>
      <ToolbarMenu
        label="Edit"
        icon={<ClipboardPaste />}
        contentClassName="w-72"
      >
        <DropdownMenuLabel>Clipboard</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={sheetActionsDisabled} onSelect={onPasteTransposed}>
            <ClipboardPaste />
            Paste transposed
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopyVisibleRange}>
            <ClipboardCopy />
            Copy visible cells
          </DropdownMenuItem>
          <DropdownMenuItem disabled={sheetActionsDisabled} onSelect={onCopyVisibleRangeToNextColumns}>
            <ArrowRight />
            Extract visible cells right
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopyRangeImage}>
            <ImageIcon />
            Copy range image
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Paste special</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={sheetActionsDisabled || !canPasteSpecial} onSelect={() => onPasteSpecial("all")}>
            All
          </DropdownMenuItem>
          <DropdownMenuItem disabled={sheetActionsDisabled || !canPasteSpecial} onSelect={() => onPasteSpecial("values")}>
            Values only
          </DropdownMenuItem>
          <DropdownMenuItem disabled={sheetActionsDisabled || !canPasteSpecial} onSelect={() => onPasteSpecial("formulas")}>
            Formulas only
          </DropdownMenuItem>
          <DropdownMenuItem disabled={sheetActionsDisabled || !canPasteSpecial} onSelect={() => onPasteSpecial("formats")}>
            Formats only
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Fill</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={sheetActionsDisabled} onSelect={onFillDown}>
            <ArrowDown />
            Fill down
          </DropdownMenuItem>
          <DropdownMenuItem disabled={sheetActionsDisabled} onSelect={onFillRight}>
            <ArrowRight />
            Fill right
          </DropdownMenuItem>
          <DropdownMenuItem disabled={sheetActionsDisabled} onSelect={onFillSeries}>
            <ListPlus />
            Fill numeric series
          </DropdownMenuItem>
          <DropdownMenuItem disabled={sheetActionsDisabled || !canFlashFill} onSelect={onFlashFill}>
            <Sparkles />
            Flash Fill
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </ToolbarMenu>
      <div className="order-first">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  aria-label="Workbook file menu"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden xl:inline">File</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Import and export files</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Open and import</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => csvInputRef.current?.click()}
            >
              <FileUp /> Import CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => tsvInputRef.current?.click()}
            >
              <FileUp /> Import TSV
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => xlsxInputRef.current?.click()}
            >
              <FileSpreadsheet /> Import XLSX
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => xlsmInputRef.current?.click()}
            >
              <FileSpreadsheet /> Import XLSM
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => xlsInputRef.current?.click()}
            >
              <FileSpreadsheet /> Import XLS
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => odsInputRef.current?.click()}
            >
              <FileSpreadsheet /> Import ODS
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => jsonInputRef.current?.click()}
            >
              <FileJson /> Import JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => xltxInputRef.current?.click()}
            >
              <FileSpreadsheet /> Import XLTX template
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => xltmInputRef.current?.click()}
            >
              <FileSpreadsheet /> Import XLTM template
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => backupInputRef.current?.click()}
            >
              <FileUp /> Restore backup
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fileImportDisabled}
              onSelect={() => recoveryInputRef.current?.click()}
            >
              <FileUp /> Recover workbook
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Export</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onExportCsv}>
              <Download /> Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportTsv}>
              <Download /> Export TSV
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportHtml}>
              <FileCode2 /> Export HTML
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportPdf}>
              <FileText /> Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportXml}>
              <FileCode2 /> Export XML
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportXlsx}>
              <Download /> Export XLSX
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportXlsm}>
              <Download /> Export XLSM
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportXls}>
              <Download /> Export XLS
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportOds}>
              <Download /> Export ODS
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportJson}>
              <Download /> Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportXltx}>
              <Download /> Export XLTX template
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportXltm}>
              <Download /> Export XLTM template
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportBackup}>
              <Download /> Download backup
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Print and data sources</DropdownMenuLabel>
          <div className="flex flex-wrap gap-1 px-2 py-1.5">
            <PrintPreviewDialog
              html={printPreviewHtml}
              pages={printPreviewPages}
              sheetName={printPreviewSheetName}
              onPrint={onPrintSheet}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onPrintSheet}
            >
              <Printer />
              Print sheet
            </Button>
            {!embedded ? (
              <SpreadsheetImportConnectorsDialog
                onImportDatabaseResult={onImportConnectorDatabaseResult}
                onImportUrl={onImportConnectorUrl}
                onDeleteQuery={onDeleteConnectorQuery}
                onRefreshQuery={onRefreshConnectorQuery}
                queries={connectorQueries}
              />
            ) : null}
          </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportCsv(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={xlsxInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportXlsx(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={xlsInputRef}
        type="file"
        accept=".xls,application/vnd.ms-excel"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportXls(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={xlsmInputRef}
        type="file"
        accept=".xlsm,application/vnd.ms-excel.sheet.macroEnabled.12"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportXlsm(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={xltxInputRef}
        type="file"
        accept=".xltx,application/vnd.openxmlformats-officedocument.spreadsheetml.template"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportXltx(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={xltmInputRef}
        type="file"
        accept=".xltm,application/vnd.ms-excel.template.macroEnabled.12"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportXltm(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={tsvInputRef}
        type="file"
        accept=".tsv,text/tab-separated-values"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportTsv(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={odsInputRef}
        type="file"
        accept=".ods,application/vnd.oasis.opendocument.spreadsheet"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportOds(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportJson(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={backupInputRef}
        type="file"
        accept=".essence-backup.json,.json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImportBackup(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={recoveryInputRef}
        type="file"
        accept=".xlsx,.xlsm,.xltx,.xltm,.xls,.ods,.json,.essence-backup.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.template,application/vnd.ms-excel.template.macroEnabled.12,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onRecoverWorkbookImport(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={localWorkbookInputRef}
        type="file"
        accept=".essence-backup.json,.json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onOpenLocalWorkbook(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={objectImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onInsertImageObject(file);
          }
          event.currentTarget.value = "";
        }}
      />
        </div>
      </ScrollArea>
      <div className="flex h-12 shrink-0 items-center border-l bg-card px-3 font-mono text-xs text-muted-foreground">
        {isSaving ? "Saving" : isDirty ? "Unsaved" : "Saved"}
      </div>
    </div>
  );
}

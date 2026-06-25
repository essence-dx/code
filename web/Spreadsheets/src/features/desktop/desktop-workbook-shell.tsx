"use client";

import { useMemo, useRef, useState } from "react";
import { FilePlus2, FolderOpen, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormulaBar } from "@/features/spreadsheet/components/formula-bar";
import {
  SpreadsheetGridPanes,
  type SplitPaneMode,
} from "@/features/spreadsheet/components/spreadsheet-grid-panes";
import { SheetTabs } from "@/features/spreadsheet/components/sheet-tabs";
import { getConditionalCellStyles } from "@/features/spreadsheet/conditional-formatting";
import { resolvePivotConditionalFormatRules } from "@/features/spreadsheet/pivot/pivot-conditional-formatting";
import { getInvalidCellIssues } from "@/features/spreadsheet/data-validation";
import { getSheetDynamicArrayState } from "@/features/spreadsheet/dynamic-arrays";
import { getFormulaErrorIssues } from "@/features/spreadsheet/formula-errors";
import { getSelectionSummary } from "@/features/spreadsheet/selection-summary";
import { getVisibleRowIndexes } from "@/features/spreadsheet/sheet-filtering";
import { useSpreadsheetState } from "@/features/spreadsheet/use-spreadsheet-state";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import {
  openWorkbookFromLocalFile,
  saveWorkbookToLocalFile,
} from "@/features/workbooks/local-workbook-file";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DesktopWorkbookShell() {
  const initialDocument = useMemo(() => createDefaultWorkbookDocument(), []);
  const state = useSpreadsheetState(initialDocument);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [splitPaneMode] = useState<SplitPaneMode>("none");
  const [workbookName, setWorkbookName] = useState("Desktop workbook");
  const [zoomPercent] = useState(100);
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
      state.document.dataValidations.filter(
        (rule) => rule.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.dataValidations],
  );
  const activeFilters = useMemo(
    () =>
      state.document.filters.filter((rule) => rule.sheetId === state.activeSheet.id),
    [state.activeSheet.id, state.document.filters],
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
  const dynamicArrayState = useMemo(
    () =>
      getSheetDynamicArrayState({
        sheet: state.activeSheet,
        computedValues: state.computedValues,
      }),
    [state.activeSheet, state.computedValues],
  );
  const formulaErrorIssues = useMemo(
    () =>
      getFormulaErrorIssues({
        sheet: state.activeSheet,
        computedValues: dynamicArrayState.computedValues,
      }),
    [dynamicArrayState.computedValues, state.activeSheet],
  );
  const invalidIssues = useMemo(
    () =>
      getInvalidCellIssues({
        sheet: state.activeSheet,
        rules: activeDataValidations,
        computedValues: dynamicArrayState.computedValues,
      }),
    [activeDataValidations, dynamicArrayState.computedValues, state.activeSheet],
  );
  const visibleRowIndexes = useMemo(
    () =>
      getVisibleRowIndexes({
        sheet: state.activeSheet,
        filters: activeFilters,
        computedValues: dynamicArrayState.computedValues,
      }),
    [activeFilters, dynamicArrayState.computedValues, state.activeSheet],
  );
  const activeSparklines = useMemo(
    () =>
      state.document.sparklines.filter(
        (sparkline) => sparkline.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.sparklines],
  );
  const activeInsertedObjects = useMemo(
    () =>
      state.document.insertedObjects.filter(
        (object) => object.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.insertedObjects],
  );
  const activeCharts = useMemo(
    () =>
      state.document.charts.filter(
        (chart) => chart.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.charts],
  );
  const activeTables = useMemo(
    () =>
      state.document.tables.filter(
        (table) => table.sheetId === state.activeSheet.id,
      ),
    [state.activeSheet.id, state.document.tables],
  );
  const linkedKeys = useMemo(
    () =>
      new Set(
        state.document.cellLinks
          .filter((link) => link.sheetId === state.activeSheet.id)
          .map((link) => link.cellKey),
      ),
    [state.activeSheet.id, state.document.cellLinks],
  );
  const notedKeys = useMemo(
    () =>
      new Set(
        state.document.cellNotes
          .filter((note) => note.sheetId === state.activeSheet.id)
          .map((note) => note.cellKey),
      ),
    [state.activeSheet.id, state.document.cellNotes],
  );
  const highlightedKeys = useMemo(() => new Set<string>(), []);
  const selectionSummary = useMemo(
    () =>
      getSelectionSummary({
        sheet: state.activeSheet,
        selectedRange: state.selectedRange,
        computedValues: dynamicArrayState.computedValues,
      }),
    [dynamicArrayState.computedValues, state.activeSheet, state.selectedRange],
  );
  const formulaErrorKeys = useMemo(
    () => new Set(formulaErrorIssues.map((issue) => issue.key)),
    [formulaErrorIssues],
  );
  const invalidKeys = useMemo(
    () =>
      new Set(
        invalidIssues
          .filter((issue) => issue.circleInvalid)
          .map((issue) => issue.key),
      ),
    [invalidIssues],
  );

  async function saveLocalWorkbook() {
    const result = await saveWorkbookToLocalFile({
      document: state.document,
      workbookName,
    });

    if (result.kind === "download") {
      downloadBlob(result.blob, result.fileName);
    }

    state.markSaved();
    setNotice(`Saved ${result.fileName}.`);
  }

  async function openLocalWorkbook(file: File) {
    const backup = await openWorkbookFromLocalFile(file);

    state.replaceDocument(backup.document);
    state.markSaved();
    setWorkbookName(backup.workbookName || file.name.replace(/\.json$/i, ""));
    setNotice(`Opened ${backup.workbookName || file.name}.`);
  }

  return (
    <main className="flex h-dvh min-h-0 overflow-hidden flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            value={workbookName}
            onChange={(event) => setWorkbookName(event.target.value)}
            className="h-9 min-w-0 font-medium sm:w-72"
            aria-label="Workbook name"
          />
          {state.isDirty ? (
            <span className="rounded-sm border px-2 py-1 text-xs text-muted-foreground">
              Unsaved
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setWorkbookName("Desktop workbook");
              state.replaceDocument(createDefaultWorkbookDocument());
              state.markSaved();
              setNotice("New local workbook ready.");
            }}
          >
            <FilePlus2 />
            <span className="hidden sm:inline">New</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen />
            <span className="hidden sm:inline">Open</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              saveLocalWorkbook().catch(() => {
                setNotice("Could not save this workbook.");
              });
            }}
          >
            <Save />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.essence-backup.json"
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];

              event.currentTarget.value = "";

              if (!file) {
                return;
              }

              openLocalWorkbook(file).catch(() => {
                setNotice("Could not open this Essence Excel backup.");
              });
            }}
          />
        </div>
      </header>
      {notice ? (
        <Alert className="m-3 w-auto">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <FormulaBar
        address={state.selectedKey}
        namedRanges={state.document.namedRanges}
        sheets={state.document.sheets}
        value={state.selectedFormulaBarValue}
        onChange={state.updateSelectedCell}
      />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <SpreadsheetGridPanes
          splitPaneMode={splitPaneMode}
          sheet={state.activeSheet}
          selected={state.selected}
          selectedRange={state.selectedRange}
          computedValues={dynamicArrayState.computedValues}
          conditionalStyles={conditionalStyles}
          dataValidations={activeDataValidations}
          filters={activeFilters}
          charts={activeCharts}
          sparklines={activeSparklines}
          insertedObjects={activeInsertedObjects}
          selectedObjectId={state.selectedObjectId}
          tables={activeTables}
          invalidKeys={invalidKeys}
          formulaErrorKeys={formulaErrorKeys}
          spillAnchorKeys={dynamicArrayState.spillAnchorKeys}
          spillBlockedKeys={dynamicArrayState.spillBlockedKeys}
          spillKeys={dynamicArrayState.spillKeys}
          linkedKeys={linkedKeys}
          notedKeys={notedKeys}
          visibleRowIndexes={visibleRowIndexes}
          highlightedKeys={highlightedKeys}
          activeHighlightKey={null}
          editingKey={editingKey}
          zoomPercent={zoomPercent}
          frozenColumnCount={0}
          frozenRowCount={0}
          showPageBreaks={false}
          printSettings={state.activePrintSettings}
          isProtected={state.isActiveSheetProtected}
          isRightToLeft={false}
          isCellProtected={state.isCellProtected}
          onEditKeyChange={setEditingKey}
          onSelectCell={state.selectCell}
          onSelectObject={state.selectInsertedObject}
          onUpdateChartAnchor={state.updateChartAnchor}
          onSelectRange={state.selectRange.bind(null, state.activeSheet.id)}
          onSelectionCommit={state.selectRange.bind(null, state.activeSheet.id)}
          onFillRange={state.fillRange}
          onResizeColumn={state.setColumnWidth}
          onToggleRowGroup={state.toggleRowOutlineGroup}
          onToggleColumnGroup={state.toggleColumnOutlineGroup}
          onToggleRowPageBreak={state.toggleRowPageBreak}
          onToggleColumnPageBreak={state.toggleColumnPageBreak}
          onMoveRowPageBreak={state.moveRowPageBreak}
          onMoveColumnPageBreak={state.moveColumnPageBreak}
          onUpdateCell={state.updateSelectedCell}
          onUpdateObject={state.updateInsertedObject}
          onUpdateRange={state.updateSelectedRange}
          onApplyColumnValueFilter={state.applyColumnValueFilter}
          onClearColumnFilters={state.clearColumnFilters}
        />
      </div>
      <SheetTabs
        sheets={state.document.sheets}
        activeSheetId={state.document.activeSheetId}
        isWorkbookProtected={state.isWorkbookProtected}
        onSelect={state.setActiveSheet}
        onAdd={state.addSheet}
        onRename={state.renameSheet}
        onSetTabColor={state.setSheetTabColor}
        onDuplicate={state.duplicateSheet}
        onDelete={state.deleteSheet}
        selectionSummary={selectionSummary}
      />
    </main>
  );
}

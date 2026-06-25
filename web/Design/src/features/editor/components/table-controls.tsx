"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import { TableFormulaBrowser } from "@/features/editor/components/table-formula-browser";
import { TableSheetControls } from "@/features/editor/components/table-sheet-controls";
import { TableValidationPanel } from "@/features/editor/components/table-validation-panel";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import {
  getTableDataSourcePreset,
  tableDataSourcePresets,
  type TableDataSourcePresetId,
} from "@/features/editor/table-data-source-presets";
import {
  fetchTableUrlAsTableData,
  getTableDataSourceKind,
} from "@/features/editor/table-data-source";
import {
  clearTableCellStyle,
  getTableCellStyle,
  pruneTableCellStyles,
  setTableCellStyle,
} from "@/features/editor/table-cell-format";
import {
  clampTableColumns,
  clampTableRows,
  getTableCell,
  maxTableColumns,
  maxTableRows,
  minTableColumns,
  minTableRows,
  resizeTableCells,
  setTableCell,
} from "@/features/editor/table";
import {
  countTableFormulas,
  getTableCellDisplayValue,
  getTableFormulaDiagnostics,
} from "@/features/editor/table-formulas";
import {
  clearTableRange,
  fillTableRangeDown,
  fillTableRangeRight,
  normalizeTableCellRange,
} from "@/features/editor/table-range";
import {
  applyTableSheetUpdates,
  getActiveTableSheet,
} from "@/features/editor/table-sheets";
import { createTableSheetValidationReport } from "@/features/editor/table-validation";
import {
  createTableView,
  hasActiveTableFilter,
  hasActiveTableSort,
} from "@/features/editor/table-view";
import type {
  DesignElement,
  TableCellStyle,
  TableElement,
} from "@/features/editor/types";

type TableControlsProps = {
  element: TableElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

export function TableControls({
  element,
  palettes,
  onUpdateElement,
}: TableControlsProps) {
  const [formatRow, setFormatRow] = useState(0);
  const [formatColumn, setFormatColumn] = useState(0);
  const [rangeEndRow, setRangeEndRow] = useState(0);
  const [rangeEndColumn, setRangeEndColumn] = useState(0);
  const [isSyncingSource, setIsSyncingSource] = useState(false);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const [dataSourcePresetId, setDataSourcePresetId] =
    useState<TableDataSourcePresetId>(
      getTableDataSourcePreset(element.dataSourcePresetId ?? "generic").id,
    );
  const [bearerToken, setBearerToken] = useState("");
  const [customHeaderName, setCustomHeaderName] = useState(
    element.dataSourceHeaderName ?? "",
  );
  const [customHeaderValue, setCustomHeaderValue] = useState("");
  const activeSheet = getActiveTableSheet(element);
  const selectedRow = Math.min(formatRow, activeSheet.rows - 1);
  const selectedColumn = Math.min(formatColumn, activeSheet.columns - 1);
  const selectedCellStyle = getTableCellStyle(
    element,
    selectedRow,
    selectedColumn,
  );
  const formulaCount = countTableFormulas(element);
  const formulaDiagnostics = getTableFormulaDiagnostics(element);
  const tableView = createTableView(element);
  const validationReport = createTableSheetValidationReport(element);
  const sortEnabled = hasActiveTableSort(element);
  const filterEnabled = hasActiveTableFilter(element);
  const dataSourcePreset = getTableDataSourcePreset(dataSourcePresetId);
  const selectedRange = normalizeTableCellRange(
    {
      startRow: selectedRow,
      startColumn: selectedColumn,
      endRow: rangeEndRow,
      endColumn: rangeEndColumn,
    },
    { rows: activeSheet.rows, columns: activeSheet.columns },
  );

  function updateTable(updates: Partial<TableElement>) {
    onUpdateElement(
      applyTableSheetUpdates(element, updates) as Partial<DesignElement>,
    );
  }

  function updateWorkbook(updates: Partial<TableElement>) {
    onUpdateElement(updates as Partial<DesignElement>);
  }

  function updateSize(nextRows: number, nextColumns: number) {
    const rows = clampTableRows(nextRows);
    const columns = clampTableColumns(nextColumns);
    const sortColumnIndex =
      typeof activeSheet.sortColumnIndex === "number" &&
      activeSheet.sortColumnIndex < columns
        ? activeSheet.sortColumnIndex
        : undefined;

    updateTable({
      rows,
      columns,
      sortColumnIndex,
      cellStyles: pruneTableCellStyles(activeSheet.cellStyles, rows, columns),
      cells: resizeTableCells({
        cells: activeSheet.cells,
        currentRows: activeSheet.rows,
        currentColumns: activeSheet.columns,
        nextRows: rows,
        nextColumns: columns,
      }),
    });
  }

  function updateSelectedCellStyle(updates: TableCellStyle) {
    updateTable({
      cellStyles: setTableCellStyle(
        activeSheet.cellStyles,
        selectedRow,
        selectedColumn,
        updates,
      ),
    });
  }

  function fillRangeDown() {
    updateTable({
      cells: fillTableRangeDown({
        cells: activeSheet.cells,
        columns: activeSheet.columns,
        range: selectedRange,
      }),
    });
  }

  function fillRangeRight() {
    updateTable({
      cells: fillTableRangeRight({
        cells: activeSheet.cells,
        columns: activeSheet.columns,
        range: selectedRange,
      }),
    });
  }

  function clearRange() {
    updateTable({
      cells: clearTableRange({
        cells: activeSheet.cells,
        columns: activeSheet.columns,
        range: selectedRange,
      }),
    });
  }

  function insertFormula(formula: string) {
    updateTable({
      cells: setTableCell(
        activeSheet.cells,
        activeSheet.columns,
        selectedRow,
        selectedColumn,
        formula,
      ),
    });
  }

  function applyDataSourcePreset(presetId: TableDataSourcePresetId) {
    const preset = getTableDataSourcePreset(presetId);

    setDataSourcePresetId(preset.id);

    if (preset.customHeaderName && !customHeaderName) {
      setCustomHeaderName(preset.customHeaderName);
    }

    updateWorkbook({
      dataSourcePresetId: preset.id,
      dataSourceHeaderName:
        preset.customHeaderName || customHeaderName || undefined,
    });
  }

  async function syncDataSource() {
    const sourceUrl = element.dataSourceUrl?.trim() ?? "";

    setSourceMessage(null);
    setIsSyncingSource(true);

    try {
      const result = await fetchTableUrlAsTableData(sourceUrl, {
        bearerToken,
        customHeaderName,
        customHeaderValue,
      });

      if (!result.ok) {
        setSourceMessage(result.message);
        updateWorkbook({
          dataSourceKind: getTableDataSourceKind(sourceUrl),
          dataSourcePresetId,
          dataSourceHeaderName: customHeaderName || undefined,
          dataSourceUrl: sourceUrl || undefined,
          dataSourceStatus: "error",
          dataSourceMessage: result.message,
        });
        return;
      }

      const message = result.truncated
        ? `Synced ${result.importedRows} rows and ${result.importedColumns} columns; trimmed to editor limits.`
        : `Synced ${result.importedRows} rows and ${result.importedColumns} columns.`;
      const sortColumnIndex =
        typeof activeSheet.sortColumnIndex === "number" &&
        activeSheet.sortColumnIndex < result.columns
          ? activeSheet.sortColumnIndex
          : undefined;

      updateTable({
        rows: result.rows,
        columns: result.columns,
        cells: result.cells,
        cellStyles: pruneTableCellStyles(
          activeSheet.cellStyles,
          result.rows,
          result.columns,
        ),
        dataSourceKind: result.sourceKind,
        dataSourcePresetId,
        dataSourceHeaderName: customHeaderName || undefined,
        dataSourceUrl: sourceUrl,
        dataSourceLastSyncedAt: new Date().toISOString(),
        dataSourceStatus: "synced",
        dataSourceMessage: message,
        sortColumnIndex,
      });
      setSourceMessage(message);
    } catch {
      const message =
        "Could not fetch this data source. Check that it is accessible from the browser and accepts this token if required.";

      setSourceMessage(message);
      updateWorkbook({
        dataSourceKind: getTableDataSourceKind(sourceUrl),
        dataSourcePresetId,
        dataSourceHeaderName: customHeaderName || undefined,
        dataSourceUrl: sourceUrl || undefined,
        dataSourceStatus: "error",
        dataSourceMessage: message,
      });
    } finally {
      setIsSyncingSource(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberControl
          label="Rows"
          value={activeSheet.rows}
          min={minTableRows}
          max={maxTableRows}
          onChange={(rows) => updateSize(rows, activeSheet.columns)}
        />
        <NumberControl
          label="Columns"
          value={activeSheet.columns}
          min={minTableColumns}
          max={maxTableColumns}
          onChange={(columns) => updateSize(activeSheet.rows, columns)}
        />
      </div>

      <TableSheetControls element={element} onUpdateWorkbook={updateWorkbook} />

      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Data source</Label>
          {element.dataSourceStatus ? (
            <span
              className={[
                "text-xs",
                element.dataSourceStatus === "error"
                  ? "text-destructive"
                  : "text-muted-foreground",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {formatDataSourceStatus(element)}
            </span>
          ) : null}
        </div>
        <ControlField label="Connector preset">
          <Select
            value={dataSourcePreset.id}
            onValueChange={(value) =>
              applyDataSourcePreset(value as TableDataSourcePresetId)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tableDataSourcePresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ControlField>
        <Input
          type="url"
          value={element.dataSourceUrl ?? ""}
          placeholder={dataSourcePreset.urlPlaceholder}
          onChange={(event) => {
            const dataSourceUrl = event.target.value;

            setSourceMessage(null);
            updateWorkbook({
              dataSourceKind: getTableDataSourceKind(dataSourceUrl),
              dataSourcePresetId,
              dataSourceHeaderName: customHeaderName || undefined,
              dataSourceUrl,
              dataSourceStatus: undefined,
              dataSourceMessage: undefined,
            });
          }}
        />
        <ControlField label="Bearer token">
          <Input
            type="password"
            value={bearerToken}
            placeholder={dataSourcePreset.tokenPlaceholder}
            autoComplete="off"
            onChange={(event) => setBearerToken(event.target.value)}
          />
        </ControlField>
        <ControlField label="Custom auth header">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={customHeaderName}
              placeholder="x-api-key"
              autoComplete="off"
              onChange={(event) => {
                const dataSourceHeaderName = event.target.value;

                setCustomHeaderName(dataSourceHeaderName);
                updateWorkbook({
                  dataSourceHeaderName:
                    dataSourceHeaderName.trim() || undefined,
                });
              }}
            />
            <Input
              type="password"
              value={customHeaderValue}
              placeholder={
                dataSourcePreset.customHeaderValuePlaceholder ??
                "Optional, not saved"
              }
              autoComplete="off"
              onChange={(event) => setCustomHeaderValue(event.target.value)}
            />
          </div>
        </ControlField>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isSyncingSource || !element.dataSourceUrl?.trim()}
            onClick={() => void syncDataSource()}
          >
            {isSyncingSource ? "Syncing..." : "Sync data"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              isSyncingSource ||
              (!element.dataSourceUrl &&
                !element.dataSourceStatus &&
                !element.dataSourceLastSyncedAt)
            }
            onClick={() => {
              setSourceMessage(null);
              setDataSourcePresetId("generic");
              setBearerToken("");
              setCustomHeaderName("");
              setCustomHeaderValue("");
              updateWorkbook({
                dataSourceKind: undefined,
                dataSourcePresetId: undefined,
                dataSourceHeaderName: undefined,
                dataSourceUrl: undefined,
                dataSourceLastSyncedAt: undefined,
                dataSourceStatus: undefined,
                dataSourceMessage: undefined,
              });
            }}
          >
            Clear
          </Button>
        </div>
        {sourceMessage || element.dataSourceMessage ? (
          <p
            className={[
              "text-xs",
              element.dataSourceStatus === "error"
                ? "text-destructive"
                : "text-muted-foreground",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {sourceMessage ?? element.dataSourceMessage}
          </p>
        ) : element.dataSourceLastSyncedAt ? (
          <p className="text-xs text-muted-foreground">
            Last synced{" "}
            {new Date(element.dataSourceLastSyncedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <ControlField label="Cells">
        <ScrollArea
          className="max-h-72 rounded-md border border-border bg-background"
          showHorizontalScrollBar
        >
          <div className="p-px">
            <div
              className="grid min-w-max gap-px bg-border"
              style={{
                gridTemplateColumns: `repeat(${activeSheet.columns}, minmax(96px, 1fr))`,
              }}
            >
              {Array.from(
                { length: activeSheet.rows * activeSheet.columns },
                (_, index) => {
                  const rowIndex = Math.floor(index / activeSheet.columns);
                  const columnIndex = index % activeSheet.columns;
                  const display = getTableCellDisplayValue(
                    element,
                    rowIndex,
                    columnIndex,
                  );
                  const isRangeCell =
                    rowIndex >= selectedRange.startRow &&
                    rowIndex <= selectedRange.endRow &&
                    columnIndex >= selectedRange.startColumn &&
                    columnIndex <= selectedRange.endColumn;

                  return (
                    <Input
                      key={`${rowIndex}-${columnIndex}`}
                      className={[
                        "h-9 rounded-none border-0 bg-card text-xs",
                        rowIndex === selectedRow &&
                        columnIndex === selectedColumn
                          ? "ring-2 ring-ring"
                          : "",
                        isRangeCell &&
                        !(
                          rowIndex === selectedRow &&
                          columnIndex === selectedColumn
                        )
                          ? "bg-primary/10"
                          : "",
                        display.isFormula ? "font-mono" : "",
                        display.error ? "text-destructive" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={
                        display.isFormula
                          ? `${display.rawValue} -> ${
                              display.error ?? display.displayValue
                            }`
                          : undefined
                      }
                      value={getTableCell(
                        activeSheet.cells,
                        activeSheet.columns,
                        rowIndex,
                        columnIndex,
                      )}
                      onChange={(event) =>
                        updateTable({
                          cells: setTableCell(
                            activeSheet.cells,
                            activeSheet.columns,
                            rowIndex,
                            columnIndex,
                            event.target.value,
                          ),
                        })
                      }
                      aria-label={`Table cell ${rowIndex + 1}, ${
                        columnIndex + 1
                      }`}
                    />
                  );
                },
              )}
            </div>
          </div>
        </ScrollArea>
      </ControlField>

      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Cell format</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              updateTable({
                cellStyles: clearTableCellStyle(
                  activeSheet.cellStyles,
                  selectedRow,
                  selectedColumn,
                ),
              })
            }
          >
            Reset
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberControl
            label="Start row"
            value={selectedRow + 1}
            min={1}
            max={activeSheet.rows}
            onChange={(row) => setFormatRow(clampTableRows(row) - 1)}
          />
          <NumberControl
            label="Start column"
            value={selectedColumn + 1}
            min={1}
            max={activeSheet.columns}
            onChange={(column) =>
              setFormatColumn(clampTableColumns(column) - 1)
            }
          />
          <NumberControl
            label="End row"
            value={selectedRange.endRow + 1}
            min={1}
            max={activeSheet.rows}
            onChange={(row) => setRangeEndRow(clampTableRows(row) - 1)}
          />
          <NumberControl
            label="End column"
            value={selectedRange.endColumn + 1}
            min={1}
            max={activeSheet.columns}
            onChange={(column) =>
              setRangeEndColumn(clampTableColumns(column) - 1)
            }
          />
        </div>
        <div className="rounded-md border border-border bg-background p-2 text-xs text-muted-foreground">
          Selected range {selectedRange.label} - {selectedRange.cellCount} cells
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedRange.rowCount < 2}
            onClick={fillRangeDown}
          >
            Fill down
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedRange.columnCount < 2}
            onClick={fillRangeRight}
          >
            Fill right
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearRange}
          >
            Clear
          </Button>
        </div>
        <ColorControl
          label="Cell fill"
          value={
            selectedCellStyle.fill ??
            (activeSheet.headerRow && selectedRow === 0
              ? element.headerFill
              : element.bodyFill)
          }
          palettes={palettes}
          onChange={(fill) => updateSelectedCellStyle({ fill })}
        />
        <ColorControl
          label="Cell text"
          value={selectedCellStyle.textColor ?? element.textColor}
          palettes={palettes}
          onChange={(textColor) => updateSelectedCellStyle({ textColor })}
        />
        <div className="flex items-center justify-between gap-3">
          <Label>Bold cell</Label>
          <Switch
            size="sm"
            checked={
              (selectedCellStyle.fontWeight ?? element.fontWeight) >= 700
            }
            onCheckedChange={(checked) =>
              updateSelectedCellStyle({
                fontWeight: checked ? 800 : element.fontWeight,
              })
            }
            aria-label="Toggle selected table cell bold"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["left", "center", "right"] as const).map((textAlign) => (
            <Button
              key={textAlign}
              type="button"
              variant={
                (selectedCellStyle.textAlign ?? "left") === textAlign
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => updateSelectedCellStyle({ textAlign })}
            >
              {textAlign}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Data view</Label>
          <span className="text-xs text-muted-foreground">
            {filterEnabled
              ? `${tableView.filteredRowCount}/${tableView.sourceDataRowCount} rows`
              : `${tableView.sourceDataRowCount} rows`}
          </span>
        </div>
        <ControlField label="Filter rows">
          <Input
            value={activeSheet.filterQuery ?? ""}
            placeholder="Search visible rows"
            onChange={(event) =>
              updateTable({
                filterQuery: event.target.value,
              })
            }
          />
        </ControlField>
        <div className="flex items-center justify-between gap-3">
          <Label>Sort rows</Label>
          <Switch
            size="sm"
            checked={sortEnabled}
            onCheckedChange={(checked) =>
              updateTable({
                sortColumnIndex: checked ? 0 : undefined,
                sortDirection: checked
                  ? (activeSheet.sortDirection ?? "asc")
                  : undefined,
              })
            }
            aria-label="Toggle table row sorting"
          />
        </div>
        {sortEnabled ? (
          <div className="grid grid-cols-2 gap-3">
            <NumberControl
              label="Sort column"
              value={(activeSheet.sortColumnIndex ?? 0) + 1}
              min={1}
              max={activeSheet.columns}
              onChange={(sortColumn) =>
                updateTable({
                  sortColumnIndex: clampTableColumns(sortColumn) - 1,
                })
              }
            />
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
              <Label>Descending</Label>
              <Switch
                size="sm"
                checked={activeSheet.sortDirection === "desc"}
                onCheckedChange={(checked) =>
                  updateTable({
                    sortDirection: checked ? "desc" : "asc",
                  })
                }
                aria-label="Toggle descending table sort"
              />
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <Label>Freeze header</Label>
          <Switch
            size="sm"
            checked={
              Boolean(activeSheet.headerRow) &&
              (activeSheet.freezeHeaderRow ?? true)
            }
            disabled={!activeSheet.headerRow}
            onCheckedChange={(freezeHeaderRow) =>
              updateTable({
                freezeHeaderRow,
              })
            }
            aria-label="Toggle frozen table header"
          />
        </div>
      </div>

      <TableValidationPanel report={validationReport} />

      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Formula check</Label>
          <span className="text-xs text-muted-foreground">
            {formulaCount === 1
              ? "1 formula"
              : formulaCount > 1
                ? `${formulaCount} formulas`
                : "No formulas"}
          </span>
        </div>
        {formulaDiagnostics.length > 0 ? (
          <div className="space-y-1">
            {formulaDiagnostics.slice(0, 4).map((diagnostic) => (
              <p
                key={`${diagnostic.cellLabel}-${diagnostic.formula}`}
                className="text-xs text-destructive"
              >
                {diagnostic.cellLabel}: {diagnostic.error}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {formulaCount > 0
              ? "All formulas valid."
              : "Formula library ready."}
          </p>
        )}
      </div>

      <TableFormulaBrowser onInsertFormula={insertFormula} />

      <div className="flex items-center justify-between gap-3">
        <Label>Header row</Label>
        <Switch
          size="sm"
          checked={Boolean(activeSheet.headerRow)}
          onCheckedChange={(headerRow) => updateTable({ headerRow })}
          aria-label="Toggle table header row"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberControl
          label="Font size"
          value={element.fontSize}
          min={8}
          max={96}
          onChange={(fontSize) =>
            onUpdateElement({ fontSize } as Partial<DesignElement>)
          }
        />
        <NumberControl
          label="Weight"
          value={element.fontWeight}
          min={100}
          max={900}
          step={100}
          onChange={(fontWeight) =>
            onUpdateElement({ fontWeight } as Partial<DesignElement>)
          }
        />
        <NumberControl
          label="Border"
          value={element.borderWidth}
          min={0}
          max={12}
          onChange={(borderWidth) =>
            onUpdateElement({ borderWidth } as Partial<DesignElement>)
          }
        />
        <NumberControl
          label="Padding"
          value={element.cellPadding}
          min={0}
          max={48}
          onChange={(cellPadding) =>
            onUpdateElement({ cellPadding } as Partial<DesignElement>)
          }
        />
      </div>

      <ColorControl
        label="Text color"
        value={element.textColor}
        palettes={palettes}
        onChange={(textColor) =>
          onUpdateElement({ textColor } as Partial<DesignElement>)
        }
      />
      <ColorControl
        label="Header fill"
        value={element.headerFill}
        palettes={palettes}
        onChange={(headerFill) =>
          onUpdateElement({ headerFill } as Partial<DesignElement>)
        }
      />
      <ColorControl
        label="Body fill"
        value={element.bodyFill}
        palettes={palettes}
        onChange={(bodyFill) =>
          onUpdateElement({ bodyFill } as Partial<DesignElement>)
        }
      />
      <ColorControl
        label="Border color"
        value={element.borderColor}
        palettes={palettes}
        onChange={(borderColor) =>
          onUpdateElement({ borderColor } as Partial<DesignElement>)
        }
      />
    </div>
  );
}

function ColorControl({
  label,
  value,
  palettes,
  onChange,
}: {
  label: string;
  value: string;
  palettes: readonly EditorColorPalette[];
  onChange: (color: string) => void;
}) {
  return (
    <ControlField label={label}>
      <Input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <ColorPalettePicker
        selectedColor={value}
        palettes={palettes}
        onSelectColor={onChange}
      />
    </ControlField>
  );
}

function formatDataSourceStatus(element: TableElement) {
  const label =
    element.dataSourceKind === "google-sheets"
      ? "Google Sheets"
      : element.dataSourceKind === "json-url"
        ? "JSON"
        : element.dataSourceKind === "csv-url"
          ? "CSV"
          : "source";

  return `${label} ${element.dataSourceStatus}`;
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <ControlField label={label}>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : min}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </ControlField>
  );
}

function ControlField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

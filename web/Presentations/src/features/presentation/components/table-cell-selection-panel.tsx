"use client"

import { useState } from "react"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  applyTableCellStyleToRange,
  applyTableCellBorderToRange,
  clearTableCellStyleRange,
  mergeTableCellRange,
  normalizeTableCellRange,
  splitTableCellRange,
  tableCellBorderPlacementLabels,
  tableCellBorderPlacements,
  tableCellFormat,
  tableCellRangeLabel,
  tableCellRangeMergeCount,
  tableCellRangeStyleCount,
  tableCellsToTsvForRange,
  tableColumns,
  tableRows,
  updateTableCellsInRange,
  type TableCellRange,
  type TableCellBorderPlacement,
  type TableCellStylePatch,
} from "../table-formatting"
import type { PresentationElement } from "../types"

function Field({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

function colorInputValue(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function fontWeightValue(value: number): PresentationElement["fontWeight"] {
  return value === 400 || value === 500 || value === 600 || value === 700
    ? value
    : 500
}

type TableCellSelectionPanelProps = {
  element: PresentationElement
  selection?: TableCellRange
  onChange: (patch: Partial<PresentationElement>) => void
  onSelectionChange: (selection: TableCellRange) => void
}

export function TableCellSelectionPanel({
  element,
  selection,
  onChange,
  onSelectionChange,
}: TableCellSelectionPanelProps) {
  const [borderPlacement, setBorderPlacement] =
    useState<TableCellBorderPlacement>("all")
  const normalizedSelection = normalizeTableCellRange(element, selection)
  const rowCount = tableRows(element)
  const columnCount = tableColumns(element)
  const selectedFormat = tableCellFormat(
    element,
    normalizedSelection.row,
    normalizedSelection.column,
  )
  const selectedMergeCount = tableCellRangeMergeCount(element, normalizedSelection)
  const selectedStyleCount = tableCellRangeStyleCount(element, normalizedSelection)

  function updateSelection(patch: Partial<TableCellRange>) {
    onSelectionChange(
      normalizeTableCellRange(element, {
        ...normalizedSelection,
        ...patch,
      }),
    )
  }

  function applyStyle(style: TableCellStylePatch) {
    onChange(
      applyTableCellStyleToRange(element, normalizedSelection, {
        background: selectedFormat.background,
        borderColor: selectedFormat.borderColor,
        color: selectedFormat.color,
        fontWeight: selectedFormat.fontWeight,
        ...style,
      }),
    )
  }

  function applyBorder() {
    onChange(
      applyTableCellBorderToRange(
        element,
        normalizedSelection,
        borderPlacement,
        selectedFormat.borderColor,
      ),
    )
  }

  return (
    <div className="grid gap-3 rounded-md border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Cell selection
        </span>
        <Badge variant="outline">
          {tableCellRangeLabel(element, normalizedSelection)}
        </Badge>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Field label="Row">
          <Input
            type="number"
            min={1}
            max={rowCount}
            value={normalizedSelection.row + 1}
            onChange={(event) =>
              updateSelection({
                row: Number(event.currentTarget.value || 1) - 1,
              })
            }
          />
        </Field>
        <Field label="Column">
          <Input
            type="number"
            min={1}
            max={columnCount}
            value={normalizedSelection.column + 1}
            onChange={(event) =>
              updateSelection({
                column: Number(event.currentTarget.value || 1) - 1,
              })
            }
          />
        </Field>
        <Field label="Rows">
          <Input
            type="number"
            min={1}
            max={rowCount - normalizedSelection.row}
            value={normalizedSelection.rowSpan}
            onChange={(event) =>
              updateSelection({
                rowSpan: Number(event.currentTarget.value || 1),
              })
            }
          />
        </Field>
        <Field label="Columns">
          <Input
            type="number"
            min={1}
            max={columnCount - normalizedSelection.column}
            value={normalizedSelection.columnSpan}
            onChange={(event) =>
              updateSelection({
                columnSpan: Number(event.currentTarget.value || 1),
              })
            }
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            normalizedSelection.rowSpan * normalizedSelection.columnSpan <= 1
          }
          onClick={() => onChange(mergeTableCellRange(element, normalizedSelection))}
        >
          Merge selected
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selectedMergeCount}
          onClick={() => onChange(splitTableCellRange(element, normalizedSelection))}
        >
          Split selected
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selectedStyleCount}
          onClick={() => onChange(clearTableCellStyleRange(element, normalizedSelection))}
        >
          Clear style
        </Button>
      </div>
      <Field label="Selected cells">
        <Textarea
          value={tableCellsToTsvForRange(element, normalizedSelection)}
          className="min-h-20 font-mono text-xs"
          onChange={(event) =>
            onChange(
              updateTableCellsInRange(
                element,
                normalizedSelection,
                event.currentTarget.value,
              ),
            )
          }
        />
      </Field>
      <div className="grid grid-cols-4 gap-2">
        <Field label="Fill">
          <Input
            type="color"
            value={colorInputValue(selectedFormat.background, "#ffffff")}
            onChange={(event) => applyStyle({ background: event.currentTarget.value })}
          />
        </Field>
        <Field label="Border">
          <Input
            type="color"
            value={colorInputValue(selectedFormat.borderColor, "#cbd5e1")}
            onChange={(event) =>
              applyStyle({ borderColor: event.currentTarget.value })
            }
          />
        </Field>
        <Field label="Text">
          <Input
            type="color"
            value={colorInputValue(selectedFormat.color, "#111827")}
            onChange={(event) => applyStyle({ color: event.currentTarget.value })}
          />
        </Field>
        <Field label="Weight">
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={selectedFormat.fontWeight}
            onChange={(event) =>
              applyStyle({
                fontWeight: fontWeightValue(Number(event.currentTarget.value)),
              })
            }
          >
            <option value={400}>Regular</option>
            <option value={500}>Medium</option>
            <option value={600}>Semi</option>
            <option value={700}>Bold</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
        <Field label="Border sides">
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={borderPlacement}
            onChange={(event) =>
              setBorderPlacement(
                event.currentTarget.value as TableCellBorderPlacement,
              )
            }
          >
            {tableCellBorderPlacements.map((placement) => (
              <option key={placement} value={placement}>
                {tableCellBorderPlacementLabels[placement]}
              </option>
            ))}
          </select>
        </Field>
        <Button type="button" variant="outline" size="sm" onClick={applyBorder}>
          Apply border
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          {normalizedSelection.rowSpan * normalizedSelection.columnSpan} cells selected
        </span>
        <Label className="text-[11px] text-muted-foreground">
          {selectedMergeCount} merges, {selectedStyleCount} styles
        </Label>
      </div>
    </div>
  )
}

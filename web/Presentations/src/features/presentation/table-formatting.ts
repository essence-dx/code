import type {
  PresentationElement,
  TableCellMerge,
  TableCellStyle,
  TableStyle,
  TableVerticalAlign,
} from "./types"

export const TABLE_MIN_ROWS = 1
export const TABLE_MAX_ROWS = 12
export const TABLE_MIN_COLUMNS = 1
export const TABLE_MAX_COLUMNS = 8

export const tableStyleOptions = [
  "plain",
  "accent",
  "dark",
  "minimal",
  "grid",
  "executive",
] as const satisfies readonly TableStyle[]

export const tableStyleLabels: Record<TableStyle, string> = {
  plain: "Plain",
  accent: "Accent",
  dark: "Dark",
  minimal: "Minimal",
  grid: "Grid",
  executive: "Executive",
}

const tableStyleSet = new Set<string>(tableStyleOptions)

export const tableVerticalAlignOptions = [
  "top",
  "middle",
  "bottom",
] as const satisfies readonly TableVerticalAlign[]

export const tableVerticalAlignLabels: Record<TableVerticalAlign, string> = {
  top: "Top",
  middle: "Middle",
  bottom: "Bottom",
}

const tableVerticalAlignSet = new Set<string>(tableVerticalAlignOptions)

export const tableCellBorderPlacements = [
  "all",
  "outer",
  "inner",
  "top",
  "right",
  "bottom",
  "left",
  "none",
] as const

export type TableCellBorderPlacement =
  (typeof tableCellBorderPlacements)[number]

export const tableCellBorderPlacementLabels: Record<
  TableCellBorderPlacement,
  string
> = {
  all: "All",
  outer: "Outer",
  inner: "Inner",
  top: "Top",
  right: "Right",
  bottom: "Bottom",
  left: "Left",
  none: "None",
}

export type TableCellRange = Pick<
  TableCellMerge,
  "row" | "column" | "rowSpan" | "columnSpan"
>

export type TableCellStylePatch = Partial<
  Pick<
    TableCellStyle,
    | "background"
    | "borderBottomColor"
    | "borderColor"
    | "borderLeftColor"
    | "borderRightColor"
    | "borderTopColor"
    | "color"
    | "fontWeight"
  >
>

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function mergeCellKey(row: number, column: number) {
  return `${row}:${column}`
}

function readMergeNumber(
  value: Record<string, unknown>,
  key: keyof TableCellMerge,
  fallback: number,
) {
  const input = value[key]
  return typeof input === "number" && Number.isFinite(input) ? input : fallback
}

function readCellStyleNumber(
  value: Record<string, unknown>,
  key: keyof TableCellStyle,
  fallback: number,
) {
  const input = value[key]
  return typeof input === "number" && Number.isFinite(input) ? input : fallback
}

function readCellStyleWeight(
  value: Record<string, unknown>,
): TableCellStyle["fontWeight"] | undefined {
  const input = value.fontWeight
  return input === 400 || input === 500 || input === 600 || input === 700
    ? input
    : undefined
}

function readColor(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined
}

function mergeCovers(
  merge: Pick<TableCellMerge, "row" | "column" | "rowSpan" | "columnSpan">,
  row: number,
  column: number,
) {
  return (
    row >= merge.row &&
    row < merge.row + merge.rowSpan &&
    column >= merge.column &&
    column < merge.column + merge.columnSpan
  )
}

function mergeIntersects(
  first: Pick<TableCellMerge, "row" | "column" | "rowSpan" | "columnSpan">,
  second: Pick<TableCellMerge, "row" | "column" | "rowSpan" | "columnSpan">,
) {
  return !(
    first.row + first.rowSpan <= second.row ||
    second.row + second.rowSpan <= first.row ||
    first.column + first.columnSpan <= second.column ||
    second.column + second.columnSpan <= first.column
  )
}

export function clampTableRows(value: number) {
  return Math.round(clamp(value, TABLE_MIN_ROWS, TABLE_MAX_ROWS))
}

export function clampTableColumns(value: number) {
  return Math.round(clamp(value, TABLE_MIN_COLUMNS, TABLE_MAX_COLUMNS))
}

export function normalizeTableCells(
  cells: string[] | undefined,
  rows: number,
  columns: number,
) {
  const size = clampTableRows(rows) * clampTableColumns(columns)
  const nextCells = Array.from({ length: size }, (_, index) => cells?.[index] ?? "")

  return nextCells
}

export function normalizeTableCellMerges(
  value: unknown,
  rows: number,
  columns: number,
): TableCellMerge[] {
  const rowCount = clampTableRows(rows)
  const columnCount = clampTableColumns(columns)
  const input = Array.isArray(value) ? value : []
  const occupied = new Set<string>()
  const candidates = input
    .map((item, index): TableCellMerge | null => {
      if (!isRecord(item)) return null
      const row = Math.round(clamp(readMergeNumber(item, "row", 0), 0, rowCount - 1))
      const column = Math.round(
        clamp(readMergeNumber(item, "column", 0), 0, columnCount - 1),
      )
      const rowSpan = Math.round(
        clamp(readMergeNumber(item, "rowSpan", 1), 1, rowCount - row),
      )
      const columnSpan = Math.round(
        clamp(readMergeNumber(item, "columnSpan", 1), 1, columnCount - column),
      )

      if (rowSpan === 1 && columnSpan === 1) return null

      return {
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `merge-${row}-${column}-${index}`,
        row,
        column,
        rowSpan,
        columnSpan,
      }
    })
    .filter((merge): merge is TableCellMerge => Boolean(merge))
    .sort((first, second) => first.row - second.row || first.column - second.column)
  const merges: TableCellMerge[] = []

  for (const merge of candidates) {
    const cells = Array.from({ length: merge.rowSpan * merge.columnSpan }, (_, index) => {
      const rowOffset = Math.floor(index / merge.columnSpan)
      const columnOffset = index % merge.columnSpan

      return mergeCellKey(merge.row + rowOffset, merge.column + columnOffset)
    })

    if (cells.some((cell) => occupied.has(cell))) continue
    cells.forEach((cell) => occupied.add(cell))
    merges.push(merge)
  }

  return merges
}

export function normalizeTableCellStyles(
  value: unknown,
  rows: number,
  columns: number,
): TableCellStyle[] {
  const rowCount = clampTableRows(rows)
  const columnCount = clampTableColumns(columns)
  const input = Array.isArray(value) ? value : []

  return input
    .map((item, index): TableCellStyle | null => {
      if (!isRecord(item)) return null
      const row = Math.round(
        clamp(readCellStyleNumber(item, "row", 0), 0, rowCount - 1),
      )
      const column = Math.round(
        clamp(readCellStyleNumber(item, "column", 0), 0, columnCount - 1),
      )
      const rowSpan = Math.round(
        clamp(readCellStyleNumber(item, "rowSpan", 1), 1, rowCount - row),
      )
      const columnSpan = Math.round(
        clamp(readCellStyleNumber(item, "columnSpan", 1), 1, columnCount - column),
      )
      const background = readColor(item.background)
      const borderColor = readColor(item.borderColor)
      const borderBottomColor = readColor(item.borderBottomColor)
      const borderLeftColor = readColor(item.borderLeftColor)
      const borderRightColor = readColor(item.borderRightColor)
      const borderTopColor = readColor(item.borderTopColor)
      const color = readColor(item.color)
      const fontWeight = readCellStyleWeight(item)

      if (
        !background &&
        !borderColor &&
        !borderBottomColor &&
        !borderLeftColor &&
        !borderRightColor &&
        !borderTopColor &&
        !color &&
        !fontWeight
      ) {
        return null
      }

      return {
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `cell-style-${row}-${column}-${index}`,
        row,
        column,
        rowSpan,
        columnSpan,
        ...(background ? { background } : {}),
        ...(borderColor ? { borderColor } : {}),
        ...(borderBottomColor ? { borderBottomColor } : {}),
        ...(borderLeftColor ? { borderLeftColor } : {}),
        ...(borderRightColor ? { borderRightColor } : {}),
        ...(borderTopColor ? { borderTopColor } : {}),
        ...(color ? { color } : {}),
        ...(fontWeight ? { fontWeight } : {}),
      }
    })
    .filter((style): style is TableCellStyle => Boolean(style))
}

export function defaultTableCells(rows = 3, columns = 3) {
  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns

    return row === 0 ? `Header ${column + 1}` : ""
  })
}

export function normalizeTableStyle(value: unknown): TableStyle {
  if (typeof value === "string" && tableStyleSet.has(value)) {
    return value as TableStyle
  }

  return "plain"
}

export function normalizeTableVerticalAlign(
  value: unknown,
): TableVerticalAlign {
  if (typeof value === "string" && tableVerticalAlignSet.has(value)) {
    return value as TableVerticalAlign
  }

  return "middle"
}

export function elementTableStyle(element: PresentationElement): TableStyle {
  return normalizeTableStyle(element.tableStyle)
}

export function elementTableVerticalAlign(
  element: PresentationElement,
): TableVerticalAlign {
  return normalizeTableVerticalAlign(element.tableVerticalAlign)
}

export function tableCellFormat(
  element: PresentationElement,
  row: number,
  column: number,
): {
  background: string
  borderColor: string
  borderBottomColor: string
  borderLeftColor: string
  borderRightColor: string
  borderTopColor: string
  color: string
  fontWeight: PresentationElement["fontWeight"]
} {
  const style = elementTableStyle(element)
  const isHeader = element.tableHeaderRow && row === 0
  const isTotalRow = element.tableTotalRow && row === tableRows(element) - 1
  const isFirstColumn = element.tableFirstColumn && column === 0
  const isLastColumn =
    element.tableLastColumn && column === tableColumns(element) - 1
  const isBandedRow = element.tableBandedRows && !isHeader && row % 2 === 1
  const isBandedColumn = element.tableBandedColumns && !isHeader && column % 2 === 1
  const isEmphasizedColumn = isFirstColumn || isLastColumn
  const isEmphasized = isHeader || isTotalRow || isEmphasizedColumn
  const isBanded = isBandedRow || isBandedColumn
  let format: {
    background: string
    borderColor: string
    color: string
    fontWeight: PresentationElement["fontWeight"]
  }

  if (style === "accent") {
    format = {
      background: isHeader || isTotalRow
        ? "#1d4ed8"
        : isEmphasizedColumn
          ? "#bfdbfe"
          : isBanded
            ? "#dbeafe"
            : "#eff6ff",
      borderColor: "#93c5fd",
      color: isHeader || isTotalRow ? "#ffffff" : "#172554",
      fontWeight: isEmphasized ? 700 : element.fontWeight,
    }
  } else if (style === "dark") {
    format = {
      background: isHeader || isTotalRow
        ? "#020617"
        : isEmphasizedColumn
          ? "#334155"
          : isBanded
            ? "#1e293b"
            : "#0f172a",
      borderColor: "#334155",
      color: "#f8fafc",
      fontWeight: isEmphasized ? 700 : element.fontWeight,
    }
  } else if (style === "minimal") {
    format = {
      background: "transparent",
      borderColor: "#e2e8f0",
      color: element.color,
      fontWeight: isEmphasized ? 700 : element.fontWeight,
    }
  } else if (style === "grid") {
    format = {
      background: isHeader
        ? "#f1f5f9"
        : isTotalRow
          ? "#e2e8f0"
          : isBanded
            ? "#f8fafc"
            : "#ffffff",
      borderColor: "#64748b",
      color: "#0f172a",
      fontWeight: isEmphasized ? 700 : element.fontWeight,
    }
  } else if (style === "executive") {
    format = {
      background: isHeader || isTotalRow
        ? "#134e4a"
        : isEmphasizedColumn
          ? "#ccfbf1"
          : isBanded
            ? "#ecfeff"
            : "#ffffff",
      borderColor: "#14b8a6",
      color: isHeader || isTotalRow ? "#f0fdfa" : "#0f172a",
      fontWeight: isEmphasized ? 700 : element.fontWeight,
    }
  } else {
    format = {
      background: isHeader
        ? "#e2e8f0"
        : isTotalRow
          ? "#e5e7eb"
          : isBanded
            ? "#f8fafc"
            : element.background,
      borderColor: element.tableBorderColor || "#cbd5e1",
      color: element.color,
      fontWeight: isEmphasized ? 700 : element.fontWeight,
    }
  }

  const baseFormat = {
    ...format,
    borderBottomColor: format.borderColor,
    borderLeftColor: format.borderColor,
    borderRightColor: format.borderColor,
    borderTopColor: format.borderColor,
  }

  const styles = tableCellStyles(element)
  const override = [...styles]
    .reverse()
    .find((item) => mergeCovers(item, row, column))

  return {
    background: override?.background ?? baseFormat.background,
    borderColor: override?.borderColor ?? baseFormat.borderColor,
    borderBottomColor:
      override?.borderBottomColor ??
      override?.borderColor ??
      baseFormat.borderBottomColor,
    borderLeftColor:
      override?.borderLeftColor ?? override?.borderColor ?? baseFormat.borderLeftColor,
    borderRightColor:
      override?.borderRightColor ??
      override?.borderColor ??
      baseFormat.borderRightColor,
    borderTopColor:
      override?.borderTopColor ?? override?.borderColor ?? baseFormat.borderTopColor,
    color: override?.color ?? baseFormat.color,
    fontWeight: override?.fontWeight ?? baseFormat.fontWeight,
  }
}

export function tableRows(element: PresentationElement) {
  return clampTableRows(element.tableRows || 3)
}

export function tableColumns(element: PresentationElement) {
  return clampTableColumns(element.tableColumns || 3)
}

export function tableCells(element: PresentationElement) {
  return normalizeTableCells(
    element.tableCells,
    tableRows(element),
    tableColumns(element),
  )
}

export function tableCellIndex(columnCount: number, row: number, column: number) {
  return row * columnCount + column
}

export function tableCell(element: PresentationElement, row: number, column: number) {
  const columns = tableColumns(element)

  return tableCells(element)[tableCellIndex(columns, row, column)] ?? ""
}

export function tableCellMerges(element: PresentationElement) {
  return normalizeTableCellMerges(
    element.tableCellMerges,
    tableRows(element),
    tableColumns(element),
  )
}

export function tableCellStyles(element: PresentationElement) {
  return normalizeTableCellStyles(
    element.tableCellStyles,
    tableRows(element),
    tableColumns(element),
  )
}

export function tableCellMergeAt(
  element: PresentationElement,
  row: number,
  column: number,
) {
  return tableCellMerges(element).find((merge) => mergeCovers(merge, row, column))
}

export function tableCellIsMergeContinuation(
  element: PresentationElement,
  row: number,
  column: number,
) {
  const merge = tableCellMergeAt(element, row, column)

  return Boolean(merge && (merge.row !== row || merge.column !== column))
}

export function tableDisplayCells(element: PresentationElement) {
  const rows = tableRows(element)
  const columns = tableColumns(element)
  const merges = tableCellMerges(element)

  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const merge = merges.find((item) => mergeCovers(item, row, column))

    if (merge && (merge.row !== row || merge.column !== column)) return null

    return {
      column,
      columnSpan: merge?.columnSpan ?? 1,
      format: tableCellFormat(element, row, column),
      row,
      rowSpan: merge?.rowSpan ?? 1,
      text: tableCell(element, row, column),
    }
  }).filter(
    (
      cell,
    ): cell is {
      column: number
      columnSpan: number
      format: ReturnType<typeof tableCellFormat>
      row: number
      rowSpan: number
      text: string
    } => Boolean(cell),
  )
}

export function mergeTableCells(
  element: PresentationElement,
  input: Pick<TableCellMerge, "row" | "column" | "rowSpan" | "columnSpan">,
) {
  const rows = tableRows(element)
  const columns = tableColumns(element)
  const merge = normalizeTableCellMerges(
    [
      {
        ...input,
        id: `merge-${input.row}-${input.column}`,
      },
    ],
    rows,
    columns,
  )[0]

  if (!merge) {
    return { tableCellMerges: tableCellMerges(element) }
  }

  return {
    tableCellMerges: normalizeTableCellMerges(
      [
        ...tableCellMerges(element).filter((item) => !mergeIntersects(item, merge)),
        merge,
      ],
      rows,
      columns,
    ),
  }
}

export function normalizeTableCellRange(
  element: PresentationElement,
  range?: Partial<TableCellRange>,
): TableCellRange {
  const rows = tableRows(element)
  const columns = tableColumns(element)
  const row = Math.round(clamp(range?.row ?? 0, 0, rows - 1))
  const column = Math.round(clamp(range?.column ?? 0, 0, columns - 1))

  return {
    row,
    column,
    rowSpan: Math.round(clamp(range?.rowSpan ?? 1, 1, rows - row)),
    columnSpan: Math.round(clamp(range?.columnSpan ?? 1, 1, columns - column)),
  }
}

export function tableCellRangeLabel(
  element: PresentationElement,
  range?: Partial<TableCellRange>,
) {
  const selection = normalizeTableCellRange(element, range)

  return `R${selection.row + 1}C${selection.column + 1}:R${
    selection.row + selection.rowSpan
  }C${selection.column + selection.columnSpan}`
}

export function tableCellRangeMergeCount(
  element: PresentationElement,
  range?: Partial<TableCellRange>,
) {
  const selection = normalizeTableCellRange(element, range)

  return tableCellMerges(element).filter((merge) =>
    mergeIntersects(merge, selection),
  ).length
}

export function tableCellRangeStyleCount(
  element: PresentationElement,
  range?: Partial<TableCellRange>,
) {
  const selection = normalizeTableCellRange(element, range)

  return tableCellStyles(element).filter((style) =>
    mergeIntersects(style, selection),
  ).length
}

export function mergeTableCellRange(
  element: PresentationElement,
  range?: Partial<TableCellRange>,
) {
  return mergeTableCells(element, normalizeTableCellRange(element, range))
}

export function splitTableCellRange(
  element: PresentationElement,
  range?: Partial<TableCellRange>,
) {
  return splitTableCells(element, normalizeTableCellRange(element, range))
}

export function tableCellsToTsvForRange(
  element: PresentationElement,
  range?: Partial<TableCellRange>,
) {
  const selection = normalizeTableCellRange(element, range)

  return Array.from({ length: selection.rowSpan }, (_, rowOffset) =>
    Array.from({ length: selection.columnSpan }, (_, columnOffset) =>
      tableCell(element, selection.row + rowOffset, selection.column + columnOffset),
    ).join("\t"),
  ).join("\n")
}

export function updateTableCellsInRange(
  element: PresentationElement,
  range: Partial<TableCellRange> | undefined,
  value: string,
) {
  const selection = normalizeTableCellRange(element, range)
  const columns = tableColumns(element)
  const cells = [...tableCells(element)]
  const parsedRows = value.split(/\r?\n/)

  for (let rowOffset = 0; rowOffset < selection.rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < selection.columnSpan; columnOffset += 1) {
      const nextValue = parsedRows[rowOffset]?.split("\t")[columnOffset] ?? ""
      const index = tableCellIndex(
        columns,
        selection.row + rowOffset,
        selection.column + columnOffset,
      )

      cells[index] = nextValue
    }
  }

  return { tableCells: cells }
}

export function applyTableCellStyleToRange(
  element: PresentationElement,
  range: Partial<TableCellRange> | undefined,
  style: TableCellStylePatch,
) {
  const rows = tableRows(element)
  const columns = tableColumns(element)
  const selection = normalizeTableCellRange(element, range)
  const hasStyle =
    style.background ||
    style.borderColor ||
    style.borderBottomColor ||
    style.borderLeftColor ||
    style.borderRightColor ||
    style.borderTopColor ||
    style.color ||
    style.fontWeight
  const remainingStyles = tableCellStyles(element).filter(
    (item) => !mergeIntersects(item, selection),
  )

  if (!hasStyle) {
    return { tableCellStyles: remainingStyles }
  }

  return {
    tableCellStyles: normalizeTableCellStyles(
      [
        ...remainingStyles,
        {
          id: `cell-style-${selection.row}-${selection.column}`,
          ...selection,
          ...style,
        },
      ],
      rows,
      columns,
    ),
  }
}

function borderPatchForCell(
  range: TableCellRange,
  row: number,
  column: number,
  color: string,
  placement: TableCellBorderPlacement,
): TableCellStylePatch {
  const firstRow = row === range.row
  const lastRow = row === range.row + range.rowSpan - 1
  const firstColumn = column === range.column
  const lastColumn = column === range.column + range.columnSpan - 1
  const clearColor = "transparent"
  const borderColor = placement === "none" ? clearColor : color
  const patch: TableCellStylePatch = {}

  if (placement === "all" || placement === "none") {
    return {
      borderBottomColor: borderColor,
      borderColor,
      borderLeftColor: borderColor,
      borderRightColor: borderColor,
      borderTopColor: borderColor,
    }
  }

  if (placement === "outer") {
    if (firstRow) patch.borderTopColor = color
    if (lastRow) patch.borderBottomColor = color
    if (firstColumn) patch.borderLeftColor = color
    if (lastColumn) patch.borderRightColor = color
    return patch
  }

  if (placement === "inner") {
    if (!firstRow) patch.borderTopColor = color
    if (!lastRow) patch.borderBottomColor = color
    if (!firstColumn) patch.borderLeftColor = color
    if (!lastColumn) patch.borderRightColor = color
    return patch
  }

  if (placement === "top") patch.borderTopColor = color
  if (placement === "right") patch.borderRightColor = color
  if (placement === "bottom") patch.borderBottomColor = color
  if (placement === "left") patch.borderLeftColor = color

  return patch
}

export function applyTableCellBorderToRange(
  element: PresentationElement,
  range: Partial<TableCellRange> | undefined,
  placement: TableCellBorderPlacement,
  color: string,
) {
  const rows = tableRows(element)
  const columns = tableColumns(element)
  const selection = normalizeTableCellRange(element, range)
  const normalizedColor = color.trim() || tableCellFormat(
    element,
    selection.row,
    selection.column,
  ).borderColor
  const remainingStyles = tableCellStyles(element).filter(
    (item) => !mergeIntersects(item, selection),
  )
  const nextStyles: TableCellStyle[] = []

  for (let rowOffset = 0; rowOffset < selection.rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < selection.columnSpan; columnOffset += 1) {
      const row = selection.row + rowOffset
      const column = selection.column + columnOffset
      const format = tableCellFormat(element, row, column)
      const patch = borderPatchForCell(selection, row, column, normalizedColor, placement)
      const hasPatch = Object.values(patch).some(Boolean)

      if (!hasPatch) continue

      nextStyles.push({
        id: `cell-border-${row}-${column}-${placement}`,
        row,
        column,
        rowSpan: 1,
        columnSpan: 1,
        background: format.background,
        borderColor: format.borderColor,
        borderBottomColor: format.borderBottomColor,
        borderLeftColor: format.borderLeftColor,
        borderRightColor: format.borderRightColor,
        borderTopColor: format.borderTopColor,
        color: format.color,
        fontWeight: format.fontWeight,
        ...patch,
      })
    }
  }

  return {
    tableCellStyles: normalizeTableCellStyles(
      [...remainingStyles, ...nextStyles],
      rows,
      columns,
    ),
  }
}

export function clearTableCellStyleRange(
  element: PresentationElement,
  range?: Partial<TableCellRange>,
) {
  const selection = normalizeTableCellRange(element, range)

  return {
    tableCellStyles: tableCellStyles(element).filter(
      (style) => !mergeIntersects(style, selection),
    ),
  }
}

export function splitTableCells(
  element: PresentationElement,
  range?: Pick<TableCellMerge, "row" | "column" | "rowSpan" | "columnSpan">,
) {
  if (!range) return { tableCellMerges: [] }

  return {
    tableCellMerges: tableCellMerges(element).filter(
      (merge) => !mergeIntersects(merge, range),
    ),
  }
}

export function resizeTableCells(
  element: PresentationElement,
  rows: number,
  columns: number,
) {
  const nextRows = clampTableRows(rows)
  const nextColumns = clampTableColumns(columns)
  const currentRows = tableRows(element)
  const currentColumns = tableColumns(element)
  const currentCells = tableCells(element)
  const nextCells = Array.from(
    { length: nextRows * nextColumns },
    (_, nextIndex) => {
      const row = Math.floor(nextIndex / nextColumns)
      const column = nextIndex % nextColumns

      if (row >= currentRows || column >= currentColumns) return ""
      return currentCells[tableCellIndex(currentColumns, row, column)] ?? ""
    },
  )

  return {
    tableRows: nextRows,
    tableColumns: nextColumns,
    tableCells: nextCells,
    tableCellMerges: normalizeTableCellMerges(
      element.tableCellMerges,
      nextRows,
      nextColumns,
    ),
    tableCellStyles: normalizeTableCellStyles(
      element.tableCellStyles,
      nextRows,
      nextColumns,
    ),
  }
}

export function tableCellsToTsv(element: PresentationElement) {
  const rows = tableRows(element)
  const columns = tableColumns(element)

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      tableCell(element, row, column),
    ).join("\t"),
  ).join("\n")
}

export function tableCellsFromTsv(
  value: string,
  rows: number,
  columns: number,
) {
  const parsedRows = value.split(/\r?\n/)

  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns

    return parsedRows[row]?.split("\t")[column] ?? ""
  })
}

export function tableText(element: PresentationElement) {
  return tableCells(element).filter(Boolean).join("\n")
}

import type {
  PresentationElement,
  TextAlign,
  TextFit,
  TextListStyle,
} from "./types"

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 540
const TEXT_PADDING_X = 16
const TEXT_PADDING_Y = 12
const COLUMN_GAP_EM = 1.4
const MIN_FITTED_FONT_SIZE = 8

export const textAlignLabels: Record<TextAlign, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
}

export const textListStyleLabels: Record<TextListStyle, string> = {
  none: "None",
  bullet: "Bullets",
  number: "Numbered",
}

export const textFitLabels: Record<TextFit, string> = {
  clip: "Clip overflow",
  shrink: "Shrink to fit",
}

function textRows(content: string) {
  if (!content) return [{ text: "", start: 0, end: 0 }]

  const rows: Array<{ text: string; start: number; end: number }> = []
  const rowPattern = /([^\r\n]*)(\r\n|\r|\n|$)/g
  let match: RegExpExecArray | null

  while ((match = rowPattern.exec(content))) {
    if (!match[0] && match.index === content.length) break

    const text = match[1] ?? ""
    rows.push({
      text,
      start: match.index,
      end: match.index + text.length,
    })

    if (!match[2]) break
  }

  return rows
}

export function elementTextAlign(element: PresentationElement): TextAlign {
  return element.textAlign ?? "left"
}

export function elementLineHeight(element: PresentationElement) {
  return element.lineHeight ?? (element.type === "title" ? 1.05 : 1.2)
}

export function elementListStyle(element: PresentationElement): TextListStyle {
  return element.listStyle ?? "none"
}

export function elementTextFit(element: PresentationElement): TextFit {
  return element.textFit ?? "clip"
}

export function elementTextColumns(element: PresentationElement) {
  return element.textColumns ?? 1
}

export function clampLineHeight(value: number) {
  return Math.max(0.8, Math.min(2.5, value))
}

export function clampTextColumns(value: number) {
  return Math.max(1, Math.min(3, Math.round(value)))
}

export function formattedTextRows(element: PresentationElement) {
  const listStyle = elementListStyle(element)
  let count = 0

  return textRows(element.content).map((row) => {
    const line = row.text

    if (listStyle === "none" || !line.trim()) {
      return { ...row, marker: "", text: line }
    }

    if (listStyle === "number") {
      count += 1
      return { ...row, marker: `${count}.`, text: line }
    }

    return { ...row, marker: "-", text: line }
  })
}

function longestTextRowLength(element: PresentationElement) {
  return formattedTextRows(element).reduce((max, row) => {
    const markerLength = row.marker ? row.marker.length + 1 : 0
    return Math.max(max, markerLength + row.text.length)
  }, 1)
}

export function elementEffectiveFontSize(element: PresentationElement) {
  if (elementTextFit(element) !== "shrink") {
    return element.fontSize
  }

  const fit = textFitEstimate(element)
  return fit.effectiveFontSize
}

function textFitEstimate(element: PresentationElement) {
  const columns = clampTextColumns(elementTextColumns(element))
  const rowCount = Math.max(1, formattedTextRows(element).length)
  const rowsPerColumn = Math.ceil(rowCount / columns)
  const lineHeight = elementLineHeight(element)
  const availableHeight = Math.max(
    MIN_FITTED_FONT_SIZE,
    (element.height / 100) * CANVAS_HEIGHT - TEXT_PADDING_Y,
  )
  const columnGap = COLUMN_GAP_EM * element.fontSize
  const availableWidth = Math.max(
    MIN_FITTED_FONT_SIZE,
    ((element.width / 100) * CANVAS_WIDTH -
      TEXT_PADDING_X -
      columnGap * (columns - 1)) /
      columns,
  )
  const longestRow = longestTextRowLength(element)
  const heightFit = availableHeight / (rowsPerColumn * lineHeight)
  const widthFit = availableWidth / (longestRow * 0.56)
  const effectiveFontSize = Math.max(
    MIN_FITTED_FONT_SIZE,
    Math.min(element.fontSize, Math.floor(Math.min(heightFit, widthFit))),
  )

  return {
    availableHeight,
    availableWidth,
    effectiveFontSize,
    longestRow,
    rowsPerColumn,
  }
}

export function textColumnStyle(element: PresentationElement) {
  const columns = clampTextColumns(elementTextColumns(element))

  return {
    columnCount: columns,
    columnGap: `${COLUMN_GAP_EM}em`,
  }
}

export function textOverflowStatus(element: PresentationElement) {
  const fit = textFitEstimate(element)
  const lineHeight = elementLineHeight(element)
  const requiredHeight = fit.rowsPerColumn * element.fontSize * lineHeight
  const requiredWidth = fit.longestRow * element.fontSize * 0.56
  const overflows =
    requiredHeight > fit.availableHeight || requiredWidth > fit.availableWidth
  const effectiveFontSize = elementEffectiveFontSize(element)

  return {
    clipped: overflows && elementTextFit(element) === "clip",
    effectiveFontSize,
    overflows,
    requiredHeight,
    requiredWidth,
    shrunk:
      elementTextFit(element) === "shrink" &&
      effectiveFontSize < element.fontSize,
  }
}

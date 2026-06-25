import type { CSSProperties } from "react"

import type {
  PresentationElement,
  RichTextRange,
  RichTextRangeStyle,
} from "./types"

export type TextSelectionRange = {
  start: number
  end: number
}

export type RichTextSegment = {
  text: string
  style: RichTextRangeStyle
}

type RichTextStyleKey = keyof RichTextRangeStyle

const richTextStyleKeys: RichTextStyleKey[] = [
  "fontWeight",
  "italic",
  "underline",
  "color",
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function rangeHasStyle(range: RichTextRange) {
  return richTextStyleKeys.some((key) => range[key] !== undefined)
}

function styleKeys(style: RichTextRangeStyle) {
  return richTextStyleKeys.filter((key) => style[key] !== undefined)
}

function copyRangeSegment(
  range: RichTextRange,
  start: number,
  end: number,
  idSuffix: string,
): RichTextRange | null {
  if (end <= start || !rangeHasStyle(range)) return null

  return {
    ...range,
    id: `${range.id}-${idSuffix}`,
    start,
    end,
  }
}

function removeStyleKeys(
  range: RichTextRange,
  keys: RichTextStyleKey[],
  start: number,
  end: number,
): RichTextRange | null {
  const next: RichTextRange = {
    id: `${range.id}-split`,
    start,
    end,
  }

  for (const key of richTextStyleKeys) {
    if (keys.includes(key)) continue
    const value = range[key]

    if (value !== undefined) {
      next[key] = value as never
    }
  }

  return rangeHasStyle(next) ? next : null
}

export function normalizeTextSelection(
  contentLength: number,
  start: number,
  end: number,
): TextSelectionRange | null {
  const from = clamp(Math.min(start, end), 0, contentLength)
  const to = clamp(Math.max(start, end), 0, contentLength)

  if (from === to) return null

  return { start: from, end: to }
}

export function normalizeRichTextRanges(
  element: PresentationElement,
): RichTextRange[] {
  const contentLength = element.content.length

  return (element.textRanges ?? [])
    .map((range) => {
      const selection = normalizeTextSelection(
        contentLength,
        range.start,
        range.end,
      )

      if (!selection) return null

      return {
        ...range,
        start: selection.start,
        end: selection.end,
      }
    })
    .filter((range): range is RichTextRange => Boolean(range))
    .filter(rangeHasStyle)
}

function removeRichTextStyleKeys(
  element: PresentationElement,
  selection: TextSelectionRange,
  keys: RichTextStyleKey[],
) {
  if (!keys.length) return normalizeRichTextRanges(element)

  return normalizeRichTextRanges(element).flatMap((range) => {
    if (range.end <= selection.start || range.start >= selection.end) {
      return [range]
    }

    const overlapStart = Math.max(range.start, selection.start)
    const overlapEnd = Math.min(range.end, selection.end)
    const nextRanges: RichTextRange[] = []
    const before = copyRangeSegment(
      range,
      range.start,
      overlapStart,
      "before",
    )
    const middle = removeStyleKeys(range, keys, overlapStart, overlapEnd)
    const after = copyRangeSegment(range, overlapEnd, range.end, "after")

    if (before) nextRanges.push(before)
    if (middle) nextRanges.push(middle)
    if (after) nextRanges.push(after)

    return nextRanges
  })
}

export function applyRichTextRange(
  element: PresentationElement,
  selection: TextSelectionRange,
  style: RichTextRangeStyle,
  id: string,
) {
  const normalizedSelection = normalizeTextSelection(
    element.content.length,
    selection.start,
    selection.end,
  )

  if (!normalizedSelection) {
    return normalizeRichTextRanges(element)
  }

  const keys = styleKeys(style)
  if (!keys.length) return normalizeRichTextRanges(element)

  const ranges = removeRichTextStyleKeys(element, normalizedSelection, keys)

  return [
    ...ranges,
    {
      id,
      ...normalizedSelection,
      ...style,
    },
  ]
}

export function toggleRichTextRange(
  element: PresentationElement,
  selection: TextSelectionRange,
  style: RichTextRangeStyle,
  id: string,
) {
  const normalizedSelection = normalizeTextSelection(
    element.content.length,
    selection.start,
    selection.end,
  )
  const keys = styleKeys(style)

  if (!normalizedSelection || !keys.length) {
    return normalizeRichTextRanges(element)
  }

  const segments = richTextSegments(
    element,
    normalizedSelection.start,
    normalizedSelection.end,
  )
  const active =
    segments.length > 0 &&
    segments.every((segment) =>
      keys.every((key) => segment.style[key] === style[key]),
    )

  if (active) {
    return removeRichTextStyleKeys(element, normalizedSelection, keys)
  }

  return applyRichTextRange(element, normalizedSelection, style, id)
}

export function clearRichTextRange(
  element: PresentationElement,
  selection: TextSelectionRange,
) {
  const normalizedSelection = normalizeTextSelection(
    element.content.length,
    selection.start,
    selection.end,
  )

  if (!normalizedSelection) return normalizeRichTextRanges(element)

  return removeRichTextStyleKeys(
    element,
    normalizedSelection,
    richTextStyleKeys,
  )
}

export function richTextSelectionState(
  element: PresentationElement,
  selection: TextSelectionRange | null,
) {
  const normalizedSelection = selection
    ? normalizeTextSelection(element.content.length, selection.start, selection.end)
    : null

  if (!normalizedSelection) {
    return {
      bold: false,
      italic: false,
      underline: false,
    }
  }

  const segments = richTextSegments(
    element,
    normalizedSelection.start,
    normalizedSelection.end,
  )
  const hasSegments = segments.length > 0

  return {
    bold:
      hasSegments &&
      segments.every((segment) => segment.style.fontWeight === 700),
    italic:
      hasSegments && segments.every((segment) => segment.style.italic === true),
    underline:
      hasSegments &&
      segments.every((segment) => segment.style.underline === true),
  }
}

export function richTextSegments(
  element: PresentationElement,
  start: number,
  end: number,
): RichTextSegment[] {
  const selection = normalizeTextSelection(element.content.length, start, end)

  if (!selection) {
    return element.content.slice(start, end)
      ? [{ text: element.content.slice(start, end), style: {} }]
      : []
  }

  const ranges = normalizeRichTextRanges(element)
  const boundaries = new Set([selection.start, selection.end])

  for (const range of ranges) {
    if (range.end <= selection.start || range.start >= selection.end) continue
    boundaries.add(clamp(range.start, selection.start, selection.end))
    boundaries.add(clamp(range.end, selection.start, selection.end))
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b)

  return sortedBoundaries.flatMap((from, index) => {
    const to = sortedBoundaries[index + 1]
    if (to === undefined || from === to) return []

    const style: RichTextRangeStyle = {}

    for (const range of ranges) {
      if (range.start > from || range.end < to) continue
      if (range.fontWeight) style.fontWeight = range.fontWeight
      if (range.italic !== undefined) style.italic = range.italic
      if (range.underline !== undefined) style.underline = range.underline
      if (range.color) style.color = range.color
    }

    return [
      {
        text: element.content.slice(from, to),
        style,
      },
    ]
  })
}

export function richTextSegmentStyle(style: RichTextRangeStyle): CSSProperties {
  return {
    color: style.color,
    fontStyle: style.italic ? "italic" : undefined,
    fontWeight: style.fontWeight,
    textDecorationLine: style.underline ? "underline" : undefined,
  }
}

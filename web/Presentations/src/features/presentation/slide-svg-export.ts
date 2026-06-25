import type {
  Deck,
  DeckAsset,
  DeckMaster,
  PresentationElement,
  ShapeArrowhead,
  Slide,
} from "./types"
import { chartData, chartMaxValue, chartText } from "./chart-formatting"
import { pieLabelPoint, pieSlicePath, pieSlices } from "./chart-pie"
import { mentionLabel } from "./comment-mentions"
import { deckAssetMap, resolveElementImageSrc } from "./deck-assets"
import { elementLinkUrl } from "./element-links"
import { visibleElements } from "./element-visibility"
import { svgFontFamily } from "./font-pairs"
import { iconDefinition, iconStrokeWidth } from "./icon-library"
import { imageFilterValue, imageOpacityValue } from "./image-corrections"
import { elementImageMask } from "./image-masks"
import { mediaCaptionCueSummary, mediaCaptionCues } from "./media-captions"
import { mediaTrimLabel } from "./media-trim"
import { richTextSegments } from "./rich-text"
import {
  isLinearShape,
  shapeFill,
  shapeEndArrowhead,
  shapeKind,
  shapeStartArrowhead,
  shapeStrokeColor,
  shapeStrokeDashArray,
  shapeStrokeWidth,
} from "./shape-formatting"
import {
  shapeConnectorGeometry,
  shapeConnectorPath,
  shapeLineEndpoints,
  shapePath,
  shapePolygonPoints,
} from "./shape-geometry"
import { masterFooterParts, masterHasVisibleContent } from "./slide-master"
import {
  defaultHandoutSettings,
  handoutLayoutLabels,
  type HandoutLayout,
  type HandoutSettings,
} from "./print-handout-settings"
import {
  sectionExportSummary,
  sectionSlideRangeLabel,
  type SectionExportSummaryItem,
} from "./section-export-summary"
import {
  clampTextColumns,
  elementEffectiveFontSize,
  elementLineHeight,
  elementTextAlign,
  elementTextColumns,
  formattedTextRows,
} from "./text-formatting"
import {
  elementTableVerticalAlign,
  tableColumns,
  tableDisplayCells,
  tableRows,
  tableText,
} from "./table-formatting"

export const SLIDE_WIDTH = 1600
export const SLIDE_HEIGHT = 900
const CANVAS_REFERENCE_WIDTH = 960
const FONT_SCALE = SLIDE_WIDTH / CANVAS_REFERENCE_WIDTH

function pxX(value: number) {
  return (value / 100) * SLIDE_WIDTH
}

function pxY(value: number) {
  return (value / 100) * SLIDE_HEIGHT
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;")
}

function escapeHtml(value: string) {
  return escapeXml(value)
}

function fileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function imageAlignment(value: number, axis: "x" | "y") {
  if (axis === "x") {
    if (value <= 33) return "xMin"
    if (value >= 67) return "xMax"
    return "xMid"
  }

  if (value <= 33) return "YMin"
  if (value >= 67) return "YMax"
  return "YMid"
}

function preserveAspectRatio(element: PresentationElement) {
  if (element.fit === "fill") return "none"

  return `${imageAlignment(element.imagePositionX, "x")}${imageAlignment(
    element.imagePositionY,
    "y",
  )} ${element.fit === "contain" ? "meet" : "slice"}`
}

function elementFrame(element: PresentationElement) {
  const x = pxX(element.x)
  const y = pxY(element.y)
  const width = pxX(element.width)
  const height = pxY(element.height)
  const centerX = x + width / 2
  const centerY = y + height / 2

  return { x, y, width, height, centerX, centerY }
}

type ElementFrame = ReturnType<typeof elementFrame>

type MasterRenderOptions = {
  master: DeckMaster
  slideNumber: number
  slideCount: number
}

function backgroundRect(element: PresentationElement) {
  if (!element.background || element.background === "transparent") return ""
  const frame = elementFrame(element)

  return `<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${element.radius}" fill="${escapeXml(element.background)}" />`
}

function imageMaskRadius(element: PresentationElement) {
  const mask = elementImageMask(element)
  if (mask === "rounded") return Math.max(element.radius, 24)
  if (mask === "circle" || mask === "diamond") return 0
  return element.radius
}

function imageMaskSvgShape(
  element: PresentationElement,
  frame: ElementFrame,
  attributes = "",
) {
  const mask = elementImageMask(element)

  if (mask === "circle") {
    return `<ellipse cx="${frame.centerX}" cy="${frame.centerY}" rx="${
      frame.width / 2
    }" ry="${frame.height / 2}" ${attributes} />`
  }

  if (mask === "diamond") {
    return `<polygon points="${frame.centerX},${frame.y} ${frame.x + frame.width},${frame.centerY} ${frame.centerX},${frame.y + frame.height} ${frame.x},${frame.centerY}" ${attributes} />`
  }

  return `<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${
    frame.height
  }" rx="${imageMaskRadius(element)}" ${attributes} />`
}

function imageBackgroundShape(element: PresentationElement, frame: ElementFrame) {
  if (!element.background || element.background === "transparent") return ""

  return imageMaskSvgShape(element, frame, `fill="${escapeXml(element.background)}"`)
}

function renderTextElement(element: PresentationElement) {
  const frame = elementFrame(element)
  const fontSize = elementEffectiveFontSize(element) * FONT_SCALE
  const lineHeight = fontSize * elementLineHeight(element)
  const paddingX = 8 * FONT_SCALE
  const paddingY = 6 * FONT_SCALE
  const columns = clampTextColumns(elementTextColumns(element))
  const align = elementTextAlign(element)
  const textAnchor =
    align === "center" ? "middle" : align === "right" ? "end" : "start"
  const columnGap = 22 * FONT_SCALE
  const columnWidth =
    (frame.width - paddingX * 2 - columnGap * (columns - 1)) / columns
  const rows = formattedTextRows(element)
  const rowsPerColumn = Math.ceil(rows.length / columns)

  function columnTextX(columnIndex: number) {
    const left = frame.x + paddingX + (columnWidth + columnGap) * columnIndex

    if (align === "center") return left + columnWidth / 2
    if (align === "right") return left + columnWidth
    return left
  }

  function segmentAttributes(segment: ReturnType<typeof richTextSegments>[number]) {
    const attributes = []

    if (segment.style.color) {
      attributes.push(`fill="${escapeXml(segment.style.color)}"`)
    }
    if (segment.style.fontWeight) {
      attributes.push(`font-weight="${segment.style.fontWeight}"`)
    }
    if (segment.style.italic) {
      attributes.push('font-style="italic"')
    }
    if (segment.style.underline) {
      attributes.push('text-decoration="underline"')
    }

    return attributes.join(" ")
  }

  function lineContent(row: (typeof rows)[number]) {
    const marker = row.marker ? `<tspan>${escapeXml(`${row.marker} `)}</tspan>` : ""
    const segments = richTextSegments(element, row.start, row.end)
      .map((segment) => {
        const attributes = segmentAttributes(segment)

        return `<tspan${attributes ? ` ${attributes}` : ""}>${escapeXml(
          segment.text,
        )}</tspan>`
      })
      .join("")

    return `${marker}${segments}`
  }

  return `${backgroundRect(element)}<text fill="${escapeXml(element.color)}" font-family="${escapeXml(svgFontFamily(element.fontFamily))}" font-size="${fontSize}" font-weight="${element.fontWeight}" text-anchor="${textAnchor}">${rows
    .map((row, index) => {
      const columnIndex = Math.min(
        columns - 1,
        Math.floor(index / rowsPerColumn),
      )
      const rowIndex = index % rowsPerColumn
      const line = row.marker ? `${row.marker} ${row.text}` : row.text
      const x = columnTextX(columnIndex)
      const y = frame.y + paddingY + fontSize + rowIndex * lineHeight
      return `<tspan x="${x}" y="${y}">${lineContent(row) || escapeXml(line)}</tspan>`
    })
    .join("")}</text>`
}

function renderImageElement(
  element: PresentationElement,
  index: number,
  assets: Map<string, DeckAsset>,
) {
  const frame = elementFrame(element)
  const imageSrc = resolveElementImageSrc(element, assets)

  if (!imageSrc) return backgroundRect(element)

  const clipId = `image-clip-${index}`
  const imageFilter = imageFilterValue(element)
  const filterAttribute = imageFilter
    ? ` style="filter: ${escapeXml(imageFilter)}"`
    : ""
  const opacityAttribute =
    imageOpacityValue(element) < 1 ? ` opacity="${imageOpacityValue(element)}"` : ""

  return `<defs><clipPath id="${clipId}">${imageMaskSvgShape(
    element,
    frame,
  )}</clipPath></defs>${imageBackgroundShape(
    element,
    frame,
  )}<image x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${
    frame.height
  }" href="${escapeXml(imageSrc)}" preserveAspectRatio="${preserveAspectRatio(
    element,
  )}" clip-path="url(#${clipId})"${filterAttribute}${opacityAttribute} />`
}

function renderTableElement(element: PresentationElement) {
  const frame = elementFrame(element)
  const rows = tableRows(element)
  const columns = tableColumns(element)
  const align = elementTextAlign(element)
  const verticalAlign = elementTableVerticalAlign(element)
  const cellWidth = frame.width / columns
  const cellHeight = frame.height / rows
  const fontSize = element.fontSize * FONT_SCALE * 0.9
  const fontFamily = escapeXml(svgFontFamily(element.fontFamily))
  const paddingX = 8 * FONT_SCALE
  const paddingY = 6 * FONT_SCALE
  const textAnchor =
    align === "center" ? "middle" : align === "right" ? "end" : "start"
  const textInsetX = (x: number, width: number) =>
    align === "center"
      ? x + width / 2
      : align === "right"
        ? x + width - paddingX
        : x + paddingX
  const textInsetY = (y: number, height: number) => {
    if (verticalAlign === "top") return y + paddingY + fontSize
    if (verticalAlign === "bottom") return y + height - paddingY
    return y + height / 2 + fontSize / 3
  }
  const borderLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
  ) =>
    color === "transparent"
      ? ""
      : `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${escapeXml(
          color,
        )}" stroke-width="1.4" />`

  return tableDisplayCells(element).map((cell) => {
    const x = frame.x + cell.column * cellWidth
    const y = frame.y + cell.row * cellHeight
    const width = cellWidth * cell.columnSpan
    const height = cellHeight * cell.rowSpan
    const borders = [
      borderLine(x, y, x + width, y, cell.format.borderTopColor),
      borderLine(x + width, y, x + width, y + height, cell.format.borderRightColor),
      borderLine(x, y + height, x + width, y + height, cell.format.borderBottomColor),
      borderLine(x, y, x, y + height, cell.format.borderLeftColor),
    ].join("")

    return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${escapeXml(
      cell.format.background || "#ffffff",
    )}" stroke="none" />${borders}<text x="${
      textInsetX(x, width)
    }" y="${textInsetY(y, height)}" fill="${escapeXml(cell.format.color)}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${cell.format.fontWeight}" text-anchor="${textAnchor}">${escapeXml(cell.text)}</text></g>`
  }).join("")
}

function renderShapeArrowMarker(
  id: string,
  arrowhead: ShapeArrowhead,
  stroke: string,
  strokeWidth: number,
) {
  if (arrowhead === "none") return ""

  const size = Math.max(6, strokeWidth * 3)
  const shape =
    arrowhead === "diamond"
      ? `<path d="M5,0 L10,5 L5,10 L0,5 Z" fill="${stroke}" />`
      : arrowhead === "oval"
        ? `<circle cx="5" cy="5" r="4.4" fill="${stroke}" />`
        : `<path d="M0,0 L10,5 L0,10 Z" fill="${stroke}" />`

  return `<marker id="${id}" markerWidth="${size}" markerHeight="${size}" refX="10" refY="5" orient="auto-start-reverse" viewBox="0 0 10 10">${shape}</marker>`
}

function renderShapeElement(element: PresentationElement, index: number) {
  const frame = elementFrame(element)
  const kind = shapeKind(element)
  const fill = escapeXml(shapeFill(element))
  const stroke = escapeXml(shapeStrokeColor(element))
  const strokeWidth = shapeStrokeWidth(element) * FONT_SCALE
  const dashArray = shapeStrokeDashArray(element)
  const dash = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : ""
  const shared = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}`

  if (kind === "ellipse") {
    return `<ellipse cx="${frame.centerX}" cy="${frame.centerY}" rx="${frame.width / 2}" ry="${frame.height / 2}" ${shared} />`
  }

  const polygonPoints = shapePolygonPoints(kind, {
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
  })

  if (polygonPoints) {
    return `<polygon points="${polygonPoints}" ${shared} />`
  }

  const customPath = shapePath(kind, {
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
  })

  if (customPath) {
    return `<path d="${customPath}" ${shared} />`
  }

  if (isLinearShape(element)) {
    const startArrowhead = shapeStartArrowhead(element)
    const endArrowhead = shapeEndArrowhead(element)
    const connectorGeometry = shapeConnectorGeometry(element)
    const connectorPath = shapeConnectorPath(kind, {
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    }, connectorGeometry)
    const lineEndpoints = shapeLineEndpoints(
      {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      },
      connectorGeometry,
    )
    const startMarkerId = `shape-start-arrow-${index}`
    const endMarkerId = `shape-end-arrow-${index}`
    const markers = `${renderShapeArrowMarker(
      startMarkerId,
      startArrowhead,
      stroke,
      strokeWidth,
    )}${renderShapeArrowMarker(endMarkerId, endArrowhead, stroke, strokeWidth)}`
    const markerDefs = markers ? `<defs>${markers}</defs>` : ""
    const markerStart =
      startArrowhead !== "none" ? ` marker-start="url(#${startMarkerId})"` : ""
    const markerEnd =
      endArrowhead !== "none" ? ` marker-end="url(#${endMarkerId})"` : ""

    if (connectorPath) {
      return `${markerDefs}<path d="${connectorPath}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dash}${markerStart}${markerEnd} />`
    }

    return `${markerDefs}<line x1="${lineEndpoints.x1}" x2="${lineEndpoints.x2}" y1="${lineEndpoints.y1}" y2="${lineEndpoints.y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"${dash}${markerStart}${markerEnd} />`
  }

  const rx = kind === "rounded" ? Math.max(18, element.radius) : element.radius

  return `<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${rx}" ${shared} />`
}

function renderIconElement(element: PresentationElement) {
  const frame = elementFrame(element)
  const definition = iconDefinition(element.iconName)
  const background =
    element.background && element.background !== "transparent"
      ? `<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${element.radius}" fill="${escapeXml(element.background)}" />`
      : ""
  const paths = definition.paths
    .map((path) => `<path d="${escapeXml(path)}" />`)
    .join("")

  return `${background}<g transform="translate(${frame.x} ${frame.y}) scale(${frame.width / 24} ${frame.height / 24})" fill="none" stroke="${escapeXml(element.color)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${iconStrokeWidth(element)}">${paths}</g>`
}

function chartPoint(
  frame: ElementFrame,
  index: number,
  count: number,
  value: number,
  maxValue: number,
) {
  const left = frame.x + frame.width * 0.1
  const right = frame.x + frame.width * 0.9
  const bottom = frame.y + frame.height * 0.8
  const top = frame.y + frame.height * 0.14
  const x = count <= 1 ? frame.centerX : left + (index / (count - 1)) * (right - left)
  const y = bottom - (value / maxValue) * (bottom - top)

  return { x, y }
}

function renderChartElement(element: PresentationElement) {
  const frame = elementFrame(element)
  const data = chartData(element)
  const maxValue = chartMaxValue(element)
  const axisColor = escapeXml(element.chartAxisColor || "#94a3b8")
  const fontSize = Math.max(9, element.fontSize * FONT_SCALE * 0.75)
  const labelSize = Math.max(8, fontSize * 0.74)
  const fontFamily = escapeXml(svgFontFamily(element.fontFamily))
  const left = frame.x + frame.width * 0.1
  const right = frame.x + frame.width * 0.9
  const bottom = frame.y + frame.height * 0.8
  const top = frame.y + frame.height * 0.14
  const background =
    element.background && element.background !== "transparent"
      ? `<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${element.radius}" fill="${escapeXml(element.background)}" />`
      : ""
  const axis = `<line x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}" stroke="${axisColor}" stroke-width="1.5" /><line x1="${left}" x2="${left}" y1="${top}" y2="${bottom}" stroke="${axisColor}" stroke-width="1.5" />`
  const legend = element.chartShowLegend
    ? data
        .slice(0, 4)
        .map((datum, index) => {
          const x = frame.x + frame.width * 0.6 + index * frame.width * 0.1
          const y = frame.y + frame.height * 0.06

          return `<g><rect x="${x}" y="${y}" width="${frame.width * 0.018}" height="${frame.height * 0.035}" fill="${escapeXml(datum.color)}" /><text x="${x + frame.width * 0.026}" y="${y + labelSize * 0.75}" fill="${escapeXml(element.color)}" font-family="${fontFamily}" font-size="${Math.max(7, labelSize * 0.78)}">${escapeXml(datum.label.slice(0, 6))}</text></g>`
        })
        .join("")
    : ""

  if (element.chartType === "pie" || element.chartType === "donut") {
    const cx = frame.x + frame.width * 0.42
    const cy = frame.y + frame.height * 0.56
    const radius = Math.min(frame.width, frame.height) * 0.3
    const slices = pieSlices(data)
      .map((slice) => {
        const shape =
          slice.percent >= 0.999
            ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${escapeXml(
                slice.datum.color,
              )}" stroke="#ffffff" stroke-width="2" />`
            : `<path d="${pieSlicePath(
                cx,
                cy,
                radius,
                slice.startAngle,
                slice.endAngle,
              )}" fill="${escapeXml(slice.datum.color)}" stroke="#ffffff" stroke-width="2" />`
        const valueText = element.chartShowValues
          ? (() => {
              const point = pieLabelPoint(
                cx,
                cy,
                radius * 0.62,
                slice.startAngle,
                slice.endAngle,
              )

              return `<text x="${point.x}" y="${point.y}" fill="#ffffff" font-family="${fontFamily}" font-size="${labelSize}" font-weight="700" text-anchor="middle">${Math.round(
                slice.percent * 100,
              )}%</text>`
            })()
          : ""

        return `<g>${shape}${valueText}</g>`
      })
      .join("")
    const donutHole =
      element.chartType === "donut"
        ? `<circle cx="${cx}" cy="${cy}" r="${radius * 0.46}" fill="${escapeXml(
            element.background || "#ffffff",
          )}" stroke="#ffffff" stroke-width="2" />`
        : ""

    return `${background}${legend}${slices}${donutHole}`
  }

  if (element.chartType === "line" || element.chartType === "area") {
    const points = data
      .map((datum, index) => {
        const point = chartPoint(frame, index, data.length, datum.value, maxValue)
        return `${point.x},${point.y}`
      })
      .join(" ")
    const areaFill =
      element.chartType === "area"
        ? `<polygon points="${left},${bottom} ${points} ${right},${bottom}" fill="${escapeXml(
            data[0]?.color ?? "#2563eb",
          )}" opacity="0.18" />`
        : ""
    const marks = data
      .map((datum, index) => {
        const point = chartPoint(frame, index, data.length, datum.value, maxValue)
        const valueText = element.chartShowValues
          ? `<text x="${point.x}" y="${Math.max(frame.y + fontSize, point.y - 8)}" fill="${escapeXml(element.color)}" font-family="${fontFamily}" font-size="${labelSize}" text-anchor="middle">${datum.value}</text>`
          : ""

        return `<g><circle cx="${point.x}" cy="${point.y}" r="5" fill="${escapeXml(datum.color)}" stroke="#ffffff" stroke-width="2" />${valueText}<text x="${point.x}" y="${frame.y + frame.height * 0.92}" fill="${escapeXml(element.color)}" font-family="${fontFamily}" font-size="${labelSize}" text-anchor="middle">${escapeXml(datum.label)}</text></g>`
      })
      .join("")

    return `${background}${axis}${legend}${areaFill}<polyline points="${points}" fill="none" stroke="${escapeXml(
      data[0]?.color ?? "#2563eb",
    )}" stroke-linecap="round" stroke-linejoin="round" stroke-width="5" />${marks}`
  }

  if (element.chartType === "horizontalBar") {
    const slotHeight = (bottom - top) / data.length
    const barHeight = Math.max(10, slotHeight * 0.56)

    return `${background}${axis}${legend}${data
      .map((datum, index) => {
        const width = Math.max(2, (datum.value / maxValue) * (right - left))
        const y = top + index * slotHeight + (slotHeight - barHeight) / 2
        const valueText = element.chartShowValues
          ? `<text x="${Math.min(right + 4, left + width + 8)}" y="${y + barHeight * 0.64}" fill="${escapeXml(element.color)}" font-family="${fontFamily}" font-size="${labelSize}">${datum.value}</text>`
          : ""

        return `<g><rect x="${left}" y="${y}" width="${width}" height="${barHeight}" rx="4" fill="${escapeXml(datum.color)}" />${valueText}<text x="${left - 8}" y="${y + barHeight * 0.64}" fill="${escapeXml(element.color)}" font-family="${fontFamily}" font-size="${labelSize}" text-anchor="end">${escapeXml(datum.label.slice(0, 10))}</text></g>`
      })
      .join("")}`
  }

  const slotWidth = (right - left) / data.length
  const barWidth = Math.max(14, slotWidth * 0.55)

  return `${background}${axis}${legend}${data
    .map((datum, index) => {
      const height = Math.max(2, (datum.value / maxValue) * (bottom - top))
      const x = left + index * slotWidth + (slotWidth - barWidth) / 2
      const y = bottom - height
      const valueText = element.chartShowValues
        ? `<text x="${x + barWidth / 2}" y="${Math.max(frame.y + fontSize, y - 8)}" fill="${escapeXml(element.color)}" font-family="${fontFamily}" font-size="${labelSize}" text-anchor="middle">${datum.value}</text>`
        : ""

      return `<g><rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="4" fill="${escapeXml(datum.color)}" />${valueText}<text x="${x + barWidth / 2}" y="${frame.y + frame.height * 0.92}" fill="${escapeXml(element.color)}" font-family="${fontFamily}" font-size="${labelSize}" text-anchor="middle">${escapeXml(datum.label)}</text></g>`
    })
    .join("")}`
}

function renderVideoElement(element: PresentationElement) {
  const frame = elementFrame(element)
  const label = element.alt || "Video"
  const trimLabel = mediaTrimLabel(element)
  const caption =
    element.mediaCaption.trim() ||
    (mediaCaptionCues(element).length ? mediaCaptionCueSummary(element) : "")
  const playbackLabel = element.mediaAutoplay ? "Autoplay" : ""
  const playSize = Math.min(frame.width, frame.height) * 0.18
  const centerX = frame.x + frame.width / 2
  const centerY = frame.y + frame.height / 2
  const points = [
    `${centerX - playSize * 0.45},${centerY - playSize * 0.62}`,
    `${centerX - playSize * 0.45},${centerY + playSize * 0.62}`,
    `${centerX + playSize * 0.65},${centerY}`,
  ].join(" ")

  return `<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${Math.max(0, element.radius)}" fill="${escapeXml(element.background || "#020617")}" /><circle cx="${centerX}" cy="${centerY}" r="${playSize}" fill="#ffffff" opacity="0.18" /><polygon points="${points}" fill="#ffffff" /><text x="${centerX}" y="${frame.y + frame.height - 48}" fill="#e2e8f0" font-family="Geist, Arial, sans-serif" font-size="18" text-anchor="middle">${escapeXml(label)}</text>${trimLabel || playbackLabel ? `<text x="${centerX}" y="${frame.y + frame.height - 30}" fill="#94a3b8" font-family="Geist, Arial, sans-serif" font-size="12" text-anchor="middle">${escapeXml([playbackLabel, trimLabel].filter(Boolean).join(" | "))}</text>` : ""}${caption ? `<text x="${centerX}" y="${frame.y + frame.height - 12}" fill="#e2e8f0" font-family="Geist, Arial, sans-serif" font-size="12" text-anchor="middle">${escapeXml(caption)}</text>` : ""}`
}

function renderAudioElement(element: PresentationElement) {
  const frame = elementFrame(element)
  const label = element.alt || "Audio"
  const trimLabel = mediaTrimLabel(element)
  const caption =
    element.mediaCaption.trim() ||
    (mediaCaptionCues(element).length ? mediaCaptionCueSummary(element) : "")
  const playbackLabel = element.mediaAutoplay ? "Autoplay" : ""
  const iconX = frame.x + 28
  const iconY = frame.y + frame.height / 2

  return `<rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${Math.max(0, element.radius)}" fill="${escapeXml(element.background || "#0f172a")}" /><circle cx="${iconX}" cy="${iconY}" r="16" fill="#ffffff" opacity="0.18" /><path d="M ${iconX - 7} ${iconY - 5} L ${iconX - 1} ${iconY - 5} L ${iconX + 8} ${iconY - 13} L ${iconX + 8} ${iconY + 13} L ${iconX - 1} ${iconY + 5} L ${iconX - 7} ${iconY + 5} Z" fill="#ffffff" /><text x="${frame.x + 58}" y="${iconY + (caption || trimLabel || playbackLabel ? -10 : 6)}" fill="#e2e8f0" font-family="Geist, Arial, sans-serif" font-size="18">${escapeXml(label)}</text>${trimLabel || playbackLabel ? `<text x="${frame.x + 58}" y="${iconY + 8}" fill="#94a3b8" font-family="Geist, Arial, sans-serif" font-size="12">${escapeXml([playbackLabel, trimLabel].filter(Boolean).join(" | "))}</text>` : ""}${caption ? `<text x="${frame.x + 58}" y="${iconY + 24}" fill="#cbd5e1" font-family="Geist, Arial, sans-serif" font-size="12">${escapeXml(caption)}</text>` : ""}`
}

function renderElement(
  element: PresentationElement,
  index: number,
  assets: Map<string, DeckAsset>,
) {
  const frame = elementFrame(element)
  let body = ""

  if (element.type === "shape") {
    body = renderShapeElement(element, index)
  } else if (element.type === "icon") {
    body = renderIconElement(element)
  } else if (element.type === "image") {
    body = renderImageElement(element, index, assets)
  } else if (element.type === "table") {
    body = renderTableElement(element)
  } else if (element.type === "chart") {
    body = renderChartElement(element)
  } else if (element.type === "video") {
    body = renderVideoElement(element)
  } else if (element.type === "audio") {
    body = renderAudioElement(element)
  } else {
    body = renderTextElement(element)
  }

  const linkUrl = elementLinkUrl(element)
  const linkedBody = linkUrl
    ? `<a href="${escapeXml(linkUrl)}" target="_blank" rel="noopener noreferrer">${body}</a>`
    : body

  if (!element.rotation) {
    return linkedBody
  }

  return `<g transform="rotate(${element.rotation} ${frame.centerX} ${frame.centerY})">${linkedBody}</g>`
}

function renderMasterOverlay(options: MasterRenderOptions | undefined) {
  if (!options || !masterHasVisibleContent(options.master)) return ""

  const parts = masterFooterParts(options)
  const fontSize = options.master.fontSize * FONT_SCALE
  const y = SLIDE_HEIGHT * 0.955
  const color = escapeXml(options.master.color)
  const shared = `fill="${color}" font-family="${escapeXml(svgFontFamily(options.master.fontFamily))}" font-size="${fontSize}"`

  return `<g><text x="${SLIDE_WIDTH * 0.06}" y="${y}" ${shared} text-anchor="start">${escapeXml(parts.left)}</text><text x="${SLIDE_WIDTH * 0.5}" y="${y}" ${shared} text-anchor="middle">${escapeXml(parts.center)}</text><text x="${SLIDE_WIDTH * 0.94}" y="${y}" ${shared} text-anchor="end">${escapeXml(parts.right)}</text></g>`
}

export function slideSvgFileName(slide: Slide, index: number) {
  return `${String(index + 1).padStart(2, "0")}-${fileSafeName(
    slide.title || "slide",
  )}.svg`
}

export function deckPrintFileName(
  deck: Deck,
  settings: HandoutSettings = defaultHandoutSettings,
) {
  return `${fileSafeName(deck.title || "deck")}-${settings.layout}-handout.html`
}

function slideCommentsHtml(slide: Slide, compact = false) {
  const comments = (slide.comments ?? []).filter((comment) => !comment.resolved)
  if (!comments.length) return ""

  return `<div class="${compact ? "details comments" : "comments"}">
    <div class="notes-label">Open comments</div>
    ${comments
      .map((comment) => {
        const mentions = (comment.mentions ?? []).map(mentionLabel).join(" ")
        const mentionText = mentions ? ` <em>${escapeHtml(mentions)}</em>` : ""

        return `<p><strong>${escapeHtml(comment.authorName)}</strong>: ${escapeHtml(
          comment.body,
        )}${mentionText}</p>`
      })
      .join("")}
  </div>`
}

function slideNotesHtml(slide: Slide, compact = false) {
  return `<div class="${compact ? "details notes" : "notes"}">
    <div class="notes-label">Speaker notes</div>
    <p>${escapeHtml(slide.notes || "No speaker notes.")}</p>
  </div>`
}

function textElementContent(slide: Slide) {
  return slide.elements
    .filter(
      (element) =>
        element.type === "title" ||
        element.type === "text" ||
        element.type === "table" ||
        element.type === "chart" ||
        element.type === "icon" ||
        element.type === "video" ||
        element.type === "audio",
    )
    .map((element) =>
      element.type === "table"
        ? tableText(element)
        : element.type === "chart"
          ? chartText(element)
          : element.type === "video" ||
              element.type === "audio" ||
              element.type === "icon"
            ? element.alt.trim()
              : element.content.trim(),
    )
    .filter(Boolean)
}

export function serializeSlideToSvg(
  slide: Slide,
  assets: DeckAsset[] = [],
  master?: MasterRenderOptions,
) {
  const assetMap = deckAssetMap(assets)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" viewBox="0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}" role="img" aria-label="${escapeXml(
    slide.title,
  )}"><rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="${escapeXml(
    slide.background,
  )}" />${visibleElements(slide)
    .map((element, index) => renderElement(element, index, assetMap))
    .join("")}${renderMasterOverlay(master)}</svg>`
}

function pageMetaHtml(
  slide: Slide,
  index: number,
  settings: HandoutSettings,
  compact = false,
) {
  const number = settings.includeSlideNumbers
    ? `<span>${String(index + 1).padStart(2, "0")}</span>`
    : ""
  const title = `<strong>${escapeHtml(slide.title || "Untitled slide")}</strong>`

  return `<div class="${compact ? "meta compact-meta" : "meta"}">${number}${title}</div>`
}

function sectionMarkerHtml(slide: Slide, index: number, compact = false) {
  const title = slide.sectionTitle.trim()
  if (!title) return ""

  return `<div class="${compact ? "section-marker compact-section-marker" : "section-marker"}">
    <span>Section</span>
    <strong>${escapeHtml(title)}</strong>
    <small>Starts at slide ${index + 1}</small>
  </div>`
}

function slideDetailsHtml(
  slide: Slide,
  settings: HandoutSettings,
  compact = false,
) {
  return `${settings.includeNotes ? slideNotesHtml(slide, compact) : ""}${
    settings.includeComments ? slideCommentsHtml(slide, compact) : ""
  }`
}

function fullSlidePages(deck: Deck, settings: HandoutSettings) {
  return deck.slides
    .map(
      (slide, index) => `<section class="page single-page">
  ${pageMetaHtml(slide, index, settings)}
  ${sectionMarkerHtml(slide, index)}
  <div class="slide">${serializeSlideToSvg(slide, deck.assets, {
    master: deck.master,
    slideNumber: index + 1,
    slideCount: deck.slides.length,
  })}</div>
  ${slideDetailsHtml(slide, settings)}
</section>`,
    )
    .join("\n")
}

function notesPages(deck: Deck, settings: HandoutSettings) {
  const notesSettings = { ...settings, includeNotes: true }

  return deck.slides
    .map(
      (slide, index) => `<section class="page notes-page">
  ${pageMetaHtml(slide, index, notesSettings)}
  ${sectionMarkerHtml(slide, index)}
  <div class="notes-layout">
    <div class="slide">${serializeSlideToSvg(slide, deck.assets, {
      master: deck.master,
      slideNumber: index + 1,
      slideCount: deck.slides.length,
    })}</div>
    <div>
      ${slideDetailsHtml(slide, notesSettings)}
    </div>
  </div>
</section>`,
    )
    .join("\n")
}

function gridPages(
  deck: Deck,
  settings: HandoutSettings,
  layout: Extract<HandoutLayout, "two-up" | "four-up">,
) {
  const slidesPerPage = layout === "two-up" ? 2 : 4
  const pages: string[] = []

  for (let start = 0; start < deck.slides.length; start += slidesPerPage) {
    const pageSlides = deck.slides.slice(start, start + slidesPerPage)
    pages.push(`<section class="page grid-page ${layout}">
      <div class="slide-grid">
        ${pageSlides
          .map(
            (slide, pageIndex) => `<article class="handout-cell">
              ${pageMetaHtml(slide, start + pageIndex, settings, true)}
              ${sectionMarkerHtml(slide, start + pageIndex, true)}
              <div class="slide">${serializeSlideToSvg(slide, deck.assets, {
                master: deck.master,
                slideNumber: start + pageIndex + 1,
                slideCount: deck.slides.length,
              })}</div>
              ${slideDetailsHtml(slide, settings, true)}
            </article>`,
          )
          .join("\n")}
      </div>
    </section>`)
  }

  return pages.join("\n")
}

function sectionMetricText(section: SectionExportSummaryItem) {
  const details = [
    `${section.slideCount} slide${section.slideCount === 1 ? "" : "s"}`,
    `${section.noteSlideCount} note${section.noteSlideCount === 1 ? "" : "s"}`,
    `${section.openCommentCount} open comment${
      section.openCommentCount === 1 ? "" : "s"
    }`,
  ]

  if (section.mediaObjectCount) {
    details.push(
      `${section.mediaObjectCount} media object${
        section.mediaObjectCount === 1 ? "" : "s"
      }`,
    )
  }

  return details.join(" / ")
}

function sectionOverviewPage(deck: Deck) {
  const summary = sectionExportSummary(deck)
  if (!summary.hasExplicitSections) return ""

  return `<section class="page section-summary-page">
    <div class="deck-heading">
      <h1>${escapeHtml(deck.title || "Untitled deck")}</h1>
      <span>${escapeHtml(summary.summary)}</span>
    </div>
    <div class="section-summary-list">
      ${summary.sections
        .map(
          (section) => `<article class="section-summary-row ${
            section.explicit ? "" : "unsectioned"
          }">
            <div>
              <div class="section-summary-title">${escapeHtml(section.title)}</div>
              <div class="section-summary-detail">${escapeHtml(
                sectionMetricText(section),
              )}</div>
            </div>
            <div class="section-summary-range">${escapeHtml(
              sectionSlideRangeLabel(section),
            )}</div>
          </article>`,
        )
        .join("\n")}
    </div>
  </section>`
}

function outlinePages(deck: Deck, settings: HandoutSettings) {
  const summary = sectionExportSummary(deck)

  return `<section class="page outline-page">
    <div class="deck-heading">
      <h1>${escapeHtml(deck.title || "Untitled deck")}</h1>
      <span>${escapeHtml(summary.summary)}</span>
    </div>
    <div class="outline-list">
      ${summary.sections
        .map((section) => {
          const sectionSlides = deck.slides.slice(
            section.startSlideNumber - 1,
            section.endSlideNumber,
          )

          return `<section class="outline-section">
            <div class="outline-section-heading">
              <strong>${escapeHtml(section.title)}</strong>
              <span>${escapeHtml(sectionSlideRangeLabel(section))}</span>
            </div>
            ${sectionSlides
              .map((slide, sectionIndex) => {
                const slideIndex = section.startSlideNumber - 1 + sectionIndex
                const textItems = textElementContent(slide)

                return `<article class="outline-slide">
                  ${pageMetaHtml(slide, slideIndex, settings)}
                  ${
                    textItems.length
                      ? `<ul>${textItems
                          .map((item) => `<li>${escapeHtml(item)}</li>`)
                          .join("")}</ul>`
                      : `<p class="muted">No text content.</p>`
                  }
                  ${
                    settings.includeNotes && slide.notes
                      ? slideNotesHtml(slide, true)
                      : ""
                  }
                  ${settings.includeComments ? slideCommentsHtml(slide, true) : ""}
                </article>`
              })
              .join("\n")}
          </section>`
        })
        .join("\n")}
    </div>
  </section>`
}

function handoutBody(deck: Deck, settings: HandoutSettings) {
  const sectionOverview = sectionOverviewPage(deck)

  if (settings.layout === "notes") {
    return `${sectionOverview}${notesPages(deck, settings)}`
  }
  if (settings.layout === "two-up" || settings.layout === "four-up") {
    return `${sectionOverview}${gridPages(deck, settings, settings.layout)}`
  }
  if (settings.layout === "outline") return outlinePages(deck, settings)
  return `${sectionOverview}${fullSlidePages(deck, settings)}`
}

export function serializeDeckToPrintHtml(
  deck: Deck,
  settings: HandoutSettings = defaultHandoutSettings,
) {
  const generatedAt = new Date().toLocaleString()

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(deck.title)} ${escapeHtml(handoutLayoutLabels[settings.layout])} handout</title>
<style>
  :root {
    color: #111827;
    background: #f8fafc;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  body {
    margin: 0;
    background: #f8fafc;
  }

  .page {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 24px;
    break-after: page;
    page-break-after: always;
  }

  .meta {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
    color: #475569;
    font-size: 13px;
  }

  .meta span {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .compact-meta {
    margin-bottom: 8px;
    font-size: 11px;
  }

  .deck-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  .deck-heading h1 {
    margin: 0;
    font-size: 24px;
  }

  .deck-heading span,
  .muted {
    color: #64748b;
  }

  .section-marker {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -4px 0 12px;
    color: #475569;
    font-size: 12px;
  }

  .section-marker span {
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    padding: 2px 8px;
    color: #334155;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .section-marker small {
    color: #64748b;
  }

  .compact-section-marker {
    margin: -2px 0 8px;
    font-size: 10px;
  }

  .section-summary-list,
  .outline-section {
    display: grid;
    gap: 12px;
  }

  .section-summary-row,
  .outline-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid #cbd5e1;
    background: white;
    padding: 14px 16px;
  }

  .section-summary-row.unsectioned {
    background: #f8fafc;
  }

  .section-summary-title {
    font-weight: 700;
  }

  .section-summary-detail,
  .section-summary-range,
  .outline-section-heading span {
    color: #64748b;
    font-size: 12px;
  }

  .outline-section {
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 14px;
  }

  .slide {
    border: 1px solid #cbd5e1;
    background: white;
    box-shadow: 0 8px 28px rgb(15 23 42 / 0.12);
  }

  .slide svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .notes,
  .comments {
    margin-top: 16px;
    border: 1px solid #cbd5e1;
    background: white;
    padding: 14px 16px;
    min-height: 96px;
  }

  .details {
    min-height: auto;
    margin-top: 8px;
    padding: 10px 12px;
    font-size: 11px;
  }

  .notes-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
    gap: 16px;
  }

  .slide-grid {
    display: grid;
    gap: 16px;
  }

  .two-up .slide-grid {
    grid-template-columns: 1fr;
  }

  .four-up .slide-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .handout-cell {
    min-width: 0;
  }

  .outline-list {
    display: grid;
    gap: 14px;
  }

  .outline-slide {
    break-inside: avoid;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 12px;
  }

  .outline-slide ul {
    margin: 8px 0 0;
    padding-left: 24px;
  }

  .print-footer {
    margin-top: 12px;
    color: #64748b;
    font-size: 11px;
  }

  .notes-label {
    margin-bottom: 8px;
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .notes p,
  .comments p {
    margin: 0;
    margin-top: 6px;
    white-space: pre-wrap;
    line-height: 1.55;
  }

  @page {
    size: ${settings.orientation};
    margin: 12mm;
  }

  @media print {
    body {
      background: white;
    }

    .page {
      min-height: auto;
      padding: 0;
    }

    .slide,
    .notes {
      box-shadow: none;
    }
  }
</style>
</head>
<body>
${handoutBody(deck, settings)}
${settings.includeDate ? `<div class="print-footer">Generated ${escapeHtml(generatedAt)}</div>` : ""}
</body>
</html>`
}

import PptxGenJS from "pptxgenjs"

import { downloadBlob } from "./browser-downloads"
import { chartData, chartMaxValue } from "./chart-formatting"
import { pieLabelPoint, pieSlicePath, pieSlices } from "./chart-pie"
import { mentionLabel } from "./comment-mentions"
import { deckAssetMap, resolveElementImageSrc } from "./deck-assets"
import { elementLinkUrl, elementSlideTarget } from "./element-links"
import { visibleElements } from "./element-visibility"
import { pptxFontFace } from "./font-pairs"
import { iconDefinition, iconStrokeWidth } from "./icon-library"
import { elementImageMask } from "./image-masks"
import { officeThemePptxFontFaces } from "./office-theme-metadata"
import {
  mediaCaptionCueSummary,
  mediaCaptionCues,
  serializeMediaCaptionHandoffNotes,
} from "./media-captions"
import { mediaTrimLabel } from "./media-trim"
import { serializeSlideActionSettingNotes } from "./action-button-handoff"
import { serializePptxAnimationHandoffNotes } from "./pptx-animation-handoff"
import { applyNativePptxAnimationsToBlob } from "./pptx-animation-xml"
import {
  pptxChartColorValues,
  pptxChartDataSeries,
  pptxChartExportMode,
  pptxChartTitle,
} from "./pptx-chart-export"
import { pptxConnectorCustomGeometryPoints } from "./pptx-connector-geometry"
import { serializePptxConnectorHandoffNotes } from "./pptx-connector-handoff"
import {
  pptxMediaExportDecision,
  serializePptxMediaExportHandoffNotes,
  type PptxMediaExportOptions,
} from "./pptx-media-export"
import { serializePptxTransitionHandoffNotes } from "./pptx-transition-handoff"
import { applyNativePptxTransitionsToBlob } from "./pptx-transition-xml"
import { richTextSegments } from "./rich-text"
import {
  isLinearShape,
  shapeFill,
  shapeEndArrowhead,
  shapeKind,
  shapeStartArrowhead,
  shapeStrokeColor,
  shapeStrokePptxDash,
  shapeStrokeWidth,
} from "./shape-formatting"
import { masterFooterParts, masterHasVisibleContent } from "./slide-master"
import {
  shapeConnectorGeometry,
  shapeLineEndpoints,
  shapePath,
} from "./shape-geometry"
import {
  clampTextColumns,
  elementEffectiveFontSize,
  elementLineHeight,
  elementTextAlign,
  elementTextColumns,
  elementTextFit,
  formattedTextRows,
} from "./text-formatting"
import {
  elementTableVerticalAlign,
  tableColumns,
  tableDisplayCells,
  tableRows,
} from "./table-formatting"
import type { Deck, DeckAsset, PresentationElement, Slide } from "./types"

const PPTX_WIDTH = 13.333
const PPTX_HEIGHT = 7.5
export type PptxDeckExportOptions = PptxMediaExportOptions
const PX_TO_PT = 0.75
const TEXT_COLUMN_GAP = 0.28
const PPTX_CUSTOM_GEOMETRY_SHAPE = "custGeom" as PptxGenJS.SHAPE_NAME
const TRANSPARENT_FILL: PptxGenJS.ShapeFillProps = {
  color: "FFFFFF",
  transparency: 100,
}
const TRANSPARENT_LINE: PptxGenJS.ShapeLineProps = {
  color: "FFFFFF",
  transparency: 100,
  width: 0,
}

type PptxSlide = ReturnType<PptxGenJS["addSlide"]>

type ElementFrame = {
  x: number
  y: number
  w: number
  h: number
}

function fileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function toHexColor(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  if (!normalized || normalized === "transparent") return fallback

  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(normalized)
  if (hex) {
    const value = hex[1]
    return value.length === 3
      ? value
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
          .toUpperCase()
      : value.toUpperCase()
  }

  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(normalized)
  if (!rgb) return fallback

  return rgb
    .slice(1, 4)
    .map((channel) => Math.max(0, Math.min(255, Number(channel))).toString(16))
    .map((channel) => channel.padStart(2, "0"))
    .join("")
    .toUpperCase()
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;")
}

function fillProps(value: string | undefined, fallback = "FFFFFF") {
  if (!value || value === "transparent") return TRANSPARENT_FILL
  return { color: toHexColor(value, fallback) } satisfies PptxGenJS.ShapeFillProps
}

function tableBorderProps(color: string): PptxGenJS.BorderProps {
  if (color === "transparent") {
    return { color: "FFFFFF", pt: 0, type: "none" }
  }

  return {
    color: toHexColor(color, "CBD5E1"),
    pt: 0.6,
    type: "solid",
  }
}

function tableBorderTuple(
  format: ReturnType<typeof tableDisplayCells>[number]["format"],
): [PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps] {
  return [
    tableBorderProps(format.borderTopColor),
    tableBorderProps(format.borderRightColor),
    tableBorderProps(format.borderBottomColor),
    tableBorderProps(format.borderLeftColor),
  ]
}

function svgDataUri(svg: string) {
  const bytes = new TextEncoder().encode(svg)
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return `data:image/svg+xml;base64,${btoa(binary)}`
}

function slideFrame(element: PresentationElement): ElementFrame {
  return {
    x: (element.x / 100) * PPTX_WIDTH,
    y: (element.y / 100) * PPTX_HEIGHT,
    w: (element.width / 100) * PPTX_WIDTH,
    h: (element.height / 100) * PPTX_HEIGHT,
  }
}

function elementHyperlink(element: PresentationElement, deck: Deck) {
  const slideTargetId = elementSlideTarget(element, deck.slides)
  if (slideTargetId) {
    return {
      slide: deck.slides.findIndex((slide) => slide.id === slideTargetId) + 1,
      tooltip: "Go to slide",
    } satisfies PptxGenJS.HyperlinkProps
  }

  const url = elementLinkUrl(element)
  return url
    ? ({ url, tooltip: "Open link" } satisfies PptxGenJS.HyperlinkProps)
    : undefined
}

function addElementLinkOverlay(
  pptx: PptxGenJS,
  slide: PptxSlide,
  element: PresentationElement,
  deck: Deck,
) {
  const hyperlink = elementHyperlink(element, deck)
  if (!hyperlink) return

  slide.addShape(pptx.ShapeType.rect, {
    ...slideFrame(element),
    fill: TRANSPARENT_FILL,
    hyperlink,
    line: TRANSPARENT_LINE,
    rotate: element.rotation || undefined,
  })
}

function pointSize(element: PresentationElement) {
  return Math.max(1, Math.round(elementEffectiveFontSize(element) * PX_TO_PT * 10) / 10)
}

function textOptions(
  element: PresentationElement,
  frame: ElementFrame,
): PptxGenJS.TextPropsOptions {
  const fill =
    element.background && element.background !== "transparent"
      ? fillProps(element.background)
      : undefined

  return {
    ...frame,
    align: elementTextAlign(element),
    bold: element.fontWeight >= 600,
    color: toHexColor(element.color, "111827"),
    fill,
    fit: elementTextFit(element) === "shrink" ? "shrink" : "none",
    fontFace: pptxFontFace(element.fontFamily),
    fontSize: pointSize(element),
    isTextBox: true,
    line: TRANSPARENT_LINE,
    lineSpacingMultiple: elementLineHeight(element),
    margin: [5, 7, 5, 7],
    rotate: element.rotation || undefined,
    valign: "top",
    wrap: true,
  }
}

function richTextRuns(element: PresentationElement): PptxGenJS.TextProps[] {
  return richTextSegments(element, 0, element.content.length).map((segment) => {
    const fontWeight = segment.style.fontWeight ?? element.fontWeight
    const color = toHexColor(segment.style.color ?? element.color, "111827")

    return {
      text: segment.text,
      options: {
        bold: fontWeight >= 600,
        color,
        fontFace: pptxFontFace(element.fontFamily),
        fontSize: pointSize(element),
        italic: segment.style.italic,
        underline: segment.style.underline
          ? {
              color,
              style: "sng",
            }
          : undefined,
      },
    }
  })
}

function plainRows(element: PresentationElement) {
  return formattedTextRows(element).map((row) =>
    row.marker ? `${row.marker} ${row.text}` : row.text,
  )
}

function addPlainColumnText(
  slide: PptxSlide,
  element: PresentationElement,
  frame: ElementFrame,
) {
  const rows = plainRows(element)
  const columns = clampTextColumns(elementTextColumns(element))
  const rowsPerColumn = Math.ceil(rows.length / columns)
  const columnWidth = (frame.w - TEXT_COLUMN_GAP * (columns - 1)) / columns

  Array.from({ length: columns }).forEach((_, columnIndex) => {
    const text = rows
      .slice(columnIndex * rowsPerColumn, (columnIndex + 1) * rowsPerColumn)
      .join("\n")

    if (!text.trim()) return

    slide.addText(text, {
      ...textOptions(element, {
        ...frame,
        x: frame.x + (columnWidth + TEXT_COLUMN_GAP) * columnIndex,
        w: columnWidth,
      }),
    })
  })
}

function addTextElement(slide: PptxSlide, element: PresentationElement) {
  const frame = slideFrame(element)
  const columns = clampTextColumns(elementTextColumns(element))
  const isPlainTextExport =
    columns > 1 || element.listStyle === "bullet" || element.listStyle === "number"

  if (isPlainTextExport) {
    addPlainColumnText(slide, element, frame)
    return
  }

  const runs = richTextRuns(element)
  const text = runs.length ? runs : element.content || " "
  slide.addText(text, textOptions(element, frame))
}

function shapeNameForElement(
  pptx: PptxGenJS,
  element: PresentationElement,
): PptxGenJS.SHAPE_NAME {
  const mask = elementImageMask(element)

  if (element.type === "image") {
    if (mask === "circle") return pptx.ShapeType.ellipse
    if (mask === "diamond") return pptx.ShapeType.diamond
  }

  const kind = shapeKind(element)
  if (kind === "ellipse") return pptx.ShapeType.ellipse
  if (kind === "diamond") return pptx.ShapeType.diamond
  if (kind === "triangle") return pptx.ShapeType.triangle
  if (kind === "pentagon") return pptx.ShapeType.pentagon
  if (kind === "hexagon") return pptx.ShapeType.hexagon
  if (kind === "parallelogram") return pptx.ShapeType.parallelogram
  if (kind === "trapezoid") return pptx.ShapeType.trapezoid
  if (kind === "rightArrow") return pptx.ShapeType.rightArrow
  if (kind === "chevron") return pptx.ShapeType.chevron
  if (kind === "plus") return pptx.ShapeType.plus
  if (kind === "star") return pptx.ShapeType.star5
  if (kind === "speechBubble") return pptx.ShapeType.wedgeRoundRectCallout
  if (kind === "rounded") return pptx.ShapeType.roundRect

  return element.radius > 0 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect
}

function addShapeElement(pptx: PptxGenJS, slide: PptxSlide, element: PresentationElement) {
  const frame = slideFrame(element)
  const kind = shapeKind(element)
  const line = {
    color: toHexColor(shapeStrokeColor(element), "2563EB"),
    width: Math.max(0.5, shapeStrokeWidth(element) * PX_TO_PT),
    dashType: shapeStrokePptxDash(element),
  } satisfies PptxGenJS.ShapeLineProps

  if (kind === "elbowConnector" || kind === "curvedConnector") {
    slide.addShape(PPTX_CUSTOM_GEOMETRY_SHAPE, {
      ...frame,
      fill: TRANSPARENT_FILL,
      line: {
        ...line,
        beginArrowType: shapeStartArrowhead(element),
        endArrowType: shapeEndArrowhead(element),
      },
      objectName: kind === "curvedConnector" ? "Curved connector" : "Elbow connector",
      points: pptxConnectorCustomGeometryPoints(element, frame) ?? undefined,
      rotate: element.rotation || undefined,
    })
    return
  }

  if (isLinearShape(element)) {
    const lineEndpoints = shapeLineEndpoints(
      {
        x: frame.x,
        y: frame.y,
        width: frame.w,
        height: frame.h,
      },
      shapeConnectorGeometry(element),
    )
    slide.addShape(pptx.ShapeType.line, {
      x: lineEndpoints.x1,
      y: lineEndpoints.y1,
      w: lineEndpoints.x2 - lineEndpoints.x1,
      h: lineEndpoints.y2 - lineEndpoints.y1,
      line: {
        ...line,
        beginArrowType: shapeStartArrowhead(element),
        endArrowType: shapeEndArrowhead(element),
      },
      rotate: element.rotation || undefined,
    })
    return
  }

  slide.addShape(shapeNameForElement(pptx, element), {
    ...frame,
    fill: fillProps(shapeFill(element)),
    line,
    rectRadius: Math.max(0, Math.min(1, element.radius / 120)),
    rotate: element.rotation || undefined,
  })
}

function addImageBackground(
  pptx: PptxGenJS,
  slide: PptxSlide,
  element: PresentationElement,
  frame: ElementFrame,
) {
  if (!element.background || element.background === "transparent") return

  slide.addShape(shapeNameForElement(pptx, element), {
    ...frame,
    fill: fillProps(element.background),
    line: TRANSPARENT_LINE,
    rectRadius: Math.max(0, Math.min(1, element.radius / 120)),
    rotate: element.rotation || undefined,
  })
}

function addImageElement(
  pptx: PptxGenJS,
  slide: PptxSlide,
  element: PresentationElement,
  assets: Map<string, DeckAsset>,
) {
  const frame = slideFrame(element)
  const imageSrc = resolveElementImageSrc(element, assets)
  const mask = elementImageMask(element)

  addImageBackground(pptx, slide, element, frame)
  if (!imageSrc) return

  slide.addImage({
    ...frame,
    altText: element.alt || "Slide image",
    data: imageSrc,
    rotate: element.rotation || undefined,
    rounding: mask === "rounded" || mask === "circle",
    sizing:
      element.fit === "fill"
        ? undefined
        : {
            h: frame.h,
            type: element.fit,
            w: frame.w,
          },
  })
}

function addIconElement(slide: PptxSlide, element: PresentationElement) {
  const frame = slideFrame(element)
  const definition = iconDefinition(element.iconName)
  const background =
    element.background && element.background !== "transparent"
      ? `<rect x="0" y="0" width="24" height="24" rx="${Math.min(
          8,
          Math.max(0, element.radius / 4),
        )}" fill="${escapeXml(element.background)}" />`
      : ""
  const paths = definition.paths
    .map((path) => `<path d="${escapeXml(path)}" />`)
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 24 24">${background}<g fill="none" stroke="${escapeXml(
    element.color,
  )}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${iconStrokeWidth(
    element,
  )}">${paths}</g></svg>`

  slide.addImage({
    ...frame,
    altText: element.alt || definition.label,
    data: svgDataUri(svg),
    rotate: element.rotation || undefined,
  })
}

function addTableBorderLine(
  pptx: PptxGenJS,
  slide: PptxSlide,
  frame: ElementFrame,
  side: "bottom" | "left" | "right" | "top",
  color: string,
  rotation: number,
) {
  if (color === "transparent") return

  const line =
    side === "top"
      ? { x: frame.x, y: frame.y, w: frame.w, h: 0 }
      : side === "right"
        ? { x: frame.x + frame.w, y: frame.y, w: 0, h: frame.h }
        : side === "bottom"
          ? { x: frame.x, y: frame.y + frame.h, w: frame.w, h: 0 }
          : { x: frame.x, y: frame.y, w: 0, h: frame.h }

  slide.addShape(pptx.ShapeType.line, {
    ...line,
    line: {
      color: toHexColor(color, "CBD5E1"),
      width: 0.6,
    },
    rotate: rotation || undefined,
  })
}

function addTableCellsAsShapes(
  pptx: PptxGenJS,
  slide: PptxSlide,
  element: PresentationElement,
) {
  const frame = slideFrame(element)
  const rows = tableRows(element)
  const columns = tableColumns(element)
  const verticalAlign = elementTableVerticalAlign(element)
  const cellWidth = frame.w / columns
  const cellHeight = frame.h / rows

  tableDisplayCells(element).forEach((cell) => {
    const cellFrame = {
      x: frame.x + cell.column * cellWidth,
      y: frame.y + cell.row * cellHeight,
      w: cellWidth * cell.columnSpan,
      h: cellHeight * cell.rowSpan,
    }

    slide.addShape(pptx.ShapeType.rect, {
      ...cellFrame,
      fill: fillProps(cell.format.background),
      line: TRANSPARENT_LINE,
      rotate: element.rotation || undefined,
    })
    addTableBorderLine(
      pptx,
      slide,
      cellFrame,
      "top",
      cell.format.borderTopColor,
      element.rotation,
    )
    addTableBorderLine(
      pptx,
      slide,
      cellFrame,
      "right",
      cell.format.borderRightColor,
      element.rotation,
    )
    addTableBorderLine(
      pptx,
      slide,
      cellFrame,
      "bottom",
      cell.format.borderBottomColor,
      element.rotation,
    )
    addTableBorderLine(
      pptx,
      slide,
      cellFrame,
      "left",
      cell.format.borderLeftColor,
      element.rotation,
    )
    slide.addText(cell.text || " ", {
      ...cellFrame,
      align: elementTextAlign(element),
      bold: cell.format.fontWeight >= 600,
      color: toHexColor(cell.format.color, "111827"),
      fit: "shrink",
      fontFace: pptxFontFace(element.fontFamily),
      fontSize: Math.max(6, pointSize(element) * 0.9),
      margin: [3, 4, 3, 4],
      rotate: element.rotation || undefined,
      valign: verticalAlign,
      wrap: true,
    })
  })
}

function addNativeTableElement(slide: PptxSlide, element: PresentationElement) {
  const frame = slideFrame(element)
  const rows = tableRows(element)
  const columns = tableColumns(element)
  const tableCells = tableDisplayCells(element)
  const rowData: PptxGenJS.TableRow[] = Array.from({ length: rows }, (_, row) =>
    tableCells
      .filter((cell) => cell.row === row)
      .sort((first, second) => first.column - second.column)
      .map((cell) => ({
        text: cell.text || " ",
        options: {
          align: elementTextAlign(element),
          bold: cell.format.fontWeight >= 600,
          border: tableBorderTuple(cell.format),
          color: toHexColor(cell.format.color, "111827"),
          colspan: cell.columnSpan > 1 ? cell.columnSpan : undefined,
          fill: fillProps(cell.format.background),
          fontFace: pptxFontFace(element.fontFamily),
          fontSize: Math.max(6, pointSize(element) * 0.9),
          margin: 0.05,
          rowspan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
          valign: elementTableVerticalAlign(element),
        },
      })),
  )

  slide.addTable(rowData, {
    ...frame,
    colW: Array.from({ length: columns }, () => frame.w / columns),
    margin: 0.05,
    rowH: Array.from({ length: rows }, () => frame.h / rows),
  })
}

function addTableElement(pptx: PptxGenJS, slide: PptxSlide, element: PresentationElement) {
  if (element.rotation) {
    addTableCellsAsShapes(pptx, slide, element)
    return
  }

  addNativeTableElement(slide, element)
}

function chartPoint(
  frame: ElementFrame,
  index: number,
  count: number,
  value: number,
  maxValue: number,
) {
  const left = frame.x + frame.w * 0.1
  const right = frame.x + frame.w * 0.9
  const bottom = frame.y + frame.h * 0.8
  const top = frame.y + frame.h * 0.15
  const x = count <= 1 ? frame.x + frame.w / 2 : left + (index / (count - 1)) * (right - left)
  const y = bottom - (value / maxValue) * (bottom - top)

  return { x, y }
}

function addChartLabel(
  slide: PptxSlide,
  element: PresentationElement,
  text: string,
  frame: ElementFrame,
) {
  slide.addText(text, {
    ...frame,
    color: toHexColor(element.color, "111827"),
    fit: "shrink",
    fontFace: pptxFontFace(element.fontFamily),
    fontSize: Math.max(5, pointSize(element) * 0.65),
    margin: 0,
    rotate: element.rotation || undefined,
    valign: "middle",
  })
}

function addChartElement(pptx: PptxGenJS, slide: PptxSlide, element: PresentationElement) {
  const frame = slideFrame(element)
  const data = chartData(element)
  const maxValue = chartMaxValue(element)
  const axisColor = toHexColor(element.chartAxisColor, "94A3B8")
  const exportMode = pptxChartExportMode(element)

  if (exportMode.mode === "native") {
    const isPieLike = element.chartType === "pie" || element.chartType === "donut"
    const title = element.content.trim()

    slide.addChart(
      pptx.ChartType[exportMode.chartType],
      pptxChartDataSeries(element),
      {
        ...frame,
        altText: `${pptxChartTitle(element)}; editable chart data exported from Essence.`,
        barDir: element.chartType === "horizontalBar" ? "bar" : "col",
        barGrouping: "clustered",
        catAxisLabelColor: toHexColor(element.color, "111827"),
        catAxisLineColor: axisColor,
        catAxisLineShow: !isPieLike,
        chartArea: {
          fill:
            element.background && element.background !== "transparent"
              ? fillProps(element.background)
              : TRANSPARENT_FILL,
        },
        chartColors: pptxChartColorValues(element),
        dataLabelColor: toHexColor(element.color, "111827"),
        dataLabelFontFace: pptxFontFace(element.fontFamily),
        dataLabelFontSize: Math.max(6, pointSize(element) * 0.7),
        dataLabelPosition: isPieLike ? "bestFit" : "outEnd",
        holeSize: element.chartType === "donut" ? 55 : undefined,
        legendFontFace: pptxFontFace(element.fontFamily),
        legendFontSize: Math.max(6, pointSize(element) * 0.7),
        legendPos: "r",
        lineDataSymbol: "circle",
        lineSize: 2,
        plotArea: {
          fill: TRANSPARENT_FILL,
        },
        showLabel: isPieLike,
        showLegend: element.chartShowLegend,
        showPercent: isPieLike && element.chartShowValues,
        showTitle: Boolean(title),
        showValue: element.chartShowValues && !isPieLike,
        title: title || undefined,
        titleColor: toHexColor(element.color, "111827"),
        titleFontFace: pptxFontFace(element.fontFamily),
        titleFontSize: Math.max(8, pointSize(element) * 0.85),
        valAxisLabelColor: toHexColor(element.color, "111827"),
        valAxisLineColor: axisColor,
        valAxisLineShow: !isPieLike,
        valGridLine: {
          color: axisColor,
          size: 0.5,
          style: "solid",
        },
      },
    )
    return
  }

  const left = frame.x + frame.w * 0.1
  const right = frame.x + frame.w * 0.9
  const bottom = frame.y + frame.h * 0.8
  const top = frame.y + frame.h * 0.15

  if (element.background && element.background !== "transparent") {
    slide.addShape(pptx.ShapeType.rect, {
      ...frame,
      fill: fillProps(element.background),
      line: TRANSPARENT_LINE,
      rectRadius: Math.max(0, Math.min(1, element.radius / 120)),
      rotate: element.rotation || undefined,
    })
  }

  if (element.chartType === "pie" || element.chartType === "donut") {
    const slices = pieSlices(data)
    const legend = element.chartShowLegend
      ? data
          .slice(0, 5)
          .map(
            (datum, index) =>
              `<g><rect x="540" y="${64 + index * 28}" width="14" height="14" rx="3" fill="${escapeXml(
                datum.color,
              )}" /><text x="564" y="${76 + index * 28}" fill="${escapeXml(
                element.color,
              )}" font-family="Arial, sans-serif" font-size="16">${escapeXml(
                datum.label,
              )}</text></g>`,
          )
          .join("")
      : ""
    const segments = slices
      .map((slice) => {
        const shape =
          slice.percent >= 0.999
            ? `<circle cx="310" cy="240" r="132" fill="${escapeXml(
                slice.datum.color,
              )}" stroke="#ffffff" stroke-width="4" />`
            : `<path d="${pieSlicePath(
                310,
                240,
                132,
                slice.startAngle,
                slice.endAngle,
              )}" fill="${escapeXml(slice.datum.color)}" stroke="#ffffff" stroke-width="4" />`
        const valueText = element.chartShowValues
          ? (() => {
              const point = pieLabelPoint(
                310,
                240,
                78,
                slice.startAngle,
                slice.endAngle,
              )

              return `<text x="${point.x}" y="${point.y}" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="700" text-anchor="middle">${Math.round(
                slice.percent * 100,
              )}%</text>`
            })()
          : ""

        return `<g>${shape}${valueText}</g>`
      })
      .join("")
    const donutHole =
      element.chartType === "donut"
        ? `<circle cx="310" cy="240" r="60" fill="${escapeXml(
            element.background || "#ffffff",
          )}" stroke="#ffffff" stroke-width="4" />`
        : ""
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">${segments}${donutHole}${legend}</svg>`

    slide.addImage({
      ...frame,
      altText: element.chartType === "donut" ? "Donut chart" : "Pie chart",
      data: svgDataUri(svg),
      rotate: element.rotation || undefined,
    })
    return
  }

  slide.addShape(pptx.ShapeType.line, {
    x: left,
    y: bottom,
    w: right - left,
    h: 0,
    line: { color: axisColor, width: 0.7 },
    rotate: element.rotation || undefined,
  })
  slide.addShape(pptx.ShapeType.line, {
    x: left,
    y: top,
    w: 0,
    h: bottom - top,
    line: { color: axisColor, width: 0.7 },
    rotate: element.rotation || undefined,
  })

  if (element.chartShowLegend) {
    data.slice(0, 4).forEach((datum, index) => {
      const x = frame.x + frame.w * 0.58 + index * frame.w * 0.1
      const y = frame.y + frame.h * 0.05

      slide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w: 0.08,
        h: 0.08,
        fill: { color: toHexColor(datum.color, "2563EB") },
        line: TRANSPARENT_LINE,
        rotate: element.rotation || undefined,
      })
      addChartLabel(slide, element, datum.label.slice(0, 6), {
        x: x + 0.1,
        y: y - 0.02,
        w: frame.w * 0.09,
        h: 0.12,
      })
    })
  }

  if (element.chartType === "line" || element.chartType === "area") {
    const points = data.map((datum, index) =>
      chartPoint(frame, index, data.length, datum.value, maxValue),
    )

    if (element.chartType === "area") {
      const areaPoints = data
        .map((datum, index) => {
          const x = data.length <= 1 ? 50 : 10 + (index / (data.length - 1)) * 80
          const y = 80 - (datum.value / maxValue) * 65
          return `${x},${y}`
        })
        .join(" ")
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 100 100"><polygon points="10,80 ${areaPoints} 90,80" fill="${escapeXml(
        data[0]?.color ?? "#2563eb",
      )}" opacity="0.18" /></svg>`

      slide.addImage({
        ...frame,
        altText: "Area chart fill",
        data: svgDataUri(svg),
        rotate: element.rotation || undefined,
      })
    }

    points.slice(1).forEach((point, index) => {
      const previous = points[index]
      if (!previous) return

      slide.addShape(pptx.ShapeType.line, {
        x: previous.x,
        y: previous.y,
        w: point.x - previous.x,
        h: point.y - previous.y,
        line: { color: toHexColor(data[0]?.color, "2563EB"), width: 1.6 },
        rotate: element.rotation || undefined,
      })
    })

    data.forEach((datum, index) => {
      const point = points[index]
      if (!point) return

      slide.addShape(pptx.ShapeType.ellipse, {
        x: point.x - 0.045,
        y: point.y - 0.045,
        w: 0.09,
        h: 0.09,
        fill: { color: toHexColor(datum.color, "2563EB") },
        line: { color: "FFFFFF", width: 0.5 },
        rotate: element.rotation || undefined,
      })
      if (element.chartShowValues) {
        addChartLabel(slide, element, String(datum.value), {
          x: point.x - 0.22,
          y: Math.max(frame.y, point.y - 0.28),
          w: 0.44,
          h: 0.16,
        })
      }
      addChartLabel(slide, element, datum.label, {
        x: point.x - 0.35,
        y: frame.y + frame.h * 0.86,
        w: 0.7,
        h: 0.18,
      })
    })
    return
  }

  if (element.chartType === "horizontalBar") {
    const slotHeight = (bottom - top) / data.length
    const barHeight = Math.max(0.12, slotHeight * 0.56)

    data.forEach((datum, index) => {
      const width = Math.max(0.04, (datum.value / maxValue) * (right - left))
      const y = top + index * slotHeight + (slotHeight - barHeight) / 2

      slide.addShape(pptx.ShapeType.rect, {
        x: left,
        y,
        w: width,
        h: barHeight,
        fill: { color: toHexColor(datum.color, "2563EB") },
        line: TRANSPARENT_LINE,
        rotate: element.rotation || undefined,
      })
      addChartLabel(slide, element, datum.label, {
        x: Math.max(frame.x, left - 0.7),
        y: y + barHeight * 0.18,
        w: 0.62,
        h: Math.max(0.12, barHeight * 0.7),
      })
      if (element.chartShowValues) {
        addChartLabel(slide, element, String(datum.value), {
          x: Math.min(right - 0.1, left + width + 0.04),
          y: y + barHeight * 0.18,
          w: 0.42,
          h: Math.max(0.12, barHeight * 0.7),
        })
      }
    })
    return
  }

  const slotWidth = (right - left) / data.length
  const barWidth = Math.max(0.16, slotWidth * 0.55)

  data.forEach((datum, index) => {
    const height = Math.max(0.03, (datum.value / maxValue) * (bottom - top))
    const x = left + index * slotWidth + (slotWidth - barWidth) / 2
    const y = bottom - height

    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: barWidth,
      h: height,
      fill: { color: toHexColor(datum.color, "2563EB") },
      line: TRANSPARENT_LINE,
      rotate: element.rotation || undefined,
    })
    if (element.chartShowValues) {
      addChartLabel(slide, element, String(datum.value), {
        x: x - 0.08,
        y: Math.max(frame.y, y - 0.25),
        w: barWidth + 0.16,
        h: 0.16,
      })
    }
    addChartLabel(slide, element, datum.label, {
      x: x - 0.08,
      y: frame.y + frame.h * 0.86,
      w: barWidth + 0.16,
      h: 0.18,
    })
  })
}

function addVideoElement(
  pptx: PptxGenJS,
  slide: PptxSlide,
  element: PresentationElement,
  options?: PptxDeckExportOptions,
) {
  const media = pptxMediaExportDecision(element, options)
  if (media.mode === "native" && media.data) {
    slide.addMedia({
      data: media.data,
      extn: media.extn,
      objectName: element.alt || "Video",
      type: "video",
      ...slideFrame(element),
    })
    return
  }

  const frame = slideFrame(element)
  const trimLabel = mediaTrimLabel(element)
  const caption = element.mediaCaption.trim()
  const captionSummary = mediaCaptionCues(element).length
    ? mediaCaptionCueSummary(element)
    : ""

  slide.addShape(pptx.ShapeType.rect, {
    ...frame,
    fill: { color: toHexColor(element.background, "020617") },
    line: { color: "1E293B", width: 1 },
    rotate: element.rotation || undefined,
  })
  slide.addText(
    [
      "Video",
      element.alt || "Embedded video",
      element.mediaAutoplay ? "Autoplay" : "",
      trimLabel,
      caption,
      captionSummary,
      media.reason,
    ]
      .filter(Boolean)
      .join("\n"),
    {
    x: frame.x,
    y: frame.y + frame.h * 0.34,
    w: frame.w,
    h: frame.h * 0.32,
    align: "center",
    bold: true,
    breakLine: false,
    color: "E2E8F0",
    fit: "shrink",
    fontFace: pptxFontFace(element.fontFamily),
    fontSize: Math.max(10, Math.min(22, pointSize(element))),
    margin: 0.08,
    rotate: element.rotation || undefined,
    valign: "middle",
    },
  )
}

function addAudioElement(
  pptx: PptxGenJS,
  slide: PptxSlide,
  element: PresentationElement,
  options?: PptxDeckExportOptions,
) {
  const media = pptxMediaExportDecision(element, options)
  if (media.mode === "native" && media.data) {
    slide.addMedia({
      data: media.data,
      extn: media.extn,
      objectName: element.alt || "Audio",
      type: "audio",
      ...slideFrame(element),
    })
    return
  }

  const frame = slideFrame(element)
  const trimLabel = mediaTrimLabel(element)
  const caption = element.mediaCaption.trim()
  const captionSummary = mediaCaptionCues(element).length
    ? mediaCaptionCueSummary(element)
    : ""

  slide.addShape(pptx.ShapeType.roundRect, {
    ...frame,
    fill: { color: toHexColor(element.background, "0F172A") },
    line: { color: "334155", width: 1 },
    rotate: element.rotation || undefined,
  })
  slide.addText(
    [
      `Audio: ${element.alt || "Embedded audio"}`,
      element.mediaAutoplay ? "Autoplay" : "",
      trimLabel,
      caption,
      captionSummary,
      media.reason,
    ]
      .filter(Boolean)
      .join("\n"),
    {
    x: frame.x + 0.16,
    y: frame.y + frame.h * 0.28,
    w: Math.max(0.1, frame.w - 0.32),
    h: frame.h * 0.44,
    align: "center",
    bold: true,
    color: "E2E8F0",
    fit: "shrink",
    fontFace: pptxFontFace(element.fontFamily),
    fontSize: Math.max(9, Math.min(18, pointSize(element))),
    margin: 0,
    rotate: element.rotation || undefined,
    valign: "middle",
    },
  )
}

function slideNotes(deck: Deck, slide: Slide, options?: PptxDeckExportOptions) {
  const notes = slide.notes.trim()
  const actionNotes = serializeSlideActionSettingNotes(deck, slide)
  const animationNotes = serializePptxAnimationHandoffNotes(slide, deck)
  const connectorNotes = serializePptxConnectorHandoffNotes(slide)
  const transitionNotes = serializePptxTransitionHandoffNotes(slide)
  const mediaExportNotes = serializePptxMediaExportHandoffNotes(slide, options)
  const mediaCaptionNotes = serializeMediaCaptionHandoffNotes(slide)
  const comments = (slide.comments ?? []).filter((comment) => !comment.resolved)
  const commentNotes = comments.map((comment) => {
    const target = slide.elements.find((element) => element.id === comment.targetElementId)
    const targetLabel = target?.type ? `${target.type} object` : "slide"
    const mentions = (comment.mentions ?? []).map(mentionLabel).join(" ")
    const suffix = mentions ? ` (${mentions})` : ""
    return `${comment.authorName} on ${targetLabel}: ${comment.body}${suffix}`
  })

  return [
    notes,
    actionNotes,
    animationNotes,
    connectorNotes,
    transitionNotes,
    mediaExportNotes,
    mediaCaptionNotes,
    commentNotes.length ? `Open comments:\n${commentNotes.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

function addMasterOverlay(slide: PptxSlide, deck: Deck, slideNumber: number) {
  if (!masterHasVisibleContent(deck.master)) return

  const parts = masterFooterParts({
    master: deck.master,
    slideNumber,
    slideCount: deck.slides.length,
  })
  const shared = {
    color: toHexColor(deck.master.color, "64748B"),
    fontFace: pptxFontFace(deck.master.fontFamily),
    fontSize: Math.max(5, deck.master.fontSize * 0.75),
    margin: 0,
  } satisfies PptxGenJS.TextPropsOptions
  const y = PPTX_HEIGHT * 0.94
  const h = 0.22

  slide.addText(parts.left || " ", {
    ...shared,
    x: PPTX_WIDTH * 0.06,
    y,
    w: PPTX_WIDTH * 0.24,
    h,
    align: "left",
  })
  slide.addText(parts.center || " ", {
    ...shared,
    x: PPTX_WIDTH * 0.32,
    y,
    w: PPTX_WIDTH * 0.36,
    h,
    align: "center",
  })
  slide.addText(parts.right || " ", {
    ...shared,
    x: PPTX_WIDTH * 0.7,
    y,
    w: PPTX_WIDTH * 0.24,
    h,
    align: "right",
  })
}

function addSlideToDeck(
  pptx: PptxGenJS,
  deck: Deck,
  slide: Slide,
  index: number,
  options?: PptxDeckExportOptions,
) {
  const pptxSlide = pptx.addSlide()
  const assets = deckAssetMap(deck.assets)
  const notes = slideNotes(deck, slide, options)

  pptxSlide.background = { color: toHexColor(slide.background, "FFFFFF") }

  visibleElements(slide).forEach((element) => {
    if (element.type === "image") {
      addImageElement(pptx, pptxSlide, element, assets)
      addElementLinkOverlay(pptx, pptxSlide, element, deck)
      return
    }

    if (element.type === "shape") {
      addShapeElement(pptx, pptxSlide, element)
      addElementLinkOverlay(pptx, pptxSlide, element, deck)
      return
    }

    if (element.type === "icon") {
      addIconElement(pptxSlide, element)
      addElementLinkOverlay(pptx, pptxSlide, element, deck)
      return
    }

    if (element.type === "table") {
      addTableElement(pptx, pptxSlide, element)
      addElementLinkOverlay(pptx, pptxSlide, element, deck)
      return
    }

    if (element.type === "chart") {
      addChartElement(pptx, pptxSlide, element)
      addElementLinkOverlay(pptx, pptxSlide, element, deck)
      return
    }

    if (element.type === "video") {
      addVideoElement(pptx, pptxSlide, element, options)
      addElementLinkOverlay(pptx, pptxSlide, element, deck)
      return
    }

    if (element.type === "audio") {
      addAudioElement(pptx, pptxSlide, element, options)
      addElementLinkOverlay(pptx, pptxSlide, element, deck)
      return
    }

    addTextElement(pptxSlide, element)
    addElementLinkOverlay(pptx, pptxSlide, element, deck)
  })

  addMasterOverlay(pptxSlide, deck, index + 1)

  if (notes) {
    pptxSlide.addNotes(notes)
  }
}

export function deckPptxFileName(deck: Deck) {
  return `${fileSafeName(deck.title || "deck")}.pptx`
}

function createPptxDeck(deck: Deck, options?: PptxDeckExportOptions) {
  const pptx = new PptxGenJS()

  pptx.layout = "LAYOUT_WIDE"
  pptx.author = "essencefromexistence"
  pptx.company = "Essence"
  pptx.subject = "Essence PowerPoint deck"
  pptx.theme = officeThemePptxFontFaces(
    deck.master.officeTheme,
    pptxFontFace(deck.master.fontFamily),
  )
  pptx.title = deck.title || "Untitled deck"

  deck.slides.forEach((slide, index) =>
    addSlideToDeck(pptx, deck, slide, index, options),
  )

  return pptx
}

function toPptxBlob(output: string | ArrayBuffer | Blob | Uint8Array) {
  if (output instanceof Blob) {
    return output
  }

  if (output instanceof Uint8Array) {
    const buffer = new ArrayBuffer(output.byteLength)
    new Uint8Array(buffer).set(output)

    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
  }

  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  })
}

export async function exportDeckToPptxBlob(
  deck: Deck,
  options?: PptxDeckExportOptions,
) {
  const blob = toPptxBlob(
    await createPptxDeck(deck, options).write({
      compression: true,
      outputType: "blob",
    }),
  )
  const transitionBlob = await applyNativePptxTransitionsToBlob(deck, blob)

  return applyNativePptxAnimationsToBlob(deck, transitionBlob)
}

export async function exportDeckToPptx(
  deck: Deck,
  options?: PptxDeckExportOptions,
) {
  downloadBlob(deckPptxFileName(deck), await exportDeckToPptxBlob(deck, options))
}

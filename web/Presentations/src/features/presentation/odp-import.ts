import { nanoid } from "nanoid"
import { strFromU8, unzipSync } from "fflate"

import {
  defaultChartPalette,
  normalizeChartData,
  normalizeChartSeries,
} from "./chart-formatting"
import { createElement } from "./default-deck"
import { createImageAsset } from "./deck-assets"
import {
  odpImportPreflightFromEntries,
  type OdpImportPreflightReport,
} from "./odp-import-preflight"
import { defaultConnectorGeometryForShape } from "./shape-geometry"
import { defaultDeckMaster } from "./slide-master"
import type {
  ChartDatum,
  ChartSeries,
  ChartType,
  Deck,
  PresentationElement,
  ShapeKind,
  ShapeStrokeDash,
  TableCellStyle,
  Slide,
  SlideTransition,
  TableCellMerge,
} from "./types"

type ZipEntries = Record<string, Uint8Array>

type ParsedOdpSlide = {
  assets: Deck["assets"]
  slide: Slide
}

type OdpGraphicStyle = {
  fillColor: string
  noFill: boolean
  noStroke: boolean
  strokeColor: string
  strokeDash: ShapeStrokeDash
  strokeWidth: number
}

type OdpTableCellStyle = {
  background?: string
  borderBottomColor?: string
  borderColor?: string
  borderLeftColor?: string
  borderRightColor?: string
  borderTopColor?: string
  color?: string
  fontWeight?: 400 | 500 | 600 | 700
}

export type OdpImportResult = {
  deck: Deck
  report: OdpImportPreflightReport
}

const ODP_IMAGE_MIME_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
}

const ODP_MEDIA_MIME_TYPES: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/mp4",
  m4v: "video/m4v",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  wav: "audio/wav",
}

const ODP_SLIDE_WIDTH_INCHES = 10
const ODP_SLIDE_HEIGHT_INCHES = 5.625
const MAX_ODP_TABLE_COLUMNS = 8
const MAX_ODP_TABLE_ROWS = 12
const DEFAULT_GRAPHIC_STYLE: OdpGraphicStyle = {
  fillColor: "#dbeafe",
  noFill: false,
  noStroke: false,
  strokeColor: "#2563eb",
  strokeDash: "solid",
  strokeWidth: 2,
}

const ODP_CUSTOM_SHAPE_KINDS: Record<string, ShapeKind> = {
  arrow: "rightArrow",
  callout: "speechBubble",
  chevron: "chevron",
  diamond: "diamond",
  ellipse: "ellipse",
  hexagon: "hexagon",
  pentagon: "pentagon",
  plus: "plus",
  rectangle: "rectangle",
  "right-arrow": "rightArrow",
  "round-rectangle": "rounded",
  star: "star",
  star5: "star",
  trapezoid: "trapezoid",
  triangle: "triangle",
}

function zipText(entries: ZipEntries, path: string) {
  const entry = entries[path]
  return entry ? strFromU8(entry) : ""
}

function parseXml(value: string) {
  if (!value.trim()) return null

  return new DOMParser().parseFromString(value, "application/xml")
}

function allElements(document: Document | Element | null) {
  return document ? Array.from(document.getElementsByTagName("*")) : []
}

function elementLocalName(element: Element) {
  return element.localName || element.nodeName.split(":").pop() || element.nodeName
}

function elementNamespace(element: Element) {
  return element.namespaceURI || ""
}

function attributeValue(element: Element | null, name: string) {
  if (!element) return ""

  return (
    element.getAttribute(name) ??
    Array.from(element.attributes).find((attribute) => {
      return attribute.localName === name || attribute.name.endsWith(`:${name}`)
    })?.value ??
    ""
  )
}

function isPresentationPage(element: Element) {
  return (
    elementLocalName(element) === "page" &&
    elementNamespace(element).includes("drawing")
  )
}

function isSpeakerNotes(element: Element) {
  return (
    elementLocalName(element) === "notes" &&
    elementNamespace(element).includes("presentation")
  )
}

function isTextBlock(element: Element) {
  const localName = elementLocalName(element)
  const namespace = elementNamespace(element)

  return (
    (localName === "p" || localName === "h") &&
    namespace.includes("text")
  )
}

function isDrawImage(element: Element) {
  return (
    elementLocalName(element) === "image" &&
    elementNamespace(element).includes("drawing")
  )
}

function isDrawShape(element: Element) {
  const localName = elementLocalName(element)

  return (
    elementNamespace(element).includes("drawing") &&
    (localName === "connector" ||
      localName === "custom-shape" ||
      localName === "ellipse" ||
      localName === "line" ||
      localName === "rect")
  )
}

function isDrawPlugin(element: Element) {
  return (
    elementLocalName(element) === "plugin" &&
    elementNamespace(element).includes("drawing")
  )
}

function isDrawObject(element: Element) {
  return (
    elementLocalName(element) === "object" &&
    elementNamespace(element).includes("drawing")
  )
}

function isOdpChart(element: Element) {
  return (
    elementLocalName(element) === "chart" &&
    elementNamespace(element).includes("chart")
  )
}

function isOdpTable(element: Element) {
  return (
    elementLocalName(element) === "table" &&
    elementNamespace(element).includes("table")
  )
}

function isOdpTableRow(element: Element) {
  return (
    elementLocalName(element) === "table-row" &&
    elementNamespace(element).includes("table")
  )
}

function isOdpTableCell(element: Element) {
  const localName = elementLocalName(element)

  return (
    elementNamespace(element).includes("table") &&
    (localName === "covered-table-cell" || localName === "table-cell")
  )
}

function isHeading(element: Element) {
  return elementLocalName(element) === "h" && elementNamespace(element).includes("text")
}

function isInsideSpeakerNotes(element: Element) {
  let current: Element | null = element

  while (current) {
    if (isSpeakerNotes(current)) return true
    current = current.parentElement
  }

  return false
}

function isInsideOdpTable(element: Element) {
  let current: Element | null = element

  while (current) {
    if (isOdpTable(current)) return true
    current = current.parentElement
  }

  return false
}

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path
}

function pathExtension(path: string) {
  return path.split(".").at(-1)?.toLowerCase() ?? ""
}

function packagePathFromHref(href: string) {
  const trimmed = href.trim()
  if (!trimmed || /^[a-z]+:/i.test(trimmed)) return ""

  const [path] = trimmed.split(/[?#]/)

  return (path ?? "").replace(/^\.?\//, "")
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

function measureToInches(value: string) {
  const match = /^(-?\d+(?:\.\d+)?)(cm|in|mm|pc|pt|px)?$/i.exec(value.trim())
  if (!match) return null

  const amount = Number(match[1])
  const unit = (match[2] ?? "in").toLowerCase()
  if (!Number.isFinite(amount)) return null

  if (unit === "cm") return amount / 2.54
  if (unit === "mm") return amount / 25.4
  if (unit === "pc") return amount / 6
  if (unit === "pt") return amount / 72
  if (unit === "px") return amount / 96

  return amount
}

function boundedPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback

  return Math.min(100, Math.max(0, value))
}

function frameElementForImage(image: Element) {
  return frameElementForChild(image)
}

function frameElementForChild(element: Element) {
  let current = element.parentElement

  while (current) {
    if (
      elementLocalName(current) === "frame" &&
      elementNamespace(current).includes("drawing")
    ) {
      return current
    }

    current = current.parentElement
  }

  return element
}

function framePercent(
  element: Element,
  attributeName: "height" | "width" | "x" | "y",
  slideMeasure: number,
  fallback: number,
) {
  const inches = measureToInches(attributeValue(element, attributeName))
  if (inches === null) return fallback

  return boundedPercent((inches / slideMeasure) * 100, fallback)
}

function shapePointPercent(
  element: Element,
  attributeName: "x1" | "x2" | "y1" | "y2",
  slideMeasure: number,
  fallback: number,
) {
  const inches = measureToInches(attributeValue(element, attributeName))
  if (inches === null) return fallback

  return boundedPercent((inches / slideMeasure) * 100, fallback)
}

function normalizeColor(value: string, fallback: string) {
  const color = value.trim()

  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback
}

function strokeWidthFromMeasure(value: string, fallback: number) {
  const inches = measureToInches(value)
  if (inches === null) return fallback

  return Math.min(16, Math.max(1, Math.round(inches * 96)))
}

function strokeDashFromValue(value: string): ShapeStrokeDash {
  const normalized = value.toLowerCase()

  if (normalized.includes("dot")) return "dot"
  if (normalized.includes("dash-dot")) return "dashDot"
  if (normalized.includes("dash")) return "dash"

  return "solid"
}

function styleProperties(style: Element) {
  return allElements(style).find(
    (element) =>
      elementLocalName(element) === "graphic-properties" &&
      elementNamespace(element).includes("style"),
  )
}

function graphicStyleFromProperties(properties: Element | undefined) {
  if (!properties) return DEFAULT_GRAPHIC_STYLE

  const fillMode = attributeValue(properties, "fill").toLowerCase()
  const strokeMode = attributeValue(properties, "stroke").toLowerCase()

  return {
    fillColor: normalizeColor(
      attributeValue(properties, "fill-color"),
      DEFAULT_GRAPHIC_STYLE.fillColor,
    ),
    noFill: fillMode === "none",
    noStroke: strokeMode === "none",
    strokeColor: normalizeColor(
      attributeValue(properties, "stroke-color"),
      DEFAULT_GRAPHIC_STYLE.strokeColor,
    ),
    strokeDash: strokeDashFromValue(strokeMode),
    strokeWidth: strokeWidthFromMeasure(
      attributeValue(properties, "stroke-width"),
      DEFAULT_GRAPHIC_STYLE.strokeWidth,
    ),
  } satisfies OdpGraphicStyle
}

function borderColorFromValue(value: string) {
  const match = /#[0-9a-f]{6}/i.exec(value)

  return match ? normalizeColor(match[0], "") : undefined
}

function fontWeightFromValue(value: string): TableCellStyle["fontWeight"] | undefined {
  const normalized = value.toLowerCase()
  const numeric = Number.parseInt(normalized, 10)

  if (normalized.includes("bold")) return 700
  if (Number.isFinite(numeric)) {
    if (numeric >= 700) return 700
    if (numeric >= 600) return 600
    if (numeric >= 500) return 500
    if (numeric >= 400) return 400
  }

  return undefined
}

function tableCellStyleFromProperties(style: Element) {
  const cellProperties = allElements(style).find(
    (element) =>
      elementLocalName(element) === "table-cell-properties" &&
      elementNamespace(element).includes("style"),
  )
  const textProperties = allElements(style).find(
    (element) =>
      elementLocalName(element) === "text-properties" &&
      elementNamespace(element).includes("style"),
  )
  const background = normalizeColor(attributeValue(cellProperties ?? null, "background-color"), "")
  const color = normalizeColor(attributeValue(textProperties ?? null, "color"), "")
  const tableCellStyle: OdpTableCellStyle = {
    ...(background ? { background } : {}),
    ...(color ? { color } : {}),
    ...(fontWeightFromValue(attributeValue(textProperties ?? null, "font-weight"))
      ? {
          fontWeight: fontWeightFromValue(
            attributeValue(textProperties ?? null, "font-weight"),
          ),
        }
      : {}),
  }
  const borderColor = borderColorFromValue(attributeValue(cellProperties ?? null, "border"))
  const borderTopColor = borderColorFromValue(attributeValue(cellProperties ?? null, "border-top"))
  const borderRightColor = borderColorFromValue(attributeValue(cellProperties ?? null, "border-right"))
  const borderBottomColor = borderColorFromValue(attributeValue(cellProperties ?? null, "border-bottom"))
  const borderLeftColor = borderColorFromValue(attributeValue(cellProperties ?? null, "border-left"))

  return {
    ...tableCellStyle,
    ...(borderColor ? { borderColor } : {}),
    ...(borderTopColor ? { borderTopColor } : {}),
    ...(borderRightColor ? { borderRightColor } : {}),
    ...(borderBottomColor ? { borderBottomColor } : {}),
    ...(borderLeftColor ? { borderLeftColor } : {}),
  } satisfies OdpTableCellStyle
}

function odpGraphicStyles(document: Document | null) {
  const styles = new Map<string, OdpGraphicStyle>()

  for (const style of allElements(document).filter(
    (element) =>
      elementLocalName(element) === "style" &&
      elementNamespace(element).includes("style"),
  )) {
    const name = attributeValue(style, "name")
    if (!name) continue

    styles.set(name, graphicStyleFromProperties(styleProperties(style)))
  }

  return styles
}

function odpTableCellStyles(document: Document | null) {
  const styles = new Map<string, OdpTableCellStyle>()

  for (const style of allElements(document).filter(
    (element) =>
      elementLocalName(element) === "style" &&
      elementNamespace(element).includes("style") &&
      attributeValue(element, "family") === "table-cell",
  )) {
    const name = attributeValue(style, "name")
    if (!name) continue

    styles.set(name, tableCellStyleFromProperties(style))
  }

  return styles
}

function graphicStyleForElement(
  element: Element,
  styles: Map<string, OdpGraphicStyle>,
) {
  const namedStyle = styles.get(attributeValue(element, "style-name"))

  return {
    ...DEFAULT_GRAPHIC_STYLE,
    ...namedStyle,
    fillColor: normalizeColor(
      attributeValue(element, "fill-color"),
      namedStyle?.fillColor ?? DEFAULT_GRAPHIC_STYLE.fillColor,
    ),
    strokeColor: normalizeColor(
      attributeValue(element, "stroke-color"),
      namedStyle?.strokeColor ?? DEFAULT_GRAPHIC_STYLE.strokeColor,
    ),
  } satisfies OdpGraphicStyle
}

function textBlocks(root: Element, options: { notes: boolean }) {
  return allElements(root)
    .filter((element) => isTextBlock(element))
    .filter((element) =>
      options.notes ? isInsideSpeakerNotes(element) : !isInsideSpeakerNotes(element),
    )
    .filter((element) => !isInsideOdpTable(element))
    .map((element) => ({
      heading: isHeading(element),
      text: cleanText(element.textContent),
    }))
    .filter((block) => block.text.length > 0)
}

function pageName(page: Element, index: number) {
  return (
    cleanText(
      page.getAttribute("draw:name") ??
        page.getAttribute("name") ??
        page.getAttribute("presentation:name"),
    ) || `ODP slide ${index + 1}`
  )
}

function slideTitle(page: Element, index: number) {
  const blocks = textBlocks(page, { notes: false })
  const heading = blocks.find((block) => block.heading)

  return heading?.text || blocks[0]?.text || pageName(page, index)
}

function slideBody(page: Element, title: string) {
  const blocks = textBlocks(page, { notes: false })
  const titleIndex = blocks.findIndex((block) => block.text === title)
  const bodyBlocks = blocks.filter((_, index) => index !== titleIndex)

  return bodyBlocks.map((block) => block.text).join("\n")
}

function slideNotes(page: Element) {
  return textBlocks(page, { notes: true })
    .map((block) => block.text)
    .join("\n")
}

function titleElement(content: string): PresentationElement {
  return {
    ...createElement("title"),
    content,
    x: 8,
    y: 9,
    width: 78,
    height: 13,
    fontSize: 34,
  }
}

function bodyElement(content: string): PresentationElement {
  return {
    ...createElement("text"),
    content,
    x: 9,
    y: 30,
    width: 74,
    height: 40,
    fontSize: 22,
    color: "#374151",
    lineHeight: 1.2,
  }
}

function imageAssetFromOdpEntry(entries: ZipEntries, path: string) {
  const bytes = entries[path]
  const mimeType = ODP_IMAGE_MIME_TYPES[pathExtension(path)] ?? ""
  if (!bytes || !mimeType) return null

  return createImageAsset({
    name: fileName(path),
    src: `data:${mimeType};base64,${bytesToBase64(bytes)}`,
  })
}

function manifestMediaTypes(document: Document | null) {
  const mediaTypes = new Map<string, string>()

  for (const fileEntry of allElements(document).filter(
    (element) => elementLocalName(element) === "file-entry",
  )) {
    const path = attributeValue(fileEntry, "full-path")
    const mediaType = attributeValue(fileEntry, "media-type").toLowerCase()

    if (path && /^(audio|video)\//i.test(mediaType)) {
      mediaTypes.set(path, mediaType)
    }
  }

  return mediaTypes
}

function mediaMimeTypeForPath(path: string, manifestTypes: Map<string, string>) {
  return (
    manifestTypes.get(path) ??
    ODP_MEDIA_MIME_TYPES[pathExtension(path)] ??
    ""
  )
}

function mediaElementTypeFromMime(
  mimeType: string,
): Extract<PresentationElement["type"], "audio" | "video"> {
  return mimeType.startsWith("audio/") ? "audio" : "video"
}

function mediaDataUrlFromOdpEntry(
  entries: ZipEntries,
  path: string,
  mimeType: string,
) {
  const bytes = entries[path]
  if (!bytes || !mimeType || !/^(audio|video)\//i.test(mimeType)) return ""

  return `data:${mimeType};base64,${bytesToBase64(bytes)}`
}

function imageElementsFromPage(page: Element, entries: ZipEntries) {
  const assets: Deck["assets"] = []
  const elements: PresentationElement[] = []

  for (const image of allElements(page).filter(isDrawImage)) {
    if (isInsideSpeakerNotes(image)) continue

    const packagePath = packagePathFromHref(attributeValue(image, "href"))
    const asset = packagePath ? imageAssetFromOdpEntry(entries, packagePath) : null
    if (!asset) continue

    const frame = frameElementForImage(image)
    const fallbackOffset = elements.length * 4

    assets.push(asset)
    elements.push({
      ...createElement("image"),
      x: framePercent(frame, "x", ODP_SLIDE_WIDTH_INCHES, 12 + fallbackOffset),
      y: framePercent(frame, "y", ODP_SLIDE_HEIGHT_INCHES, 24 + fallbackOffset),
      width: framePercent(frame, "width", ODP_SLIDE_WIDTH_INCHES, 64),
      height: framePercent(frame, "height", ODP_SLIDE_HEIGHT_INCHES, 40),
      assetId: asset.id,
      src: "",
      alt: fileName(packagePath),
      fit: "contain",
    })
  }

  return { assets, elements }
}

function mediaElementsFromPage(
  page: Element,
  entries: ZipEntries,
  manifestTypes: Map<string, string>,
) {
  const elements: PresentationElement[] = []

  for (const plugin of allElements(page).filter(isDrawPlugin)) {
    if (isInsideSpeakerNotes(plugin)) continue

    const packagePath = packagePathFromHref(attributeValue(plugin, "href"))
    const mimeType = packagePath
      ? mediaMimeTypeForPath(packagePath, manifestTypes)
      : attributeValue(plugin, "mime-type").toLowerCase()
    const src = packagePath
      ? mediaDataUrlFromOdpEntry(entries, packagePath, mimeType)
      : ""

    if (!src || !mimeType) continue

    const type = mediaElementTypeFromMime(mimeType)
    const frame = frameElementForChild(plugin)
    const fallbackOffset = elements.length * 4

    elements.push({
      ...createElement(type),
      x: framePercent(
        frame,
        "x",
        ODP_SLIDE_WIDTH_INCHES,
        type === "audio" ? 18 : 16,
      ),
      y: framePercent(
        frame,
        "y",
        ODP_SLIDE_HEIGHT_INCHES,
        type === "audio" ? 36 + fallbackOffset : 22 + fallbackOffset,
      ),
      width: framePercent(
        frame,
        "width",
        ODP_SLIDE_WIDTH_INCHES,
        type === "audio" ? 42 : 58,
      ),
      height: framePercent(
        frame,
        "height",
        ODP_SLIDE_HEIGHT_INCHES,
        type === "audio" ? 14 : 36,
      ),
      src,
      alt: packagePath ? fileName(packagePath) : "Embedded media",
      fit: "contain",
    })
  }

  return elements
}

function customShapeKind(shape: Element): ShapeKind {
  const enhancedGeometry = allElements(shape).find(
    (element) =>
      elementLocalName(element) === "enhanced-geometry" &&
      elementNamespace(element).includes("drawing"),
  )
  const type = attributeValue(enhancedGeometry ?? shape, "type").toLowerCase()

  return ODP_CUSTOM_SHAPE_KINDS[type] ?? "rectangle"
}

function shapeKindFromElement(shape: Element): ShapeKind {
  const localName = elementLocalName(shape)

  if (localName === "connector") return "elbowConnector"
  if (localName === "custom-shape") return customShapeKind(shape)
  if (localName === "ellipse") return "ellipse"
  if (localName === "line") return "line"

  return "rectangle"
}

function linearShapeFrame(shape: Element) {
  const startX = shapePointPercent(shape, "x1", ODP_SLIDE_WIDTH_INCHES, 20)
  const endX = shapePointPercent(shape, "x2", ODP_SLIDE_WIDTH_INCHES, 80)
  const startY = shapePointPercent(shape, "y1", ODP_SLIDE_HEIGHT_INCHES, 40)
  const endY = shapePointPercent(shape, "y2", ODP_SLIDE_HEIGHT_INCHES, 40)
  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const width = Math.max(1, Math.abs(endX - startX))
  const height = Math.max(1, Math.abs(endY - startY))

  return {
    frame: { x, y, width, height },
    geometry: {
      controlX: 50,
      controlY: 50,
      endX: endX >= startX ? 100 : 0,
      endY: endY >= startY ? 100 : 0,
      startX: startX <= endX ? 0 : 100,
      startY: startY <= endY ? 0 : 100,
    },
  }
}

function boxShapeFrame(shape: Element, index: number) {
  const fallbackOffset = index * 4

  return {
    x: framePercent(shape, "x", ODP_SLIDE_WIDTH_INCHES, 16 + fallbackOffset),
    y: framePercent(shape, "y", ODP_SLIDE_HEIGHT_INCHES, 28 + fallbackOffset),
    width: framePercent(shape, "width", ODP_SLIDE_WIDTH_INCHES, 34),
    height: framePercent(shape, "height", ODP_SLIDE_HEIGHT_INCHES, 18),
  }
}

function shapeElementsFromPage(
  page: Element,
  styles: Map<string, OdpGraphicStyle>,
) {
  const elements: PresentationElement[] = []

  for (const shape of allElements(page).filter(isDrawShape)) {
    if (isInsideSpeakerNotes(shape)) continue

    const shapeKind = shapeKindFromElement(shape)
    const connectorGeometry = defaultConnectorGeometryForShape(shapeKind)
    const isLinear =
      shapeKind === "line" ||
      shapeKind === "arrow" ||
      shapeKind === "doubleArrow" ||
      shapeKind === "elbowConnector" ||
      shapeKind === "curvedConnector"
    const style = graphicStyleForElement(shape, styles)
    const linearFrame = isLinear ? linearShapeFrame(shape) : null
    const frame = linearFrame?.frame ?? boxShapeFrame(shape, elements.length)
    const background = isLinear || style.noFill ? "transparent" : style.fillColor
    const strokeColor = style.noStroke ? "transparent" : style.strokeColor

    if (background === "transparent" && strokeColor === "transparent") continue

    elements.push({
      ...createElement("shape"),
      ...frame,
      background,
      content: "",
      radius: shapeKind === "rounded" ? 8 : 0,
      shapeKind,
      shapeConnectorControlX:
        linearFrame?.geometry.controlX ?? connectorGeometry.controlX,
      shapeConnectorControlY:
        linearFrame?.geometry.controlY ?? connectorGeometry.controlY,
      shapeConnectorEndX: linearFrame?.geometry.endX ?? connectorGeometry.endX,
      shapeConnectorEndY: linearFrame?.geometry.endY ?? connectorGeometry.endY,
      shapeConnectorStartX:
        linearFrame?.geometry.startX ?? connectorGeometry.startX,
      shapeConnectorStartY:
        linearFrame?.geometry.startY ?? connectorGeometry.startY,
      shapeStrokeColor: strokeColor,
      shapeStrokeDash: style.strokeDash,
      shapeStrokeWidth: style.strokeWidth,
    })
  }

  return elements
}

function childElements(element: Element) {
  return Array.from(element.childNodes).filter(
    (node): node is Element => node.nodeType === 1,
  )
}

function readPositiveInt(value: string, fallback: number, max: number) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback

  return Math.min(max, parsed)
}

function parseOdpTableRows(
  table: Element,
  cellStyles: Map<string, OdpTableCellStyle>,
) {
  const rows: string[][] = []
  const merges: TableCellMerge[] = []
  const styles: TableCellStyle[] = []

  for (const rowElement of childElements(table).filter(isOdpTableRow)) {
    if (rows.length >= MAX_ODP_TABLE_ROWS) break

    const rowRepeat = readPositiveInt(
      attributeValue(rowElement, "number-rows-repeated"),
      1,
      MAX_ODP_TABLE_ROWS - rows.length,
    )
    const parsedRow: string[] = []

    for (const cellElement of childElements(rowElement).filter(isOdpTableCell)) {
      if (parsedRow.length >= MAX_ODP_TABLE_COLUMNS) break

      const covered = elementLocalName(cellElement) === "covered-table-cell"
      if (covered) continue

      const repeat = readPositiveInt(
        attributeValue(cellElement, "number-columns-repeated"),
        1,
        MAX_ODP_TABLE_COLUMNS - parsedRow.length,
      )
      const columnSpan = readPositiveInt(
        attributeValue(cellElement, "number-columns-spanned"),
        1,
        MAX_ODP_TABLE_COLUMNS,
      )
      const rowSpan = readPositiveInt(
        attributeValue(cellElement, "number-rows-spanned"),
        1,
        MAX_ODP_TABLE_ROWS,
      )
      const cellStyle = cellStyles.get(attributeValue(cellElement, "style-name"))
      const text = cleanText(cellElement.textContent)

      for (let repeatIndex = 0; repeatIndex < repeat; repeatIndex += 1) {
        const rowIndex = rows.length
        const columnIndex = parsedRow.length

        parsedRow.push(text)

        if (columnSpan > 1 || rowSpan > 1) {
          merges.push({
            id: nanoid(),
            row: rowIndex,
            column: columnIndex,
            rowSpan: Math.min(rowSpan, MAX_ODP_TABLE_ROWS - rowIndex),
            columnSpan: Math.min(
              columnSpan,
              MAX_ODP_TABLE_COLUMNS - columnIndex,
            ),
          })
        }

        if (cellStyle && Object.keys(cellStyle).length) {
          styles.push({
            id: nanoid(),
            row: rowIndex,
            column: columnIndex,
            rowSpan: Math.min(rowSpan, MAX_ODP_TABLE_ROWS - rowIndex),
            columnSpan: Math.min(columnSpan, MAX_ODP_TABLE_COLUMNS - columnIndex),
            ...cellStyle,
          })
        }

        for (
          let spanColumn = 1;
          spanColumn < columnSpan && parsedRow.length < MAX_ODP_TABLE_COLUMNS;
          spanColumn += 1
        ) {
          parsedRow.push("")
        }
      }
    }

    for (let repeatIndex = 0; repeatIndex < rowRepeat; repeatIndex += 1) {
      rows.push([...parsedRow])
    }
  }

  const columns = Math.min(
    MAX_ODP_TABLE_COLUMNS,
    Math.max(1, ...rows.map((row) => row.length)),
  )
  const normalizedRows = rows.length ? rows : [[""]]

  return {
    cells: normalizedRows.flatMap((row) =>
      Array.from({ length: columns }, (_, index) => row[index] ?? ""),
    ),
    columns,
    merges: merges.filter(
      (merge) => merge.row < normalizedRows.length && merge.column < columns,
    ),
    rows: normalizedRows.length,
    styles: styles.filter(
      (style) => style.row < normalizedRows.length && style.column < columns,
    ),
  }
}

function tableElementsFromPage(
  page: Element,
  cellStyles: Map<string, OdpTableCellStyle>,
) {
  const elements: PresentationElement[] = []

  for (const table of allElements(page).filter(isOdpTable)) {
    if (isInsideSpeakerNotes(table)) continue

    const parsed = parseOdpTableRows(table, cellStyles)
    const frame = frameElementForChild(table)
    const fallbackOffset = elements.length * 4

    if (!parsed.cells.some((cell) => cell.trim())) continue

    elements.push({
      ...createElement("table"),
      x: framePercent(frame, "x", ODP_SLIDE_WIDTH_INCHES, 12 + fallbackOffset),
      y: framePercent(frame, "y", ODP_SLIDE_HEIGHT_INCHES, 28 + fallbackOffset),
      width: framePercent(frame, "width", ODP_SLIDE_WIDTH_INCHES, 72),
      height: framePercent(frame, "height", ODP_SLIDE_HEIGHT_INCHES, 30),
      content: "",
      fontSize: 14,
      tableRows: parsed.rows,
      tableColumns: parsed.columns,
      tableCells: parsed.cells,
      tableCellMerges: parsed.merges,
      tableCellStyles: parsed.styles,
      tableHeaderRow: true,
      tableStyle: "grid",
      tableBandedRows: true,
      tableBorderColor: "#cbd5e1",
    })
  }

  return elements
}

function packageObjectContent(entries: ZipEntries, href: string) {
  const packagePath = packagePathFromHref(href).replace(/\/$/, "")
  if (!packagePath) return null

  return parseXml(zipText(entries, `${packagePath}/content.xml`))
}

function chartTypeFromOdpClass(value: string): ChartType {
  const normalized = value.toLowerCase()

  if (normalized.includes("area")) return "area"
  if (normalized.includes("circle") || normalized.includes("pie")) return "pie"
  if (normalized.includes("line") || normalized.includes("scatter")) return "line"
  if (normalized.includes("ring") || normalized.includes("donut")) return "donut"

  return "bar"
}

function numericCellValue(value: string) {
  const normalized = value.replace(/[$,%\s]/g, "").replace(/,/g, "")
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

function tableRowsForChart(table: Element) {
  const rows: string[][] = []

  for (const rowElement of childElements(table).filter(isOdpTableRow)) {
    const row: string[] = []

    for (const cellElement of childElements(rowElement).filter(isOdpTableCell)) {
      if (elementLocalName(cellElement) === "covered-table-cell") continue

      const repeat = readPositiveInt(
        attributeValue(cellElement, "number-columns-repeated"),
        1,
        MAX_ODP_TABLE_COLUMNS - row.length,
      )
      const text = cleanText(cellElement.textContent)

      for (let index = 0; index < repeat && row.length < MAX_ODP_TABLE_COLUMNS; index += 1) {
        row.push(text)
      }
    }

    if (row.some(Boolean)) rows.push(row)
    if (rows.length >= MAX_ODP_TABLE_ROWS) break
  }

  return rows
}

function chartDataFromOdpTable(table: Element | undefined): ChartDatum[] {
  if (!table) return []

  const rows = tableRowsForChart(table)
  const [headerRow] = rows
  const dataRows = rows.length > 1 ? rows.slice(1) : rows
  const hasMultipleSeries = Boolean(headerRow && headerRow.length > 2)
  const data = dataRows.flatMap((row, rowIndex) => {
    const categoryLabel = row[0]?.trim() || `Item ${rowIndex + 1}`
    const numericCells = row
      .slice(1)
      .map((cell, cellIndex) => ({
        seriesLabel:
          headerRow?.[cellIndex + 1]?.trim() || `Series ${cellIndex + 1}`,
        value: numericCellValue(cell),
      }))
      .filter((cell): cell is { seriesLabel: string; value: number } => {
        return cell.value !== null
      })

    return numericCells.map((cell, cellIndex) => {
      const datumIndex = rowIndex * Math.max(1, numericCells.length) + cellIndex

      return {
        label: hasMultipleSeries
          ? `${categoryLabel} - ${cell.seriesLabel}`
          : categoryLabel,
        value: cell.value,
        color: defaultChartPalette[datumIndex % defaultChartPalette.length],
      }
    })
  })

  return data.length ? normalizeChartData(data) : []
}

function chartSeriesFromOdpTable(table: Element | undefined): ChartSeries[] {
  if (!table) return []

  const rows = tableRowsForChart(table)
  const [headerRow] = rows
  const dataRows = rows.length > 1 ? rows.slice(1) : rows
  const seriesCount = Math.max(
    1,
    Math.min(
      4,
      Math.max(...dataRows.map((row) => Math.max(0, row.length - 1))),
      Math.max(0, (headerRow?.length ?? 1) - 1),
    ),
  )

  return normalizeChartSeries(
    Array.from({ length: seriesCount }, (_, seriesIndex) => ({
      id: `odp-series-${seriesIndex + 1}`,
      name: headerRow?.[seriesIndex + 1]?.trim() || `Series ${seriesIndex + 1}`,
      color: defaultChartPalette[seriesIndex % defaultChartPalette.length],
      data: dataRows.flatMap((row, rowIndex) => {
        const value = numericCellValue(row[seriesIndex + 1] ?? "")

        return value === null
          ? []
          : [
              {
                label: row[0]?.trim() || `Item ${rowIndex + 1}`,
                value,
              },
            ]
      }),
    })),
  )
}

function chartTitle(chart: Element) {
  const title = allElements(chart).find(
    (element) =>
      elementLocalName(element) === "title" &&
      elementNamespace(element).includes("chart"),
  )

  return cleanText(title?.textContent) || "Imported chart"
}

function chartElementFromChart(chart: Element, frame: Element, index: number) {
  const table = allElements(chart).find(isOdpTable)
  const data = chartDataFromOdpTable(table)
  const series = chartSeriesFromOdpTable(table)
  if (!data.length) return null

  const fallbackOffset = index * 4

  return {
    ...createElement("chart"),
    x: framePercent(frame, "x", ODP_SLIDE_WIDTH_INCHES, 14 + fallbackOffset),
    y: framePercent(frame, "y", ODP_SLIDE_HEIGHT_INCHES, 24 + fallbackOffset),
    width: framePercent(frame, "width", ODP_SLIDE_WIDTH_INCHES, 62),
    height: framePercent(frame, "height", ODP_SLIDE_HEIGHT_INCHES, 38),
    content: chartTitle(chart),
    chartType: chartTypeFromOdpClass(attributeValue(chart, "class")),
    chartData: data,
    chartSeries: series,
    chartShowLegend: Boolean(
      allElements(chart).find(
        (element) =>
          elementLocalName(element) === "legend" &&
          elementNamespace(element).includes("chart"),
      ),
    ),
    chartShowValues: true,
    background: "#ffffff",
    radius: 8,
  } satisfies PresentationElement
}

function chartElementFromPackageObject(
  object: Element,
  entries: ZipEntries,
  index: number,
) {
  const document = packageObjectContent(entries, attributeValue(object, "href"))
  const chart = allElements(document).find(isOdpChart)
  if (!chart) return null

  return chartElementFromChart(chart, frameElementForChild(object), index)
}

function chartElementsFromPage(page: Element, entries: ZipEntries) {
  const elements: PresentationElement[] = []

  for (const chart of allElements(page).filter(isOdpChart)) {
    if (isInsideSpeakerNotes(chart)) continue

    const element = chartElementFromChart(
      chart,
      frameElementForChild(chart),
      elements.length,
    )

    if (element) elements.push(element)
  }

  for (const object of allElements(page).filter(isDrawObject)) {
    if (isInsideSpeakerNotes(object)) continue

    const element = chartElementFromPackageObject(
      object,
      entries,
      elements.length,
    )

    if (element) elements.push(element)
  }

  return elements
}

function durationToMs(value: string, fallback: number) {
  const trimmed = value.trim()
  if (!trimmed) return fallback

  const unitMatch = /^(\d+(?:\.\d+)?)(ms|s)?$/i.exec(trimmed)
  if (unitMatch) {
    const amount = Number(unitMatch[1])
    const unit = unitMatch[2]?.toLowerCase()

    if (Number.isFinite(amount)) {
      return Math.round(unit === "s" ? amount * 1000 : amount)
    }
  }

  const isoMatch =
    /^P(?:T)?(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(
      trimmed,
    )
  if (isoMatch) {
    const hours = Number(isoMatch[1] ?? 0)
    const minutes = Number(isoMatch[2] ?? 0)
    const seconds = Number(isoMatch[3] ?? 0)
    const total = hours * 3_600_000 + minutes * 60_000 + seconds * 1000

    if (Number.isFinite(total) && total > 0) return Math.round(total)
  }

  return fallback
}

function clampDurationMs(value: number, fallback: number, max = 10_000) {
  if (!Number.isFinite(value) || value <= 0) return fallback

  return Math.min(max, Math.max(100, Math.round(value)))
}

function transitionDurationFromSpeed(value: string) {
  const normalized = value.toLowerCase()

  if (normalized === "slow") return 1_000
  if (normalized === "medium" || normalized === "med") return 700

  return 350
}

function transitionFromOdpType(value: string): SlideTransition {
  const normalized = value.toLowerCase()

  if (!normalized) return "none"
  if (normalized.includes("fade") || normalized.includes("dissolve")) return "fade"
  if (normalized.includes("zoom")) return "zoom"
  if (
    normalized.includes("move") ||
    normalized.includes("push") ||
    normalized.includes("slide") ||
    normalized.includes("wipe")
  ) {
    return "push"
  }

  return "fade"
}

function odpSlideTransition(page: Element) {
  const transition = transitionFromOdpType(attributeValue(page, "transition-type"))
  const speedDuration = transitionDurationFromSpeed(
    attributeValue(page, "transition-speed"),
  )
  const transitionDurationMs = clampDurationMs(
    durationToMs(attributeValue(page, "transition-duration"), speedDuration),
    speedDuration,
  )
  const autoAdvanceAfterMs = clampDurationMs(
    durationToMs(attributeValue(page, "duration"), 0),
    0,
    600_000,
  )

  return {
    autoAdvanceAfterMs,
    transition,
    transitionDurationMs,
  }
}

function slideFromPage(
  page: Element,
  index: number,
  entries: ZipEntries,
  styles: Map<string, OdpGraphicStyle>,
  tableCellStyles: Map<string, OdpTableCellStyle>,
  mediaTypes: Map<string, string>,
): ParsedOdpSlide {
  const title = slideTitle(page, index)
  const body = slideBody(page, title)
  const imageImport = imageElementsFromPage(page, entries)
  const shapeElements = shapeElementsFromPage(page, styles)
  const tableElements = tableElementsFromPage(page, tableCellStyles)
  const mediaElements = mediaElementsFromPage(page, entries, mediaTypes)
  const chartElements = chartElementsFromPage(page, entries)
  const transition = odpSlideTransition(page)
  const elements = [titleElement(title)]

  if (body) {
    elements.push(bodyElement(body))
  }

  elements.push(...shapeElements)
  elements.push(...tableElements)
  elements.push(...chartElements)
  elements.push(...mediaElements)
  elements.push(...imageImport.elements)

  return {
    assets: imageImport.assets,
    slide: {
      id: nanoid(),
      title,
      sectionTitle: index === 0 ? "Imported ODP" : "",
      layout: body ? "title-body" : "title",
      background: "#f8fafc",
      transition: transition.transition,
      transitionDurationMs: transition.transitionDurationMs,
      autoAdvanceAfterMs: transition.autoAdvanceAfterMs,
      rehearsalDurationMs: 0,
      notes: slideNotes(page),
      comments: [],
      elements,
    },
  }
}

function deckTitleFromFileName(sourceFileName: string) {
  return (
    sourceFileName
      .replace(/\.odp$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Imported ODP deck"
  )
}

export function importOdpDeckFromEntries(input: {
  entries: ZipEntries
  importedAt?: Date
  sourceFileName: string
}): OdpImportResult {
  const report = odpImportPreflightFromEntries(input)
  const content = parseXml(zipText(input.entries, "content.xml"))
  const pages = allElements(content).filter(isPresentationPage)
  const graphicStyles = odpGraphicStyles(content)
  const tableCellStyles = odpTableCellStyles(content)
  const mediaTypes = manifestMediaTypes(
    parseXml(zipText(input.entries, "META-INF/manifest.xml")),
  )
  const parsedSlides = pages.map((page, index) =>
    slideFromPage(
      page,
      index,
      input.entries,
      graphicStyles,
      tableCellStyles,
      mediaTypes,
    ),
  )
  const slides = parsedSlides.map((entry) => entry.slide)
  const assets = parsedSlides.flatMap((entry) => entry.assets)

  if (!slides.length) {
    throw new Error("No editable slides were found in this ODP package.")
  }

  return {
    deck: {
      id: nanoid(),
      title: deckTitleFromFileName(input.sourceFileName),
      theme: "studio",
      master: defaultDeckMaster,
      assets,
      slides,
      updatedAt: (input.importedAt ?? new Date()).toISOString(),
    },
    report,
  }
}

export async function importOdpDeckWithReport(
  file: File,
): Promise<OdpImportResult> {
  let entries: ZipEntries

  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Error("Could not read this ODP package.")
  }

  return importOdpDeckFromEntries({
    entries,
    sourceFileName: file.name,
  })
}

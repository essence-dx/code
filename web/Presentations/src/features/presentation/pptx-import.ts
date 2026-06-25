import { strFromU8, unzipSync } from "fflate"
import { nanoid } from "nanoid"

import {
  defaultChartPalette,
  normalizeChartData,
  normalizeChartSeries,
} from "./chart-formatting"
import { extractCommentMentions } from "./comment-mentions"
import { createElement } from "./default-deck"
import { createImageAsset } from "./deck-assets"
import {
  pptxCompatibilityWarningsFromEntries,
  type PptxCompatibilityWarning,
} from "./pptx-compatibility"
import { officeThemeMetadataFromPptxThemeXml } from "./office-theme-metadata"
import { defaultDeckMaster } from "./slide-master"
import { defaultConnectorGeometryForShape } from "./shape-geometry"
import {
  clampTableColumns,
  clampTableRows,
  normalizeTableCellMerges,
  normalizeTableCellStyles,
  normalizeTableCells,
} from "./table-formatting"
import type {
  ChartDatum,
  ChartSeries,
  ChartType,
  Deck,
  DeckAsset,
  PresentationElement,
  ShapeArrowhead,
  ShapeKind,
  ShapeStrokeDash,
  Slide,
  SlideComment,
  SlideLayout,
  SlideTransition,
  TableCellMerge,
  TableCellStyle,
  TextAlign,
} from "./types"

type ZipEntries = Record<string, Uint8Array>

type RelationshipMap = Map<string, string>

type SlideSize = {
  cx: number
  cy: number
}

type ElementFrame = {
  height: number
  width: number
  x: number
  y: number
}

type RawFrame = {
  cx: number
  cy: number
  x: number
  y: number
}

type GroupTransform = RawFrame & {
  childCx: number
  childCy: number
  childX: number
  childY: number
}

type FrameMapper = (frame: RawFrame) => RawFrame

type ElementImportContext = {
  groupId: string
  mapFrame?: FrameMapper
  rotation: number
}

type LayoutPlaceholder = {
  color: string
  fontSize: number
  frame: ElementFrame | null
  index: string
  textAlign: TextAlign
  type: string
}

type SlideLayoutContext = {
  background: string
  layout: SlideLayout
  placeholders: LayoutPlaceholder[]
}

type ThemeColorMap = Map<string, string>

type CommentAuthorMap = Map<string, string>

type ParsedPptxSlide = {
  assets: DeckAsset[]
  autoAdvanceAfterMs: number
  background: string
  comments: SlideComment[]
  elements: PresentationElement[]
  layout: SlideLayout
  notes: string
  title: string
  transition: SlideTransition
  transitionDurationMs: number
}

export type PptxImportResult = {
  deck: Deck
  warnings: PptxCompatibilityWarning[]
}

const DEFAULT_SLIDE_SIZE: SlideSize = {
  cx: 12_192_000,
  cy: 6_858_000,
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
}

const PPTX_MEDIA_MIME_TYPES: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/mp4",
  m4v: "video/m4v",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  wav: "audio/wav",
}

const PRESET_SHAPE_KINDS: Record<string, ShapeKind> = {
  bentConnector2: "elbowConnector",
  bentConnector3: "elbowConnector",
  chevron: "chevron",
  curvedConnector2: "curvedConnector",
  curvedConnector3: "curvedConnector",
  diamond: "diamond",
  ellipse: "ellipse",
  hexagon: "hexagon",
  homePlate: "chevron",
  line: "line",
  parallelogram: "parallelogram",
  pentagon: "pentagon",
  plus: "plus",
  rect: "rectangle",
  rightArrow: "rightArrow",
  roundRect: "rounded",
  star5: "star",
  straightConnector1: "line",
  trapezoid: "trapezoid",
  triangle: "triangle",
  wedgeRoundRectCallout: "speechBubble",
}

const TRANSITION_KIND_MAP: Record<string, SlideTransition> = {
  fade: "fade",
  pull: "push",
  push: "push",
  wipe: "push",
  warp: "zoom",
  zoom: "zoom",
}

const GROUP_IMPORT_NODE_NAMES = new Set([
  "cxnSp",
  "graphicFrame",
  "pic",
  "sp",
])

function zipText(entries: ZipEntries, path: string) {
  const value = entries[path]
  return value ? strFromU8(value) : ""
}

function parseXml(text: string) {
  if (!text) return null

  return new DOMParser().parseFromString(text, "application/xml")
}

function descendantElements(root: ParentNode | null) {
  if (!root) return []

  const rootWithSelectors = root as ParentNode & {
    getElementsByTagName?: (name: string) => HTMLCollectionOf<Element>
    querySelectorAll?: (selectors: string) => NodeListOf<Element>
  }

  if (typeof rootWithSelectors.querySelectorAll === "function") {
    return Array.from(rootWithSelectors.querySelectorAll("*"))
  }

  if (typeof rootWithSelectors.getElementsByTagName === "function") {
    return Array.from(rootWithSelectors.getElementsByTagName("*"))
  }

  return []
}

function childElements(root: Element | null) {
  if (!root) return []

  return Array.from(root.childNodes).filter(
    (node): node is Element => node.nodeType === 1,
  )
}

function elementsByName(root: ParentNode | null, localName: string) {
  if (!root) return []

  return descendantElements(root).filter(
    (element) => element.localName === localName,
  )
}

function childByName(root: Element | null, localName: string) {
  if (!root) return null

  return childElements(root).find(
    (element) => element.localName === localName,
  ) ?? null
}

function childrenByName(root: Element | null, localName: string) {
  if (!root) return []

  return childElements(root).filter(
    (element) => element.localName === localName,
  )
}

function firstByName(root: ParentNode | null, localName: string) {
  return elementsByName(root, localName)[0] ?? null
}

function namespacedAttribute(element: Element | null, name: string) {
  if (!element) return ""

  return (
    element.getAttribute(name) ??
    Array.from(element.attributes).find((attribute) => {
      return attribute.localName === name || attribute.name.endsWith(`:${name}`)
    })?.value ??
    ""
  )
}

function numericAttribute(element: Element | null, name: string, fallback = 0) {
  const value = Number(namespacedAttribute(element, name))
  return Number.isFinite(value) ? value : fallback
}

function colorFromNode(
  root: ParentNode | null,
  fallback: string,
  themeColors: ThemeColorMap = new Map(),
) {
  const color = firstByName(root, "srgbClr")?.getAttribute("val")
  if (color) return `#${color}`

  const systemColor = firstByName(root, "sysClr")?.getAttribute("lastClr")
  if (systemColor) return `#${systemColor}`

  const schemeColor = firstByName(root, "schemeClr")?.getAttribute("val")
  return schemeColor ? (themeColors.get(schemeColor) ?? fallback) : fallback
}

function parseThemeColors(entries: ZipEntries): ThemeColorMap {
  const document = parseXml(zipText(entries, "ppt/theme/theme1.xml"))
  const colors: [string, string][] = []
  const scheme = firstByName(document, "clrScheme")

  for (const node of Array.from(scheme?.children ?? [])) {
    const value = colorFromNode(node, "")
    if (node.localName && value) {
      colors.push([node.localName, value])
    }
  }

  const map = new Map(colors)
  if (map.has("lt1") && !map.has("bg1")) map.set("bg1", map.get("lt1") ?? "")
  if (map.has("dk1") && !map.has("tx1")) map.set("tx1", map.get("dk1") ?? "")
  if (map.has("lt2") && !map.has("bg2")) map.set("bg2", map.get("lt2") ?? "")
  if (map.has("dk2") && !map.has("tx2")) map.set("tx2", map.get("dk2") ?? "")

  return map
}

function pptxPartCount(entries: ZipEntries, prefix: string) {
  return Object.keys(entries).filter(
    (path) => path.startsWith(prefix) && path.endsWith(".xml"),
  ).length
}

function pptxPlaceholderDefaultCount(entries: ZipEntries) {
  return Object.keys(entries)
    .filter((path) => {
      return (
        (path.startsWith("ppt/slideLayouts/") ||
          path.startsWith("ppt/slideMasters/")) &&
        path.endsWith(".xml")
      )
    })
    .reduce((count, path) => {
      return count + elementsByName(parseXml(zipText(entries, path)), "ph").length
    }, 0)
}

function normalizeZipPath(baseDir: string, target: string) {
  if (target.startsWith("/")) return target.slice(1)

  const parts = baseDir ? baseDir.split("/") : []
  for (const part of target.split("/")) {
    if (!part || part === ".") continue
    if (part === "..") {
      parts.pop()
      continue
    }
    parts.push(part)
  }

  return parts.join("/")
}

function directoryName(path: string) {
  return path.split("/").slice(0, -1).join("/")
}

function fileName(path: string) {
  return path.split("/").at(-1) ?? path
}

function relationshipsPathFor(path: string) {
  const name = fileName(path)
  return `${directoryName(path)}/_rels/${name}.rels`
}

function firstRelationshipPath(relationships: RelationshipMap, segment: string) {
  return Array.from(relationships.values()).find((path) => path.includes(segment))
}

function parseRelationships(
  entries: ZipEntries,
  relsPath: string,
  baseDir: string,
): RelationshipMap {
  const document = parseXml(zipText(entries, relsPath))
  const relationships = new Map<string, string>()

  for (const relationship of elementsByName(document, "Relationship")) {
    const id = relationship.getAttribute("Id") ?? ""
    const target = relationship.getAttribute("Target") ?? ""
    const mode = relationship.getAttribute("TargetMode") ?? ""

    if (id && target && mode !== "External") {
      relationships.set(id, normalizeZipPath(baseDir, target))
    }
  }

  return relationships
}

function presentationSlideSize(document: XMLDocument | null): SlideSize {
  const size = firstByName(document, "sldSz")
  return {
    cx: numericAttribute(size, "cx", DEFAULT_SLIDE_SIZE.cx),
    cy: numericAttribute(size, "cy", DEFAULT_SLIDE_SIZE.cy),
  }
}

function orderedSlidePaths(entries: ZipEntries, presentation: XMLDocument | null) {
  const relationships = parseRelationships(
    entries,
    "ppt/_rels/presentation.xml.rels",
    "ppt",
  )
  const ordered = elementsByName(presentation, "sldId")
    .map((slideId) => relationships.get(namespacedAttribute(slideId, "id")))
    .filter((path): path is string => Boolean(path))

  if (ordered.length) return ordered

  return Object.keys(entries)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((first, second) => first.localeCompare(second, undefined, {
      numeric: true,
    }))
}

function rawFrameFromXfrm(xfrm: Element | null): RawFrame | null {
  const off = childByName(xfrm, "off")
  const ext = childByName(xfrm, "ext")
  const cx = numericAttribute(ext, "cx")
  const cy = numericAttribute(ext, "cy")

  if (!cx || !cy) return null

  return {
    cx,
    cy,
    x: numericAttribute(off, "x"),
    y: numericAttribute(off, "y"),
  }
}

function xfrmFrame(
  root: Element,
  slideSize: SlideSize,
  mapFrame?: FrameMapper,
): ElementFrame | null {
  const rawFrame = rawFrameFromXfrm(firstByName(root, "xfrm"))
  if (!rawFrame) return null

  const frame = mapFrame ? mapFrame(rawFrame) : rawFrame

  return {
    x: Math.max(0, Math.min(100, (frame.x / slideSize.cx) * 100)),
    y: Math.max(0, Math.min(100, (frame.y / slideSize.cy) * 100)),
    width: Math.max(3, Math.min(100, (frame.cx / slideSize.cx) * 100)),
    height: Math.max(3, Math.min(100, (frame.cy / slideSize.cy) * 100)),
  }
}

function normalizeRotation(degrees: number) {
  return Math.round((((degrees % 360) + 360) % 360) * 10) / 10
}

function rotationFromXfrm(xfrm: Element | null) {
  const raw = Number(xfrm?.getAttribute("rot") ?? 0)
  if (!Number.isFinite(raw)) return 0

  return raw / 60_000
}

function xfrmRotation(root: Element | null, inheritedRotation = 0) {
  return normalizeRotation(
    rotationFromXfrm(firstByName(root, "xfrm")) + inheritedRotation,
  )
}

function directGroupXfrm(group: Element) {
  return childByName(childByName(group, "grpSpPr"), "xfrm")
}

function groupTransformFromNode(group: Element): GroupTransform | null {
  const xfrm = directGroupXfrm(group)
  const frame = rawFrameFromXfrm(xfrm)
  const childOffset = childByName(xfrm, "chOff")
  const childExtent = childByName(xfrm, "chExt")
  const childCx = numericAttribute(childExtent, "cx")
  const childCy = numericAttribute(childExtent, "cy")

  if (!frame || !childCx || !childCy) return null

  return {
    ...frame,
    childCx,
    childCy,
    childX: numericAttribute(childOffset, "x"),
    childY: numericAttribute(childOffset, "y"),
  }
}

function transformGroupedFrame(frame: RawFrame, transform: GroupTransform) {
  const scaleX = transform.cx / transform.childCx
  const scaleY = transform.cy / transform.childCy

  return {
    x: transform.x + (frame.x - transform.childX) * scaleX,
    y: transform.y + (frame.y - transform.childY) * scaleY,
    cx: frame.cx * scaleX,
    cy: frame.cy * scaleY,
  }
}

function ancestorByName(element: Element, localName: string) {
  let parent = element.parentElement

  while (parent) {
    if (parent.localName === localName) return parent
    parent = parent.parentElement
  }

  return null
}

function collectGroupImportContexts(root: ParentNode | null) {
  const contexts = new Map<Element, ElementImportContext>()

  function visitGroup(
    group: Element,
    parentMapper: FrameMapper | undefined,
    parentRotation: number,
  ) {
    const groupId = nanoid()
    const transform = groupTransformFromNode(group)
    const mapFrame = transform
      ? (frame: RawFrame) => {
          const groupedFrame = transformGroupedFrame(frame, transform)
          return parentMapper ? parentMapper(groupedFrame) : groupedFrame
        }
      : parentMapper
    const rotation = parentRotation + rotationFromXfrm(directGroupXfrm(group))

    for (const child of Array.from(group.children)) {
      if (child.localName === "grpSp") {
        visitGroup(child, mapFrame, rotation)
        continue
      }

      if (GROUP_IMPORT_NODE_NAMES.has(child.localName)) {
        contexts.set(child, {
          groupId,
          mapFrame,
          rotation,
        })
      }
    }
  }

  for (const group of elementsByName(root, "grpSp")) {
    if (!ancestorByName(group, "grpSp")) {
      visitGroup(group, undefined, 0)
    }
  }

  return contexts
}

function pptxSlideLayoutFromType(type: string, placeholderTypes: string[]) {
  if (type === "blank") return "blank"
  if (type === "title" || type === "onlyTitle") return "title"
  if (type === "secHead") return "section"
  if (type === "twoObj" || type === "twoTx" || type === "twoColTx") {
    return "two-content"
  }
  if (type === "comparison") return "comparison"
  if (type === "picTx") return "picture-caption"

  const bodyCount = placeholderTypes.filter((value) =>
    ["body", "obj", "dt", "chart", "tbl", "pic"].includes(value),
  ).length

  if (placeholderTypes.includes("pic")) return "picture-caption"
  if (bodyCount >= 2) return "two-content"
  if (placeholderTypes.includes("subTitle") && bodyCount === 0) return "title"

  return "title-body"
}

function textAlignFromShape(shape: Element | null): TextAlign | "" {
  const align = firstByName(shape, "pPr")?.getAttribute("algn") ?? ""
  if (align === "ctr") return "center"
  if (align === "r") return "right"

  return ""
}

function placeholderIndex(shape: Element) {
  return firstByName(shape, "ph")?.getAttribute("idx") ?? ""
}

function layoutPlaceholderFromShape(
  shape: Element,
  slideSize: SlideSize,
  themeColors: ThemeColorMap,
): LayoutPlaceholder | null {
  const placeholder = firstByName(shape, "ph")
  if (!placeholder) return null

  const type = placeholder.getAttribute("type") ?? "body"
  const isTitle = type === "title" || type === "ctrTitle"

  return {
    color: colorFromNode(firstByName(shape, "rPr"), "#111827", themeColors),
    fontSize: fontSizeFromShape(shape, isTitle ? 34 : 21),
    frame: xfrmFrame(shape, slideSize),
    index: placeholder.getAttribute("idx") ?? "",
    textAlign: textAlignFromShape(shape) || "left",
    type,
  }
}

function layoutPlaceholderScore(
  placeholder: LayoutPlaceholder,
  type: string,
  index: string,
) {
  let score = 0

  if (index && placeholder.index === index) score += 4
  if (type && placeholder.type === type) score += 3
  if (!type && !placeholder.index && placeholder.type === "body") score += 1

  return score
}

function layoutPlaceholderForShape(
  shape: Element,
  placeholders: LayoutPlaceholder[],
) {
  const type = placeholderType(shape)
  const index = placeholderIndex(shape)

  return placeholders
    .map((placeholder) => ({
      placeholder,
      score: layoutPlaceholderScore(placeholder, type, index),
    }))
    .filter((match) => match.score > 0)
    .sort((first, second) => second.score - first.score)[0]?.placeholder ?? null
}

function parseLayoutPlaceholders(
  document: XMLDocument | null,
  slideSize: SlideSize,
  themeColors: ThemeColorMap,
) {
  return elementsByName(document, "sp")
    .map((shape) => layoutPlaceholderFromShape(shape, slideSize, themeColors))
    .filter((placeholder): placeholder is LayoutPlaceholder => {
      return placeholder !== null
    })
}

function inheritedBackground(
  themeColors: ThemeColorMap,
  documents: Array<XMLDocument | null>,
) {
  for (const document of documents) {
    const background = firstByName(document, "bg")
    if (background) return colorFromNode(background, "#f8fafc", themeColors)
  }

  return "#f8fafc"
}

function parseSlideLayoutContext(
  entries: ZipEntries,
  relationships: RelationshipMap,
  slideSize: SlideSize,
  themeColors: ThemeColorMap,
): SlideLayoutContext {
  const layoutPath = firstRelationshipPath(relationships, "/slideLayouts/")
  const layoutDocument = layoutPath ? parseXml(zipText(entries, layoutPath)) : null
  const layoutRelationships = layoutPath
    ? parseRelationships(
        entries,
        relationshipsPathFor(layoutPath),
        directoryName(layoutPath),
      )
    : new Map<string, string>()
  const masterPath = firstRelationshipPath(layoutRelationships, "/slideMasters/")
  const masterDocument = masterPath ? parseXml(zipText(entries, masterPath)) : null
  const layoutPlaceholders = parseLayoutPlaceholders(
    layoutDocument,
    slideSize,
    themeColors,
  )
  const masterPlaceholders = parseLayoutPlaceholders(
    masterDocument,
    slideSize,
    themeColors,
  )
  const placeholderTypes = [...layoutPlaceholders, ...masterPlaceholders].map(
    (placeholder) => placeholder.type,
  )
  const layoutType =
    layoutDocument?.documentElement?.getAttribute("type")?.trim() ?? ""

  return {
    background: inheritedBackground(themeColors, [layoutDocument, masterDocument]),
    layout: pptxSlideLayoutFromType(layoutType, placeholderTypes),
    placeholders: [...layoutPlaceholders, ...masterPlaceholders],
  }
}

function presetGeometry(root: Element | null) {
  return firstByName(root, "prstGeom")?.getAttribute("prst") ?? ""
}

function directSolidFill(root: Element | null) {
  return childByName(root, "solidFill")
}

function directNoFill(root: Element | null) {
  return Boolean(childByName(root, "noFill"))
}

function fillColor(
  root: Element | null,
  fallback: string,
  themeColors: ThemeColorMap,
) {
  if (directNoFill(root)) return "transparent"

  const fill = directSolidFill(root)
  return fill ? colorFromNode(fill, fallback, themeColors) : fallback
}

function lineWidth(line: Element | null) {
  const value = numericAttribute(line, "w", 25_400)
  return Math.max(1, Math.min(16, Math.round(value / 12_700)))
}

function lineDash(line: Element | null): ShapeStrokeDash {
  const value = firstByName(line, "prstDash")?.getAttribute("val") ?? ""
  if (value.includes("dot") || value.includes("Dot")) return "dot"
  if (value.includes("dashDot") || value.includes("DashDot")) return "dashDot"
  if (value.includes("dash") || value.includes("Dash")) return "dash"

  return "solid"
}

function arrowheadFromNode(node: Element | null): ShapeArrowhead {
  const type = node?.getAttribute("type") ?? ""
  if (type === "diamond") return "diamond"
  if (type === "oval") return "oval"
  if (type && type !== "none") return "triangle"

  return "none"
}

function linearKind(
  kind: ShapeKind,
  startArrowhead: ShapeArrowhead,
  endArrowhead: ShapeArrowhead,
): ShapeKind {
  if (kind !== "line") return kind
  if (startArrowhead !== "none" && endArrowhead !== "none") return "doubleArrow"
  if (endArrowhead !== "none") return "arrow"

  return "line"
}

function shapeElementFromNode(
  shape: Element,
  slideSize: SlideSize,
  themeColors: ThemeColorMap,
  context?: ElementImportContext,
): PresentationElement | null {
  const spPr = firstByName(shape, "spPr")
  const preset = presetGeometry(spPr)
  const kind = PRESET_SHAPE_KINDS[preset]
  const frame = xfrmFrame(shape, slideSize, context?.mapFrame)
  const placeholder = placeholderType(shape)

  if (!kind || !frame || placeholder) return null

  const line = childByName(spPr, "ln")
  const startArrowhead = arrowheadFromNode(childByName(line, "headEnd"))
  const endArrowhead = arrowheadFromNode(childByName(line, "tailEnd"))
  const shapeKind = linearKind(kind, startArrowhead, endArrowhead)
  const connectorGeometry = defaultConnectorGeometryForShape(shapeKind)
  const isLinear =
    shapeKind === "line" ||
    shapeKind === "arrow" ||
    shapeKind === "doubleArrow" ||
    shapeKind === "elbowConnector" ||
    shapeKind === "curvedConnector"
  const background = isLinear
    ? "transparent"
    : fillColor(spPr, themeColors.get("accent1") ?? "#dbeafe", themeColors)
  const strokeColor = directNoFill(line)
    ? "transparent"
    : fillColor(line, themeColors.get("accent1") ?? "#2563eb", themeColors)

  if (background === "transparent" && strokeColor === "transparent") {
    return null
  }

  return {
    ...createElement("shape"),
    ...frame,
    background,
    radius: shapeKind === "rounded" ? 8 : 0,
    shapeKind,
    shapeConnectorControlX: connectorGeometry.controlX,
    shapeConnectorControlY: connectorGeometry.controlY,
    shapeConnectorEndX: connectorGeometry.endX,
    shapeConnectorEndY: connectorGeometry.endY,
    shapeConnectorStartX: connectorGeometry.startX,
    shapeConnectorStartY: connectorGeometry.startY,
    shapeStrokeColor: strokeColor,
    shapeStrokeDash: lineDash(line),
    shapeStrokeWidth: lineWidth(line),
    shapeStartArrowhead: startArrowhead,
    shapeEndArrowhead: endArrowhead,
    rotation: xfrmRotation(shape, context?.rotation),
    groupId: context?.groupId ?? "",
  } satisfies PresentationElement
}

function paragraphText(paragraph: Element) {
  return elementsByName(paragraph, "t")
    .map((text) => text.textContent ?? "")
    .join("")
    .trim()
}

function shapeText(shape: Element) {
  const txBody = firstByName(shape, "txBody")
  if (!txBody) return ""

  return elementsByName(txBody, "p")
    .map(paragraphText)
    .filter(Boolean)
    .join("\n")
}

function placeholderType(shape: Element) {
  return firstByName(shape, "ph")?.getAttribute("type") ?? ""
}

function fontSizeFromShape(shape: Element, fallback: number) {
  const size = elementsByName(shape, "rPr")
    .map((node) => Number(node.getAttribute("sz")))
    .find((value) => Number.isFinite(value) && value > 0)

  return size ? Math.max(8, Math.min(72, Math.round(size / 100))) : fallback
}

function textElementFromShape(
  shape: Element,
  slideSize: SlideSize,
  index: number,
  themeColors: ThemeColorMap,
  context?: ElementImportContext,
  layoutPlaceholder?: LayoutPlaceholder | null,
): PresentationElement | null {
  const text = shapeText(shape)
  if (!text) return null

  const placeholder = placeholderType(shape)
  const placeholderFrame = layoutPlaceholder?.frame
  const isTitle =
    placeholder === "title" ||
    placeholder === "ctrTitle" ||
    layoutPlaceholder?.type === "title" ||
    layoutPlaceholder?.type === "ctrTitle" ||
    index === 0
  const frame = xfrmFrame(shape, slideSize, context?.mapFrame) ??
    placeholderFrame ?? {
    x: isTitle ? 8 : 10,
    y: isTitle ? 10 : 30 + index * 8,
    width: isTitle ? 78 : 76,
    height: isTitle ? 12 : 18,
  }

  return {
    ...createElement(isTitle ? "title" : "text"),
    ...frame,
    content: text,
    color: colorFromNode(
      firstByName(shape, "rPr"),
      layoutPlaceholder?.color ?? "#111827",
      themeColors,
    ),
    fontSize: fontSizeFromShape(
      shape,
      layoutPlaceholder?.fontSize ?? (isTitle ? 34 : 21),
    ),
    fontWeight: isTitle ? 700 : 500,
    rotation: xfrmRotation(shape, context?.rotation),
    groupId: context?.groupId ?? "",
    textAlign: textAlignFromShape(shape) || layoutPlaceholder?.textAlign || "left",
  } satisfies PresentationElement
}

function pathExtension(path: string) {
  const extension = path.split(".").at(-1)?.toLowerCase() ?? ""

  return extension
}

function imageMimeTypeForPath(path: string) {
  return IMAGE_MIME_TYPES[pathExtension(path)] ?? ""
}

function pptxMediaMimeTypeForPath(path: string) {
  return PPTX_MEDIA_MIME_TYPES[pathExtension(path)] ?? ""
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

function imageAssetFromMedia(entries: ZipEntries, path: string) {
  const bytes = entries[path]
  const mimeType = imageMimeTypeForPath(path)
  if (!bytes || !mimeType) return null

  return createImageAsset({
    name: fileName(path),
    src: `data:${mimeType};base64,${bytesToBase64(bytes)}`,
  })
}

function pictureMediaRelationshipId(picture: Element) {
  const mediaNode =
    firstByName(picture, "videoFile") ?? firstByName(picture, "audioFile")

  return (
    namespacedAttribute(mediaNode, "link") ||
    namespacedAttribute(mediaNode, "embed")
  )
}

function mediaDataUrlFromMedia(
  entries: ZipEntries,
  path: string,
  mimeType: string,
) {
  const bytes = entries[path]
  if (!bytes || !mimeType) return ""

  return `data:${mimeType};base64,${bytesToBase64(bytes)}`
}

function mediaElementTypeFromMime(
  mimeType: string,
): Extract<PresentationElement["type"], "audio" | "video"> {
  return mimeType.startsWith("audio/") ? "audio" : "video"
}

function imageElementsFromSlide(
  entries: ZipEntries,
  slideDocument: XMLDocument | null,
  relationships: RelationshipMap,
  slideSize: SlideSize,
  groupContexts: Map<Element, ElementImportContext>,
) {
  const assets: DeckAsset[] = []
  const elements: PresentationElement[] = []

  for (const picture of elementsByName(slideDocument, "pic")) {
    if (pictureMediaRelationshipId(picture)) continue

    const embedId = namespacedAttribute(firstByName(picture, "blip"), "embed")
    const mediaPath = relationships.get(embedId)
    if (!mediaPath) continue

    const asset = imageAssetFromMedia(entries, mediaPath)
    if (!asset) continue

    const context = groupContexts.get(picture)

    assets.push(asset)
    elements.push({
      ...createElement("image"),
      ...(xfrmFrame(picture, slideSize, context?.mapFrame) ?? {
        x: 12,
        y: 22,
        width: 64,
        height: 42,
      }),
      assetId: asset.id,
      src: "",
      alt: fileName(mediaPath),
      fit: "contain",
      rotation: xfrmRotation(picture, context?.rotation),
      groupId: context?.groupId ?? "",
    })
  }

  return { assets, elements }
}

function mediaElementsFromSlide(
  entries: ZipEntries,
  slideDocument: XMLDocument | null,
  relationships: RelationshipMap,
  slideSize: SlideSize,
  groupContexts: Map<Element, ElementImportContext>,
) {
  const elements: PresentationElement[] = []
  const importedPaths = new Set<string>()

  for (const picture of elementsByName(slideDocument, "pic")) {
    const relationshipId = pictureMediaRelationshipId(picture)
    const mediaPath = relationships.get(relationshipId)
    const mimeType = mediaPath ? pptxMediaMimeTypeForPath(mediaPath) : ""
    const src = mediaPath ? mediaDataUrlFromMedia(entries, mediaPath, mimeType) : ""
    if (!mediaPath || !src || !mimeType) continue

    const type = mediaElementTypeFromMime(mimeType)
    const context = groupContexts.get(picture)
    const frame =
      xfrmFrame(picture, slideSize, context?.mapFrame) ??
      (type === "audio"
        ? { x: 18, y: 36, width: 42, height: 14 }
        : { x: 16, y: 22, width: 58, height: 36 })

    importedPaths.add(mediaPath)
    elements.push({
      ...createElement(type),
      ...frame,
      src,
      alt: fileName(mediaPath),
      fit: "contain",
      rotation: xfrmRotation(picture, context?.rotation),
      groupId: context?.groupId ?? "",
    })
  }

  const unplacedMedia = Array.from(new Set(relationships.values()))
    .filter((path) => path.startsWith("ppt/media/"))
    .filter((path) => !importedPaths.has(path))
    .filter((path) => pptxMediaMimeTypeForPath(path))
    .filter((path) => entries[path])

  for (const mediaPath of unplacedMedia) {
    const mimeType = pptxMediaMimeTypeForPath(mediaPath)
    const src = mediaDataUrlFromMedia(entries, mediaPath, mimeType)
    if (!src) continue

    const type = mediaElementTypeFromMime(mimeType)

    importedPaths.add(mediaPath)
    elements.push({
      ...createElement(type),
      x: type === "audio" ? 18 : 16,
      y:
        type === "audio"
          ? Math.min(78, 36 + elements.length * 4)
          : Math.min(52, 22 + elements.length * 4),
      width: type === "audio" ? 42 : 58,
      height: type === "audio" ? 14 : 36,
      src,
      alt: fileName(mediaPath),
      fit: "contain",
    })
  }

  return { elements, importedPaths }
}

function tableCellText(cell: Element) {
  const paragraphs = elementsByName(cell, "p")
    .map(paragraphText)
    .filter(Boolean)

  if (paragraphs.length) return paragraphs.join("\n")

  return elementsByName(cell, "t")
    .map((text) => text.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
}

function tableCellSpan(cell: Element, name: "gridSpan" | "rowSpan") {
  return Math.max(1, Math.round(numericAttribute(cell, name, 1)))
}

function tableCellBorderColor(
  border: Element | null,
  themeColors: ThemeColorMap,
) {
  return border ? colorFromNode(border, "", themeColors) : ""
}

function tableCellStyleFromNode(
  cell: Element,
  row: number,
  column: number,
  rowSpan: number,
  columnSpan: number,
  themeColors: ThemeColorMap,
): TableCellStyle | null {
  const properties = childByName(cell, "tcPr")
  if (!properties) return null

  const fill = colorFromNode(childByName(properties, "solidFill"), "", themeColors)
  const borders = childByName(properties, "tcBdr")
  const borderBottomColor = tableCellBorderColor(
    childByName(borders, "lnB"),
    themeColors,
  )
  const borderLeftColor = tableCellBorderColor(
    childByName(borders, "lnL"),
    themeColors,
  )
  const borderRightColor = tableCellBorderColor(
    childByName(borders, "lnR"),
    themeColors,
  )
  const borderTopColor = tableCellBorderColor(
    childByName(borders, "lnT"),
    themeColors,
  )
  const textColor = colorFromNode(firstByName(cell, "rPr"), "", themeColors)

  if (
    !fill &&
    !borderBottomColor &&
    !borderLeftColor &&
    !borderRightColor &&
    !borderTopColor &&
    !textColor
  ) {
    return null
  }

  return {
    id: `cell-style-${row}-${column}`,
    row,
    column,
    rowSpan,
    columnSpan,
    ...(fill ? { background: fill } : {}),
    ...(borderBottomColor ? { borderBottomColor } : {}),
    ...(borderLeftColor ? { borderLeftColor } : {}),
    ...(borderRightColor ? { borderRightColor } : {}),
    ...(borderTopColor ? { borderTopColor } : {}),
    ...(textColor ? { color: textColor } : {}),
  }
}

function isTableCellContinuation(cell: Element) {
  return namespacedAttribute(cell, "hMerge") === "1" || namespacedAttribute(cell, "vMerge") === "1"
}

function tableGridFromNode(table: Element, themeColors: ThemeColorMap) {
  const rowNodes = childrenByName(table, "tr")
  const rowCount = clampTableRows(rowNodes.length)
  const columnCount = clampTableColumns(
    Math.max(1, ...rowNodes.map((row) => childrenByName(row, "tc").length)),
  )
  const cells = Array.from({ length: rowCount * columnCount }, () => "")
  const merges: TableCellMerge[] = []
  const styles: TableCellStyle[] = []

  rowNodes.slice(0, rowCount).forEach((rowNode, row) => {
    childrenByName(rowNode, "tc")
      .slice(0, columnCount)
      .forEach((cell, column) => {
        const isContinuation = isTableCellContinuation(cell)
        const rowSpan = Math.min(tableCellSpan(cell, "rowSpan"), rowCount - row)
        const columnSpan = Math.min(
          tableCellSpan(cell, "gridSpan"),
          columnCount - column,
        )

        if (!isContinuation) {
          cells[row * columnCount + column] = tableCellText(cell)
          const cellStyle = tableCellStyleFromNode(
            cell,
            row,
            column,
            rowSpan,
            columnSpan,
            themeColors,
          )
          if (cellStyle) styles.push(cellStyle)
        }

        if (!isContinuation && (rowSpan > 1 || columnSpan > 1)) {
          merges.push({
            id: `merge-${row}-${column}`,
            row,
            column,
            rowSpan,
            columnSpan,
          })
        }
      })
  })

  return {
    cells: normalizeTableCells(cells, rowCount, columnCount),
    columnCount,
    merges: normalizeTableCellMerges(merges, rowCount, columnCount),
    rowCount,
    styles: normalizeTableCellStyles(styles, rowCount, columnCount),
  }
}

function tableElementFromGraphicFrame(
  frameNode: Element,
  slideSize: SlideSize,
  themeColors: ThemeColorMap,
  context?: ElementImportContext,
): PresentationElement | null {
  const table = firstByName(frameNode, "tbl")

  if (!table) return null
  if (!childrenByName(table, "tr").length) return null

  const tableGrid = tableGridFromNode(table, themeColors)
  if (!tableGrid.rowCount) return null
  const tablePr = childByName(table, "tblPr")
  const officeStyleId = childByName(tablePr, "tableStyleId")?.textContent?.trim() ?? ""
  const borderColor = colorFromNode(
    firstByName(table, "tcBdr"),
    themeColors.get("accent1") ?? "#cbd5e1",
    themeColors,
  )

  return {
    ...createElement("table"),
    ...(xfrmFrame(frameNode, slideSize, context?.mapFrame) ?? {
      x: 10,
      y: 28,
      width: 80,
      height: 34,
    }),
    tableRows: tableGrid.rowCount,
    tableColumns: tableGrid.columnCount,
    tableCells: tableGrid.cells,
    tableCellMerges: tableGrid.merges,
    tableCellStyles: tableGrid.styles,
    tableHeaderRow: namespacedAttribute(tablePr, "firstRow") !== "0",
    tableTotalRow: namespacedAttribute(tablePr, "lastRow") === "1",
    tableBorderColor: borderColor,
    tableOfficeStyleId: officeStyleId,
    tableOfficeStyleName: officeStyleId ? "Imported PowerPoint table style" : "",
    tableStyle: namespacedAttribute(tablePr, "bandRow") === "1" ? "accent" : "plain",
    tableBandedRows: namespacedAttribute(tablePr, "bandRow") === "1",
    tableBandedColumns: namespacedAttribute(tablePr, "bandCol") === "1",
    tableFirstColumn: namespacedAttribute(tablePr, "firstCol") === "1",
    tableLastColumn: namespacedAttribute(tablePr, "lastCol") === "1",
    background: "#ffffff",
    color: themeColors.get("tx1") ?? "#111827",
    fontSize: 14,
    fontWeight: 500,
    rotation: xfrmRotation(frameNode, context?.rotation),
    groupId: context?.groupId ?? "",
  } satisfies PresentationElement
}

function supportedChartNode(document: XMLDocument | null) {
  const plotArea = firstByName(document, "plotArea")

  return (
    firstByName(plotArea, "doughnutChart") ??
    firstByName(plotArea, "pieChart") ??
    firstByName(plotArea, "lineChart") ??
    firstByName(plotArea, "areaChart") ??
    firstByName(plotArea, "barChart")
  )
}

function chartTypeFromDocument(document: XMLDocument | null): ChartType | null {
  const node = supportedChartNode(document)
  if (!node) return null

  if (node.localName === "doughnutChart") return "donut"
  if (node.localName === "pieChart") return "pie"
  if (node.localName === "lineChart") return "line"
  if (node.localName === "areaChart") return "area"

  const barDirection = firstByName(node, "barDir")?.getAttribute("val")
  return barDirection === "bar" ? "horizontalBar" : "bar"
}

function chartTitleFromDocument(document: XMLDocument | null) {
  const title = firstByName(document, "title")

  return elementsByName(title, "t")
    .map((text) => text.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
}

function cachePointValues(root: Element | null) {
  return elementsByName(root, "pt")
    .map((point) => ({
      index: numericAttribute(point, "idx"),
      value: firstByName(point, "v")?.textContent?.trim() ?? "",
    }))
    .filter((point) => point.value)
    .sort((first, second) => first.index - second.index)
}

function chartPointColor(
  series: Element,
  index: number,
  themeColors: ThemeColorMap,
) {
  const pointFill = elementsByName(series, "dPt").find((point) => {
    return numericAttribute(firstByName(point, "idx"), "val", -1) === index
  })
  const seriesColor = colorFromNode(
    childByName(series, "spPr"),
    "",
    themeColors,
  )

  return colorFromNode(
    childByName(pointFill ?? null, "spPr"),
    seriesColor || defaultChartPalette[index % defaultChartPalette.length],
    themeColors,
  )
}

function chartSeriesColor(
  series: Element,
  index: number,
  themeColors: ThemeColorMap,
) {
  return colorFromNode(
    childByName(series, "spPr"),
    defaultChartPalette[index % defaultChartPalette.length],
    themeColors,
  )
}

function chartSeriesName(series: Element, index: number) {
  const title = firstByName(series, "tx")
  const text =
    firstByName(title, "v")?.textContent?.trim() ||
    firstByName(title, "t")?.textContent?.trim()

  return text || `Series ${index + 1}`
}

function chartDataFromDocument(
  document: XMLDocument | null,
  themeColors: ThemeColorMap,
): ChartDatum[] {
  const chartNode = supportedChartNode(document)
  if (!chartNode) return []

  for (const series of childrenByName(chartNode, "ser")) {
    const categories = cachePointValues(firstByName(series, "cat"))
    const values = cachePointValues(firstByName(series, "val"))
    const data = values
      .map((point, pointIndex) => {
        const label =
          categories.find((category) => category.index === point.index)?.value ??
          categories[pointIndex]?.value ??
          `Item ${pointIndex + 1}`
        const value = Number(point.value)

        return {
          label,
          value: Number.isFinite(value) ? value : 0,
          color: chartPointColor(series, point.index, themeColors),
        }
      })
      .filter((datum) => datum.value > 0 || datum.label.trim())

    if (data.length) return normalizeChartData(data)
  }

  return []
}

function chartSeriesFromDocument(
  document: XMLDocument | null,
  themeColors: ThemeColorMap,
): ChartSeries[] {
  const chartNode = supportedChartNode(document)
  if (!chartNode) return []

  return normalizeChartSeries(
    childrenByName(chartNode, "ser").map((series, seriesIndex) => {
      const categories = cachePointValues(firstByName(series, "cat"))
      const values = cachePointValues(firstByName(series, "val"))

      return {
        id: `pptx-series-${seriesIndex + 1}`,
        name: chartSeriesName(series, seriesIndex),
        color: chartSeriesColor(series, seriesIndex, themeColors),
        data: values
          .map((point, pointIndex) => {
            const label =
              categories.find((category) => category.index === point.index)
                ?.value ??
              categories[pointIndex]?.value ??
              `Item ${pointIndex + 1}`
            const value = Number(point.value)

            return {
              label,
              value: Number.isFinite(value) ? value : 0,
            }
          })
          .filter((datum) => datum.value > 0 || datum.label.trim()),
      }
    }),
  )
}

function chartElementFromGraphicFrame(
  entries: ZipEntries,
  frameNode: Element,
  relationships: RelationshipMap,
  slideSize: SlideSize,
  themeColors: ThemeColorMap,
  context?: ElementImportContext,
): PresentationElement | null {
  const chartRef = firstByName(frameNode, "chart")
  const chartPath = relationships.get(namespacedAttribute(chartRef, "id"))
  const chartDocument = chartPath ? parseXml(zipText(entries, chartPath)) : null
  const chartType = chartTypeFromDocument(chartDocument)
  const chartData = chartDataFromDocument(chartDocument, themeColors)
  const chartSeries = chartSeriesFromDocument(chartDocument, themeColors)

  if (!chartType || !chartData.length) return null

  return {
    ...createElement("chart"),
    ...(xfrmFrame(frameNode, slideSize, context?.mapFrame) ?? {
      x: 12,
      y: 24,
      width: 72,
      height: 44,
    }),
    content: chartTitleFromDocument(chartDocument) || "Imported chart",
    chartType,
    chartData,
    chartSeries,
    chartShowLegend: Boolean(firstByName(chartDocument, "legend")),
    chartShowValues: true,
    chartAxisColor: themeColors.get("tx1") ?? "#94a3b8",
    background: "#ffffff",
    radius: 8,
    rotation: xfrmRotation(frameNode, context?.rotation),
    groupId: context?.groupId ?? "",
  } satisfies PresentationElement
}

function graphicElementsFromSlide(
  entries: ZipEntries,
  slideDocument: XMLDocument | null,
  relationships: RelationshipMap,
  slideSize: SlideSize,
  themeColors: ThemeColorMap,
  groupContexts: Map<Element, ElementImportContext>,
) {
  return elementsByName(slideDocument, "graphicFrame")
    .map((frameNode) => {
      const context = groupContexts.get(frameNode)

      return (
        tableElementFromGraphicFrame(frameNode, slideSize, themeColors, context) ??
        chartElementFromGraphicFrame(
          entries,
          frameNode,
          relationships,
          slideSize,
          themeColors,
          context,
        )
      )
    })
    .filter((element): element is PresentationElement => element !== null)
}

function slideNotes(entries: ZipEntries, relationships: RelationshipMap) {
  const notesPath = Array.from(relationships.values()).find((path) =>
    path.includes("/notesSlides/"),
  )
  const document = notesPath ? parseXml(zipText(entries, notesPath)) : null

  return elementsByName(document, "t")
    .map((text) => text.textContent?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
}

function timestampFromPptxComment(value: string | null) {
  const timestamp = Date.parse(value ?? "")

  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : new Date().toISOString()
}

export function pptxCommentAuthorsFromXml(value: string): CommentAuthorMap {
  const document = parseXml(value)
  const authors: CommentAuthorMap = new Map()

  for (const author of [
    ...elementsByName(document, "cmAuthor"),
    ...elementsByName(document, "author"),
  ]) {
    const id =
      author.getAttribute("id") ??
      author.getAttribute("userId") ??
      author.getAttribute("authorId") ??
      ""
    const name =
      author.getAttribute("name")?.trim() ||
      author.getAttribute("userName")?.trim() ||
      author.getAttribute("initials")?.trim() ||
      ""

    if (id && name) {
      authors.set(id, name)
    }
  }

  return authors
}

function pptxCommentAuthorsFromEntries(entries: ZipEntries): CommentAuthorMap {
  return Object.keys(entries)
    .filter(
      (path) =>
        path === "ppt/commentAuthors.xml" ||
        (path.startsWith("ppt/threadedComments/") &&
          path.toLowerCase().includes("author")),
    )
    .reduce((authors, path) => {
      for (const [id, name] of pptxCommentAuthorsFromXml(
        zipText(entries, path),
      )) {
        authors.set(id, name)
      }

      return authors
    }, new Map<string, string>())
}

function pptxCommentText(comment: Element) {
  const directText = childByName(comment, "text")?.textContent?.trim()
  if (directText) return directText

  return elementsByName(comment, "t")
    .map((text) => text.textContent?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
}

function pptxCommentAnchor(comment: Element) {
  const position = childByName(comment, "pos")
  if (!position) return undefined

  return {
    x: numericAttribute(position, "x"),
    y: numericAttribute(position, "y"),
  }
}

function pptxCommentAttribute(comment: Element, names: string[]) {
  for (const name of names) {
    const value = namespacedAttribute(comment, name).trim()
    if (value) return value
  }

  return ""
}

function pptxCommentSourceId(comment: Element) {
  return pptxCommentAttribute(comment, ["id", "commentId", "cid"])
}

function pptxCommentParentId(comment: Element) {
  return pptxCommentAttribute(comment, [
    "parentId",
    "parentCommentId",
    "replyToId",
    "replyTo",
  ])
}

function pptxCommentThreadId(comment: Element) {
  return pptxCommentAttribute(comment, [
    "threadId",
    "conversationId",
    "conversation",
  ])
}

function pptxCommentHierarchyDepth(
  comment: SlideComment,
  commentsBySourceId: Map<string, SlideComment>,
) {
  let depth = 0
  let parentId = comment.sourceParentCommentId ?? ""
  const visited = new Set<string>()

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    depth += 1
    parentId = commentsBySourceId.get(parentId)?.sourceParentCommentId ?? ""
  }

  return depth
}

function pptxCommentRootThreadId(
  comment: SlideComment,
  commentsBySourceId: Map<string, SlideComment>,
) {
  if (comment.sourceThreadId) return comment.sourceThreadId

  let root = comment.sourceCommentId ?? ""
  let parentId = comment.sourceParentCommentId ?? ""
  const visited = new Set<string>()

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    root = parentId
    parentId = commentsBySourceId.get(parentId)?.sourceParentCommentId ?? ""
  }

  return root
}

function withPptxCommentHierarchy(comments: SlideComment[]) {
  const commentsBySourceId = new Map(
    comments.flatMap((comment) =>
      comment.sourceCommentId ? [[comment.sourceCommentId, comment]] : [],
    ),
  )

  return comments.map((comment) => {
    const sourceReplyDepth = pptxCommentHierarchyDepth(
      comment,
      commentsBySourceId,
    )
    const parent = comment.sourceParentCommentId
      ? commentsBySourceId.get(comment.sourceParentCommentId)
      : undefined
    const sourceThreadId = pptxCommentRootThreadId(comment, commentsBySourceId)

    return {
      ...comment,
      ...(sourceThreadId ? { sourceThreadId } : {}),
      ...(sourceReplyDepth ? { sourceReplyDepth } : {}),
      ...(parent?.authorName
        ? { sourceReplyToAuthorName: parent.authorName }
        : {}),
    } satisfies SlideComment
  })
}

export function pptxSlideCommentsFromXml(
  value: string,
  authors: CommentAuthorMap = new Map(),
): SlideComment[] {
  const document = parseXml(value)

  const comments = [
    ...elementsByName(document, "cm"),
    ...elementsByName(document, "threadedComment"),
    ...elementsByName(document, "comment"),
  ]
    .map((comment): SlideComment | null => {
      const body = pptxCommentText(comment)
      if (!body) return null

      const authorId =
        comment.getAttribute("authorId") ??
        comment.getAttribute("userId") ??
        comment.getAttribute("author") ??
        ""
      const createdAt = timestampFromPptxComment(
        comment.getAttribute("dt") ?? comment.getAttribute("created"),
      )
      const sourceAnchor = pptxCommentAnchor(comment)
      const sourceCommentId = pptxCommentSourceId(comment)
      const sourceParentCommentId = pptxCommentParentId(comment)
      const sourceThreadId = pptxCommentThreadId(comment)

      return {
        id: nanoid(),
        body,
        authorName: authors.get(authorId) ?? "PowerPoint reviewer",
        targetElementId: "",
        mentions: extractCommentMentions(body),
        resolved: false,
        createdAt,
        updatedAt: createdAt,
        source: "pptx",
        ...(sourceAnchor ? { sourceAnchor } : {}),
        ...(sourceCommentId ? { sourceCommentId } : {}),
        ...(sourceParentCommentId ? { sourceParentCommentId } : {}),
        ...(sourceThreadId ? { sourceThreadId } : {}),
      } satisfies SlideComment
    })
    .filter((comment): comment is SlideComment => comment !== null)

  return withPptxCommentHierarchy(comments)
}

function slideCommentsFromRelationships(
  entries: ZipEntries,
  relationships: RelationshipMap,
  authors: CommentAuthorMap,
) {
  return Array.from(relationships.values())
    .filter(
      (path) =>
        path.startsWith("ppt/comments/") ||
        path.startsWith("ppt/threadedComments/"),
    )
    .flatMap((path) => pptxSlideCommentsFromXml(zipText(entries, path), authors))
}

function slideBackground(
  document: XMLDocument | null,
  themeColors: ThemeColorMap,
  inheritedFallback = "#f8fafc",
) {
  const background = firstByName(document, "bg")
  return background
    ? colorFromNode(background, inheritedFallback, themeColors)
    : inheritedFallback
}

function parseDurationAttribute(value: string | null, fallback: number) {
  if (!value) return fallback

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) return fallback

  return Math.min(10_000, Math.max(100, parsed))
}

function transitionDurationFromSpeed(value: string | null) {
  if (value === "slow") return 1_000
  if (value === "med") return 700
  return 350
}

export function pptxSlideTransitionFromXml(value: string) {
  const document = parseXml(value)
  const transitionNode = firstByName(document, "transition")

  if (!transitionNode) {
    return {
      autoAdvanceAfterMs: 0,
      transition: "none" as SlideTransition,
      transitionDurationMs: 350,
    }
  }

  const transitionChild = Array.from(transitionNode.children).find(
    (child) => child.localName !== "sndAc",
  )
  const transition = transitionChild
    ? TRANSITION_KIND_MAP[transitionChild.localName] ?? "fade"
    : "none"
  const transitionDurationMs = parseDurationAttribute(
    transitionNode.getAttribute("dur"),
    transitionDurationFromSpeed(transitionNode.getAttribute("spd")),
  )
  const autoAdvanceAfterMs = parseDurationAttribute(
    transitionNode.getAttribute("advTm"),
    0,
  )

  return {
    autoAdvanceAfterMs,
    transition,
    transitionDurationMs,
  }
}

function parseSlide(
  entries: ZipEntries,
  slidePath: string,
  slideSize: SlideSize,
  themeColors: ThemeColorMap,
  commentAuthors: CommentAuthorMap,
  index: number,
): ParsedPptxSlide {
  const slideXml = zipText(entries, slidePath)
  const document = parseXml(slideXml)
  const transition = pptxSlideTransitionFromXml(slideXml)
  const relationships = parseRelationships(
    entries,
    relationshipsPathFor(slidePath),
    directoryName(slidePath),
  )
  const layoutContext = parseSlideLayoutContext(
    entries,
    relationships,
    slideSize,
    themeColors,
  )
  const groupContexts = collectGroupImportContexts(document)
  const textElements = elementsByName(document, "sp")
    .map((shape, shapeIndex) => {
      const layoutPlaceholder = layoutPlaceholderForShape(
        shape,
        layoutContext.placeholders,
      )

      return textElementFromShape(
        shape,
        slideSize,
        shapeIndex,
        themeColors,
        groupContexts.get(shape),
        layoutPlaceholder,
      )
    })
    .filter((element): element is PresentationElement => element !== null)
  const shapeElements = [
    ...elementsByName(document, "sp"),
    ...elementsByName(document, "cxnSp"),
  ]
    .map((shape) =>
      shapeElementFromNode(
        shape,
        slideSize,
        themeColors,
        groupContexts.get(shape),
      ),
    )
    .filter((element): element is PresentationElement => element !== null)
  const imageImport = imageElementsFromSlide(
    entries,
    document,
    relationships,
    slideSize,
    groupContexts,
  )
  const mediaImport = mediaElementsFromSlide(
    entries,
    document,
    relationships,
    slideSize,
    groupContexts,
  )
  const graphicElements = graphicElementsFromSlide(
    entries,
    document,
    relationships,
    slideSize,
    themeColors,
    groupContexts,
  )
  const comments = slideCommentsFromRelationships(
    entries,
    relationships,
    commentAuthors,
  )
  const elements = [
    ...shapeElements,
    ...textElements,
    ...graphicElements,
    ...imageImport.elements,
    ...mediaImport.elements,
  ]
  const title =
    textElements.find((element) => element.type === "title")?.content.split(
      "\n",
    )[0] ??
    textElements[0]?.content.split("\n")[0] ??
    `Imported slide ${index + 1}`

  return {
    assets: imageImport.assets,
    autoAdvanceAfterMs: transition.autoAdvanceAfterMs,
    background: slideBackground(document, themeColors, layoutContext.background),
    comments,
    elements,
    layout: layoutContext.layout,
    notes: slideNotes(entries, relationships),
    title: title.trim() || `Imported slide ${index + 1}`,
    transition: transition.transition,
    transitionDurationMs: transition.transitionDurationMs,
  }
}

function createDeckSlide(input: ParsedPptxSlide): Slide {
  return {
    id: nanoid(),
    title: input.title,
    sectionTitle: "",
    layout: input.layout,
    background: input.background,
    transition: input.transition,
    transitionDurationMs: input.transitionDurationMs,
    autoAdvanceAfterMs: input.autoAdvanceAfterMs,
    rehearsalDurationMs: 0,
    notes: input.notes,
    comments: input.comments,
    elements: input.elements,
  }
}

function deckTitleFromFile(file: File) {
  return file.name.replace(/\.pptx$/i, "").trim() || "Imported PowerPoint deck"
}

function deckFromPptxEntries(file: File, entries: ZipEntries): Deck {
  const presentation = parseXml(zipText(entries, "ppt/presentation.xml"))
  const slideSize = presentationSlideSize(presentation)
  const themeColors = parseThemeColors(entries)
  const importedAt = new Date().toISOString()
  const officeTheme = officeThemeMetadataFromPptxThemeXml(
    zipText(entries, "ppt/theme/theme1.xml"),
    {
      importedAt,
      placeholderDefaultCount: pptxPlaceholderDefaultCount(entries),
      slideLayoutCount: pptxPartCount(entries, "ppt/slideLayouts/"),
      slideMasterCount: pptxPartCount(entries, "ppt/slideMasters/"),
    },
  )
  const commentAuthors = pptxCommentAuthorsFromEntries(entries)
  const parsedSlides = orderedSlidePaths(entries, presentation).map(
    (path, index) =>
      parseSlide(entries, path, slideSize, themeColors, commentAuthors, index),
  )
  const slides = parsedSlides.map(createDeckSlide)

  if (!slides.length) {
    throw new Error("No slides were found in this PowerPoint file.")
  }

  return {
    id: nanoid(),
    title: deckTitleFromFile(file),
    theme: "studio",
    master: {
      ...defaultDeckMaster,
      officeTheme,
    },
    assets: parsedSlides.flatMap((slide) => slide.assets),
    slides,
    updatedAt: importedAt,
  }
}

export async function importPptxDeckWithReport(
  file: File,
): Promise<PptxImportResult> {
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))

  return {
    deck: deckFromPptxEntries(file, entries),
    warnings: pptxCompatibilityWarningsFromEntries(entries),
  }
}

export async function importPptxDeck(file: File): Promise<Deck> {
  return (await importPptxDeckWithReport(file)).deck
}

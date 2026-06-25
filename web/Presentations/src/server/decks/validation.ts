import type {
  Deck,
  DeckAsset,
  DeckMaster,
  ElementAnimation,
  PresentationElement,
  RichTextRange,
  Slide,
  SlideComment,
} from "@/features/presentation/types"
import { extractCommentMentions } from "@/features/presentation/comment-mentions"
import {
  defaultFontFamilyForElementType,
  normalizeFontFamily,
} from "@/features/presentation/font-pairs"
import {
  elementAnimationOptions,
  normalizeElementAnimationTrigger,
} from "@/features/presentation/animation-effects"
import { normalizeMediaCaptionCues } from "@/features/presentation/media-captions"
import { normalizeOfficeThemeMetadata } from "@/features/presentation/office-theme-metadata"
import { normalizeDeckLayoutPresets } from "@/features/presentation/slide-master"
import { iconDefinitions } from "@/features/presentation/icon-library"
import {
  shapeArrowheadOptions,
  shapeKinds as presentationShapeKinds,
  shapeStrokeDashOptions,
} from "@/features/presentation/shape-formatting"
import {
  defaultConnectorGeometryForShape,
  shapeConnectorGeometry,
} from "@/features/presentation/shape-geometry"
import {
  normalizeTableCellMerges,
  normalizeTableCellStyles,
  tableStyleOptions,
  tableVerticalAlignOptions,
} from "@/features/presentation/table-formatting"

const themes = new Set(["studio", "midnight", "paper", "signal"])
const layouts = new Set([
  "title",
  "title-body",
  "section",
  "blank",
  "two-content",
  "comparison",
  "quote",
  "picture-caption",
])
const transitions = new Set(["none", "fade", "push", "zoom"])
const elementAnimations = new Set<string>(elementAnimationOptions)
const iconNames = new Set(Object.keys(iconDefinitions))
const elementTypes = new Set([
  "title",
  "text",
  "shape",
  "icon",
  "image",
  "video",
  "audio",
  "table",
  "chart",
])
const shapeKinds = new Set<string>(presentationShapeKinds)
const shapeStrokeDashes = new Set<string>(shapeStrokeDashOptions)
const shapeArrowheads = new Set<string>(shapeArrowheadOptions)
const chartTypes = new Set(["bar", "horizontalBar", "line", "area", "pie", "donut"])
const imageFits = new Set(["contain", "cover", "fill"])
const imageMasks = new Set(["rectangle", "rounded", "circle", "diamond"])
const textAligns = new Set(["left", "center", "right"])
const textListStyles = new Set(["none", "bullet", "number"])
const textFits = new Set(["clip", "shrink"])
const placeholderRoles = new Set(["none", "title", "body", "media", "caption"])
const assetTypes = new Set(["image"])
const tableStyles = new Set<string>(tableStyleOptions)
const tableVerticalAligns = new Set<string>(tableVerticalAlignOptions)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function readWeight(value: unknown): PresentationElement["fontWeight"] {
  return value === 400 || value === 500 || value === 600 || value === 700
    ? value
    : 500
}

function readOptionalWeight(value: unknown): RichTextRange["fontWeight"] {
  return value === 400 || value === 500 || value === 600 || value === 700
    ? value
    : undefined
}

function parseTextRanges(value: unknown, contentLength: number) {
  if (!Array.isArray(value)) return []

  return value
    .map((item): RichTextRange | null => {
      if (!isRecord(item)) return null
      const start = Math.round(
        clampNumber(readNumber(item.start, 0), 0, contentLength),
      )
      const end = Math.round(
        clampNumber(readNumber(item.end, start), 0, contentLength),
      )

      if (end <= start) return null

      const range: RichTextRange = {
        id: readString(item.id, `${start}-${end}`),
        start,
        end,
      }
      const fontWeight = readOptionalWeight(item.fontWeight)
      const italic = typeof item.italic === "boolean" ? item.italic : undefined
      const underline =
        typeof item.underline === "boolean" ? item.underline : undefined
      const color = readString(item.color)

      if (fontWeight) range.fontWeight = fontWeight
      if (italic !== undefined) range.italic = italic
      if (underline !== undefined) range.underline = underline
      if (color) range.color = color

      return range
    })
    .filter((range): range is RichTextRange => Boolean(range))
}

function parseStringArray(value: unknown, size: number) {
  const items = Array.isArray(value) ? value : []

  return Array.from({ length: size }, (_, index) => readString(items[index]))
}

function parseChartData(value: unknown): PresentationElement["chartData"] {
  const items = Array.isArray(value) ? value : []
  const parsed = items
    .slice(0, 8)
    .map((item, index) => {
      if (!isRecord(item)) return null
      const label = readString(item.label, `Item ${index + 1}`).trim()

      return {
        label: label || `Item ${index + 1}`,
        value: clampNumber(readNumber(item.value, 0), 0, 1_000_000),
        color: readString(item.color, ["#2563eb", "#16a34a", "#f97316", "#7c3aed"][index % 4]),
      }
    })
    .filter((item): item is PresentationElement["chartData"][number] =>
      Boolean(item),
    )

  return parsed.length
    ? parsed
    : [
        { label: "Q1", value: 42, color: "#2563eb" },
        { label: "Q2", value: 64, color: "#16a34a" },
        { label: "Q3", value: 56, color: "#f97316" },
        { label: "Q4", value: 78, color: "#7c3aed" },
      ]
}

function parseChartSeries(
  value: unknown,
  fallbackData: PresentationElement["chartData"],
): PresentationElement["chartSeries"] {
  const items = Array.isArray(value) ? value : []

  return items
    .slice(0, 4)
    .map((item, seriesIndex) => {
      if (!isRecord(item)) return null
      const dataItems = Array.isArray(item.data) ? item.data : []
      const data = dataItems
        .slice(0, 8)
        .map((datum, datumIndex) => {
          if (!isRecord(datum)) return null
          const fallback = fallbackData[datumIndex]
          const label = readString(
            datum.label,
            fallback?.label ?? `Item ${datumIndex + 1}`,
          ).trim()

          return {
            label: label || fallback?.label || `Item ${datumIndex + 1}`,
            value: clampNumber(readNumber(datum.value, 0), 0, 1_000_000),
          }
        })
        .filter((datum): datum is PresentationElement["chartSeries"][number]["data"][number] =>
          Boolean(datum),
        )

      if (!data.length) return null

      return {
        id: readString(item.id, `series-${seriesIndex + 1}`),
        name: readString(item.name, `Series ${seriesIndex + 1}`),
        color: readString(
          item.color,
          fallbackData[seriesIndex]?.color ??
            ["#2563eb", "#16a34a", "#f97316", "#7c3aed"][seriesIndex % 4],
        ),
        data,
      }
    })
    .filter((item): item is PresentationElement["chartSeries"][number] =>
      Boolean(item),
    )
}

function parseAsset(value: unknown): DeckAsset | null {
  if (!isRecord(value)) return null
  const type = readString(value.type)
  const id = readString(value.id)
  const dataUrl = readString(value.dataUrl)
  const remoteUrl = readString(value.remoteUrl)

  if (!id || (!dataUrl && !remoteUrl) || !assetTypes.has(type)) return null

  return {
    id,
    type: type as DeckAsset["type"],
    name: readString(value.name, "Imported image"),
    mimeType: readString(value.mimeType, "application/octet-stream"),
    dataUrl,
    storage: value.storage === "remote" ? "remote" : "inline",
    remoteUrl,
    sizeBytes: Math.round(
      clampNumber(readNumber(value.sizeBytes, dataUrl.length), 0, 75_000_000),
    ),
    createdAt: readString(value.createdAt, new Date().toISOString()),
  }
}

function parseDeckMaster(value: unknown): DeckMaster {
  const master = isRecord(value) ? value : {}

  return {
    showFooter: readBoolean(master.showFooter),
    footerText: readString(master.footerText),
    showDate: readBoolean(master.showDate),
    showSlideNumbers: readBoolean(master.showSlideNumbers),
    color: readString(master.color, "#64748b"),
    fontSize: clampNumber(readNumber(master.fontSize, 10), 6, 24),
    fontFamily: normalizeFontFamily(master.fontFamily, "system"),
    layoutPresets: normalizeDeckLayoutPresets(master.layoutPresets),
    officeTheme: normalizeOfficeThemeMetadata(master.officeTheme),
  }
}

function parseSlideComment(value: unknown): SlideComment | null {
  if (!isRecord(value)) return null
  const id = readString(value.id)
  const body = readString(value.body).trim()
  const sourceAnchor = isRecord(value.sourceAnchor)
    ? {
        x: readNumber(value.sourceAnchor.x, 0),
        y: readNumber(value.sourceAnchor.y, 0),
      }
    : undefined
  const source = readString(value.source)
  const sourceCommentId = readString(value.sourceCommentId)
  const sourceParentCommentId = readString(value.sourceParentCommentId)
  const sourceReplyDepth = Math.round(
    clampNumber(readNumber(value.sourceReplyDepth, 0), 0, 12),
  )
  const sourceReplyToAuthorName = readString(value.sourceReplyToAuthorName)
  const sourceThreadId = readString(value.sourceThreadId)

  if (!id || !body) return null

  return {
    id,
    body,
    authorName: readString(value.authorName, "essencefromexistence"),
    targetElementId: readString(value.targetElementId),
    mentions: extractCommentMentions(body),
    resolved: readBoolean(value.resolved),
    createdAt: readString(value.createdAt, new Date().toISOString()),
    updatedAt: readString(value.updatedAt, new Date().toISOString()),
    ...(source === "pptx" ? { source: "pptx" as const } : {}),
    ...(sourceAnchor ? { sourceAnchor } : {}),
    ...(source === "pptx" && sourceCommentId ? { sourceCommentId } : {}),
    ...(source === "pptx" && sourceParentCommentId
      ? { sourceParentCommentId }
      : {}),
    ...(source === "pptx" && sourceReplyDepth ? { sourceReplyDepth } : {}),
    ...(source === "pptx" && sourceReplyToAuthorName
      ? { sourceReplyToAuthorName }
      : {}),
    ...(source === "pptx" && sourceThreadId ? { sourceThreadId } : {}),
  }
}

function parseElement(value: unknown): PresentationElement | null {
  if (!isRecord(value)) return null
  const type = readString(value.type)
  const fit = readString(value.fit, "cover")
  const imageMask = readString(value.imageMask, "rectangle")
  const textAlign = readString(value.textAlign, "left")
  const listStyle = readString(value.listStyle, "none")
  const textFit = readString(value.textFit, "clip")
  const placeholderRole = readString(value.placeholderRole, "none")
  const tableStyle = readString(value.tableStyle, "plain")
  const tableVerticalAlign = readString(value.tableVerticalAlign, "middle")
  const shapeKind = readString(value.shapeKind, "rectangle")
  const shapeStrokeDash = readString(value.shapeStrokeDash, "solid")
  const shapeStartArrowhead = readString(value.shapeStartArrowhead, "none")
  const shapeEndArrowhead = readString(
    value.shapeEndArrowhead,
    shapeKind === "arrow" ||
      shapeKind === "elbowConnector" ||
      shapeKind === "curvedConnector"
      ? "triangle"
      : "none",
  )
  const chartType = readString(value.chartType, "bar")
  const animation = readString(value.animation, "none")
  const iconName = readString(value.iconName, "sparkle")
  if (!elementTypes.has(type)) return null
  const parsedShapeKind = shapeKinds.has(shapeKind)
    ? (shapeKind as PresentationElement["shapeKind"])
    : "rectangle"
  const connectorDefaults = defaultConnectorGeometryForShape(parsedShapeKind)
  const connectorGeometry = shapeConnectorGeometry({
    shapeConnectorControlX: readNumber(
      value.shapeConnectorControlX,
      connectorDefaults.controlX,
    ),
    shapeConnectorControlY: readNumber(
      value.shapeConnectorControlY,
      connectorDefaults.controlY,
    ),
    shapeConnectorEndX: readNumber(value.shapeConnectorEndX, connectorDefaults.endX),
    shapeConnectorEndY: readNumber(value.shapeConnectorEndY, connectorDefaults.endY),
    shapeConnectorStartX: readNumber(
      value.shapeConnectorStartX,
      connectorDefaults.startX,
    ),
    shapeConnectorStartY: readNumber(
      value.shapeConnectorStartY,
      connectorDefaults.startY,
    ),
    shapeKind: parsedShapeKind,
  })
  const defaultLineHeight = type === "title" ? 1.05 : 1.2
  const content = readString(value.content)
  const tableRows = Math.round(clampNumber(readNumber(value.tableRows, 3), 1, 12))
  const tableColumns = Math.round(
    clampNumber(readNumber(value.tableColumns, 3), 1, 8),
  )
  const chartData = parseChartData(value.chartData)

  return {
    id: readString(value.id),
    type: type as PresentationElement["type"],
    x: readNumber(value.x, 0),
    y: readNumber(value.y, 0),
    width: readNumber(value.width, 20),
    height: readNumber(value.height, 10),
    content,
    fontSize: readNumber(value.fontSize, 24),
    fontFamily: normalizeFontFamily(
      value.fontFamily,
      defaultFontFamilyForElementType(type as PresentationElement["type"]),
    ),
    fontWeight: readWeight(value.fontWeight),
    textAlign: textAligns.has(textAlign)
      ? (textAlign as PresentationElement["textAlign"])
      : "left",
    lineHeight: clampNumber(
      readNumber(value.lineHeight, defaultLineHeight),
      0.8,
      2.5,
    ),
    listStyle: textListStyles.has(listStyle)
      ? (listStyle as PresentationElement["listStyle"])
      : "none",
    textColumns: Math.round(
      clampNumber(readNumber(value.textColumns, 1), 1, 3),
    ),
    textFit: textFits.has(textFit)
      ? (textFit as PresentationElement["textFit"])
      : "clip",
    textRanges: parseTextRanges(value.textRanges, content.length),
    tableRows,
    tableColumns,
    tableCells: parseStringArray(value.tableCells, tableRows * tableColumns),
    tableCellMerges: normalizeTableCellMerges(
      value.tableCellMerges,
      tableRows,
      tableColumns,
    ),
    tableCellStyles: normalizeTableCellStyles(
      value.tableCellStyles,
      tableRows,
      tableColumns,
    ),
    tableHeaderRow: readBoolean(value.tableHeaderRow, true),
    tableTotalRow: readBoolean(value.tableTotalRow),
    tableBorderColor: readString(value.tableBorderColor, "#cbd5e1"),
    tableOfficeStyleId: readString(value.tableOfficeStyleId),
    tableOfficeStyleName: readString(value.tableOfficeStyleName),
    tableStyle: tableStyles.has(tableStyle)
      ? (tableStyle as PresentationElement["tableStyle"])
      : "plain",
    tableBandedRows: readBoolean(value.tableBandedRows),
    tableBandedColumns: readBoolean(value.tableBandedColumns),
    tableFirstColumn: readBoolean(value.tableFirstColumn),
    tableLastColumn: readBoolean(value.tableLastColumn),
    tableVerticalAlign: tableVerticalAligns.has(tableVerticalAlign)
      ? (tableVerticalAlign as PresentationElement["tableVerticalAlign"])
      : "middle",
    chartType: chartTypes.has(chartType)
      ? (chartType as PresentationElement["chartType"])
      : "bar",
    chartData,
    chartSeries: parseChartSeries(value.chartSeries, chartData),
    chartShowLegend: readBoolean(value.chartShowLegend, true),
    chartShowValues: readBoolean(value.chartShowValues, true),
    chartAxisColor: readString(value.chartAxisColor, "#94a3b8"),
    color: readString(value.color, "#111827"),
    background: readString(value.background, "transparent"),
    radius: readNumber(value.radius, 0),
    shapeKind: parsedShapeKind,
    shapeConnectorControlX: connectorGeometry.controlX,
    shapeConnectorControlY: connectorGeometry.controlY,
    shapeConnectorEndX: connectorGeometry.endX,
    shapeConnectorEndY: connectorGeometry.endY,
    shapeConnectorStartX: connectorGeometry.startX,
    shapeConnectorStartY: connectorGeometry.startY,
    shapeStrokeColor: readString(value.shapeStrokeColor, "#2563eb"),
    shapeStrokeWidth: clampNumber(readNumber(value.shapeStrokeWidth, 2), 1, 24),
    shapeStrokeDash: shapeStrokeDashes.has(shapeStrokeDash)
      ? (shapeStrokeDash as PresentationElement["shapeStrokeDash"])
      : "solid",
    shapeStartArrowhead: shapeArrowheads.has(shapeStartArrowhead)
      ? (shapeStartArrowhead as PresentationElement["shapeStartArrowhead"])
      : "none",
    shapeEndArrowhead: shapeArrowheads.has(shapeEndArrowhead)
      ? (shapeEndArrowhead as PresentationElement["shapeEndArrowhead"])
      : "none",
    iconName: iconNames.has(iconName)
      ? (iconName as PresentationElement["iconName"])
      : "sparkle",
    rotation: readNumber(value.rotation, 0),
    animation: elementAnimations.has(animation)
      ? (animation as ElementAnimation)
      : "none",
    animationDurationMs: Math.round(
      clampNumber(readNumber(value.animationDurationMs, 500), 50, 5000),
    ),
    animationDelayMs: Math.round(
      clampNumber(readNumber(value.animationDelayMs, 0), 0, 10000),
    ),
    animationMotionX: clampNumber(readNumber(value.animationMotionX, 16), -100, 100),
    animationMotionY: clampNumber(readNumber(value.animationMotionY, 0), -100, 100),
    animationTrigger: normalizeElementAnimationTrigger(value.animationTrigger),
    linkUrl: readString(value.linkUrl),
    linkSlideId: readString(value.linkSlideId),
    hidden: readBoolean(value.hidden),
    locked: readBoolean(value.locked),
    groupId: readString(value.groupId),
    placeholderRole: placeholderRoles.has(placeholderRole)
      ? (placeholderRole as PresentationElement["placeholderRole"])
      : "none",
    assetId: readString(value.assetId),
    src: readString(value.src),
    alt: readString(value.alt),
    fit: imageFits.has(fit) ? (fit as PresentationElement["fit"]) : "cover",
    mediaStartSeconds: clampNumber(
      readNumber(value.mediaStartSeconds, 0),
      0,
      86_400,
    ),
    mediaEndSeconds: clampNumber(
      readNumber(value.mediaEndSeconds, 0),
      0,
      86_400,
    ),
    mediaCaption: readString(value.mediaCaption),
    mediaCaptionCues: normalizeMediaCaptionCues(value.mediaCaptionCues),
    mediaAutoplay: readBoolean(value.mediaAutoplay),
    imageMask: imageMasks.has(imageMask)
      ? (imageMask as PresentationElement["imageMask"])
      : "rectangle",
    imagePositionX: clampNumber(readNumber(value.imagePositionX, 50), 0, 100),
    imagePositionY: clampNumber(readNumber(value.imagePositionY, 50), 0, 100),
    imageOpacity: clampNumber(readNumber(value.imageOpacity, 100), 0, 100),
    imageBrightness: clampNumber(readNumber(value.imageBrightness, 100), 0, 200),
    imageContrast: clampNumber(readNumber(value.imageContrast, 100), 0, 200),
    imageSaturation: clampNumber(readNumber(value.imageSaturation, 100), 0, 200),
  }
}

function parseSlide(value: unknown): Slide | null {
  if (!isRecord(value)) return null
  const layout = readString(value.layout)
  const transition = readString(value.transition, "none")
  if (!layouts.has(layout) || !Array.isArray(value.elements)) return null

  return {
    id: readString(value.id),
    title: readString(value.title, "Untitled slide"),
    sectionTitle: readString(value.sectionTitle),
    layout: layout as Slide["layout"],
    background: readString(value.background, "#f8fafc"),
    transition: transitions.has(transition)
      ? (transition as Slide["transition"])
      : "none",
    transitionDurationMs: clampNumber(
      readNumber(value.transitionDurationMs, 350),
      0,
      3000,
    ),
    autoAdvanceAfterMs: clampNumber(
      readNumber(value.autoAdvanceAfterMs, 0),
      0,
      3_600_000,
    ),
    rehearsalDurationMs: clampNumber(
      readNumber(value.rehearsalDurationMs, 0),
      0,
      86_400_000,
    ),
    notes: readString(value.notes),
    comments: Array.isArray(value.comments)
      ? value.comments
          .map(parseSlideComment)
          .filter((comment): comment is SlideComment => Boolean(comment))
      : [],
    elements: value.elements
      .map(parseElement)
      .filter((element): element is PresentationElement => Boolean(element)),
  }
}

export function parseDeckPayload(value: unknown): Deck | null {
  if (!isRecord(value) || !isRecord(value.deck)) return null
  const rawDeck = value.deck
  const theme = readString(rawDeck.theme)
  if (!themes.has(theme) || !Array.isArray(rawDeck.slides)) return null

  const slides = rawDeck.slides
    .map(parseSlide)
    .filter((slide): slide is Slide => Boolean(slide))
  const assets = Array.isArray(rawDeck.assets)
    ? rawDeck.assets
        .map(parseAsset)
        .filter((asset): asset is DeckAsset => Boolean(asset))
    : []

  if (!slides.length) {
    return null
  }

  return {
    id: readString(rawDeck.id),
    title: readString(rawDeck.title, "Untitled deck"),
    theme: theme as Deck["theme"],
    master: parseDeckMaster(rawDeck.master),
    assets,
    updatedAt: new Date().toISOString(),
    slides,
  }
}

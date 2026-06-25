import { nanoid } from "nanoid"

import {
  clampAnimationDelay,
  clampAnimationDuration,
  clampAnimationMotionOffset,
  elementAnimationOptions,
  normalizeElementAnimationTrigger,
} from "./animation-effects"
import {
  defaultChartData,
  normalizeChartData,
  normalizeChartSeries,
} from "./chart-formatting"
import { extractCommentMentions } from "./comment-mentions"
import {
  defaultFontFamilyForElementType,
  normalizeFontFamily,
} from "./font-pairs"
import {
  normalizeImageCorrection,
  normalizeImageOpacity,
} from "./image-corrections"
import { iconDefinitions } from "./icon-library"
import { normalizeMediaCaptionCues } from "./media-captions"
import { normalizeMediaTrimSeconds } from "./media-trim"
import {
  normalizeShapeArrowhead,
  normalizeShapeKind,
  normalizeShapeStrokeDash,
} from "./shape-formatting"
import { shapeConnectorGeometry } from "./shape-geometry"
import { normalizeDeckMaster } from "./slide-master"
import {
  defaultTableCells,
  normalizeTableCellMerges,
  normalizeTableCellStyles,
  normalizeTableCells,
  normalizeTableStyle,
  normalizeTableVerticalAlign,
} from "./table-formatting"
import type {
  Deck,
  DeckAsset,
  DeckAssetStorage,
  ElementAnimation,
  PresentationElement,
  SlideComment,
} from "./types"

type ImageAssetInput = {
  src: string
  name?: string
}

function isDataUrl(value: string) {
  return value.startsWith("data:")
}

const elementAnimations = new Set<string>(elementAnimationOptions)
const iconNames = new Set(Object.keys(iconDefinitions))
const placeholderRoles = new Set([
  "none",
  "title",
  "body",
  "media",
  "caption",
])

function normalizePlaceholderRole(value: unknown) {
  return typeof value === "string" && placeholderRoles.has(value)
    ? (value as PresentationElement["placeholderRole"])
    : "none"
}

export function dataUrlMimeType(dataUrl: string) {
  return /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? "application/octet-stream"
}

export function dataUrlSizeBytes(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",")
  if (commaIndex < 0) return dataUrl.length

  const metadata = dataUrl.slice(0, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)

  if (metadata.endsWith(";base64")) {
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
  }

  try {
    return new TextEncoder().encode(decodeURIComponent(payload)).length
  } catch {
    return payload.length
  }
}

export function createImageAsset(input: ImageAssetInput): DeckAsset {
  return {
    id: nanoid(),
    type: "image",
    name: input.name?.trim() || "Imported image",
    mimeType: dataUrlMimeType(input.src),
    dataUrl: input.src,
    storage: "inline",
    remoteUrl: "",
    sizeBytes: dataUrlSizeBytes(input.src),
    createdAt: new Date().toISOString(),
  }
}

function normalizeAssetStorage(value: unknown): DeckAssetStorage {
  return value === "remote" ? "remote" : "inline"
}

export function normalizeDeckAsset(asset: DeckAsset): DeckAsset {
  return {
    ...asset,
    dataUrl: asset.dataUrl ?? "",
    storage: normalizeAssetStorage(asset.storage),
    remoteUrl: asset.remoteUrl ?? "",
  }
}

export function deckAssetMap(assets: DeckAsset[] | undefined) {
  return new Map((assets ?? []).map((asset) => [asset.id, asset]))
}

export function resolveElementImageSrc(
  element: PresentationElement,
  assets: DeckAsset[] | Map<string, DeckAsset> | undefined,
) {
  if (element.assetId) {
    const asset = Array.isArray(assets)
      ? assets.find((item) => item.id === element.assetId)
      : assets?.get(element.assetId)

    if (asset?.dataUrl) {
      return asset.dataUrl
    }
    if (asset?.remoteUrl) {
      return asset.remoteUrl
    }
  }

  return element.src
}

export function withImageAsset(deck: Deck, input: ImageAssetInput) {
  const assets = deck.assets ?? []
  const existing = assets.find(
    (asset) => asset.dataUrl && asset.dataUrl === input.src,
  )

  if (existing) {
    return {
      assets,
      assetId: existing.id,
    }
  }

  const asset = createImageAsset(input)

  return {
    assets: [...assets, asset],
    assetId: asset.id,
  }
}

export function migrateDeckAssets(deck: Deck): Deck {
  const assets = (deck.assets ?? []).map(normalizeDeckAsset)
  const assetIdsByDataUrl = new Map(
    assets
      .filter((asset) => asset.dataUrl)
      .map((asset) => [asset.dataUrl, asset.id]),
  )

  function withElementDefaults(element: PresentationElement) {
    const tableRows = element.tableRows ?? 3
    const tableColumns = element.tableColumns ?? 3
    const normalizedShapeKind = normalizeShapeKind(element.shapeKind, element.radius)
    const connectorGeometry = shapeConnectorGeometry({
      ...element,
      shapeKind: normalizedShapeKind,
    })

    return {
      ...element,
      fontFamily: normalizeFontFamily(
        element.fontFamily,
        defaultFontFamilyForElementType(element.type),
      ),
      placeholderRole: normalizePlaceholderRole(element.placeholderRole),
      tableRows,
      tableColumns,
      tableCells: normalizeTableCells(
        element.tableCells ?? defaultTableCells(tableRows, tableColumns),
        tableRows,
        tableColumns,
      ),
      tableCellMerges: normalizeTableCellMerges(
        element.tableCellMerges,
        tableRows,
        tableColumns,
      ),
      tableCellStyles: normalizeTableCellStyles(
        element.tableCellStyles,
        tableRows,
        tableColumns,
      ),
      tableHeaderRow: element.tableHeaderRow ?? true,
      tableTotalRow: element.tableTotalRow ?? false,
      tableBorderColor: element.tableBorderColor ?? "#cbd5e1",
      tableOfficeStyleId: element.tableOfficeStyleId ?? "",
      tableOfficeStyleName: element.tableOfficeStyleName ?? "",
      tableStyle: normalizeTableStyle(element.tableStyle),
      tableBandedRows: element.tableBandedRows ?? false,
      tableBandedColumns: element.tableBandedColumns ?? false,
      tableFirstColumn: element.tableFirstColumn ?? false,
      tableLastColumn: element.tableLastColumn ?? false,
      tableVerticalAlign: normalizeTableVerticalAlign(element.tableVerticalAlign),
      chartType: element.chartType ?? "bar",
      chartData: normalizeChartData(element.chartData ?? defaultChartData()),
      chartSeries: normalizeChartSeries(
        element.chartSeries,
        element.chartData ?? defaultChartData(),
      ),
      chartShowLegend: element.chartShowLegend ?? true,
      chartShowValues: element.chartShowValues ?? true,
      chartAxisColor: element.chartAxisColor ?? "#94a3b8",
      shapeKind: normalizedShapeKind,
      shapeConnectorControlX: connectorGeometry.controlX,
      shapeConnectorControlY: connectorGeometry.controlY,
      shapeConnectorEndX: connectorGeometry.endX,
      shapeConnectorEndY: connectorGeometry.endY,
      shapeConnectorStartX: connectorGeometry.startX,
      shapeConnectorStartY: connectorGeometry.startY,
      shapeStrokeColor: element.shapeStrokeColor ?? "#2563eb",
      shapeStrokeWidth: element.shapeStrokeWidth ?? 2,
      shapeStrokeDash: normalizeShapeStrokeDash(element.shapeStrokeDash),
      shapeStartArrowhead: normalizeShapeArrowhead(element.shapeStartArrowhead),
      shapeEndArrowhead: normalizeShapeArrowhead(
        element.shapeEndArrowhead,
        element.shapeKind === "arrow" || element.shapeKind === "doubleArrow"
          ? "triangle"
          : "none",
      ),
      iconName: iconNames.has(element.iconName) ? element.iconName : "sparkle",
      animation: elementAnimations.has(element.animation)
        ? (element.animation as ElementAnimation)
        : "none",
      animationDurationMs: clampAnimationDuration(
        element.animationDurationMs ?? 500,
      ),
      animationDelayMs: clampAnimationDelay(element.animationDelayMs ?? 0),
      animationMotionX: clampAnimationMotionOffset(
        element.animationMotionX ?? 16,
      ),
      animationMotionY: clampAnimationMotionOffset(
        element.animationMotionY ?? 0,
      ),
      animationTrigger: normalizeElementAnimationTrigger(element.animationTrigger),
      linkUrl: element.linkUrl ?? "",
      linkSlideId: element.linkSlideId ?? "",
      mediaStartSeconds: normalizeMediaTrimSeconds(element.mediaStartSeconds),
      mediaEndSeconds: normalizeMediaTrimSeconds(element.mediaEndSeconds),
      mediaCaption: element.mediaCaption ?? "",
      mediaCaptionCues: normalizeMediaCaptionCues(element.mediaCaptionCues),
      mediaAutoplay: element.mediaAutoplay ?? false,
      imageOpacity: normalizeImageOpacity(element.imageOpacity),
      imageBrightness: normalizeImageCorrection(element.imageBrightness),
      imageContrast: normalizeImageCorrection(element.imageContrast),
      imageSaturation: normalizeImageCorrection(element.imageSaturation),
    }
  }

  function withCommentDefaults(comment: SlideComment) {
    return {
      ...comment,
      mentions: comment.mentions?.length
        ? comment.mentions
        : extractCommentMentions(comment.body),
    }
  }

  const slides = deck.slides.map((slide) => ({
    ...slide,
    sectionTitle: slide.sectionTitle ?? "",
    comments: (slide.comments ?? []).map(withCommentDefaults),
    elements: slide.elements.map((inputElement) => {
      const element = withElementDefaults(inputElement)

      if (element.type !== "image") {
        return { ...element, assetId: element.assetId ?? "" }
      }

      const assetId = element.assetId ?? ""
      const src = element.src ?? ""

      if (assetId || !isDataUrl(src)) {
        return { ...element, assetId, src }
      }

      const existingId = assetIdsByDataUrl.get(src)
      if (existingId) {
        return { ...element, assetId: existingId, src: "" }
      }

      const asset = createImageAsset({
        src,
        name: element.alt || "Imported image",
      })
      assets.push(asset)
      assetIdsByDataUrl.set(src, asset.id)

      return { ...element, assetId: asset.id, src: "" }
    }),
  }))

  return {
    ...deck,
    master: normalizeDeckMaster(deck.master),
    assets,
    slides,
  }
}

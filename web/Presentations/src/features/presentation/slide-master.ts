import type {
  DeckLayoutPreset,
  DeckLayoutPresetSlot,
  DeckMaster,
  FontFamily,
  ImageFit,
  PlaceholderRole,
  SlideElementType,
  TextAlign,
  TextFit,
  TextListStyle,
} from "./types"
import { normalizeFontFamily } from "./font-pairs"
import { normalizeOfficeThemeMetadata } from "./office-theme-metadata"

export type SlideMasterRenderInput = {
  master: DeckMaster
  slideNumber: number
  slideCount: number
  date?: Date
}

export const defaultDeckMaster: DeckMaster = {
  showFooter: false,
  footerText: "",
  showDate: false,
  showSlideNumbers: false,
  color: "#64748b",
  fontSize: 10,
  fontFamily: "system",
  layoutPresets: [],
  officeTheme: null,
}

const maxLayoutPresets = 12
const layoutElementTypes = new Set<SlideElementType>([
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
const layoutPlaceholderRoles = new Set<PlaceholderRole>([
  "title",
  "body",
  "media",
  "caption",
])
const textAligns = new Set<TextAlign>(["left", "center", "right"])
const textListStyles = new Set<TextListStyle>(["none", "bullet", "number"])
const textFits = new Set<TextFit>(["clip", "shrink"])
const imageFits = new Set<ImageFit>(["contain", "cover", "fill"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function readWeight(value: unknown): DeckLayoutPresetSlot["fontWeight"] {
  return value === 400 || value === 500 || value === 600 || value === 700
    ? value
    : 500
}

function readElementType(value: unknown) {
  return typeof value === "string" && layoutElementTypes.has(value as SlideElementType)
    ? (value as SlideElementType)
    : null
}

function readPlaceholderRole(value: unknown) {
  return typeof value === "string" &&
    layoutPlaceholderRoles.has(value as PlaceholderRole)
    ? (value as PlaceholderRole)
    : null
}

function readTextAlign(value: unknown): TextAlign {
  return typeof value === "string" && textAligns.has(value as TextAlign)
    ? (value as TextAlign)
    : "left"
}

function readTextListStyle(value: unknown): TextListStyle {
  return typeof value === "string" && textListStyles.has(value as TextListStyle)
    ? (value as TextListStyle)
    : "none"
}

function readTextFit(value: unknown): TextFit {
  return typeof value === "string" && textFits.has(value as TextFit)
    ? (value as TextFit)
    : "clip"
}

function readImageFit(value: unknown): ImageFit {
  return typeof value === "string" && imageFits.has(value as ImageFit)
    ? (value as ImageFit)
    : "cover"
}

function defaultFontForElement(type: SlideElementType): FontFamily {
  return type === "title" ? "geist" : "system"
}

function normalizeLayoutPresetSlot(value: unknown): DeckLayoutPresetSlot | null {
  if (!isRecord(value)) return null

  const type = readElementType(value.type)
  const placeholderRole = readPlaceholderRole(value.placeholderRole)

  if (!type || !placeholderRole) return null

  return {
    type,
    placeholderRole,
    x: readNumber(value.x, 8),
    y: readNumber(value.y, 12),
    width: readNumber(value.width, 84),
    height: readNumber(value.height, type === "title" ? 16 : 20),
    content: readString(value.content),
    fontSize: readNumber(value.fontSize, type === "title" ? 44 : 24),
    fontFamily: normalizeFontFamily(value.fontFamily, defaultFontForElement(type)),
    fontWeight: readWeight(value.fontWeight),
    textAlign: readTextAlign(value.textAlign),
    lineHeight: readNumber(value.lineHeight, type === "title" ? 1.05 : 1.2),
    listStyle: readTextListStyle(value.listStyle),
    textFit: readTextFit(value.textFit),
    textColumns: readNumber(value.textColumns, 1),
    color: readString(value.color, "#111827"),
    background: readString(value.background, "transparent"),
    radius: readNumber(value.radius, 0),
    fit: readImageFit(value.fit),
    alt: readString(value.alt),
  }
}

export function normalizeDeckLayoutPresets(value: unknown): DeckLayoutPreset[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item): DeckLayoutPreset | null => {
      if (!isRecord(item) || !readString(item.id).startsWith("deck-layout:")) {
        return null
      }

      const slots = Array.isArray(item.slots)
        ? item.slots
            .map(normalizeLayoutPresetSlot)
            .filter((slot): slot is DeckLayoutPresetSlot => Boolean(slot))
        : []

      if (!slots.length) return null

      return {
        id: item.id as DeckLayoutPreset["id"],
        label: readString(item.label, "Deck layout").trim().slice(0, 60),
        description: readString(
          item.description,
          `${slots.length} master placeholders`,
        ),
        createdAt: readString(item.createdAt, new Date().toISOString()),
        lastUsedAt: readString(item.lastUsedAt) || undefined,
        slots,
        useCount: Math.max(0, Math.round(readNumber(item.useCount, 0))),
      }
    })
    .filter((preset): preset is DeckLayoutPreset => Boolean(preset))
    .slice(0, maxLayoutPresets)
}

export function normalizeDeckMaster(master: Partial<DeckMaster> | undefined) {
  return {
    ...defaultDeckMaster,
    ...master,
    footerText: master?.footerText ?? defaultDeckMaster.footerText,
    color: master?.color || defaultDeckMaster.color,
    fontSize: Math.max(6, Math.min(24, Number(master?.fontSize) || 10)),
    fontFamily: normalizeFontFamily(
      master?.fontFamily,
      defaultDeckMaster.fontFamily,
    ),
    layoutPresets: normalizeDeckLayoutPresets(master?.layoutPresets),
    officeTheme: normalizeOfficeThemeMetadata(master?.officeTheme),
  }
}

export function masterHasVisibleContent(master: DeckMaster) {
  return (
    (master.showFooter && master.footerText.trim()) ||
    master.showDate ||
    master.showSlideNumbers
  )
}

export function formatMasterDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function masterFooterParts(input: SlideMasterRenderInput) {
  return {
    left: input.master.showDate ? formatMasterDate(input.date) : "",
    center: input.master.showFooter ? input.master.footerText.trim() : "",
    right: input.master.showSlideNumbers
      ? `${input.slideNumber} / ${input.slideCount}`
      : "",
  }
}

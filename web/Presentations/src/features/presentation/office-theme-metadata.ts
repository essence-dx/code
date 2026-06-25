import type { OfficeThemeColor, OfficeThemeMetadata } from "./types"

type OfficeThemeMetadataXmlOptions = {
  importedAt?: string
  placeholderDefaultCount?: number
  slideLayoutCount?: number
  slideMasterCount?: number
  source?: OfficeThemeMetadata["source"]
}

const maxOfficeThemeColors = 16
const maxThemeNameLength = 80

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function readCount(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
}

function normalizeThemeString(value: unknown, fallback: string) {
  return (readString(value).trim() || fallback).slice(0, maxThemeNameLength)
}

function normalizeHexColor(value: unknown) {
  const color = readString(value).trim()
  const normalized = color.startsWith("#") ? color : `#${color}`

  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : ""
}

function validDate(value: unknown, fallback: string) {
  const candidate = readString(value)
  return Number.isFinite(Date.parse(candidate)) ? candidate : fallback
}

function normalizeOfficeThemeColors(value: unknown): OfficeThemeColor[] {
  if (!Array.isArray(value)) return []

  const colors: OfficeThemeColor[] = []
  const seen = new Set<string>()

  for (const item of value) {
    if (!isRecord(item)) continue

    const key = readString(item.key).trim().slice(0, 24)
    const color = normalizeHexColor(item.color)
    const dedupeKey = key.toLowerCase()

    if (!key || !color || seen.has(dedupeKey)) continue

    seen.add(dedupeKey)
    colors.push({ key, color })

    if (colors.length >= maxOfficeThemeColors) break
  }

  return colors
}

function childElements(root: Element | null) {
  if (!root) return []

  return Array.from(root.childNodes).filter(
    (node): node is Element => node.nodeType === 1,
  )
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

function firstByName(root: ParentNode | null, localName: string) {
  return (
    descendantElements(root).find((element) => element.localName === localName) ??
    null
  )
}

function parseXml(text: string) {
  if (!text || typeof DOMParser === "undefined") return null

  return new DOMParser().parseFromString(text, "application/xml")
}

function themeColorFromNode(root: ParentNode | null) {
  const color = firstByName(root, "srgbClr")?.getAttribute("val")
  if (color) return normalizeHexColor(color)

  const systemColor = firstByName(root, "sysClr")?.getAttribute("lastClr")
  return systemColor ? normalizeHexColor(systemColor) : ""
}

function fontFace(root: ParentNode | null, fallback: string) {
  return normalizeThemeString(
    firstByName(root, "latin")?.getAttribute("typeface"),
    fallback,
  )
}

export function normalizeOfficeThemeMetadata(
  value: unknown,
  importedAtFallback = new Date().toISOString(),
): OfficeThemeMetadata | null {
  if (!isRecord(value)) return null

  const colors = normalizeOfficeThemeColors(value.colors)
  const name = normalizeThemeString(value.name, "Office Theme")
  const colorSchemeName = normalizeThemeString(
    value.colorSchemeName,
    `${name} colors`,
  )
  const majorFont = normalizeThemeString(value.majorFont, "Arial")
  const minorFont = normalizeThemeString(value.minorFont, majorFont)
  const hasMeaningfulMetadata =
    readString(value.name).trim() ||
    readString(value.colorSchemeName).trim() ||
    colors.length ||
    readString(value.majorFont).trim() ||
    readString(value.minorFont).trim()

  if (!hasMeaningfulMetadata) return null

  return {
    source: value.source === "pptx" ? "pptx" : "manual",
    name,
    colorSchemeName,
    colors,
    majorFont,
    minorFont,
    slideMasterCount: readCount(value.slideMasterCount),
    slideLayoutCount: readCount(value.slideLayoutCount),
    placeholderDefaultCount: readCount(value.placeholderDefaultCount),
    importedAt: validDate(value.importedAt, importedAtFallback),
  }
}

export function officeThemeMetadataFromPptxThemeXml(
  themeXml: string,
  options: OfficeThemeMetadataXmlOptions = {},
): OfficeThemeMetadata | null {
  const document = parseXml(themeXml)
  if (!document) return null

  const theme = document.documentElement
  const colorScheme = firstByName(document, "clrScheme")
  const majorFont = firstByName(document, "majorFont")
  const minorFont = firstByName(document, "minorFont")
  const colors = childElements(colorScheme).flatMap((node) => {
    const color = themeColorFromNode(node)
    return color && node.localName ? [{ key: node.localName, color }] : []
  })

  return normalizeOfficeThemeMetadata(
    {
      source: options.source ?? "pptx",
      name: theme?.getAttribute("name") ?? "Office Theme",
      colorSchemeName: colorScheme?.getAttribute("name") ?? "Office colors",
      colors,
      majorFont: fontFace(majorFont, "Arial"),
      minorFont: fontFace(minorFont, "Arial"),
      slideMasterCount: options.slideMasterCount,
      slideLayoutCount: options.slideLayoutCount,
      placeholderDefaultCount: options.placeholderDefaultCount,
      importedAt: options.importedAt,
    },
    options.importedAt,
  )
}

export function officeThemePptxFontFaces(
  officeTheme: OfficeThemeMetadata | null | undefined,
  fallback = "Arial",
) {
  return {
    bodyFontFace: officeTheme?.minorFont?.trim() || fallback,
    headFontFace: officeTheme?.majorFont?.trim() || fallback,
  }
}

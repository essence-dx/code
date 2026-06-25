import { createElement } from "./default-deck"
import { isElementLocked } from "./element-visibility"
import { normalizeFontFamily } from "./font-pairs"
import type { PlaceholderRole, PresentationElement, Slide } from "./types"

export type CustomSlideLayoutId = `custom-layout:${string}`

export type CustomSlideLayoutSlot = Pick<
  PresentationElement,
  | "type"
  | "placeholderRole"
  | "x"
  | "y"
  | "width"
  | "height"
  | "content"
  | "fontSize"
  | "fontFamily"
  | "fontWeight"
  | "textAlign"
  | "lineHeight"
  | "listStyle"
  | "textFit"
  | "textColumns"
  | "color"
  | "background"
  | "radius"
  | "fit"
  | "alt"
>

export type CustomSlideLayout = {
  id: CustomSlideLayoutId
  label: string
  description: string
  createdAt: string
  slots: CustomSlideLayoutSlot[]
}

export type CustomSlideLayoutBundle = {
  version: 1
  layouts: CustomSlideLayout[]
}

export type CustomSlideLayoutApplyResult = {
  slides: Slide[]
  appliedCount: number
}

export type CustomSlideLayoutImportResult = {
  layouts: CustomSlideLayout[]
  added: number
  skipped: number
}

export type SlideLayoutPresetLike = {
  id?: string
  label: string
  slots: CustomSlideLayoutSlot[]
}

const CUSTOM_SLIDE_LAYOUTS_STORAGE_KEY =
  "essence-powerpoint-custom-slide-layouts"
const MAX_CUSTOM_SLIDE_LAYOUTS = 16
export const customSlideLayoutsFileName = "essence-slide-layouts.json"

const placeholderRoles = new Set<PlaceholderRole>([
  "title",
  "body",
  "media",
  "caption",
])
const elementTypes = new Set<PresentationElement["type"]>([
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

function customLayoutId(): CustomSlideLayoutId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-layout:${crypto.randomUUID()}`
  }

  return `custom-layout:${Date.now()}`
}

function customLayoutStorage() {
  return typeof window === "undefined" ? null : window.localStorage
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function readPlaceholderRole(value: unknown) {
  return typeof value === "string" && placeholderRoles.has(value as PlaceholderRole)
    ? (value as PlaceholderRole)
    : null
}

function readElementType(value: unknown) {
  return typeof value === "string" && elementTypes.has(value as PresentationElement["type"])
    ? (value as PresentationElement["type"])
    : null
}

function parseSlot(value: unknown): CustomSlideLayoutSlot | null {
  if (!value || typeof value !== "object") return null

  const slot = value as Partial<CustomSlideLayoutSlot>
  const type = readElementType(slot.type)
  const placeholderRole = readPlaceholderRole(slot.placeholderRole)

  if (!type || !placeholderRole) return null

  const base = createElement(type)

  return {
    type: base.type,
    placeholderRole,
    x: readNumber(slot.x, base.x),
    y: readNumber(slot.y, base.y),
    width: readNumber(slot.width, base.width),
    height: readNumber(slot.height, base.height),
    content: readString(slot.content, base.content),
    fontSize: readNumber(slot.fontSize, base.fontSize),
    fontFamily: normalizeFontFamily(slot.fontFamily, base.fontFamily),
    fontWeight: slot.fontWeight ?? base.fontWeight,
    textAlign: slot.textAlign ?? base.textAlign,
    lineHeight: readNumber(slot.lineHeight, base.lineHeight),
    listStyle: slot.listStyle ?? base.listStyle,
    textFit: slot.textFit ?? base.textFit,
    textColumns: readNumber(slot.textColumns, base.textColumns),
    color: readString(slot.color, base.color),
    background: readString(slot.background, base.background),
    radius: readNumber(slot.radius, base.radius),
    fit: slot.fit ?? base.fit,
    alt: readString(slot.alt, base.alt),
  }
}

function parseCustomSlideLayout(value: unknown): CustomSlideLayout | null {
  if (!value || typeof value !== "object") return null

  const layout = value as Partial<CustomSlideLayout>
  const slots = Array.isArray(layout.slots)
    ? layout.slots
        .map(parseSlot)
        .filter((slot): slot is CustomSlideLayoutSlot => Boolean(slot))
    : []

  if (
    !layout.id?.startsWith("custom-layout:") ||
    typeof layout.label !== "string" ||
    typeof layout.createdAt !== "string" ||
    !slots.length
  ) {
    return null
  }

  return {
    id: layout.id,
    label: layout.label.trim().slice(0, 60) || "Custom layout",
    description:
      typeof layout.description === "string"
        ? layout.description
        : `${slots.length} placeholders`,
    createdAt: layout.createdAt,
    slots,
  }
}

function parseCustomSlideLayoutList(value: unknown) {
  const records = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        (value as Partial<CustomSlideLayoutBundle>).version === 1 &&
        Array.isArray((value as Partial<CustomSlideLayoutBundle>).layouts)
      ? (value as Partial<CustomSlideLayoutBundle>).layouts
      : null

  if (!records) return []

  return records
    .map(parseCustomSlideLayout)
    .filter((layout): layout is CustomSlideLayout => Boolean(layout))
}

export function serializeCustomSlideLayouts(layouts: CustomSlideLayout[]) {
  return JSON.stringify(
    {
      version: 1,
      layouts,
    } satisfies CustomSlideLayoutBundle,
    null,
    2,
  )
}

export function parseCustomSlideLayoutsText(value: string) {
  try {
    return parseCustomSlideLayoutList(JSON.parse(value))
  } catch {
    return []
  }
}

function slotFromElement(element: PresentationElement): CustomSlideLayoutSlot {
  return {
    type: element.type,
    placeholderRole: element.placeholderRole,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    content: element.content,
    fontSize: element.fontSize,
    fontFamily: element.fontFamily,
    fontWeight: element.fontWeight,
    textAlign: element.textAlign,
    lineHeight: element.lineHeight,
    listStyle: element.listStyle,
    textFit: element.textFit,
    textColumns: element.textColumns,
    color: element.color,
    background: element.background,
    radius: element.radius,
    fit: element.fit,
    alt: element.alt,
  }
}

export function customSlideLayoutFromSlide(
  slide: Slide,
  name: string,
  now = new Date(),
): CustomSlideLayout | null {
  const slots = slide.elements
    .filter((element) => placeholderRoles.has(element.placeholderRole))
    .map(slotFromElement)

  if (!slots.length) return null

  const label = name.trim().slice(0, 60) || `${slide.title || "Slide"} layout`

  return {
    id: customLayoutId(),
    label,
    description: `${slots.length} placeholder${slots.length === 1 ? "" : "s"}`,
    createdAt: now.toISOString(),
    slots,
  }
}

export function readCustomSlideLayouts() {
  const storage = customLayoutStorage()
  if (!storage) return []

  try {
    return parseCustomSlideLayoutList(
      JSON.parse(storage.getItem(CUSTOM_SLIDE_LAYOUTS_STORAGE_KEY) ?? "[]"),
    )
  } catch {
    return []
  }
}

export function saveCustomSlideLayout(slide: Slide, name: string) {
  const layout = customSlideLayoutFromSlide(slide, name)
  if (!layout) return { layouts: readCustomSlideLayouts(), saved: false }

  const layouts = [layout, ...readCustomSlideLayouts()].slice(
    0,
    MAX_CUSTOM_SLIDE_LAYOUTS,
  )
  customLayoutStorage()?.setItem(
    CUSTOM_SLIDE_LAYOUTS_STORAGE_KEY,
    JSON.stringify(layouts),
  )

  return { layouts, saved: true }
}

export function deleteCustomSlideLayout(layoutId: string) {
  const layouts = readCustomSlideLayouts().filter(
    (layout) => layout.id !== layoutId,
  )
  customLayoutStorage()?.setItem(
    CUSTOM_SLIDE_LAYOUTS_STORAGE_KEY,
    JSON.stringify(layouts),
  )

  return layouts
}

export function importCustomSlideLayoutsFromText(
  value: string,
): CustomSlideLayoutImportResult {
  const imported = parseCustomSlideLayoutsText(value)
  const existing = readCustomSlideLayouts()
  const existingIds = new Set(existing.map((layout) => layout.id))
  const fresh = imported.filter((layout) => !existingIds.has(layout.id))
  const availableSlots = Math.max(0, MAX_CUSTOM_SLIDE_LAYOUTS - existing.length)
  const accepted = fresh.slice(0, availableSlots)
  const layouts = [...accepted, ...existing].slice(0, MAX_CUSTOM_SLIDE_LAYOUTS)

  customLayoutStorage()?.setItem(
    CUSTOM_SLIDE_LAYOUTS_STORAGE_KEY,
    JSON.stringify(layouts),
  )

  return {
    layouts,
    added: accepted.length,
    skipped: imported.length - accepted.length,
  }
}

function candidateElements(slide: Slide, slot: CustomSlideLayoutSlot) {
  const matchingRole = slide.elements.filter(
    (element) =>
      element.type === slot.type && element.placeholderRole === slot.placeholderRole,
  )
  if (matchingRole.length) return matchingRole

  return slide.elements.filter((element) => element.type === slot.type)
}

function lockedPlaceholderForSlot(
  slide: Slide,
  slot: CustomSlideLayoutSlot,
  usedIds: Set<string>,
) {
  return slide.elements.find(
    (element) =>
      !usedIds.has(element.id) &&
      isElementLocked(element) &&
      element.type === slot.type &&
      element.placeholderRole === slot.placeholderRole,
  )
}

function applySlot(
  existing: PresentationElement | undefined,
  slot: CustomSlideLayoutSlot,
) {
  const content = existing?.content.trim() ? existing.content : slot.content
  const nextElement = {
    ...(existing ?? createElement(slot.type)),
    ...slot,
    content,
  }

  if (existing?.type === "image" && slot.type === "image") {
    return {
      ...nextElement,
      assetId: existing.assetId,
      src: existing.src,
      alt: existing.alt || slot.alt,
    }
  }

  return nextElement
}

export function applyCustomSlideLayout(
  slide: Slide,
  layout: SlideLayoutPresetLike,
): Slide {
  const usedIds = new Set<string>()
  const replacements = new Map<string, PresentationElement>()
  const additions: PresentationElement[] = []

  for (const slot of layout.slots) {
    const existing = candidateElements(slide, slot).find(
      (element) => !usedIds.has(element.id) && !isElementLocked(element),
    )

    if (!existing) {
      const lockedPlaceholder = lockedPlaceholderForSlot(slide, slot, usedIds)
      if (lockedPlaceholder) {
        usedIds.add(lockedPlaceholder.id)
        continue
      }
    }

    const nextElement = applySlot(existing, slot)

    if (existing) {
      usedIds.add(existing.id)
      replacements.set(existing.id, nextElement)
    } else {
      additions.push(nextElement)
    }
  }

  return {
    ...slide,
    elements: [
      ...slide.elements.map((element) => replacements.get(element.id) ?? element),
      ...additions,
    ],
  }
}

export function applyCustomSlideLayoutToSlides(
  slides: Slide[],
  layout: SlideLayoutPresetLike,
  slideIds: string[],
): CustomSlideLayoutApplyResult {
  const targetIds = new Set(slideIds)
  let appliedCount = 0
  const nextSlides = slides.map((slide) => {
    if (!targetIds.has(slide.id)) return slide

    appliedCount += 1
    return applyCustomSlideLayout(slide, layout)
  })

  return { slides: nextSlides, appliedCount }
}

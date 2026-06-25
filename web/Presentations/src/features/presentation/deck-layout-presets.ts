import { customSlideLayoutFromSlide } from "./custom-slide-layouts"
import { createElement } from "./default-deck"
import { normalizeFontFamily } from "./font-pairs"
import type {
  DeckLayoutPreset,
  DeckLayoutPresetSlot,
  DeckMaster,
  PlaceholderRole,
  PresentationElement,
  Slide,
} from "./types"

const maxDeckLayoutPresets = 12
export const deckLayoutPresetsFileName = "essence-master-layout-presets.json"

export type DeckLayoutPresetBundle = {
  version: 1
  presets: DeckLayoutPreset[]
}

export type DeckLayoutPresetImportResult = {
  master: DeckMaster
  added: number
  skipped: number
}

export type RecommendedDeckLayoutPresetOptions = {
  limit?: number
}

export type DeckLayoutPresetPatch = Partial<
  Pick<DeckLayoutPreset, "description" | "label">
>

export type DeckLayoutPresetSlotPatch = Partial<
  Pick<
    DeckLayoutPresetSlot,
    "content" | "height" | "width" | "x" | "y"
  >
>

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

function deckLayoutPresetId(): DeckLayoutPreset["id"] {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `deck-layout:${crypto.randomUUID()}`
  }

  return `deck-layout:${Date.now()}`
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

function parseSlot(value: unknown): DeckLayoutPresetSlot | null {
  if (!value || typeof value !== "object") return null

  const slot = value as Partial<DeckLayoutPresetSlot>
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

function parseDeckLayoutPreset(value: unknown): DeckLayoutPreset | null {
  if (!value || typeof value !== "object") return null

  const preset = value as Partial<DeckLayoutPreset>
  const slots = Array.isArray(preset.slots)
    ? preset.slots
        .map(parseSlot)
        .filter((slot): slot is DeckLayoutPresetSlot => Boolean(slot))
    : []

  if (
    !preset.id?.startsWith("deck-layout:") ||
    typeof preset.label !== "string" ||
    typeof preset.createdAt !== "string" ||
    !slots.length
  ) {
    return null
  }

  return {
    id: preset.id,
    label: preset.label.trim().slice(0, 60) || "Master layout",
    description:
      typeof preset.description === "string"
        ? preset.description
        : `${slots.length} master placeholders`,
    createdAt: preset.createdAt,
    lastUsedAt: readString(preset.lastUsedAt) || undefined,
    slots,
    useCount: Math.max(0, Math.round(readNumber(preset.useCount, 0))),
  }
}

function parseDeckLayoutPresetList(value: unknown) {
  const records = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        (value as Partial<DeckLayoutPresetBundle>).version === 1 &&
        Array.isArray((value as Partial<DeckLayoutPresetBundle>).presets)
      ? (value as Partial<DeckLayoutPresetBundle>).presets
      : null

  if (!records) return []

  return records
    .map(parseDeckLayoutPreset)
    .filter((preset): preset is DeckLayoutPreset => Boolean(preset))
}

function readTimestamp(value: string | undefined) {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function clampPercent(value: number, fallback: number, min = 0) {
  return Math.max(min, Math.min(100, readNumber(value, fallback)))
}

function normalizeSlotGeometry(slot: DeckLayoutPresetSlot): DeckLayoutPresetSlot {
  const x = Math.min(99, clampPercent(slot.x, 8))
  const y = Math.min(99, clampPercent(slot.y, 12))
  const width = Math.min(clampPercent(slot.width, 40, 1), 100 - x)
  const height = Math.min(clampPercent(slot.height, 12, 1), 100 - y)

  return {
    ...slot,
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

function presetRoleCoverage(preset: DeckLayoutPreset) {
  return new Set(preset.slots.map((slot) => slot.placeholderRole)).size
}

export function serializeDeckLayoutPresets(presets: DeckLayoutPreset[]) {
  return JSON.stringify(
    {
      version: 1,
      presets,
    } satisfies DeckLayoutPresetBundle,
    null,
    2,
  )
}

export function parseDeckLayoutPresetsText(value: string) {
  try {
    return parseDeckLayoutPresetList(JSON.parse(value))
  } catch {
    return []
  }
}

export function deckLayoutPresetFromSlide(
  slide: Slide,
  name: string,
  now = new Date(),
): DeckLayoutPreset | null {
  const layout = customSlideLayoutFromSlide(slide, name, now)

  if (!layout) return null

  return {
    ...layout,
    id: deckLayoutPresetId(),
    description: `${layout.slots.length} master placeholder${
      layout.slots.length === 1 ? "" : "s"
    }`,
    useCount: 0,
  }
}

export function saveDeckLayoutPreset(
  master: DeckMaster,
  slide: Slide,
  name: string,
) {
  const preset = deckLayoutPresetFromSlide(slide, name)

  if (!preset) {
    return { master, saved: false }
  }

  return {
    master: {
      ...master,
      layoutPresets: [preset, ...master.layoutPresets].slice(
        0,
        maxDeckLayoutPresets,
      ),
    },
    saved: true,
  }
}

export function deleteDeckLayoutPreset(
  master: DeckMaster,
  presetId: DeckLayoutPreset["id"],
): DeckMaster {
  return {
    ...master,
    layoutPresets: master.layoutPresets.filter((preset) => preset.id !== presetId),
  }
}

export function updateDeckLayoutPreset(
  master: DeckMaster,
  presetId: DeckLayoutPreset["id"],
  patch: DeckLayoutPresetPatch,
): DeckMaster {
  return {
    ...master,
    layoutPresets: master.layoutPresets.map((preset) =>
      preset.id === presetId
        ? {
            ...preset,
            description:
              patch.description !== undefined
                ? patch.description.trim().slice(0, 120) ||
                  preset.description
                : preset.description,
            label:
              patch.label !== undefined
                ? patch.label.trim().slice(0, 60) || preset.label
                : preset.label,
          }
        : preset,
    ),
  }
}

export function updateDeckLayoutPresetSlot(
  master: DeckMaster,
  presetId: DeckLayoutPreset["id"],
  slotIndex: number,
  patch: DeckLayoutPresetSlotPatch,
): DeckMaster {
  if (slotIndex < 0 || !Number.isInteger(slotIndex)) return master

  return {
    ...master,
    layoutPresets: master.layoutPresets.map((preset) =>
      preset.id === presetId
        ? {
            ...preset,
            slots: preset.slots.map((slot, index) =>
              index === slotIndex
                ? normalizeSlotGeometry({
                    ...slot,
                    ...patch,
                    content:
                      patch.content !== undefined
                        ? patch.content.slice(0, 180)
                        : slot.content,
                  })
                : slot,
            ),
          }
        : preset,
    ),
  }
}

export function markDeckLayoutPresetUsed(
  master: DeckMaster,
  presetId: DeckLayoutPreset["id"],
  now = new Date(),
): DeckMaster {
  return {
    ...master,
    layoutPresets: master.layoutPresets.map((preset) =>
      preset.id === presetId
        ? {
            ...preset,
            lastUsedAt: now.toISOString(),
            useCount: (preset.useCount ?? 0) + 1,
          }
        : preset,
    ),
  }
}

export function recommendedDeckLayoutPresets(
  master: DeckMaster,
  options: RecommendedDeckLayoutPresetOptions = {},
) {
  const limit = Math.max(0, Math.floor(options.limit ?? 3))

  if (!limit) return []

  return [...master.layoutPresets]
    .sort((left, right) => {
      const rightLastUsed = readTimestamp(right.lastUsedAt)
      const leftLastUsed = readTimestamp(left.lastUsedAt)

      if (rightLastUsed !== leftLastUsed) return rightLastUsed - leftLastUsed

      const rightUseCount = right.useCount ?? 0
      const leftUseCount = left.useCount ?? 0

      if (rightUseCount !== leftUseCount) return rightUseCount - leftUseCount

      const rightCoverage = presetRoleCoverage(right)
      const leftCoverage = presetRoleCoverage(left)

      if (rightCoverage !== leftCoverage) return rightCoverage - leftCoverage
      if (right.slots.length !== left.slots.length) {
        return right.slots.length - left.slots.length
      }

      const rightCreated = readTimestamp(right.createdAt)
      const leftCreated = readTimestamp(left.createdAt)

      if (rightCreated !== leftCreated) return rightCreated - leftCreated

      return left.label.localeCompare(right.label)
    })
    .slice(0, limit)
}

export function importDeckLayoutPresetsToMaster(
  master: DeckMaster,
  value: string,
): DeckLayoutPresetImportResult {
  const imported = parseDeckLayoutPresetsText(value)
  const existingIds = new Set(master.layoutPresets.map((preset) => preset.id))
  const fresh = imported.filter((preset) => !existingIds.has(preset.id))
  const availableSlots = Math.max(
    0,
    maxDeckLayoutPresets - master.layoutPresets.length,
  )
  const accepted = fresh.slice(0, availableSlots)

  return {
    master: {
      ...master,
      layoutPresets: [...accepted, ...master.layoutPresets].slice(
        0,
        maxDeckLayoutPresets,
      ),
    },
    added: accepted.length,
    skipped: imported.length - accepted.length,
  }
}

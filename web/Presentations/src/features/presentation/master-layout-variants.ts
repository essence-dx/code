import type { SlideLayoutPresetLike } from "./custom-slide-layouts"
import type { DeckLayoutPreset, DeckLayoutPresetSlot } from "./types"

export type MasterLayoutVariantId = "original" | "mirrored" | "stacked"

export type MasterLayoutVariant = SlideLayoutPresetLike & {
  actionLabel: string
  description: string
  sourcePresetId: DeckLayoutPreset["id"]
  variantId: MasterLayoutVariantId
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, roundPercent(value)))
}

function mirrorSlot(slot: DeckLayoutPresetSlot): DeckLayoutPresetSlot {
  return {
    ...slot,
    x: clampPercent(100 - slot.x - slot.width),
  }
}

function slotSignature(slots: DeckLayoutPresetSlot[]) {
  return slots
    .map(
      (slot) =>
        `${slot.type}:${slot.placeholderRole}:${roundPercent(slot.x)}:${roundPercent(
          slot.y,
        )}:${roundPercent(slot.width)}:${roundPercent(slot.height)}`,
    )
    .join("|")
}

function contentSlots(slots: DeckLayoutPresetSlot[]) {
  return slots.filter((slot) => slot.placeholderRole !== "title")
}

function stackedSlots(preset: DeckLayoutPreset): DeckLayoutPresetSlot[] | null {
  const content = contentSlots(preset.slots)
  if (content.length < 2) return null

  const sortedContent = [...content].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  )
  const contentIds = new Map(
    sortedContent.map((slot, index) => [
      `${slot.type}:${slot.placeholderRole}:${slot.x}:${slot.y}:${slot.width}:${slot.height}`,
      index,
    ]),
  )
  const minX = Math.min(...content.map((slot) => slot.x))
  const maxRight = Math.max(...content.map((slot) => slot.x + slot.width))
  const minY = Math.min(...content.map((slot) => slot.y))
  const maxBottom = Math.max(...content.map((slot) => slot.y + slot.height))
  const gap = 3
  const totalGap = gap * (content.length - 1)
  const height = Math.max(8, (maxBottom - minY - totalGap) / content.length)
  const width = Math.max(8, maxRight - minX)

  return preset.slots.map((slot) => {
    if (slot.placeholderRole === "title") return slot

    const key = `${slot.type}:${slot.placeholderRole}:${slot.x}:${slot.y}:${slot.width}:${slot.height}`
    const index = contentIds.get(key) ?? 0

    return {
      ...slot,
      x: clampPercent(minX),
      y: clampPercent(minY + index * (height + gap)),
      width: clampPercent(width),
      height: clampPercent(height),
    }
  })
}

function variantFromSlots(input: {
  actionLabel: string
  description: string
  id: MasterLayoutVariantId
  label: string
  preset: DeckLayoutPreset
  slots: DeckLayoutPresetSlot[]
}): MasterLayoutVariant {
  return {
    actionLabel: input.actionLabel,
    description: input.description,
    id: `${input.preset.id}:variant:${input.id}`,
    label: input.label,
    slots: input.slots,
    sourcePresetId: input.preset.id,
    variantId: input.id,
  }
}

export function masterLayoutVariantsForPreset(
  preset: DeckLayoutPreset,
): MasterLayoutVariant[] {
  const variants = [
    variantFromSlots({
      actionLabel: "Original",
      description: preset.description,
      id: "original",
      label: preset.label,
      preset,
      slots: preset.slots,
    }),
  ]
  const originalSignature = slotSignature(preset.slots)
  const mirroredSlots = preset.slots.map(mirrorSlot)

  if (slotSignature(mirroredSlots) !== originalSignature) {
    variants.push(
      variantFromSlots({
        actionLabel: "Mirror",
        description: `${preset.description} mirrored`,
        id: "mirrored",
        label: `${preset.label} mirror`,
        preset,
        slots: mirroredSlots,
      }),
    )
  }

  const stacked = stackedSlots(preset)
  if (stacked && slotSignature(stacked) !== originalSignature) {
    variants.push(
      variantFromSlots({
        actionLabel: "Stack",
        description: `${preset.description} stacked`,
        id: "stacked",
        label: `${preset.label} stack`,
        preset,
        slots: stacked,
      }),
    )
  }

  return variants
}

import {
  masterStylePatchFromMaster,
  type CustomMasterStylePresetId,
  type MasterStylePatch,
  type MasterStylePreset,
} from "./master-style-presets"
import { defaultDeckMaster, normalizeDeckMaster } from "./slide-master"
import type { DeckMaster } from "./types"

export type CustomMasterStylePreset = MasterStylePreset & {
  createdAt: string
  id: CustomMasterStylePresetId
}

export type CustomMasterStylePresetFile = {
  presets: CustomMasterStylePreset[]
  version: 1
}

export type CustomMasterStylePresetImportResult = {
  added: number
  presets: CustomMasterStylePreset[]
  skipped: number
}

const CUSTOM_MASTER_STYLES_STORAGE_KEY =
  "essence-powerpoint-custom-master-styles"
const MAX_CUSTOM_MASTER_STYLES = 16
export const customMasterStylePresetsFileName =
  "essence-master-styles.json"

function customMasterStylePresetId(): CustomMasterStylePresetId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-master-style:${crypto.randomUUID()}`
  }

  return `custom-master-style:${Date.now()}`
}

function customMasterStyleStorage() {
  return typeof window === "undefined" ? null : window.localStorage
}

function masterStylePatchFromUnknown(value: unknown): MasterStylePatch {
  const master =
    value && typeof value === "object"
      ? normalizeDeckMaster(value as Partial<DeckMaster>)
      : defaultDeckMaster

  return masterStylePatchFromMaster(master)
}

function parseCustomMasterStylePreset(
  value: unknown,
): CustomMasterStylePreset | null {
  if (!value || typeof value !== "object") return null

  const preset = value as Partial<CustomMasterStylePreset>

  if (
    !preset.id?.startsWith("custom-master-style:") ||
    typeof preset.label !== "string" ||
    typeof preset.createdAt !== "string"
  ) {
    return null
  }

  const patch = masterStylePatchFromUnknown(preset.patch)

  return {
    accent:
      typeof preset.accent === "string" && preset.accent.trim()
        ? preset.accent
        : patch.color,
    createdAt: preset.createdAt,
    description:
      typeof preset.description === "string"
        ? preset.description
        : "Saved master footer system",
    id: preset.id,
    label: preset.label.trim().slice(0, 60) || "Custom master style",
    patch,
  }
}

function parseCustomMasterStylePresetList(value: unknown) {
  const records = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        (value as Partial<CustomMasterStylePresetFile>).version === 1 &&
        Array.isArray(
          (value as Partial<CustomMasterStylePresetFile>).presets,
        )
      ? (value as Partial<CustomMasterStylePresetFile>).presets
      : null

  if (!records) return []

  return records
    .map(parseCustomMasterStylePreset)
    .filter(
      (preset): preset is CustomMasterStylePreset => Boolean(preset),
    )
}

export function serializeCustomMasterStylePresets(
  presets: CustomMasterStylePreset[],
) {
  return JSON.stringify(
    {
      presets,
      version: 1,
    } satisfies CustomMasterStylePresetFile,
    null,
    2,
  )
}

export function parseCustomMasterStylePresetsText(value: string) {
  try {
    return parseCustomMasterStylePresetList(JSON.parse(value))
  } catch {
    return []
  }
}

export function customMasterStylePresetFromMaster(
  master: DeckMaster,
  name: string,
  now = new Date(),
): CustomMasterStylePreset {
  const label = name.trim().slice(0, 60) || "House master style"
  const patch = masterStylePatchFromMaster(master)

  return {
    accent: patch.color,
    createdAt: now.toISOString(),
    description: "Saved from the current master footer settings",
    id: customMasterStylePresetId(),
    label,
    patch,
  }
}

export function readCustomMasterStylePresets() {
  const storage = customMasterStyleStorage()
  if (!storage) return []

  try {
    return parseCustomMasterStylePresetList(
      JSON.parse(storage.getItem(CUSTOM_MASTER_STYLES_STORAGE_KEY) ?? "[]"),
    )
  } catch {
    return []
  }
}

export function saveCustomMasterStylePreset(
  master: DeckMaster,
  name: string,
) {
  const preset = customMasterStylePresetFromMaster(master, name)
  const presets = [preset, ...readCustomMasterStylePresets()].slice(
    0,
    MAX_CUSTOM_MASTER_STYLES,
  )

  customMasterStyleStorage()?.setItem(
    CUSTOM_MASTER_STYLES_STORAGE_KEY,
    JSON.stringify(presets),
  )

  return presets
}

export function deleteCustomMasterStylePreset(presetId: string) {
  const presets = readCustomMasterStylePresets().filter(
    (preset) => preset.id !== presetId,
  )

  customMasterStyleStorage()?.setItem(
    CUSTOM_MASTER_STYLES_STORAGE_KEY,
    JSON.stringify(presets),
  )

  return presets
}

export function importCustomMasterStylePresetsFromText(
  value: string,
): CustomMasterStylePresetImportResult {
  const imported = parseCustomMasterStylePresetsText(value)
  const existing = readCustomMasterStylePresets()
  const existingIds = new Set(existing.map((preset) => preset.id))
  const fresh = imported.filter((preset) => !existingIds.has(preset.id))
  const availableSlots = Math.max(
    0,
    MAX_CUSTOM_MASTER_STYLES - existing.length,
  )
  const accepted = fresh.slice(0, availableSlots)
  const presets = [...accepted, ...existing].slice(0, MAX_CUSTOM_MASTER_STYLES)

  customMasterStyleStorage()?.setItem(
    CUSTOM_MASTER_STYLES_STORAGE_KEY,
    JSON.stringify(presets),
  )

  return {
    added: accepted.length,
    presets,
    skipped: imported.length - accepted.length,
  }
}

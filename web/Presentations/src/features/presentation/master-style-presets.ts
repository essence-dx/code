import type { DeckMaster, FontFamily } from "./types"
import { defaultDeckMaster, masterFooterParts } from "./slide-master"

export type BuiltInMasterStylePresetId =
  | "minimal"
  | "boardroom"
  | "lecture"
  | "portfolio"

export type CustomMasterStylePresetId = `custom-master-style:${string}`
export type MasterStylePresetId =
  | BuiltInMasterStylePresetId
  | CustomMasterStylePresetId

export type MasterStylePatch = Pick<
  DeckMaster,
  | "color"
  | "fontFamily"
  | "fontSize"
  | "footerText"
  | "showDate"
  | "showFooter"
  | "showSlideNumbers"
>

export type MasterStylePreset = {
  accent: string
  description: string
  id: MasterStylePresetId
  label: string
  patch: MasterStylePatch
}

export type MasterStylePresetPreview = {
  center: string
  color: string
  fontSize: number
  left: string
  right: string
}

function masterPatch(input: MasterStylePatch): MasterStylePatch {
  return input
}

export const masterStylePresets: MasterStylePreset[] = [
  {
    accent: "#64748b",
    description: "Clean numbering only",
    id: "minimal",
    label: "Minimal",
    patch: masterPatch({
      color: "#64748b",
      fontFamily: "system",
      fontSize: 9,
      footerText: "",
      showDate: false,
      showFooter: false,
      showSlideNumbers: true,
    }),
  },
  {
    accent: "#0f766e",
    description: "Footer, date, and numbers",
    id: "boardroom",
    label: "Boardroom",
    patch: masterPatch({
      color: "#0f766e",
      fontFamily: "system",
      fontSize: 9,
      footerText: "Confidential",
      showDate: true,
      showFooter: true,
      showSlideNumbers: true,
    }),
  },
  {
    accent: "#7c3aed",
    description: "Lecture footer and numbering",
    id: "lecture",
    label: "Lecture",
    patch: masterPatch({
      color: "#7c3aed",
      fontFamily: "serif",
      fontSize: 10,
      footerText: "Lecture notes",
      showDate: false,
      showFooter: true,
      showSlideNumbers: true,
    }),
  },
  {
    accent: "#d97706",
    description: "Portfolio date footer",
    id: "portfolio",
    label: "Portfolio",
    patch: masterPatch({
      color: "#d97706",
      fontFamily: "geist",
      fontSize: 8,
      footerText: "Portfolio",
      showDate: true,
      showFooter: true,
      showSlideNumbers: false,
    }),
  },
]

export function applyMasterStylePreset(
  master: DeckMaster,
  presetId: MasterStylePresetId,
): DeckMaster {
  const preset =
    masterStylePresets.find((item) => item.id === presetId) ??
    masterStylePresets[0]!

  return {
    ...master,
    ...preset.patch,
    fontFamily: preset.patch.fontFamily as FontFamily,
  }
}

export function masterStylePatchFromMaster(
  master: DeckMaster,
): MasterStylePatch {
  return {
    color: master.color,
    fontFamily: master.fontFamily,
    fontSize: master.fontSize,
    footerText: master.footerText,
    showDate: master.showDate,
    showFooter: master.showFooter,
    showSlideNumbers: master.showSlideNumbers,
  }
}

export function masterStylePresetMatches(
  master: DeckMaster,
  preset: MasterStylePreset,
) {
  return Object.entries(preset.patch).every(
    ([key, value]) => master[key as keyof MasterStylePatch] === value,
  )
}

export function masterStylePresetPreview(
  preset: MasterStylePreset,
  options: {
    date?: Date
    slideCount?: number
    slideNumber?: number
  } = {},
): MasterStylePresetPreview {
  const master: DeckMaster = {
    ...defaultDeckMaster,
    ...preset.patch,
    fontFamily: preset.patch.fontFamily as FontFamily,
  }
  const parts = masterFooterParts({
    date: options.date,
    master,
    slideCount: options.slideCount ?? 12,
    slideNumber: options.slideNumber ?? 3,
  })

  return {
    ...parts,
    color: master.color,
    fontSize: master.fontSize,
  }
}

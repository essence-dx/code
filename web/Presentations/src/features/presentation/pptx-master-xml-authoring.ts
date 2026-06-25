import {
  nativePptxLayoutPlaceholderKindForSlot,
  nativePptxMasterLayoutPlan,
  type NativePptxLayoutPlaceholderKind,
  type NativePptxMasterPlaceholderKind,
} from "./pptx-master-layout-export"
import { pptxThemePackagePlan } from "./pptx-theme-package-plan"
import type {
  Deck,
  DeckLayoutPreset,
  DeckLayoutPresetSlot,
  PlaceholderRole,
} from "./types"

export type PptxMasterXmlAuthoringTaskStatus =
  | "blocked"
  | "partial"
  | "ready"

export type PptxMasterXmlAuthoringTaskKind =
  | "layout-placeholder"
  | "master-placeholder"
  | "package"
  | "relationship"

export type PptxMasterXmlAuthoringTask = {
  detail: string
  geometry: string
  id: string
  kind: PptxMasterXmlAuthoringTaskKind
  label: string
  partPath: string
  placeholderKind?: NativePptxLayoutPlaceholderKind | NativePptxMasterPlaceholderKind
  placeholderRole?: PlaceholderRole
  status: PptxMasterXmlAuthoringTaskStatus
}

export type PptxMasterXmlAuthoringPlan = {
  blockedTaskCount: number
  handoffTaskCount: number
  layoutPlaceholderTaskCount: number
  masterPlaceholderTaskCount: number
  readyTaskCount: number
  status: PptxMasterXmlAuthoringTaskStatus
  summary: string
  tasks: PptxMasterXmlAuthoringTask[]
  totalTaskCount: number
}

function statusFromPackageStatus(
  status: "blocked" | "partial" | "ready",
): PptxMasterXmlAuthoringTaskStatus {
  return status
}

function combinedStatus(
  statuses: readonly PptxMasterXmlAuthoringTaskStatus[],
): PptxMasterXmlAuthoringTaskStatus {
  if (!statuses.length || statuses.every((status) => status === "blocked")) {
    return "blocked"
  }

  if (statuses.every((status) => status === "ready")) {
    return "ready"
  }

  return "partial"
}

function roundedPercent(value: number) {
  return Math.round(value * 10) / 10
}

function slotGeometry(slot: DeckLayoutPresetSlot) {
  return `${roundedPercent(slot.x)},${roundedPercent(slot.y)},${roundedPercent(
    slot.width,
  )},${roundedPercent(slot.height)}`
}

function packageTasks(deck: Deck): PptxMasterXmlAuthoringTask[] {
  return pptxThemePackagePlan(deck).packageParts.map((part) => ({
    detail: part.detail,
    geometry: "",
    id: `author:${part.id}`,
    kind: part.kind.includes("relationship") ? "relationship" : "package",
    label: part.name,
    partPath: part.path,
    status: statusFromPackageStatus(part.status),
  }))
}

function masterPlaceholderTasks(deck: Deck): PptxMasterXmlAuthoringTask[] {
  const tasks: PptxMasterXmlAuthoringTask[] = []

  if (deck.master.showDate) {
    tasks.push({
      detail: "Author a date placeholder on slideMaster1.xml instead of only painting dates onto each slide.",
      geometry: "master-default",
      id: "author:master-placeholder:date",
      kind: "master-placeholder",
      label: "Date placeholder",
      partPath: "ppt/slideMasters/slideMaster1.xml",
      placeholderKind: "date",
      status: "ready",
    })
  }

  if (deck.master.showFooter && deck.master.footerText.trim()) {
    tasks.push({
      detail: `Author a footer placeholder with text "${deck.master.footerText.trim()}".`,
      geometry: "master-default",
      id: "author:master-placeholder:footer",
      kind: "master-placeholder",
      label: "Footer placeholder",
      partPath: "ppt/slideMasters/slideMaster1.xml",
      placeholderKind: "footer",
      status: "ready",
    })
  }

  if (deck.master.showSlideNumbers) {
    tasks.push({
      detail: "Author a slide-number placeholder on slideMaster1.xml for native Office numbering.",
      geometry: "master-default",
      id: "author:master-placeholder:slide-number",
      kind: "master-placeholder",
      label: "Slide-number placeholder",
      partPath: "ppt/slideMasters/slideMaster1.xml",
      placeholderKind: "slide-number",
      status: "ready",
    })
  }

  return tasks
}

function layoutPlaceholderTask(
  preset: DeckLayoutPreset,
  slot: DeckLayoutPresetSlot,
  presetIndex: number,
  slotIndex: number,
): PptxMasterXmlAuthoringTask {
  const placeholderKind = nativePptxLayoutPlaceholderKindForSlot(slot)
  const geometry = slotGeometry(slot)
  const partPath = `ppt/slideLayouts/slideLayout${presetIndex + 1}.xml`

  if (!placeholderKind) {
    return {
      detail: `${slot.type} slots with ${slot.placeholderRole} role stay as Essence layout metadata until a safe Office placeholder mapping exists.`,
      geometry,
      id: `author:layout-placeholder:${preset.id}:${slotIndex}`,
      kind: "layout-placeholder",
      label: `${preset.label} slot ${slotIndex + 1}`,
      partPath,
      placeholderRole: slot.placeholderRole,
      status: "blocked",
    }
  }

  return {
    detail: `Author <p:ph type="${placeholderKind}"> for a ${slot.placeholderRole} ${slot.type} slot.`,
    geometry,
    id: `author:layout-placeholder:${preset.id}:${slotIndex}`,
    kind: "layout-placeholder",
    label: `${preset.label} ${slot.placeholderRole}`,
    partPath,
    placeholderKind,
    placeholderRole: slot.placeholderRole,
    status: "ready",
  }
}

function layoutPlaceholderTasks(deck: Deck): PptxMasterXmlAuthoringTask[] {
  return deck.master.layoutPresets.flatMap((preset, presetIndex) =>
    preset.slots.map((slot, slotIndex) =>
      layoutPlaceholderTask(preset, slot, presetIndex, slotIndex),
    ),
  )
}

function planSummary(input: {
  blockedTaskCount: number
  readyTaskCount: number
  totalTaskCount: number
}) {
  if (!input.totalTaskCount) {
    return "No native master/layout XML authoring tasks are available yet."
  }

  if (!input.blockedTaskCount) {
    return `${input.readyTaskCount}/${input.totalTaskCount} native master/layout XML authoring task(s) are ready.`
  }

  return `${input.readyTaskCount}/${input.totalTaskCount} native master/layout XML authoring task(s) are ready; ${input.blockedTaskCount} task(s) need compatibility handoff.`
}

export function pptxMasterXmlAuthoringPlan(
  deck: Deck,
): PptxMasterXmlAuthoringPlan {
  const layoutPlan = nativePptxMasterLayoutPlan(deck)
  const tasks = [
    ...packageTasks(deck),
    ...masterPlaceholderTasks(deck),
    ...layoutPlaceholderTasks(deck),
  ]
  const readyTaskCount = tasks.filter((task) => task.status === "ready").length
  const blockedTaskCount = tasks.filter((task) => task.status === "blocked").length
  const status = combinedStatus([
    ...tasks.map((task) => task.status),
    layoutPlan.status === "blocked" ? "blocked" : "ready",
  ])

  return {
    blockedTaskCount,
    handoffTaskCount: tasks.length - readyTaskCount,
    layoutPlaceholderTaskCount: tasks.filter(
      (task) => task.kind === "layout-placeholder",
    ).length,
    masterPlaceholderTaskCount: tasks.filter(
      (task) => task.kind === "master-placeholder",
    ).length,
    readyTaskCount,
    status,
    summary: planSummary({
      blockedTaskCount,
      readyTaskCount,
      totalTaskCount: tasks.length,
    }),
    tasks,
    totalTaskCount: tasks.length,
  }
}

export function serializePptxMasterXmlAuthoringPlan(deck: Deck) {
  const plan = pptxMasterXmlAuthoringPlan(deck)
  const lines = [
    "Native master/layout XML authoring plan",
    `Status: ${plan.status}`,
    `Tasks: ${plan.readyTaskCount}/${plan.totalTaskCount}`,
    `Master placeholders: ${plan.masterPlaceholderTaskCount}`,
    `Layout placeholders: ${plan.layoutPlaceholderTaskCount}`,
    `Handoffs: ${plan.handoffTaskCount}`,
    `Summary: ${plan.summary}`,
    "",
    "Authoring tasks:",
    ...plan.tasks.map(
      (task, index) =>
        `${index + 1}. ${task.partPath} - ${task.label}; ${task.status}; ${task.geometry || "no geometry"}; ${task.detail}`,
    ),
  ]

  return `${lines.join("\n")}\n`
}

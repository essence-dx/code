import {
  nativePptxLayoutPlaceholderKindForSlot,
  type NativePptxLayoutPlaceholderKind,
  type NativePptxMasterPlaceholderKind,
} from "./pptx-master-layout-export"
import {
  pptxMasterXmlAuthoringPlan,
  type PptxMasterXmlAuthoringTaskStatus,
} from "./pptx-master-xml-authoring"
import type { Deck, DeckLayoutPreset, DeckLayoutPresetSlot } from "./types"

export type PptxMasterLayoutXmlPartKind = "slide-layout" | "slide-master"

export type PptxMasterLayoutXmlPart = {
  detail: string
  id: string
  kind: PptxMasterLayoutXmlPartKind
  name: string
  path: string
  placeholderCount: number
  status: PptxMasterXmlAuthoringTaskStatus
  xml: string
  xmlLength: number
}

export type PptxMasterLayoutXmlAuthoring = {
  handoffPlaceholderCount: number
  layoutPartCount: number
  masterPartCount: number
  packagePartCount: number
  parts: PptxMasterLayoutXmlPart[]
  placeholderCount: number
  readyPartCount: number
  status: PptxMasterXmlAuthoringTaskStatus
  summary: string
  totalPartCount: number
  xmlLength: number
}

type PlaceholderFrame = {
  height: number
  width: number
  x: number
  y: number
}

type MasterPlaceholderEntry = {
  frame: PlaceholderFrame
  kind: NativePptxMasterPlaceholderKind
  label: string
  text: string
}

type LayoutPlaceholderEntry = {
  frame: PlaceholderFrame
  kind: NativePptxLayoutPlaceholderKind
  label: string
  slot: DeckLayoutPresetSlot
  text: string
}

const slideWidthEmu = 12_192_000
const slideHeightEmu = 6_858_000

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function clampPercent(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback
}

function percentFrame(input: PlaceholderFrame) {
  const x = clampPercent(input.x, 0)
  const y = clampPercent(input.y, 0)
  const width = Math.max(1, Math.min(100 - x, clampPercent(input.width, 1)))
  const height = Math.max(1, Math.min(100 - y, clampPercent(input.height, 1)))

  return {
    cx: Math.round((width / 100) * slideWidthEmu),
    cy: Math.round((height / 100) * slideHeightEmu),
    x: Math.round((x / 100) * slideWidthEmu),
    y: Math.round((y / 100) * slideHeightEmu),
  }
}

function slotFrame(slot: DeckLayoutPresetSlot): PlaceholderFrame {
  return {
    height: slot.height,
    width: slot.width,
    x: slot.x,
    y: slot.y,
  }
}

function masterPlaceholderEntries(deck: Deck): MasterPlaceholderEntry[] {
  return [
    deck.master.showDate
      ? ({
          frame: { x: 5, y: 92.8, width: 24, height: 4.2 },
          kind: "date",
          label: "Date placeholder",
          text: "Date",
        } satisfies MasterPlaceholderEntry)
      : null,
    deck.master.showFooter && deck.master.footerText.trim()
      ? ({
          frame: { x: 32, y: 92.8, width: 36, height: 4.2 },
          kind: "footer",
          label: "Footer placeholder",
          text: deck.master.footerText.trim(),
        } satisfies MasterPlaceholderEntry)
      : null,
    deck.master.showSlideNumbers
      ? ({
          frame: { x: 88, y: 92.8, width: 7, height: 4.2 },
          kind: "slide-number",
          label: "Slide number placeholder",
          text: "#",
        } satisfies MasterPlaceholderEntry)
      : null,
  ].filter((entry): entry is MasterPlaceholderEntry => Boolean(entry))
}

function officeMasterPlaceholderType(kind: NativePptxMasterPlaceholderKind) {
  if (kind === "date") return "dt"
  if (kind === "slide-number") return "sldNum"

  return "ftr"
}

function officeLayoutPlaceholderType(kind: NativePptxLayoutPlaceholderKind) {
  if (kind === "content") return "obj"
  if (kind === "caption") return "body"

  return kind
}

function textBodyXml(text: string) {
  const content = escapeXml(text)

  return `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US"/><a:t>${content}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></p:txBody>`
}

function placeholderShapeXml(input: {
  frame: PlaceholderFrame
  id: number
  index: number
  name: string
  placeholderType: string
  text: string
}) {
  const frame = percentFrame(input.frame)

  return `    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${input.id}" name="${escapeXml(input.name)}"/>
        <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
        <p:nvPr><p:ph type="${input.placeholderType}" idx="${input.index}"/></p:nvPr>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${frame.x}" y="${frame.y}"/><a:ext cx="${frame.cx}" cy="${frame.cy}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
      ${textBodyXml(input.text)}
    </p:sp>`
}

function spTreeXml(shapes: string[]) {
  return `<p:spTree>
    <p:nvGrpSpPr>
      <p:cNvPr id="1" name=""/>
      <p:cNvGrpSpPr/>
      <p:nvPr/>
    </p:nvGrpSpPr>
    <p:grpSpPr>
      <a:xfrm>
        <a:off x="0" y="0"/>
        <a:ext cx="0" cy="0"/>
        <a:chOff x="0" y="0"/>
        <a:chExt cx="0" cy="0"/>
      </a:xfrm>
    </p:grpSpPr>
${shapes.join("\n")}
  </p:spTree>`
}

function slideMasterXml(
  deck: Deck,
  entries: MasterPlaceholderEntry[],
  layoutPartCount: number,
) {
  const shapes = entries.map((entry, index) =>
    placeholderShapeXml({
      frame: entry.frame,
      id: index + 2,
      index: index + 1,
      name: entry.label,
      placeholderType: officeMasterPlaceholderType(entry.kind),
      text: entry.text,
    }),
  )
  const layoutIds = Array.from({ length: layoutPartCount }, (_, index) => {
    const layoutId = 2_147_483_649 + index

    return `    <p:sldLayoutId id="${layoutId}" r:id="rId${index + 1}"/>`
  })

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld name="${escapeXml(deck.title.trim() || "Essence master")}">
${spTreeXml(shapes)}
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
${layoutIds.join("\n")}
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle>
    <p:bodyStyle><a:lvl1pPr marL="342900" indent="-342900"><a:defRPr sz="2400"/></a:lvl1pPr></p:bodyStyle>
    <p:otherStyle><a:lvl1pPr algn="l"><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle>
  </p:txStyles>
</p:sldMaster>`
}

function layoutEntries(preset: DeckLayoutPreset): LayoutPlaceholderEntry[] {
  return preset.slots.flatMap((slot, index) => {
    const kind = nativePptxLayoutPlaceholderKindForSlot(slot)
    if (!kind) return []

    return [
      {
        frame: slotFrame(slot),
        kind,
        label: `${preset.label} ${slot.placeholderRole} ${index + 1}`,
        slot,
        text: slot.content.trim() || `${slot.placeholderRole} placeholder`,
      },
    ]
  })
}

function layoutStatus(
  preset: DeckLayoutPreset,
  entries: LayoutPlaceholderEntry[],
): PptxMasterXmlAuthoringTaskStatus {
  if (!entries.length) return "blocked"
  if (entries.length === preset.slots.length) return "ready"

  return "partial"
}

function slideLayoutXml(preset: DeckLayoutPreset, entries: LayoutPlaceholderEntry[]) {
  const shapes = entries.map((entry, index) =>
    placeholderShapeXml({
      frame: entry.frame,
      id: index + 2,
      index: index + 1,
      name: entry.label,
      placeholderType: officeLayoutPlaceholderType(entry.kind),
      text: entry.text,
    }),
  )

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" type="obj" preserve="1">
  <p:cSld name="${escapeXml(preset.label)}">
${spTreeXml(shapes)}
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`
}

function combinedStatus(
  statuses: PptxMasterXmlAuthoringTaskStatus[],
): PptxMasterXmlAuthoringTaskStatus {
  if (!statuses.length || statuses.every((status) => status === "blocked")) {
    return "blocked"
  }

  if (statuses.every((status) => status === "ready")) {
    return "ready"
  }

  return "partial"
}

function summary(input: {
  handoffPlaceholderCount: number
  placeholderCount: number
  readyPartCount: number
  totalPartCount: number
  xmlLength: number
}) {
  if (!input.totalPartCount) {
    return "No slide-master or slide-layout XML parts can be authored yet."
  }

  const partSummary = `${input.readyPartCount}/${input.totalPartCount} master/layout XML part${
    input.totalPartCount === 1 ? "" : "s"
  } authored`

  if (!input.handoffPlaceholderCount) {
    return `${partSummary}; ${input.placeholderCount} placeholder(s) and ${input.xmlLength} XML characters are ready for package writing.`
  }

  return `${partSummary}; ${input.placeholderCount} placeholder(s) authored and ${input.handoffPlaceholderCount} placeholder task(s) still need handoff.`
}

export function pptxMasterLayoutXmlAuthoring(
  deck: Deck,
): PptxMasterLayoutXmlAuthoring {
  const plan = pptxMasterXmlAuthoringPlan(deck)
  const masterEntries = masterPlaceholderEntries(deck)
  const masterParts: PptxMasterLayoutXmlPart[] = masterEntries.length
    ? [
        {
          detail:
            "Author slide master placeholders for date, footer, or slide numbers instead of only flattening them onto slides.",
          id: "master-layout-xml:slideMaster1",
          kind: "slide-master",
          name: "Slide Master 1",
          path: "ppt/slideMasters/slideMaster1.xml",
          placeholderCount: masterEntries.length,
          status: "ready",
          xml: slideMasterXml(deck, masterEntries, deck.master.layoutPresets.length),
          xmlLength: 0,
        },
      ]
    : []
  const layoutParts = deck.master.layoutPresets.map((preset, index) => {
    const entries = layoutEntries(preset)
    const status = layoutStatus(preset, entries)
    const xml = entries.length ? slideLayoutXml(preset, entries) : ""

    return {
      detail:
        status === "ready"
          ? "All saved layout slots are authored as native Office placeholders."
          : status === "partial"
            ? "Some saved layout slots can be authored as Office placeholders; unsupported slots stay as handoff metadata."
            : "No saved layout slots have a safe Office placeholder mapping yet.",
      id: `master-layout-xml:slideLayout${index + 1}`,
      kind: "slide-layout",
      name: preset.label,
      path: `ppt/slideLayouts/slideLayout${index + 1}.xml`,
      placeholderCount: entries.length,
      status,
      xml,
      xmlLength: xml.length,
    } satisfies PptxMasterLayoutXmlPart
  })
  const parts = [...masterParts, ...layoutParts].map((part) => ({
    ...part,
    xmlLength: part.xml.length,
  }))
  const readyPartCount = parts.filter((part) => part.status === "ready").length
  const packagePartCount = plan.tasks.filter(
    (task) => task.kind === "package" || task.kind === "relationship",
  ).length
  const handoffPlaceholderCount = plan.tasks.filter(
    (task) =>
      (task.kind === "layout-placeholder" ||
        task.kind === "master-placeholder") &&
      task.status !== "ready",
  ).length
  const placeholderCount = parts.reduce(
    (total, part) => total + part.placeholderCount,
    0,
  )
  const xmlLength = parts.reduce((total, part) => total + part.xmlLength, 0)
  const status = combinedStatus(parts.map((part) => part.status))

  return {
    handoffPlaceholderCount,
    layoutPartCount: layoutParts.length,
    masterPartCount: masterParts.length,
    packagePartCount,
    parts,
    placeholderCount,
    readyPartCount,
    status,
    summary: summary({
      handoffPlaceholderCount,
      placeholderCount,
      readyPartCount,
      totalPartCount: parts.length,
      xmlLength,
    }),
    totalPartCount: parts.length,
    xmlLength,
  }
}

export function serializePptxMasterLayoutXmlAuthoring(deck: Deck) {
  const authoring = pptxMasterLayoutXmlAuthoring(deck)
  const lines = [
    "Native master/layout XML authoring",
    `Status: ${authoring.status}`,
    `Parts: ${authoring.readyPartCount}/${authoring.totalPartCount}`,
    `Master parts: ${authoring.masterPartCount}`,
    `Layout parts: ${authoring.layoutPartCount}`,
    `Placeholders: ${authoring.placeholderCount}`,
    `Handoffs: ${authoring.handoffPlaceholderCount}`,
    `XML characters: ${authoring.xmlLength}`,
    `Summary: ${authoring.summary}`,
    "",
    "Authored XML parts:",
    ...authoring.parts.map(
      (part, index) =>
        `${index + 1}. ${part.path} - ${part.status}; ${part.placeholderCount} placeholder(s); ${part.xmlLength} characters; ${part.detail}`,
    ),
  ]

  return `${lines.join("\n")}\n`
}

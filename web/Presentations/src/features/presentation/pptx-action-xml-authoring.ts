import {
  pptxActionSettingPlan,
  type PptxActionSettingPlanItem,
} from "./pptx-action-settings"
import type { Deck, PresentationElement, Slide } from "./types"

export type PptxActionXmlPartKind =
  | "slide-action-overlays"
  | "slide-action-relationships"

export type PptxActionXmlPartStatus = "blocked" | "partial" | "ready"

export type PptxActionXmlPart = {
  actionCount: number
  detail: string
  id: string
  kind: PptxActionXmlPartKind
  path: string
  relationshipCount: number
  slideId: string
  slideNumber: number
  status: PptxActionXmlPartStatus
  xml: string
  xmlLength: number
}

export type PptxActionXmlAuthoring = {
  blockedActionCount: number
  externalRelationshipCount: number
  internalRelationshipCount: number
  missingGeometryCount: number
  nativeActionCount: number
  parts: PptxActionXmlPart[]
  readyPartCount: number
  relationshipCount: number
  status: PptxActionXmlPartStatus
  summary: string
  totalActionCount: number
  totalPartCount: number
  xmlLength: number
}

type ActionRecord = {
  element: PresentationElement
  item: PptxActionSettingPlanItem
  slide: Slide
  slideIndex: number
}

type AuthoredAction = ActionRecord & {
  relationshipId: string
  shapeId: number
}

const slideWidthEmu = 12_192_000
const slideHeightEmu = 6_858_000

const drawingNamespace =
  "http://schemas.openxmlformats.org/drawingml/2006/main"
const presentationNamespace =
  "http://schemas.openxmlformats.org/presentationml/2006/main"
const relationshipNamespace =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
const packageRelationshipNamespace =
  "http://schemas.openxmlformats.org/package/2006/relationships"

const hyperlinkRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
const slideRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"

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

function elementFrame(element: PresentationElement) {
  const x = Math.min(99.5, clampPercent(element.x, 0))
  const y = Math.min(99.5, clampPercent(element.y, 0))
  const width = Math.max(0.5, Math.min(100 - x, clampPercent(element.width, 1)))
  const height = Math.max(
    0.5,
    Math.min(100 - y, clampPercent(element.height, 1)),
  )

  return {
    cx: Math.round((width / 100) * slideWidthEmu),
    cy: Math.round((height / 100) * slideHeightEmu),
    x: Math.round((x / 100) * slideWidthEmu),
    y: Math.round((y / 100) * slideHeightEmu),
  }
}

function rotationAttribute(element: PresentationElement) {
  if (!element.rotation) return ""

  return ` rot="${Math.round(element.rotation * 60_000)}"`
}

function relationshipType(item: PptxActionSettingPlanItem) {
  return item.relationshipKind === "internal-slide"
    ? slideRelationshipType
    : hyperlinkRelationshipType
}

function relationshipTargetMode(item: PptxActionSettingPlanItem) {
  return item.relationshipKind === "external-hyperlink"
    ? ' TargetMode="External"'
    : ""
}

function officeActionAttribute(item: PptxActionSettingPlanItem) {
  if (item.targetKind === "slide") return ' action="ppaction://hlinksldjump"'
  if (item.targetKind === "mailto") return ' action="ppaction://hlinkmailto"'

  return ""
}

function tooltip(item: PptxActionSettingPlanItem) {
  return item.tooltip.trim() || item.targetLabel.trim() || "Open"
}

function actionRecords(deck: Deck) {
  const plan = pptxActionSettingPlan(deck)
  const records = plan.items.flatMap((item): ActionRecord[] => {
    if (!item.nativeExport) return []

    const slideIndex = deck.slides.findIndex((slide) => slide.id === item.slideId)
    const slide = deck.slides[slideIndex]
    const element = slide?.elements.find((candidate) => candidate.id === item.elementId)

    return slide && element ? [{ element, item, slide, slideIndex }] : []
  })

  return {
    missingGeometryCount: plan.nativeActionSettingCount - records.length,
    plan,
    records,
  }
}

function groupActionsBySlide(records: ActionRecord[]) {
  return records.reduce((groups, record) => {
    const key = record.slide.id
    groups.set(key, [...(groups.get(key) ?? []), record])
    return groups
  }, new Map<string, ActionRecord[]>())
}

function authoredActions(records: ActionRecord[]) {
  return records.map((record, index): AuthoredAction => ({
    ...record,
    relationshipId: `rIdAction${index + 1}`,
    shapeId: 90_000 + record.slideIndex * 1_000 + index + 1,
  }))
}

function emptyTextBodyXml() {
  return `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody>`
}

function actionOverlayShapeXml(action: AuthoredAction) {
  const frame = elementFrame(action.element)
  const name = escapeXml(`${action.item.label} action overlay`)
  const tooltipText = escapeXml(tooltip(action.item))

  return `    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${action.shapeId}" name="${name}">
          <a:hlinkClick r:id="${action.relationshipId}" tooltip="${tooltipText}"${officeActionAttribute(action.item)}/>
        </p:cNvPr>
        <p:cNvSpPr/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm${rotationAttribute(action.element)}><a:off x="${frame.x}" y="${frame.y}"/><a:ext cx="${frame.cx}" cy="${frame.cy}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
      ${emptyTextBodyXml()}
    </p:sp>`
}

function actionOverlaysXml(actions: AuthoredAction[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:spTree xmlns:a="${drawingNamespace}" xmlns:p="${presentationNamespace}" xmlns:r="${relationshipNamespace}">
${actions.map(actionOverlayShapeXml).join("\n")}
</p:spTree>`
}

function relationshipXml(action: AuthoredAction) {
  return `  <Relationship Id="${action.relationshipId}" Type="${relationshipType(
    action.item,
  )}" Target="${escapeXml(action.item.relationshipTarget)}"${relationshipTargetMode(
    action.item,
  )}/>`
}

function actionRelationshipsXml(actions: AuthoredAction[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${packageRelationshipNamespace}">
${actions.map(relationshipXml).join("\n")}
</Relationships>`
}

function combinedStatus(input: {
  missingGeometryCount: number
  parts: PptxActionXmlPart[]
}) {
  if (!input.parts.length) return "blocked"
  if (input.missingGeometryCount) return "partial"
  if (input.parts.every((part) => part.status === "ready")) return "ready"

  return "partial"
}

function summary(input: {
  externalRelationshipCount: number
  internalRelationshipCount: number
  missingGeometryCount: number
  nativeActionCount: number
  readyPartCount: number
  relationshipCount: number
  totalPartCount: number
}) {
  if (!input.nativeActionCount) {
    return "No ready slide or URL actions are available for native PPTX action XML authoring yet."
  }

  const base = `${input.readyPartCount}/${input.totalPartCount} action XML part${
    input.totalPartCount === 1 ? "" : "s"
  } authored for ${input.nativeActionCount} native action setting${
    input.nativeActionCount === 1 ? "" : "s"
  }`
  const relationships = `${input.relationshipCount} relationship${
    input.relationshipCount === 1 ? "" : "s"
  } (${input.internalRelationshipCount} slide, ${
    input.externalRelationshipCount
  } external)`
  const missing = input.missingGeometryCount
    ? `; ${input.missingGeometryCount} action(s) need overlay geometry review`
    : ""

  return `${base}; ${relationships}${missing}.`
}

export function pptxActionXmlAuthoring(deck: Deck): PptxActionXmlAuthoring {
  const { missingGeometryCount, plan, records } = actionRecords(deck)
  const slideGroups = groupActionsBySlide(records)
  const parts: PptxActionXmlPart[] = []

  for (const recordsForSlide of slideGroups.values()) {
    const first = recordsForSlide[0]
    if (!first) continue

    const actions = authoredActions(recordsForSlide)
    const slideNumber = first.slideIndex + 1
    const overlayXml = actionOverlaysXml(actions)
    const relationshipsXml = actionRelationshipsXml(actions)

    parts.push(
      {
        actionCount: actions.length,
        detail:
          "Authors transparent native click overlay shapes with a:hlinkClick markup for safe slide jumps and URL actions.",
        id: `action-xml:overlays:${first.slide.id}`,
        kind: "slide-action-overlays",
        path: `ppt/slides/slide${slideNumber}.xml`,
        relationshipCount: actions.length,
        slideId: first.slide.id,
        slideNumber,
        status: "ready",
        xml: overlayXml,
        xmlLength: overlayXml.length,
      },
      {
        actionCount: actions.length,
        detail:
          "Authors slide relationship entries for internal slide jumps and external hyperlink targets used by the click overlays.",
        id: `action-xml:relationships:${first.slide.id}`,
        kind: "slide-action-relationships",
        path: `ppt/slides/_rels/slide${slideNumber}.xml.rels`,
        relationshipCount: actions.length,
        slideId: first.slide.id,
        slideNumber,
        status: "ready",
        xml: relationshipsXml,
        xmlLength: relationshipsXml.length,
      },
    )
  }

  const readyPartCount = parts.filter((part) => part.status === "ready").length
  const relationshipCount = records.length
  const internalRelationshipCount = records.filter(
    (record) => record.item.relationshipKind === "internal-slide",
  ).length
  const externalRelationshipCount = records.filter(
    (record) => record.item.relationshipKind === "external-hyperlink",
  ).length
  const xmlLength = parts.reduce((total, part) => total + part.xmlLength, 0)

  return {
    blockedActionCount: plan.blockedCount,
    externalRelationshipCount,
    internalRelationshipCount,
    missingGeometryCount,
    nativeActionCount: records.length,
    parts,
    readyPartCount,
    relationshipCount,
    status: combinedStatus({ missingGeometryCount, parts }),
    summary: summary({
      externalRelationshipCount,
      internalRelationshipCount,
      missingGeometryCount,
      nativeActionCount: records.length,
      readyPartCount,
      relationshipCount,
      totalPartCount: parts.length,
    }),
    totalActionCount: plan.totalCount,
    totalPartCount: parts.length,
    xmlLength,
  }
}

export function serializePptxActionXmlAuthoring(deck: Deck) {
  const authoring = pptxActionXmlAuthoring(deck)
  const lines = [
    "PowerPoint action XML authoring",
    `Status: ${authoring.status}`,
    `Parts: ${authoring.readyPartCount}/${authoring.totalPartCount}`,
    `Native actions: ${authoring.nativeActionCount}/${authoring.totalActionCount}`,
    `Relationships: ${authoring.relationshipCount}`,
    `Internal slide relationships: ${authoring.internalRelationshipCount}`,
    `External hyperlink relationships: ${authoring.externalRelationshipCount}`,
    `Blocked actions: ${authoring.blockedActionCount}`,
    `Missing geometry: ${authoring.missingGeometryCount}`,
    `XML characters: ${authoring.xmlLength}`,
    `Summary: ${authoring.summary}`,
    "",
    "Authored action XML parts:",
    ...(authoring.parts.length
      ? authoring.parts.map(
          (part, index) =>
            `${index + 1}. ${part.path} - ${part.status}; ${part.actionCount} action(s); ${part.relationshipCount} relationship(s); ${part.xmlLength} characters; ${part.detail}`,
        )
      : ["None"]),
  ]

  return `${lines.join("\n")}\n`
}

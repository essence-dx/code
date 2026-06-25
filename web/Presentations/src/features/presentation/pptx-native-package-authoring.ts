import { strFromU8, strToU8 } from "fflate"

import {
  pptxActionXmlAuthoring,
  type PptxActionXmlPart,
} from "./pptx-action-xml-authoring"
import {
  applyNativeTimingXmlToSlideXml,
  nativePptxAnimationTargetsForSlide,
  nativePptxTimingXmlForTargets,
} from "./pptx-animation-xml"
import {
  pptxCommentXmlAuthoring,
  type PptxCommentXmlPart,
} from "./pptx-comment-xml-authoring"
import {
  pptxMasterLayoutXmlAuthoring,
  type PptxMasterLayoutXmlPart,
} from "./pptx-master-layout-xml-authoring"
import {
  pptxThemePackageXmlAuthoring,
  type PptxThemePackageXmlPart,
} from "./pptx-theme-package-xml-authoring"
import type { Deck } from "./types"

type ZipEntries = Record<string, Uint8Array>

export type NativePptxPackagePartSource =
  | "action"
  | "animation"
  | "comment"
  | "master-layout"
  | "theme"

export type NativePptxPackageWriteStrategy =
  | "append-slide-shapes"
  | "merge-content-types"
  | "merge-relationships"
  | "replace"
  | "replace-slide-timing"

export type NativePptxPackagePartStatus =
  | "blocked"
  | "merge-required"
  | "ready"

export type NativePptxPackagePart = {
  detail: string
  id: string
  path: string
  source: NativePptxPackagePartSource
  status: NativePptxPackagePartStatus
  strategy: NativePptxPackageWriteStrategy
  xml: string
  xmlLength: number
}

export type NativePptxPackageAuthoring = {
  mergePartCount: number
  parts: NativePptxPackagePart[]
  readyPartCount: number
  replacePartCount: number
  status: NativePptxPackagePartStatus
  summary: string
  totalPartCount: number
  xmlLength: number
}

export type ApplyNativePptxPackageAuthoringResult = {
  appliedPartCount: number
  changed: boolean
  entries: ZipEntries
  skippedPartIds: string[]
}

function combineStatuses(
  statuses: NativePptxPackagePartStatus[],
): NativePptxPackagePartStatus {
  if (!statuses.length || statuses.every((status) => status === "blocked")) {
    return "blocked"
  }

  if (statuses.every((status) => status === "ready")) return "ready"

  return "merge-required"
}

function part(input: Omit<NativePptxPackagePart, "xmlLength">) {
  return {
    ...input,
    xmlLength: input.xml.length,
  } satisfies NativePptxPackagePart
}

function statusFromXmlPart(status: "blocked" | "partial" | "ready") {
  return status === "ready" ? "ready" : "blocked"
}

function themePackageParts(deck: Deck): NativePptxPackagePart[] {
  return pptxThemePackageXmlAuthoring(deck).parts.flatMap(
    (item: PptxThemePackageXmlPart) => {
      if (!item.xml) return []

      const strategy: NativePptxPackageWriteStrategy =
        item.path === "[Content_Types].xml"
          ? "merge-content-types"
          : item.path.endsWith(".rels")
            ? "merge-relationships"
            : "replace"

      return [
        part({
          detail: item.detail,
          id: `native-package:${item.id}`,
          path: item.path,
          source: "theme",
          status: statusFromXmlPart(item.status),
          strategy,
          xml: item.xml,
        }),
      ]
    },
  )
}

function masterLayoutParts(deck: Deck): NativePptxPackagePart[] {
  return pptxMasterLayoutXmlAuthoring(deck).parts.flatMap(
    (item: PptxMasterLayoutXmlPart) =>
      item.xml
        ? [
            part({
              detail: item.detail,
              id: `native-package:${item.id}`,
              path: item.path,
              source: "master-layout",
              status: statusFromXmlPart(item.status),
              strategy: "replace",
              xml: item.xml,
            }),
          ]
        : [],
  )
}

function commentParts(deck: Deck): NativePptxPackagePart[] {
  return pptxCommentXmlAuthoring(deck).parts.flatMap(
    (item: PptxCommentXmlPart) => {
      if (!item.xml) return []

      return [
        part({
          detail: item.detail,
          id: `native-package:${item.id}`,
          path: item.path,
          source: "comment",
          status: statusFromXmlPart(item.status),
          strategy: item.kind === "slide-comment-relationship"
            ? "merge-relationships"
            : "replace",
          xml: item.xml,
        }),
      ]
    },
  )
}

function actionParts(deck: Deck): NativePptxPackagePart[] {
  return pptxActionXmlAuthoring(deck).parts.flatMap((item: PptxActionXmlPart) => {
    if (!item.xml) return []

    return [
      part({
        detail: item.detail,
        id: `native-package:${item.id}`,
        path: item.path,
        source: "action",
        status: statusFromXmlPart(item.status),
        strategy: item.kind === "slide-action-relationships"
          ? "merge-relationships"
          : "append-slide-shapes",
        xml: item.xml,
      }),
    ]
  })
}

function animationParts(deck: Deck, entries: ZipEntries | undefined) {
  if (!entries) return []

  return deck.slides.flatMap((slide, index): NativePptxPackagePart[] => {
    const path = `ppt/slides/slide${index + 1}.xml`
    const entry = entries[path]
    if (!entry) return []

    const currentXml = strFromU8(entry)
    const targets = nativePptxAnimationTargetsForSlide(deck, slide, currentXml)
    const xml = nativePptxTimingXmlForTargets(targets)
    if (!xml) return []

    return [
      part({
        detail: `${targets.length} animation timing target(s) are ready for native slide timing XML.`,
        id: `native-package:animation:${slide.id}`,
        path,
        source: "animation",
        status: "ready",
        strategy: "replace-slide-timing",
        xml,
      }),
    ]
  })
}

function summary(input: {
  mergePartCount: number
  readyPartCount: number
  totalPartCount: number
  xmlLength: number
}) {
  if (!input.totalPartCount) {
    return "No native Office package parts are available for writing yet."
  }

  return `${input.readyPartCount}/${input.totalPartCount} native Office package part(s) are ready; ${input.mergePartCount} part(s) require safe merge handling; ${input.xmlLength} XML characters prepared.`
}

export function pptxNativePackageAuthoring(
  deck: Deck,
  entries?: ZipEntries,
): NativePptxPackageAuthoring {
  const parts = [
    ...themePackageParts(deck),
    ...masterLayoutParts(deck),
    ...commentParts(deck),
    ...actionParts(deck),
    ...animationParts(deck, entries),
  ]
  const readyPartCount = parts.filter((item) => item.status === "ready").length
  const mergePartCount = parts.filter(
    (item) =>
      item.strategy === "merge-content-types" ||
      item.strategy === "merge-relationships" ||
      item.strategy === "append-slide-shapes" ||
      item.strategy === "replace-slide-timing",
  ).length
  const replacePartCount = parts.filter((item) => item.strategy === "replace").length
  const xmlLength = parts.reduce((total, item) => total + item.xmlLength, 0)

  return {
    mergePartCount,
    parts,
    readyPartCount,
    replacePartCount,
    status: combineStatuses(parts.map((item) => item.status)),
    summary: summary({
      mergePartCount,
      readyPartCount,
      totalPartCount: parts.length,
      xmlLength,
    }),
    totalPartCount: parts.length,
    xmlLength,
  }
}

function uniqueXmlLines(sourceXml: string, pattern: RegExp) {
  return Array.from(sourceXml.matchAll(pattern))
    .map((match) => match[0])
    .filter(Boolean)
}

function mergeContentTypesXml(currentXml: string, nextXml: string) {
  const defaults = uniqueXmlLines(nextXml, /<Default\b[^>]*\/>/g)
  const overrides = uniqueXmlLines(nextXml, /<Override\b[^>]*\/>/g)
  const additions = [...defaults, ...overrides].filter((line) => {
    const extension = /Extension="([^"]+)"/.exec(line)?.[1]
    const partName = /PartName="([^"]+)"/.exec(line)?.[1]

    if (extension && currentXml.includes(`Extension="${extension}"`)) return false
    if (partName && currentXml.includes(`PartName="${partName}"`)) return false

    return !currentXml.includes(line)
  })

  if (!additions.length) return currentXml

  return currentXml.replace("</Types>", `${additions.join("\n")}\n</Types>`)
}

function mergeRelationshipsXml(currentXml: string, nextXml: string) {
  const relationships = uniqueXmlLines(nextXml, /<Relationship\b[^>]*\/>/g)
  const additions = relationships.filter((line) => {
    const id = /Id="([^"]+)"/.exec(line)?.[1]
    if (id && currentXml.includes(`Id="${id}"`)) return false

    return !currentXml.includes(line)
  })

  if (!additions.length) return currentXml

  return currentXml.replace(
    "</Relationships>",
    `${additions.join("\n")}\n</Relationships>`,
  )
}

function slideShapeXml(sourceXml: string) {
  const match = /<p:sp\b[\s\S]*?<\/p:sp>/g

  return Array.from(sourceXml.matchAll(match)).map((item) => item[0])
}

function appendSlideShapes(currentXml: string, nextXml: string) {
  const shapes = slideShapeXml(nextXml).filter(
    (shape) => !currentXml.includes(shape),
  )
  if (!shapes.length) return currentXml

  return currentXml.replace("</p:spTree>", `${shapes.join("\n")}\n</p:spTree>`)
}

function defaultXmlForPath(path: string) {
  if (path === "[Content_Types].xml") {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'
  }

  if (path.endsWith(".rels")) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
  }

  return ""
}

function applyPartXml(currentXml: string, part: NativePptxPackagePart) {
  if (part.strategy === "merge-content-types") {
    return mergeContentTypesXml(currentXml, part.xml)
  }

  if (part.strategy === "merge-relationships") {
    return mergeRelationshipsXml(currentXml, part.xml)
  }

  if (part.strategy === "append-slide-shapes") {
    return appendSlideShapes(currentXml, part.xml)
  }

  if (part.strategy === "replace-slide-timing") {
    return applyNativeTimingXmlToSlideXml(currentXml, part.xml)
  }

  return part.xml
}

export function applyNativePptxPackageAuthoringToEntries(
  entries: ZipEntries,
  deck: Deck,
): ApplyNativePptxPackageAuthoringResult {
  const authoring = pptxNativePackageAuthoring(deck, entries)
  const nextEntries = { ...entries }
  const skippedPartIds: string[] = []
  let appliedPartCount = 0

  for (const item of authoring.parts) {
    if (item.status !== "ready") {
      skippedPartIds.push(item.id)
      continue
    }

    const currentXml = nextEntries[item.path]
      ? strFromU8(nextEntries[item.path])
      : defaultXmlForPath(item.path)

    if (!currentXml) {
      skippedPartIds.push(item.id)
      continue
    }

    const nextXml = applyPartXml(currentXml, item)
    if (nextXml === currentXml) continue

    nextEntries[item.path] = strToU8(nextXml)
    appliedPartCount += 1
  }

  return {
    appliedPartCount,
    changed: appliedPartCount > 0,
    entries: nextEntries,
    skippedPartIds,
  }
}

export function serializePptxNativePackageAuthoring(
  deck: Deck,
  entries?: ZipEntries,
) {
  const authoring = pptxNativePackageAuthoring(deck, entries)
  const lines = [
    "Native PPTX package authoring",
    `Status: ${authoring.status}`,
    `Parts: ${authoring.readyPartCount}/${authoring.totalPartCount}`,
    `Replace parts: ${authoring.replacePartCount}`,
    `Merge parts: ${authoring.mergePartCount}`,
    `XML characters: ${authoring.xmlLength}`,
    `Summary: ${authoring.summary}`,
    "",
    "Package parts:",
    ...(authoring.parts.length
      ? authoring.parts.map(
          (item, index) =>
            `${index + 1}. ${item.path} - ${item.source}; ${item.strategy}; ${item.status}; ${item.xmlLength} characters; ${item.detail}`,
        )
      : ["None"]),
  ]

  return `${lines.join("\n")}\n`
}

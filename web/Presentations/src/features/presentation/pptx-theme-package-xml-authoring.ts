import {
  pptxThemePackagePlan,
  type PptxThemePackagePart,
  type PptxThemePackagePartStatus,
} from "./pptx-theme-package-plan"
import type { Deck, OfficeThemeMetadata } from "./types"

export type PptxThemePackageXmlPart = {
  contentType?: string
  detail: string
  id: string
  kind: PptxThemePackagePart["kind"]
  path: string
  relationshipType?: string
  status: PptxThemePackagePartStatus
  xml: string
  xmlLength: number
}

export type PptxThemePackageXmlAuthoring = {
  packageFileName: string
  parts: PptxThemePackageXmlPart[]
  readyPartCount: number
  status: PptxThemePackagePartStatus
  summary: string
  themeName: string
  themeXmlLength: number
  totalPartCount: number
  xmlLength: number
}

const packageNamespace =
  "http://schemas.openxmlformats.org/package/2006/content-types"
const relationshipNamespace =
  "http://schemas.openxmlformats.org/package/2006/relationships"
const drawingNamespace =
  "http://schemas.openxmlformats.org/drawingml/2006/main"

const relationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"
const themeContentType =
  "application/vnd.openxmlformats-officedocument.theme+xml"

const defaultColorSlots = [
  { key: "dk1", color: "#111827" },
  { key: "lt1", color: "#F8FAFC" },
  { key: "dk2", color: "#1F2937" },
  { key: "lt2", color: "#E5E7EB" },
  { key: "accent1", color: "#2563EB" },
  { key: "accent2", color: "#16A34A" },
  { key: "accent3", color: "#F59E0B" },
  { key: "accent4", color: "#DB2777" },
  { key: "accent5", color: "#7C3AED" },
  { key: "accent6", color: "#0891B2" },
  { key: "hlink", color: "#2563EB" },
  { key: "folHlink", color: "#7C3AED" },
] as const

const canonicalColorKeys = new Map(
  defaultColorSlots.map((slot) => [slot.key.toLowerCase(), slot.key]),
)

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function xmlColor(value: string) {
  const color = value.trim().replace(/^#/, "").toUpperCase()

  return /^[0-9A-F]{6}$/.test(color) ? color : "000000"
}

function themeColorSlots(theme: OfficeThemeMetadata) {
  const colors = new Map(
    theme.colors.flatMap((color) => {
      const key = canonicalColorKeys.get(color.key.trim().toLowerCase())

      return key ? [[key, color.color] as const] : []
    }),
  )

  return defaultColorSlots.map((slot) => ({
    key: slot.key,
    color: colors.get(slot.key) ?? slot.color,
  }))
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${packageNamespace}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="${themeContentType}"/>
</Types>`
}

function rootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${relationshipNamespace}">
  <Relationship Id="rId1" Type="${relationshipType}" Target="ppt/theme/theme1.xml"/>
</Relationships>`
}

function emptyThemeRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${relationshipNamespace}"/>`
}

function themeXml(theme: OfficeThemeMetadata) {
  const colorLines = themeColorSlots(theme).map(
    (slot) =>
      `      <a:${slot.key}><a:srgbClr val="${xmlColor(slot.color)}"/></a:${slot.key}>`,
  )
  const rawName = theme.name.trim() || "Office Theme"
  const name = escapeXml(rawName)
  const colorSchemeName = escapeXml(
    theme.colorSchemeName.trim() || `${rawName} Colors`,
  )
  const fontSchemeName = escapeXml(`${rawName} Fonts`)
  const majorFont = escapeXml(theme.majorFont.trim())
  const minorFont = escapeXml(theme.minorFont.trim())

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="${drawingNamespace}" name="${name}">
  <a:themeElements>
    <a:clrScheme name="${colorSchemeName}">
${colorLines.join("\n")}
    </a:clrScheme>
    <a:fontScheme name="${fontSchemeName}">
      <a:majorFont>
        <a:latin typeface="${majorFont}"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="${minorFont}"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Essence Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"/></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"/></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`
}

function xmlForPackagePart(
  part: PptxThemePackagePart,
  theme: OfficeThemeMetadata | null | undefined,
) {
  if (part.status !== "ready") return ""

  switch (part.kind) {
    case "content-types":
      return contentTypesXml()
    case "root-relationship":
      return rootRelationshipsXml()
    case "theme":
      return theme ? themeXml(theme) : ""
    case "theme-relationships":
      return emptyThemeRelationshipsXml()
  }
}

function packageSummary(input: {
  readyPartCount: number
  status: PptxThemePackagePartStatus
  totalPartCount: number
  xmlLength: number
}) {
  const partSummary = `${input.readyPartCount}/${input.totalPartCount} theme XML package part${
    input.totalPartCount === 1 ? "" : "s"
  } authored`

  if (input.status === "ready") {
    return `${partSummary}; ${input.xmlLength} XML characters are ready for reusable .thmx packaging.`
  }

  if (input.status === "partial") {
    return `${partSummary}; complete Office theme metadata before writing every package part.`
  }

  return "No Office theme package XML can be authored until theme metadata is available."
}

export function pptxThemePackageXmlAuthoring(
  deck: Deck,
): PptxThemePackageXmlAuthoring {
  const plan = pptxThemePackagePlan(deck)
  const theme = deck.master.officeTheme
  const parts = plan.packageParts.map((part): PptxThemePackageXmlPart => {
    const xml = xmlForPackagePart(part, theme)

    return {
      contentType: part.contentType,
      detail: part.detail,
      id: part.id,
      kind: part.kind,
      path: part.path,
      relationshipType: part.relationshipType,
      status: xml ? "ready" : part.status,
      xml,
      xmlLength: xml.length,
    }
  })
  const readyPartCount = parts.filter((part) => part.status === "ready").length
  const totalPartCount = parts.length
  const xmlLength = parts.reduce((total, part) => total + part.xmlLength, 0)
  const themeXmlLength =
    parts.find((part) => part.kind === "theme")?.xmlLength ?? 0

  return {
    packageFileName: plan.packageFileName,
    parts,
    readyPartCount,
    status: plan.status,
    summary: packageSummary({
      readyPartCount,
      status: plan.status,
      totalPartCount,
      xmlLength,
    }),
    themeName: plan.themeName,
    themeXmlLength,
    totalPartCount,
    xmlLength,
  }
}

export function serializePptxThemePackageXmlAuthoring(deck: Deck) {
  const authoring = pptxThemePackageXmlAuthoring(deck)
  const lines = [
    "Office theme package XML authoring",
    `Theme: ${authoring.themeName}`,
    `Status: ${authoring.status}`,
    `Package: ${authoring.packageFileName}`,
    `Parts: ${authoring.readyPartCount}/${authoring.totalPartCount}`,
    `XML characters: ${authoring.xmlLength}`,
    `Theme XML characters: ${authoring.themeXmlLength}`,
    `Summary: ${authoring.summary}`,
    "",
    "Package XML parts:",
    ...authoring.parts.map(
      (part, index) =>
        `${index + 1}. ${part.path} - ${part.status}; ${part.xmlLength} characters; ${part.detail}`,
    ),
  ]

  return `${lines.join("\n")}\n`
}

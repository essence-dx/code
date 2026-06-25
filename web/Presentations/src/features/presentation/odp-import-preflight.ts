import { nanoid } from "nanoid"
import { strFromU8, unzipSync } from "fflate"

type ZipEntries = Record<string, Uint8Array>

export type OdpImportPreflightSeverity = "info" | "warning" | "attention"

export type OdpImportPreflightIssueId =
  | "animations"
  | "charts"
  | "embedded-objects"
  | "media"
  | "native-import-unavailable"
  | "no-slides"
  | "partial-editable-import"
  | "speaker-notes"
  | "transitions"

export type OdpImportPreflightIssue = {
  count: number
  detail: string
  id: OdpImportPreflightIssueId
  label: string
  severity: OdpImportPreflightSeverity
}

export type OdpImportPreflightMetric = {
  detail: string
  id: string
  label: string
  value: string
}

export type OdpImportPreflightReport = {
  id: string
  importedAt: string
  issues: OdpImportPreflightIssue[]
  metrics: OdpImportPreflightMetric[]
  sourceFileName: string
  status: Exclude<OdpImportPreflightSeverity, "info">
  summary: string
  version: 1
}

type OdpPackageSummary = {
  animationCount: number
  chartCount: number
  embeddedObjectCount: number
  imageCount: number
  linkedChartDataCount: number
  localChartTableCount: number
  mediaCount: number
  multiSeriesChartCount: number
  noteCount: number
  slideCount: number
  tableCount: number
  transitionCount: number
}

const storageKey = "essence-powerpoint:odp-import-preflight"

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window
}

function zipText(entries: ZipEntries, path: string) {
  const entry = entries[path]
  return entry ? strFromU8(entry) : ""
}

function parseXml(value: string) {
  if (!value.trim()) return null

  return new DOMParser().parseFromString(value, "application/xml")
}

function allElements(document: Document | Element | null) {
  return document ? Array.from(document.getElementsByTagName("*")) : []
}

function elementLocalName(element: Element) {
  return element.localName || element.nodeName.split(":").pop() || element.nodeName
}

function elementNamespace(element: Element) {
  return element.namespaceURI || ""
}

function countElements(
  document: Document | null,
  predicate: (element: Element) => boolean,
) {
  return allElements(document).filter(predicate).length
}

function manifestMediaCount(document: Document | null, matcher: RegExp) {
  return countElements(document, (element) => {
    if (elementLocalName(element) !== "file-entry") return false

    return matcher.test(
      element.getAttribute("manifest:media-type") ??
        element.getAttribute("media-type") ??
        "",
    )
  })
}

function drawPluginCount(document: Document | null) {
  return countElements(
    document,
    (element) =>
      elementLocalName(element) === "plugin" &&
      elementNamespace(element).includes("drawing"),
  )
}

function attributeValue(element: Element | null, name: string) {
  if (!element) return ""

  return (
    element.getAttribute(name) ??
    Array.from(element.attributes).find((attribute) => {
      return attribute.localName === name || attribute.name.endsWith(`:${name}`)
    })?.value ??
    ""
  )
}

function packagePathFromHref(href: string) {
  const trimmed = href.trim()
  if (!trimmed || /^[a-z]+:/i.test(trimmed)) return ""

  const [path] = trimmed.split(/[?#]/)

  return (path ?? "").replace(/^\.?\//, "").replace(/\/$/, "")
}

function chartObjectHrefs(document: Document | null) {
  return allElements(document)
    .filter(
      (element) =>
        elementLocalName(element) === "object" &&
        elementNamespace(element).includes("drawing"),
    )
    .map((element) => packagePathFromHref(attributeValue(element, "href")))
    .filter(Boolean)
}

function chartCountInDocument(document: Document | null) {
  return countElements(
    document,
    (element) =>
      elementLocalName(element) === "chart" &&
      elementNamespace(element).includes("chart"),
  )
}

function chartObjectCount(entries: ZipEntries, content: Document | null) {
  return chartObjectHrefs(content).filter((path) =>
    chartCountInDocument(parseXml(zipText(entries, `${path}/content.xml`))),
  ).length
}

function chartDocuments(entries: ZipEntries, content: Document | null) {
  return [
    content,
    ...chartObjectHrefs(content).map((path) =>
      parseXml(zipText(entries, `${path}/content.xml`)),
    ),
  ].filter((document): document is Document => Boolean(document))
}

function chartElements(document: Document | null) {
  return allElements(document).filter(
    (element) =>
      elementLocalName(element) === "chart" &&
      elementNamespace(element).includes("chart"),
  )
}

function isOdpTable(element: Element) {
  return (
    elementLocalName(element) === "table" &&
    elementNamespace(element).includes("table")
  )
}

function isOdpTableRow(element: Element) {
  return (
    elementLocalName(element) === "table-row" &&
    elementNamespace(element).includes("table")
  )
}

function isOdpTableCell(element: Element) {
  const localName = elementLocalName(element)

  return (
    elementNamespace(element).includes("table") &&
    (localName === "covered-table-cell" || localName === "table-cell")
  )
}

function chartLocalTable(chart: Element) {
  return allElements(chart).find(isOdpTable)
}

function childElements(element: Element) {
  return Array.from(element.childNodes).filter(
    (node): node is Element => node.nodeType === 1,
  )
}

function localTableColumnCount(table: Element) {
  const firstRow = childElements(table).find(isOdpTableRow)
  if (!firstRow) return 0

  return childElements(firstRow).filter((element) => {
    return isOdpTableCell(element) && elementLocalName(element) !== "covered-table-cell"
  }).length
}

function chartDataSummary(entries: ZipEntries, content: Document | null) {
  const charts = chartDocuments(entries, content).flatMap(chartElements)
  const localTableCharts = charts.filter(chartLocalTable)

  return {
    linkedChartDataCount: Math.max(0, charts.length - localTableCharts.length),
    localChartTableCount: localTableCharts.length,
    multiSeriesChartCount: localTableCharts.filter((chart) => {
      const table = chartLocalTable(chart)

      return table ? localTableColumnCount(table) > 2 : false
    }).length,
  }
}

function isPresentationPage(element: Element) {
  return (
    elementLocalName(element) === "page" &&
    elementNamespace(element).includes("drawing")
  )
}

function hasTransitionAttribute(element: Element) {
  return Array.from(element.attributes).some((attribute) =>
    attribute.name.toLowerCase().includes("transition"),
  )
}

function isOdpPackage(entries: ZipEntries, sourceFileName: string) {
  const mimetype = zipText(entries, "mimetype").trim()
  if (mimetype === "application/vnd.oasis.opendocument.presentation") {
    return true
  }

  return sourceFileName.toLowerCase().endsWith(".odp") && Boolean(entries["content.xml"])
}

function pictureEntryCount(entries: ZipEntries) {
  return Object.keys(entries).filter((path) =>
    /^Pictures\/.+\.(gif|jpe?g|png|svg|webp)$/i.test(path),
  ).length
}

function summarizePackage(entries: ZipEntries): OdpPackageSummary {
  const content = parseXml(zipText(entries, "content.xml"))
  const manifest = parseXml(zipText(entries, "META-INF/manifest.xml"))
  const pages = allElements(content).filter(isPresentationPage)
  const drawImageCount = countElements(
    content,
    (element) =>
      elementLocalName(element) === "image" &&
      elementNamespace(element).includes("drawing"),
  )
  const imageCount = Math.max(drawImageCount, pictureEntryCount(entries))
  const chartPackageObjectCount = chartObjectCount(entries, content)
  const chartData = chartDataSummary(entries, content)
  const drawObjectCount = countElements(
    content,
    (element) =>
      elementLocalName(element) === "object" &&
      elementNamespace(element).includes("drawing"),
  )

  return {
    animationCount: countElements(
      content,
      (element) =>
        element.nodeName.startsWith("anim:") ||
        elementNamespace(element).includes("animation"),
    ),
    chartCount: chartCountInDocument(content) + chartPackageObjectCount,
    embeddedObjectCount: Math.max(0, drawObjectCount - chartPackageObjectCount),
    imageCount,
    linkedChartDataCount: chartData.linkedChartDataCount,
    localChartTableCount: chartData.localChartTableCount,
    mediaCount: Math.max(
      manifestMediaCount(manifest, /^(audio|video)\//i),
      drawPluginCount(content),
    ),
    multiSeriesChartCount: chartData.multiSeriesChartCount,
    noteCount: countElements(
      content,
      (element) =>
        elementLocalName(element) === "notes" &&
        elementNamespace(element).includes("presentation"),
    ),
    slideCount: pages.length,
    tableCount: countElements(
      content,
      (element) =>
        elementLocalName(element) === "table" &&
        elementNamespace(element).includes("table"),
    ),
    transitionCount: pages.filter(hasTransitionAttribute).length,
  }
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`
}

function packageIssues(summary: OdpPackageSummary): OdpImportPreflightIssue[] {
  const issues: OdpImportPreflightIssue[] = []

  if (summary.slideCount <= 0) {
    issues.push({
      count: 1,
      detail: "No presentation pages were found in content.xml.",
      id: "no-slides",
      label: "No slide pages detected",
      severity: "attention",
    })
  } else {
    issues.push({
      count: summary.slideCount,
      detail:
        "Slide order, title/body text, editable tables, basic drawing shapes, common charts, embedded package images, and speaker notes can be imported as editable Essence slides; richer ODP objects still need review.",
      id: "partial-editable-import",
      label: "Partial editable import",
      severity: "warning",
    })
  }

  if (summary.mediaCount) {
    issues.push({
      count: summary.mediaCount,
      detail:
        "Supported package audio/video imports as editable playback objects; unsupported or externally linked media still needs handoff review.",
      id: "media",
      label: "Embedded media",
      severity: "warning",
    })
  }

  if (summary.embeddedObjectCount) {
    issues.push({
      count: summary.embeddedObjectCount,
      detail: "Embedded OLE or document objects need a converter or fallback image.",
      id: "embedded-objects",
      label: "Embedded objects",
      severity: "warning",
    })
  }

  if (summary.chartCount) {
    issues.push({
      count: summary.chartCount,
      detail:
        "Common ODP chart objects with local tables import as editable Essence charts, including flattened multi-series values; linked-data and advanced chart styling still need handoff review.",
      id: "charts",
      label: "Charts",
      severity: "warning",
    })
  }

  if (summary.animationCount) {
    issues.push({
      count: summary.animationCount,
      detail: "ODP animation timelines need mapping into Essence animation settings.",
      id: "animations",
      label: "Animations",
      severity: "warning",
    })
  }

  if (summary.transitionCount) {
    issues.push({
      count: summary.transitionCount,
      detail:
        "Common ODP transition metadata imports into Essence slide transitions; sounds and advanced variants still need handoff review.",
      id: "transitions",
      label: "Transitions",
      severity: "warning",
    })
  }

  if (summary.noteCount) {
    issues.push({
      count: summary.noteCount,
      detail: "ODP speaker notes are imported into Essence slide notes.",
      id: "speaker-notes",
      label: "Speaker notes",
      severity: "info",
    })
  }

  return issues
}

function packageMetrics(summary: OdpPackageSummary): OdpImportPreflightMetric[] {
  return [
    {
      id: "slides",
      label: "Slides",
      value: String(summary.slideCount),
      detail: "draw:page entries",
    },
    {
      id: "images",
      label: "Images",
      value: String(summary.imageCount),
      detail: "draw images or Pictures package entries",
    },
    {
      id: "notes",
      label: "Notes",
      value: String(summary.noteCount),
      detail: "speaker-note containers",
    },
    {
      id: "tables",
      label: "Tables",
      value: String(summary.tableCount),
      detail: "table:table objects import as editable Essence tables",
    },
    {
      id: "media",
      label: "Media",
      value: String(summary.mediaCount),
      detail: "supported embedded audio/video imports as editable playback media",
    },
    {
      id: "transitions",
      label: "Transitions",
      value: String(summary.transitionCount),
      detail: "common transition type, speed, and page duration metadata",
    },
    {
      id: "charts",
      label: "Charts",
      value: String(summary.chartCount),
      detail: `${summary.localChartTableCount} local-table, ${summary.multiSeriesChartCount} multi-series, ${summary.linkedChartDataCount} linked-data review`,
    },
    {
      id: "complex",
      label: "Complex items",
      value: String(
        summary.mediaCount +
          summary.embeddedObjectCount +
          summary.chartCount +
          summary.animationCount +
          summary.transitionCount,
      ),
      detail: "objects needing dedicated import mapping",
    },
  ]
}

function reportStatus(issues: OdpImportPreflightIssue[]) {
  return issues.some((issue) => issue.severity === "attention")
    ? "attention"
    : "warning"
}

export function odpImportPreflightFromEntries(input: {
  entries: ZipEntries
  importedAt?: Date
  sourceFileName: string
}): OdpImportPreflightReport {
  if (!isOdpPackage(input.entries, input.sourceFileName)) {
    throw new Error("This does not look like an OpenDocument presentation (.odp).")
  }

  const summary = summarizePackage(input.entries)
  const issues = packageIssues(summary)
  const status = reportStatus(issues)

  return {
    id: nanoid(),
    importedAt: (input.importedAt ?? new Date()).toISOString(),
    issues,
    metrics: packageMetrics(summary),
    sourceFileName: input.sourceFileName,
    status,
    summary: `ODP preflight found ${plural(
      summary.slideCount,
      "slide",
    )}, ${plural(summary.imageCount, "image")}, and ${plural(
      issues.length,
      "handoff item",
    )}.`,
    version: 1,
  }
}

export async function odpImportPreflightFromFile(
  file: File,
): Promise<OdpImportPreflightReport> {
  let entries: ZipEntries

  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Error("Could not read this ODP package.")
  }

  return odpImportPreflightFromEntries({
    entries,
    sourceFileName: file.name,
  })
}

function isIssueSeverity(value: unknown): value is OdpImportPreflightSeverity {
  return value === "info" || value === "warning" || value === "attention"
}

function isIssue(value: unknown): value is OdpImportPreflightIssue {
  const issue = value as Partial<OdpImportPreflightIssue>

  return (
    typeof issue.count === "number" &&
    typeof issue.detail === "string" &&
    typeof issue.id === "string" &&
    typeof issue.label === "string" &&
    isIssueSeverity(issue.severity)
  )
}

function isMetric(value: unknown): value is OdpImportPreflightMetric {
  const metric = value as Partial<OdpImportPreflightMetric>

  return (
    typeof metric.detail === "string" &&
    typeof metric.id === "string" &&
    typeof metric.label === "string" &&
    typeof metric.value === "string"
  )
}

export function parseOdpImportPreflightReport(
  value: unknown,
): OdpImportPreflightReport | null {
  const report = value as Partial<OdpImportPreflightReport>

  if (
    typeof report.id !== "string" ||
    typeof report.importedAt !== "string" ||
    !Array.isArray(report.issues) ||
    !report.issues.every(isIssue) ||
    !Array.isArray(report.metrics) ||
    !report.metrics.every(isMetric) ||
    typeof report.sourceFileName !== "string" ||
    (report.status !== "attention" && report.status !== "warning") ||
    typeof report.summary !== "string" ||
    report.version !== 1
  ) {
    return null
  }

  return {
    id: report.id,
    importedAt: report.importedAt,
    issues: report.issues,
    metrics: report.metrics,
    sourceFileName: report.sourceFileName,
    status: report.status,
    summary: report.summary,
    version: 1,
  }
}

export function readOdpImportPreflightReport() {
  if (!canUseLocalStorage()) return null

  try {
    return parseOdpImportPreflightReport(
      JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as unknown,
    )
  } catch {
    return null
  }
}

export function rememberOdpImportPreflightReport(
  report: OdpImportPreflightReport,
) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(storageKey, JSON.stringify(report))
  }

  return report
}

export function clearOdpImportPreflightReport() {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(storageKey)
  }

  return null
}

export function odpImportPreflightAlert(report: OdpImportPreflightReport) {
  const warnings = report.issues.filter((issue) => issue.severity !== "info")

  return `${report.summary}\nODP editable import created a partial deck for slide text, notes, supported media, tables, shapes, transitions, and common charts. ${plural(
    warnings.length,
    "issue",
  )} recorded for the compatibility report.`
}

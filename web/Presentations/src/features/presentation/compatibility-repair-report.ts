import { chartSeries } from "./chart-formatting"
import type { OdpImportPreflightReport } from "./odp-import-preflight"
import { odpLinkedChartDataCount } from "./office-interoperability-repair-plan"
import { isPptxNativeChartElement } from "./pptx-chart-export"
import { nativePptxMasterXmlPlan } from "./pptx-master-xml-plan"
import type { Deck, PresentationElement, Slide } from "./types"

export type CompatibilityRepairStatus = "attention" | "ready" | "warning"

export type CompatibilityRepairArea =
  | "linked-chart-data"
  | "odp-table-presets"
  | "office-theme-file"

export type CompatibilityRepairItem = {
  area: CompatibilityRepairArea
  count: number
  detail: string
  id: string
  label: string
  repairSteps: string[]
  slideTitles: string[]
  status: CompatibilityRepairStatus
}

export type CompatibilityRepairReport = {
  attentionCount: number
  items: CompatibilityRepairItem[]
  readyCount: number
  repairActionCount: number
  status: CompatibilityRepairStatus
  summary: string
  warningCount: number
}

function slideLabel(slide: Slide, index: number) {
  return slide.title.trim() || `Slide ${index + 1}`
}

function deckElements(deck: Deck) {
  return deck.slides.flatMap((slide, slideIndex) =>
    slide.elements.map((element) => ({
      element,
      slideTitle: slideLabel(slide, slideIndex),
    })),
  )
}

function metricNumber(
  report: OdpImportPreflightReport | null | undefined,
  metricId: string,
) {
  const value = report?.metrics.find((metric) => metric.id === metricId)?.value
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function combineStatus(
  statuses: CompatibilityRepairStatus[],
): CompatibilityRepairStatus {
  if (statuses.includes("attention")) return "attention"
  if (statuses.includes("warning")) return "warning"
  return "ready"
}

function chartRepairItem(input: {
  chartElements: Array<{ element: PresentationElement; slideTitle: string }>
  linkedDataCount: number
}): CompatibilityRepairItem {
  const fallbackCharts = input.chartElements.filter(
    ({ element }) => !isPptxNativeChartElement(element),
  )
  const multiSeriesCharts = input.chartElements.filter(
    ({ element }) => chartSeries(element).length > 1,
  )
  const count = input.linkedDataCount + fallbackCharts.length
  const status = count ? "warning" : "ready"

  return {
    area: "linked-chart-data",
    count,
    detail: count
      ? `${input.linkedDataCount} linked-data chart source(s) and ${fallbackCharts.length} chart fallback(s) need repair before a fully editable PPTX handoff.`
      : `${multiSeriesCharts.length} multi-series chart(s) are already represented as editable local chart data.`,
    id: "linked-chart-repair",
    label: "Linked chart repair",
    repairSteps: count
      ? [
          "Open each linked chart and paste the source worksheet values into the chart data grid.",
          "Keep multi-series labels in the Category/Series TSV format before export.",
          "Set rotated charts back to 0 degrees when editability matters more than visual rotation.",
        ]
      : [],
    slideTitles: fallbackCharts.map(({ slideTitle }) => slideTitle).slice(0, 4),
    status,
  }
}

function tableRepairItem(input: {
  odpTableCount: number
  tableElements: Array<{ element: PresentationElement; slideTitle: string }>
}): CompatibilityRepairItem {
  const presetFallbackTables = input.tableElements.filter(({ element }) => {
    return !element.tableOfficeStyleId && !element.tableOfficeStyleName
  })
  const count =
    input.odpTableCount && presetFallbackTables.length
      ? presetFallbackTables.length
      : 0

  return {
    area: "odp-table-presets",
    count,
    detail: count
      ? `${count} table(s) use editable grid formatting but do not preserve an Office/ODP table preset identity.`
      : `${input.tableElements.length} table(s) have enough structure for the current native table export path.`,
    id: "odp-table-preset-repair",
    label: "ODP table preset repair",
    repairSteps: count
      ? [
          "Review imported ODP tables in the editor and choose a table style preset that matches the source deck.",
          "Reapply header row, banded rows, first column, and selected-cell borders before PPTX export.",
          "Use the preflight snapshot to keep unresolved table preset fallbacks visible during handoff.",
        ]
      : [],
    slideTitles: presetFallbackTables
      .map(({ slideTitle }) => slideTitle)
      .slice(0, 4),
    status: count ? "warning" : "ready",
  }
}

function themeRepairItem(deck: Deck): CompatibilityRepairItem {
  const masterPlan = nativePptxMasterXmlPlan(deck)
  const handoff = masterPlan.themeFileHandoff
  const packagePlan = masterPlan.themePackagePlan
  const hasInheritanceIssues = masterPlan.placeholderInheritanceIssueCount > 0
  const ready =
    (handoff.status === "ready" || handoff.status === "manual-theme") &&
    packagePlan.status !== "partial" &&
    !hasInheritanceIssues

  return {
    area: "office-theme-file",
    count: ready ? 0 : 1,
    detail: ready
      ? handoff.status === "ready"
        ? `Theme metadata is ready for ${packagePlan.packageFileName}.`
        : "Manual Essence theme defaults do not need Office theme-file repair."
      : `${handoff.themeName} is ${handoff.status}; ${packagePlan.readyPartCount}/${packagePlan.totalPartCount} theme package part(s) ready and ${masterPlan.placeholderInheritanceIssueCount} placeholder inheritance diagnostic(s) need review.`,
    id: "office-theme-file-repair",
    label: "Office theme-file repair",
    repairSteps: ready
      ? []
      : [
          "Import or preserve Office theme metadata with major/minor fonts and color scheme entries.",
          "Review placeholder inheritance diagnostics before bulk reapplying master layouts.",
          `Use ${packagePlan.packageFileName} as the reusable theme-file handoff target once metadata is ready.`,
        ],
    slideTitles: masterPlan.placeholderInheritance.flatMap((diagnostic) =>
      diagnostic.slideTitles.slice(0, 2),
    ).slice(0, 4),
    status: ready
      ? "ready"
      : hasInheritanceIssues
        ? "attention"
        : "warning",
  }
}

function reportSummary(input: {
  attentionCount: number
  repairActionCount: number
  warningCount: number
}) {
  if (!input.repairActionCount) {
    return "No compatibility repair actions are needed before the current PPTX handoff."
  }

  if (input.attentionCount) {
    return `${input.repairActionCount} compatibility repair action(s) include ${input.attentionCount} attention item(s).`
  }

  return `${input.repairActionCount} compatibility repair action(s) are available before export.`
}

export function compatibilityRepairReport(
  deck: Deck,
  input: { odpImportReport?: OdpImportPreflightReport | null } = {},
): CompatibilityRepairReport {
  const elements = deckElements(deck)
  const chartElements = elements.filter(({ element }) => element.type === "chart")
  const tableElements = elements.filter(({ element }) => element.type === "table")
  const items = [
    chartRepairItem({
      chartElements,
      linkedDataCount: odpLinkedChartDataCount(input.odpImportReport),
    }),
    tableRepairItem({
      odpTableCount: metricNumber(input.odpImportReport, "tables"),
      tableElements,
    }),
    themeRepairItem(deck),
  ]
  const attentionCount = items.filter((item) => item.status === "attention").length
  const warningCount = items.filter((item) => item.status === "warning").length
  const readyCount = items.filter((item) => item.status === "ready").length
  const repairActionCount = items.filter((item) => item.status !== "ready").length
  const status = combineStatus(items.map((item) => item.status))

  return {
    attentionCount,
    items,
    readyCount,
    repairActionCount,
    status,
    summary: reportSummary({
      attentionCount,
      repairActionCount,
      warningCount,
    }),
    warningCount,
  }
}

import { chartSeries } from "./chart-formatting"
import type { OdpImportPreflightReport } from "./odp-import-preflight"
import { isPptxNativeChartElement } from "./pptx-chart-export"
import { tableCellMerges, tableCellStyles } from "./table-formatting"
import type { Deck, PresentationElement, Slide } from "./types"

export type OfficeInteropRepairStatus = "attention" | "ready" | "warning"

export type OfficeInteropRepairArea =
  | "chart-editability"
  | "linked-chart-data"
  | "table-preset-mapping"
  | "table-structure"

export type OfficeInteropRepairAction = {
  area: OfficeInteropRepairArea
  count: number
  detail: string
  exportImpact: string
  id: string
  label: string
  ownerAction: string
  slideTitles: string[]
  status: OfficeInteropRepairStatus
}

export type OfficeInteropRepairPlan = {
  actionCount: number
  actions: OfficeInteropRepairAction[]
  attentionCount: number
  chartFallbackCount: number
  editableChartCount: number
  linkedChartDataCount: number
  mergedTableCellCount: number
  odpTableCount: number
  officeTableStyleCount: number
  readyCount: number
  selectedCellBorderVariantCount: number
  status: OfficeInteropRepairStatus
  summary: string
  tableCount: number
  tablePresetFallbackCount: number
  tableStructureReadyCount: number
  warningCount: number
}

export type OfficeInteropRepairPlanOptions = {
  odpImportReport?: OdpImportPreflightReport | null
}

type ElementWithSlide = {
  element: PresentationElement
  slideTitle: string
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

export function odpLinkedChartDataCount(
  report: OdpImportPreflightReport | null | undefined,
) {
  const chartsMetric = report?.metrics.find((metric) => metric.id === "charts")
  const match = /(\d+)\s+linked-data/i.exec(chartsMetric?.detail ?? "")

  return match ? Number(match[1]) : 0
}

function chartActions(input: {
  chartElements: ElementWithSlide[]
  editableChartCount: number
  fallbackCharts: ElementWithSlide[]
  linkedDataCount: number
}): OfficeInteropRepairAction[] {
  const multiSeriesCount = input.chartElements.filter(
    ({ element }) => chartSeries(element).length > 1,
  ).length

  return [
    {
      area: "linked-chart-data",
      count: input.linkedDataCount,
      detail: input.linkedDataCount
        ? `${input.linkedDataCount} linked chart data source(s) need owner review before a fully editable PPTX handoff.`
        : `${multiSeriesCount} multi-series chart(s) use local editable chart data without linked-data repair.`,
      exportImpact: input.linkedDataCount
        ? "PowerPoint can open the deck, but linked source workbooks will not be rebuilt automatically."
        : "Charts stay editable through the native Office chart export path.",
      id: "linked-chart-data-review",
      label: "Linked chart data review",
      ownerAction: input.linkedDataCount
        ? "Paste linked worksheet values into the chart data grid or keep the ODP source attached for manual rebuild."
        : "No linked chart data action is needed.",
      slideTitles: input.chartElements.map(({ slideTitle }) => slideTitle).slice(0, 4),
      status: input.linkedDataCount ? "warning" : "ready",
    },
    {
      area: "chart-editability",
      count: input.fallbackCharts.length,
      detail: input.fallbackCharts.length
        ? `${input.fallbackCharts.length} chart(s) keep exact appearance as rendered artwork because native Office chart rotation is not available yet.`
        : `${input.editableChartCount} chart(s) are ready for editable Office chart export.`,
      exportImpact: input.fallbackCharts.length
        ? "Visual fidelity is preserved, but those charts are not editable as PowerPoint chart data."
        : "Chart data, labels, colors, legend state, and values remain editable after export.",
      id: "chart-editability-repair",
      label: "Chart editability repair",
      ownerAction: input.fallbackCharts.length
        ? "Set rotated charts back to 0 degrees when editability matters more than visual rotation."
        : "No chart editability action is needed.",
      slideTitles: input.fallbackCharts
        .map(({ slideTitle }) => slideTitle)
        .slice(0, 4),
      status: input.fallbackCharts.length ? "warning" : "ready",
    },
  ]
}

function hasBorderVariant(element: PresentationElement) {
  return tableCellStyles(element).some(
    (style) =>
      style.borderBottomColor ||
      style.borderLeftColor ||
      style.borderRightColor ||
      style.borderTopColor,
  )
}

function tableActions(input: {
  mergedCellCount: number
  odpTableCount: number
  officeStyleCount: number
  presetFallbackTables: ElementWithSlide[]
  selectedCellBorderVariantCount: number
  tableElements: ElementWithSlide[]
  tableStructureReadyCount: number
}): OfficeInteropRepairAction[] {
  const rotatedTables = input.tableElements.filter(
    ({ element }) => Math.round(element.rotation || 0) !== 0,
  )
  const presetFallbackCount =
    input.odpTableCount && input.presetFallbackTables.length
      ? input.presetFallbackTables.length
      : 0

  return [
    {
      area: "table-preset-mapping",
      count: presetFallbackCount,
      detail: presetFallbackCount
        ? `${presetFallbackCount} ODP table(s) are editable but do not carry an Office table style identity yet.`
        : `${input.officeStyleCount} table(s) preserve imported Office style metadata, and ${input.tableElements.length} table(s) have editable table formatting.`,
      exportImpact: presetFallbackCount
        ? "PowerPoint receives editable tables, but the original preset may need a manual style reapply."
        : "Table presets and local formatting have enough metadata for the current handoff.",
      id: "table-preset-mapping-repair",
      label: "Table preset mapping",
      ownerAction: presetFallbackCount
        ? "Choose the closest table style preset in the editor and confirm header, banding, first/last column, and border-side formatting."
        : "No table preset mapping action is needed.",
      slideTitles: input.presetFallbackTables
        .map(({ slideTitle }) => slideTitle)
        .slice(0, 4),
      status: presetFallbackCount ? "warning" : "ready",
    },
    {
      area: "table-structure",
      count: rotatedTables.length,
      detail: rotatedTables.length
        ? `${rotatedTables.length} table(s) export as visual fallback because rotated native Office tables are not supported yet.`
        : `${input.tableStructureReadyCount} table(s) are ready for native table export with ${input.mergedCellCount} merged cell(s) and ${input.selectedCellBorderVariantCount} selected-cell border variant(s).`,
      exportImpact: rotatedTables.length
        ? "Merged cells and border variants stay visible, but table editing in PowerPoint is limited for those objects."
        : "Rows, columns, spans, and selected-cell border variants stay editable in PowerPoint.",
      id: "table-structure-readiness",
      label: "Table structure readiness",
      ownerAction: rotatedTables.length
        ? "Set rotated tables back to 0 degrees before export when native PowerPoint table editing is required."
        : "No table structure action is needed.",
      slideTitles: rotatedTables.map(({ slideTitle }) => slideTitle).slice(0, 4),
      status: rotatedTables.length ? "warning" : "ready",
    },
  ]
}

function planStatus(
  actions: OfficeInteropRepairAction[],
): OfficeInteropRepairStatus {
  if (actions.some((action) => action.status === "attention")) return "attention"
  if (actions.some((action) => action.status === "warning")) return "warning"

  return "ready"
}

function planSummary(input: {
  actionCount: number
  attentionCount: number
  chartFallbackCount: number
  linkedChartDataCount: number
  tablePresetFallbackCount: number
}) {
  if (!input.actionCount) {
    return "Office chart and table interoperability is ready for the current PPTX handoff."
  }

  if (input.attentionCount) {
    return `${input.actionCount} Office interoperability repair action(s) include ${input.attentionCount} attention item(s).`
  }

  return `${input.actionCount} Office interoperability repair action(s): ${input.linkedChartDataCount} linked chart source(s), ${input.chartFallbackCount} chart editability fallback(s), and ${input.tablePresetFallbackCount} table preset mapping gap(s).`
}

export function officeInteroperabilityRepairPlan(
  deck: Deck,
  options: OfficeInteropRepairPlanOptions = {},
): OfficeInteropRepairPlan {
  const elements = deckElements(deck)
  const chartElements = elements.filter(({ element }) => element.type === "chart")
  const tableElements = elements.filter(({ element }) => element.type === "table")
  const fallbackCharts = chartElements.filter(
    ({ element }) => !isPptxNativeChartElement(element),
  )
  const editableChartCount = chartElements.length - fallbackCharts.length
  const linkedChartDataCount = odpLinkedChartDataCount(options.odpImportReport)
  const odpTableCount = metricNumber(options.odpImportReport, "tables")
  const presetFallbackTables = tableElements.filter(
    ({ element }) => !element.tableOfficeStyleId && !element.tableOfficeStyleName,
  )
  const officeTableStyleCount = tableElements.filter(
    ({ element }) => element.tableOfficeStyleId || element.tableOfficeStyleName,
  ).length
  const mergedTableCellCount = tableElements.reduce(
    (total, { element }) => total + tableCellMerges(element).length,
    0,
  )
  const selectedCellBorderVariantCount = tableElements.reduce(
    (total, { element }) => total + (hasBorderVariant(element) ? 1 : 0),
    0,
  )
  const tableStructureReadyCount = tableElements.filter(
    ({ element }) => Math.round(element.rotation || 0) === 0,
  ).length
  const actions = [
    ...chartActions({
      chartElements,
      editableChartCount,
      fallbackCharts,
      linkedDataCount: linkedChartDataCount,
    }),
    ...tableActions({
      mergedCellCount: mergedTableCellCount,
      odpTableCount,
      officeStyleCount: officeTableStyleCount,
      presetFallbackTables,
      selectedCellBorderVariantCount,
      tableElements,
      tableStructureReadyCount,
    }),
  ]
  const attentionCount = actions.filter(
    (action) => action.status === "attention",
  ).length
  const warningCount = actions.filter((action) => action.status === "warning").length
  const readyCount = actions.filter((action) => action.status === "ready").length
  const actionCount = actions.length - readyCount
  const status = planStatus(actions)
  const tablePresetFallbackCount =
    odpTableCount && presetFallbackTables.length ? presetFallbackTables.length : 0

  return {
    actionCount,
    actions,
    attentionCount,
    chartFallbackCount: fallbackCharts.length,
    editableChartCount,
    linkedChartDataCount,
    mergedTableCellCount,
    odpTableCount,
    officeTableStyleCount,
    readyCount,
    selectedCellBorderVariantCount,
    status,
    summary: planSummary({
      actionCount,
      attentionCount,
      chartFallbackCount: fallbackCharts.length,
      linkedChartDataCount,
      tablePresetFallbackCount,
    }),
    tableCount: tableElements.length,
    tablePresetFallbackCount,
    tableStructureReadyCount,
    warningCount,
  }
}

function isOfficeInteropRepairPlan(
  value: Deck | OfficeInteropRepairPlan,
): value is OfficeInteropRepairPlan {
  return "actions" in value && "actionCount" in value
}

export function serializeOfficeInteroperabilityRepairPlan(
  input: Deck | OfficeInteropRepairPlan,
  options: OfficeInteropRepairPlanOptions = {},
) {
  const plan = isOfficeInteropRepairPlan(input)
    ? input
    : officeInteroperabilityRepairPlan(input, options)
  const lines = [
    "Office interoperability repair plan",
    `Status: ${plan.status}`,
    `Summary: ${plan.summary}`,
    `Repair actions: ${plan.actionCount}`,
    `Linked chart data: ${plan.linkedChartDataCount}`,
    `Chart fallbacks: ${plan.chartFallbackCount}`,
    `Table preset gaps: ${plan.tablePresetFallbackCount}`,
    `Table readiness: ${plan.tableStructureReadyCount}/${plan.tableCount}`,
    "",
    "Actions",
    ...plan.actions.map((action) => {
      const slides = action.slideTitles.length
        ? ` Slides: ${action.slideTitles.join(", ")}.`
        : ""

      return `- [${action.status}] ${action.label}: ${action.count}. ${action.detail} Owner action: ${action.ownerAction} Export impact: ${action.exportImpact}.${slides}`
    }),
  ]

  return `${lines.join("\n")}\n`
}

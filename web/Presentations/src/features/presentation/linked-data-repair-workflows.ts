import type { OdpImportPreflightReport } from "./odp-import-preflight"
import {
  officeInteroperabilityRepairPlan,
  type OfficeInteropRepairAction,
  type OfficeInteropRepairPlan,
  type OfficeInteropRepairStatus,
} from "./office-interoperability-repair-plan"
import type { Deck } from "./types"

export type LinkedDataRepairWorkflowStatus = OfficeInteropRepairStatus

export type LinkedDataRepairWorkflowActionType =
  | "apply-style"
  | "normalize-chart"
  | "paste-data"
  | "unrotate-table"
  | "verify-export"

export type LinkedDataRepairWorkflowArea =
  | "chart-editability"
  | "linked-chart-data"
  | "table-structure"
  | "table-style-mapping"

export type LinkedDataRepairWorkflowStep = {
  actionType: LinkedDataRepairWorkflowActionType
  area: LinkedDataRepairWorkflowArea
  detail: string
  exportImpact: string
  id: string
  label: string
  ownerAction: string
  priority: number
  slideTitles: string[]
  sourceActionIds: string[]
  status: LinkedDataRepairWorkflowStatus
}

export type LinkedDataRepairWorkflowMetrics = {
  attentionStepCount: number
  chartFallbackCount: number
  linkedChartDataCount: number
  readyStepCount: number
  repairActionCount: number
  tablePresetFallbackCount: number
  tableStructureFallbackCount: number
  totalStepCount: number
  warningStepCount: number
}

export type LinkedDataRepairWorkflowReport = {
  attentionCount: number
  metrics: LinkedDataRepairWorkflowMetrics
  readyCount: number
  repairActionCount: number
  status: LinkedDataRepairWorkflowStatus
  steps: LinkedDataRepairWorkflowStep[]
  summary: string
  totalCount: number
  warningCount: number
}

export type LinkedDataRepairWorkflowOptions = {
  odpImportReport?: OdpImportPreflightReport | null
}

function statusWeight(status: LinkedDataRepairWorkflowStatus) {
  if (status === "attention") return 0
  if (status === "warning") return 1

  return 2
}

function workflowActionType(
  action: OfficeInteropRepairAction,
): LinkedDataRepairWorkflowActionType {
  if (action.area === "linked-chart-data") return "paste-data"
  if (action.area === "chart-editability") return "normalize-chart"
  if (action.area === "table-preset-mapping") return "apply-style"
  if (action.area === "table-structure") return "unrotate-table"

  return "verify-export"
}

function workflowArea(
  action: OfficeInteropRepairAction,
): LinkedDataRepairWorkflowArea {
  if (action.area === "table-preset-mapping") return "table-style-mapping"

  return action.area
}

function workflowPriority(action: OfficeInteropRepairAction) {
  if (action.area === "linked-chart-data") return 10
  if (action.area === "chart-editability") return 20
  if (action.area === "table-preset-mapping") return 30
  if (action.area === "table-structure") return 40

  return 50
}

function workflowStepId(action: OfficeInteropRepairAction) {
  if (action.area === "linked-chart-data") return "workflow:paste-linked-chart-data"
  if (action.area === "chart-editability") return "workflow:normalize-rotated-charts"
  if (action.area === "table-preset-mapping") return "workflow:apply-table-style"
  if (action.area === "table-structure") return "workflow:normalize-rotated-tables"

  return `workflow:${action.id}`
}

function workflowStepLabel(action: OfficeInteropRepairAction) {
  if (action.area === "linked-chart-data") return "Paste linked worksheet values"
  if (action.area === "chart-editability") return "Normalize rotated charts"
  if (action.area === "table-preset-mapping") return "Apply closest table style"
  if (action.area === "table-structure") return "Unrotate native table handoff"

  return action.label
}

function workflowStepOwnerAction(action: OfficeInteropRepairAction) {
  if (action.area === "linked-chart-data" && action.status !== "ready") {
    return "Paste linked worksheet values into the chart data grid, keep category/series labels aligned, and attach the source workbook or ODP package to the handoff notes."
  }

  if (action.area === "chart-editability" && action.status !== "ready") {
    return "Set rotated charts back to 0 degrees before export when editable PowerPoint chart data matters more than preserving rotation."
  }

  if (action.area === "table-preset-mapping" && action.status !== "ready") {
    return "Choose the closest table style preset and verify header, banding, first/last column, merged cells, and selected-cell borders before PPTX export."
  }

  if (action.area === "table-structure" && action.status !== "ready") {
    return "Set rotated tables back to 0 degrees before export when native PowerPoint table editing is required."
  }

  return action.ownerAction
}

function workflowStep(action: OfficeInteropRepairAction): LinkedDataRepairWorkflowStep {
  return {
    actionType: workflowActionType(action),
    area: workflowArea(action),
    detail: action.detail,
    exportImpact: action.exportImpact,
    id: workflowStepId(action),
    label: workflowStepLabel(action),
    ownerAction: workflowStepOwnerAction(action),
    priority: workflowPriority(action),
    slideTitles: action.slideTitles,
    sourceActionIds: [action.id],
    status: action.status,
  }
}

function workflowStatus(steps: LinkedDataRepairWorkflowStep[]) {
  if (steps.some((step) => step.status === "attention")) return "attention"
  if (steps.some((step) => step.status === "warning")) return "warning"

  return "ready"
}

function workflowSummary(input: {
  attentionCount: number
  chartFallbackCount: number
  linkedChartDataCount: number
  repairActionCount: number
  tablePresetFallbackCount: number
  tableStructureFallbackCount: number
}) {
  if (!input.repairActionCount) {
    return "Linked chart data and table style handoffs are ready for the current PPTX export."
  }

  if (input.attentionCount) {
    return `${input.repairActionCount} linked-data workflow step(s) include ${input.attentionCount} attention item(s).`
  }

  return `${input.repairActionCount} linked-data workflow step(s): ${input.linkedChartDataCount} linked chart source(s), ${input.chartFallbackCount} rotated chart fallback(s), ${input.tablePresetFallbackCount} table style gap(s), and ${input.tableStructureFallbackCount} rotated table handoff(s).`
}

function reportFromPlan(
  plan: OfficeInteropRepairPlan,
): LinkedDataRepairWorkflowReport {
  const steps = plan.actions
    .map(workflowStep)
    .sort((first, second) => {
      const statusDelta = statusWeight(first.status) - statusWeight(second.status)

      return statusDelta || first.priority - second.priority
    })
  const attentionCount = steps.filter((step) => step.status === "attention").length
  const warningCount = steps.filter((step) => step.status === "warning").length
  const readyCount = steps.filter((step) => step.status === "ready").length
  const repairActionCount = steps.length - readyCount
  const tableStructureFallbackCount = Math.max(
    0,
    plan.tableCount - plan.tableStructureReadyCount,
  )
  const status = workflowStatus(steps)
  const metrics = {
    attentionStepCount: attentionCount,
    chartFallbackCount: plan.chartFallbackCount,
    linkedChartDataCount: plan.linkedChartDataCount,
    readyStepCount: readyCount,
    repairActionCount,
    tablePresetFallbackCount: plan.tablePresetFallbackCount,
    tableStructureFallbackCount,
    totalStepCount: steps.length,
    warningStepCount: warningCount,
  } satisfies LinkedDataRepairWorkflowMetrics

  return {
    attentionCount,
    metrics,
    readyCount,
    repairActionCount,
    status,
    steps,
    summary: workflowSummary({
      attentionCount,
      chartFallbackCount: plan.chartFallbackCount,
      linkedChartDataCount: plan.linkedChartDataCount,
      repairActionCount,
      tablePresetFallbackCount: plan.tablePresetFallbackCount,
      tableStructureFallbackCount,
    }),
    totalCount: steps.length,
    warningCount,
  }
}

export function linkedDataRepairWorkflowReport(
  deck: Deck,
  options: LinkedDataRepairWorkflowOptions = {},
) {
  return reportFromPlan(
    officeInteroperabilityRepairPlan(deck, {
      odpImportReport: options.odpImportReport,
    }),
  )
}

function isLinkedDataRepairWorkflowReport(
  value: Deck | LinkedDataRepairWorkflowReport,
): value is LinkedDataRepairWorkflowReport {
  return "steps" in value && "metrics" in value
}

export function serializeLinkedDataRepairWorkflowReport(
  input: Deck | LinkedDataRepairWorkflowReport,
  options: LinkedDataRepairWorkflowOptions = {},
) {
  const report = isLinkedDataRepairWorkflowReport(input)
    ? input
    : linkedDataRepairWorkflowReport(input, options)
  const lines = [
    "Linked data repair workflow",
    `Status: ${report.status}`,
    `Summary: ${report.summary}`,
    `Workflow steps: ${report.repairActionCount}/${report.totalCount}`,
    `Linked chart data: ${report.metrics.linkedChartDataCount}`,
    `Chart fallbacks: ${report.metrics.chartFallbackCount}`,
    `Table style gaps: ${report.metrics.tablePresetFallbackCount}`,
    `Table structure fallbacks: ${report.metrics.tableStructureFallbackCount}`,
    "",
    "Steps",
    ...report.steps.map((step) => {
      const slides = step.slideTitles.length
        ? ` Slides: ${step.slideTitles.join(", ")}.`
        : ""

      return `- [${step.status}] ${step.label}: ${step.detail} Owner action: ${step.ownerAction} Export impact: ${step.exportImpact}.${slides}`
    }),
  ]

  return `${lines.join("\n")}\n`
}

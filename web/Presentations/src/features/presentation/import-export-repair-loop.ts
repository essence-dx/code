import type { OdpImportPreflightReport } from "./odp-import-preflight"
import { compatibilityRepairReport } from "./compatibility-repair-report"
import {
  linkedDataRepairWorkflowReport,
  serializeLinkedDataRepairWorkflowReport,
  type LinkedDataRepairWorkflowStep,
} from "./linked-data-repair-workflows"
import { pptxExportPreflight } from "./pptx-export-preflight"
import type { Deck } from "./types"

export type ImportExportRepairLoopStatus = "attention" | "ready" | "warning"

export type ImportExportRepairLoopActionKind =
  | "apply-table-preset"
  | "normalize-chart-editability"
  | "normalize-table-structure"
  | "paste-linked-chart-data"
  | "verify-export-preflight"

export type ImportExportRepairLoopAction = {
  count: number
  detail: string
  exportImpact: string
  id: string
  kind: ImportExportRepairLoopActionKind
  label: string
  nextCommand: string
  ownerAction: string
  priority: number
  slideTitles: string[]
  sourceMetricIds: string[]
  sourceStepIds: string[]
  status: ImportExportRepairLoopStatus
}

export type ImportExportRepairLoopMetric = {
  detail: string
  id: string
  label: string
  value: string
}

export type ImportExportRepairLoopReport = {
  actions: ImportExportRepairLoopAction[]
  attentionCount: number
  metrics: ImportExportRepairLoopMetric[]
  readyCount: number
  repairActionCount: number
  status: ImportExportRepairLoopStatus
  summary: string
  totalCount: number
  warningCount: number
  workflowText: string
}

export type ImportExportRepairLoopOptions = {
  odpImportReport?: OdpImportPreflightReport | null
}

function statusWeight(status: ImportExportRepairLoopStatus) {
  if (status === "attention") return 0
  if (status === "warning") return 1

  return 2
}

function loopStatus(actions: ImportExportRepairLoopAction[]) {
  if (actions.some((action) => action.status === "attention")) return "attention"
  if (actions.some((action) => action.status === "warning")) return "warning"

  return "ready"
}

function actionKind(
  step: LinkedDataRepairWorkflowStep,
): ImportExportRepairLoopActionKind {
  if (step.actionType === "paste-data") return "paste-linked-chart-data"
  if (step.actionType === "normalize-chart") return "normalize-chart-editability"
  if (step.actionType === "apply-style") return "apply-table-preset"
  if (step.actionType === "unrotate-table") return "normalize-table-structure"

  return "verify-export-preflight"
}

function actionCommand(kind: ImportExportRepairLoopActionKind) {
  if (kind === "paste-linked-chart-data") return "Open chart data grid"
  if (kind === "normalize-chart-editability") return "Set chart rotation to 0"
  if (kind === "apply-table-preset") return "Apply closest table preset"
  if (kind === "normalize-table-structure") return "Set table rotation to 0"

  return "Review PPTX preflight"
}

function sourceMetricIds(kind: ImportExportRepairLoopActionKind) {
  if (kind === "paste-linked-chart-data") {
    return ["linked-chart-data-review", "linked-data-workflow-steps"]
  }

  if (kind === "normalize-chart-editability") {
    return ["chart-editability-repairs", "linked-data-workflow-steps"]
  }

  if (kind === "apply-table-preset") {
    return ["table-preset-mapping", "odp-table-preset-repairs"]
  }

  if (kind === "normalize-table-structure") {
    return ["table-structure-readiness"]
  }

  return ["compatibility-repair-actions"]
}

function loopActionFromStep(
  step: LinkedDataRepairWorkflowStep,
): ImportExportRepairLoopAction {
  const kind = actionKind(step)

  return {
    count: step.status === "ready" ? 0 : 1,
    detail: step.detail,
    exportImpact: step.exportImpact,
    id: `repair-loop:${step.id}`,
    kind,
    label: step.label,
    nextCommand: actionCommand(kind),
    ownerAction: step.ownerAction,
    priority: step.priority,
    slideTitles: step.slideTitles,
    sourceMetricIds: sourceMetricIds(kind),
    sourceStepIds: step.sourceActionIds,
    status: step.status,
  }
}

function preflightLoopAction(input: {
  issueCount: number
  issueIds: string[]
  repairActionCount: number
  status: ImportExportRepairLoopStatus
}): ImportExportRepairLoopAction {
  return {
    count: input.issueCount,
    detail: input.issueCount
      ? `${input.issueCount} PPTX preflight item(s) should be reviewed after import/export repairs are applied.`
      : "The PPTX preflight has no open review items after the current repair checks.",
    exportImpact: input.issueCount
      ? "A final preflight pass catches remaining lossy handoffs before the file is shared with PowerPoint users."
      : "The deck is ready for the current PPTX export path.",
    id: "repair-loop:verify-pptx-preflight",
    kind: "verify-export-preflight",
    label: "Verify PPTX preflight",
    nextCommand: "Copy or download preflight snapshot",
    ownerAction: input.repairActionCount
      ? "Apply the listed linked-data and table repair actions, then copy or download the PPTX preflight snapshot for a final owner review."
      : "Copy or download the PPTX preflight snapshot before sending the deck to PowerPoint users.",
    priority: 90,
    slideTitles: [],
    sourceMetricIds: ["compatibility-repair-actions", "preflight-review-items"],
    sourceStepIds: input.issueIds,
    status: input.status,
  }
}

function summary(input: {
  attentionCount: number
  repairActionCount: number
  totalCount: number
}) {
  if (!input.repairActionCount) {
    return "Import/export repair loop is ready for the current PPTX handoff."
  }

  if (input.attentionCount) {
    return `${input.repairActionCount} import/export repair action(s) include ${input.attentionCount} attention item(s) before PPTX export.`
  }

  return `${input.repairActionCount} import/export repair action(s) are ready for owner review across ${input.totalCount} loop step(s).`
}

function safeFilePart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "deck"
  )
}

export function importExportRepairLoopReport(
  deck: Deck,
  options: ImportExportRepairLoopOptions = {},
): ImportExportRepairLoopReport {
  const compatibility = compatibilityRepairReport(deck, options)
  const workflow = linkedDataRepairWorkflowReport(deck, options)
  const preflight = pptxExportPreflight(deck, options)
  const verificationStatus =
    preflight.attentionCount || compatibility.status === "attention"
      ? "attention"
      : preflight.issues.length || workflow.repairActionCount
        ? "warning"
        : "ready"
  const actions = [
    ...workflow.steps.map(loopActionFromStep),
    preflightLoopAction({
      issueCount: preflight.issues.length,
      issueIds: preflight.issues.map((issue) => issue.id),
      repairActionCount: workflow.repairActionCount + compatibility.repairActionCount,
      status: verificationStatus,
    }),
  ].sort((first, second) => {
    const statusDelta = statusWeight(first.status) - statusWeight(second.status)

    return statusDelta || first.priority - second.priority
  })
  const attentionCount = actions.filter(
    (action) => action.status === "attention",
  ).length
  const warningCount = actions.filter((action) => action.status === "warning").length
  const readyCount = actions.filter((action) => action.status === "ready").length
  const repairActionCount = actions.length - readyCount
  const status = loopStatus(actions)

  return {
    actions,
    attentionCount,
    metrics: [
      {
        id: "linked-chart-data",
        label: "Linked chart data",
        value: String(workflow.metrics.linkedChartDataCount),
        detail: "External workbook or ODP chart data sources needing owner review.",
      },
      {
        id: "chart-editability",
        label: "Chart editability",
        value: String(workflow.metrics.chartFallbackCount),
        detail: "Rotated charts that export as rendered artwork until normalized.",
      },
      {
        id: "table-preset-mapping",
        label: "Table presets",
        value: String(workflow.metrics.tablePresetFallbackCount),
        detail: "Editable ODP tables that still need an Office-style preset match.",
      },
      {
        id: "table-structure-readiness",
        label: "Table structure",
        value: String(workflow.metrics.tableStructureFallbackCount),
        detail: "Rotated native table handoffs that should be normalized for editability.",
      },
      {
        id: "compatibility-actions",
        label: "Compatibility actions",
        value: String(compatibility.repairActionCount),
        detail: compatibility.summary,
      },
      {
        id: "preflight-review-items",
        label: "Preflight review",
        value: String(preflight.issues.length),
        detail: preflight.summary,
      },
    ],
    readyCount,
    repairActionCount,
    status,
    summary: summary({
      attentionCount,
      repairActionCount,
      totalCount: actions.length,
    }),
    totalCount: actions.length,
    warningCount,
    workflowText: serializeLinkedDataRepairWorkflowReport(workflow),
  }
}

function isImportExportRepairLoopReport(
  value: Deck | ImportExportRepairLoopReport,
): value is ImportExportRepairLoopReport {
  return "actions" in value && "workflowText" in value
}

export function serializeImportExportRepairLoopReport(
  input: Deck | ImportExportRepairLoopReport,
  options: ImportExportRepairLoopOptions = {},
) {
  const report = isImportExportRepairLoopReport(input)
    ? input
    : importExportRepairLoopReport(input, options)
  const lines = [
    "Import/export repair loop",
    `Status: ${report.status}`,
    `Summary: ${report.summary}`,
    `Repair actions: ${report.repairActionCount}/${report.totalCount}`,
    `Linked chart data: ${
      report.metrics.find((metric) => metric.id === "linked-chart-data")?.value ?? "0"
    }`,
    `Chart editability: ${
      report.metrics.find((metric) => metric.id === "chart-editability")?.value ?? "0"
    }`,
    `Table presets: ${
      report.metrics.find((metric) => metric.id === "table-preset-mapping")?.value ?? "0"
    }`,
    `PPTX preflight: ${
      report.metrics.find((metric) => metric.id === "preflight-review-items")
        ?.value ?? "0"
    }`,
    "",
    "Actions",
    ...report.actions.map((action) => {
      const slides = action.slideTitles.length
        ? ` Slides: ${action.slideTitles.join(", ")}.`
        : ""

      return `- [${action.status}] ${action.label}: ${action.detail} Owner action: ${action.ownerAction} Next: ${action.nextCommand}. Export impact: ${action.exportImpact}.${slides}`
    }),
    "",
    report.workflowText.trim(),
  ]

  return `${lines.join("\n")}\n`
}

export function importExportRepairLoopFileName(
  deckTitle: string,
  date = new Date(),
) {
  return `${safeFilePart(deckTitle)}-${date.toISOString().slice(0, 10)}-import-export-repair-loop.txt`
}

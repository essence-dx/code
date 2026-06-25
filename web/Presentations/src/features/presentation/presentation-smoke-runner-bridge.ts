import {
  presentationBrowserSmokeFlows,
  type PresentationBrowserSmokeFlow,
} from "./presentation-browser-smoke-contract"
import {
  presentationSmokeExecutionReadinessReport,
  type PresentationSmokeExecutionFixtureMode,
} from "./presentation-smoke-execution-readiness"
import type { SmokeFixtureExecutionHandoffMode } from "./smoke-fixture-execution-plan"
import type { SmokeFixtureReadinessStatus } from "./smoke-fixture-readiness"

export type PresentationSmokeRunnerBridgeInput = {
  allowBrowserExecution?: boolean
  appUrl?: string
  approvalPhrase?: string
  browserHandoffMode?: SmokeFixtureExecutionHandoffMode
  fixtureDeckId?: string
  fixtureMode?: PresentationSmokeExecutionFixtureMode
  flowIds?: string[]
  maxFlowCount?: number
  storageStatePath?: string
  storageStateText?: string
  timeoutMs?: string
}

export type PresentationSmokeRunnerBridgeCheck = {
  detail: string
  id: string
  label: string
  status: SmokeFixtureReadinessStatus
}

export type PresentationSmokeRunnerBridgeReport = {
  canRun: boolean
  checks: PresentationSmokeRunnerBridgeCheck[]
  command: string
  readyCount: number
  selectedFlowIds: string[]
  status: SmokeFixtureReadinessStatus
  stepCount: number
  summary: string
  totalCount: number
  unknownFlowIds: string[]
}

const approvalPhrase = "RUN_PRESENTATION_SMOKE"

function combineStatuses(
  statuses: SmokeFixtureReadinessStatus[],
): SmokeFixtureReadinessStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function check(
  checks: PresentationSmokeRunnerBridgeCheck[],
  id: string,
  label: string,
  status: SmokeFixtureReadinessStatus,
  detail: string,
) {
  checks.push({ detail, id, label, status })
}

function isHttpUrl(value: string | undefined) {
  if (!value) return false

  try {
    const parsed = new URL(value)

    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function flowMap() {
  return new Map<string, PresentationBrowserSmokeFlow>(
    presentationBrowserSmokeFlows.map((flow) => [flow.id, flow]),
  )
}

function unique(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)))
}

function selectedFlows(flowIds: string[] | undefined) {
  const ids = unique(flowIds)
  const flows = flowMap()
  const unknownFlowIds = ids.filter((flowId) => !flows.has(flowId))
  const selected = ids
    .map((flowId) => flows.get(flowId))
    .filter((flow): flow is PresentationBrowserSmokeFlow => Boolean(flow))

  return { ids, selected, unknownFlowIds }
}

function storageStateDetail(input: PresentationSmokeRunnerBridgeInput) {
  if (!input.storageStatePath?.trim()) {
    return {
      detail:
        "PRESENTATION_SMOKE_STORAGE_STATE must point to a Playwright storage-state JSON file before live browser execution.",
      status: "blocked" as const,
    }
  }

  if (!input.storageStateText) {
    return {
      detail: `Storage state path ${input.storageStatePath} could not be read.`,
      status: "blocked" as const,
    }
  }

  try {
    const parsed = JSON.parse(input.storageStateText) as {
      cookies?: unknown
      origins?: unknown
    }
    const valid =
      Array.isArray(parsed.cookies) && Array.isArray(parsed.origins)

    return {
      detail: valid
        ? `Storage state ${input.storageStatePath} is valid Playwright-compatible JSON.`
        : `Storage state ${input.storageStatePath} must include cookies and origins arrays.`,
      status: valid ? ("ready" as const) : ("blocked" as const),
    }
  } catch {
    return {
      detail: `Storage state ${input.storageStatePath} is not valid JSON.`,
      status: "blocked" as const,
    }
  }
}

function bridgeCommand(input: PresentationSmokeRunnerBridgeInput) {
  const flowPart = unique(input.flowIds).length
    ? `PRESENTATION_SMOKE_FLOW_IDS=${unique(input.flowIds).join(",")}`
    : "PRESENTATION_SMOKE_FLOW_IDS=<flow-id>"

  return [
    "PRESENTATION_SMOKE_APPROVAL=RUN_PRESENTATION_SMOKE",
    "PRESENTATION_SMOKE_BROWSER_HANDOFF=playwright",
    `PRESENTATION_SMOKE_URL=${input.appUrl ?? "<url>"}`,
    `PRESENTATION_SMOKE_STORAGE_STATE=${
      input.storageStatePath ?? "<storage-state.json>"
    }`,
    `PRESENTATION_SMOKE_FIXTURE_DECK_ID=${
      input.fixtureDeckId ?? "<deck-id>"
    }`,
    "PRESENTATION_SMOKE_FIXTURE_MODE=mutation-safe",
    flowPart,
    "bun run test:presentation-smoke:bridge",
  ].join(" ")
}

export function presentationSmokeRunnerBridgeReport(
  input: PresentationSmokeRunnerBridgeInput = {},
): PresentationSmokeRunnerBridgeReport {
  const checks: PresentationSmokeRunnerBridgeCheck[] = []
  const maxFlowCount = Math.max(1, input.maxFlowCount ?? 3)
  const flowSelection = selectedFlows(input.flowIds)
  const selectedWithinCap = flowSelection.selected.slice(0, maxFlowCount)
  const skippedFlowCount = flowSelection.selected.length - selectedWithinCap.length
  const selectedFlowIds = selectedWithinCap.map((flow) => flow.id)
  const readiness = presentationSmokeExecutionReadinessReport({
    appUrl: input.appUrl,
    fixtureDeckId: input.fixtureDeckId,
    fixtureMode: input.fixtureMode,
    flowId: selectedFlowIds[0],
    requireMutationSafeFixture: true,
    requireUrl: true,
    timeoutMs: input.timeoutMs,
  })

  check(
    checks,
    "live-url",
    "Live URL",
    isHttpUrl(input.appUrl) ? "ready" : "blocked",
    isHttpUrl(input.appUrl)
      ? `Live smoke target is ${input.appUrl}.`
      : "PRESENTATION_SMOKE_URL must be a valid http(s) URL.",
  )

  check(
    checks,
    "low-cost-flow-selection",
    "Low-cost flow selection",
    flowSelection.unknownFlowIds.length || !selectedFlowIds.length
      ? "blocked"
      : skippedFlowCount
        ? "attention"
        : "ready",
    flowSelection.unknownFlowIds.length
      ? `Unknown presentation smoke flow id(s): ${flowSelection.unknownFlowIds.join(", ")}.`
      : !selectedFlowIds.length
        ? "Select at least one registered presentation smoke flow."
        : skippedFlowCount
          ? `${selectedFlowIds.length} flow(s) selected and ${skippedFlowCount} held back by the ${maxFlowCount}-flow cap.`
          : `${selectedFlowIds.length} targeted low-cost flow(s) selected.`,
  )

  const storage = storageStateDetail(input)
  check(
    checks,
    "storage-state",
    "Storage state",
    storage.status,
    storage.detail,
  )

  check(
    checks,
    "mutation-safe-fixture",
    "Mutation-safe fixture",
    input.fixtureMode === "mutation-safe" && Boolean(input.fixtureDeckId?.trim())
      ? "ready"
      : "blocked",
    input.fixtureMode === "mutation-safe" && input.fixtureDeckId?.trim()
      ? `Live smoke execution will use mutation-safe deck ${input.fixtureDeckId}.`
      : "Set PRESENTATION_SMOKE_FIXTURE_MODE=mutation-safe and PRESENTATION_SMOKE_FIXTURE_DECK_ID before live execution.",
  )

  check(
    checks,
    "explicit-approval",
    "Explicit approval",
    input.allowBrowserExecution && input.approvalPhrase === approvalPhrase
      ? "ready"
      : "blocked",
    input.allowBrowserExecution && input.approvalPhrase === approvalPhrase
      ? "Live browser execution was explicitly approved for this run."
      : `Set PRESENTATION_SMOKE_APPROVAL=${approvalPhrase} before running the browser bridge.`,
  )

  check(
    checks,
    "browser-handoff",
    "Browser handoff",
    input.browserHandoffMode === "playwright" ? "ready" : "blocked",
    input.browserHandoffMode === "playwright"
      ? "Playwright browser handoff is selected."
      : "Set PRESENTATION_SMOKE_BROWSER_HANDOFF=playwright to opt in to browser execution.",
  )

  check(
    checks,
    "static-readiness",
    "Static readiness",
    readiness.failedCount ? "blocked" : "ready",
    readiness.failedCount
      ? `${readiness.failedCount} static readiness check(s) failed before browser execution.`
      : `${readiness.selectedFlowCount} flow(s) and ${readiness.stepCount} step(s) passed static readiness checks.`,
  )

  const readyCount = checks.filter((item) => item.status === "ready").length
  const status = combineStatuses(checks.map((item) => item.status))

  return {
    canRun: status === "ready",
    checks,
    command: bridgeCommand(input),
    readyCount,
    selectedFlowIds,
    status,
    stepCount: selectedWithinCap.reduce(
      (total, flow) => total + flow.steps.length,
      0,
    ),
    summary: `${readyCount} of ${checks.length} runner bridge checks are ready.`,
    totalCount: checks.length,
    unknownFlowIds: flowSelection.unknownFlowIds,
  }
}

export function serializePresentationSmokeRunnerBridgeReport(
  report: PresentationSmokeRunnerBridgeReport,
) {
  return [
    `Presentation smoke runner bridge: ${report.summary} Status: ${report.status}.`,
    `Can run: ${report.canRun ? "yes" : "no"}.`,
    `Selected flows: ${
      report.selectedFlowIds.length ? report.selectedFlowIds.join(", ") : "none"
    }.`,
    `Step count: ${report.stepCount}.`,
    `Command: ${report.command}`,
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}

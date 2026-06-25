import {
  presentationBrowserSmokeFlows,
  type PresentationBrowserSmokeFlow,
} from "./presentation-browser-smoke-contract"
import type {
  LowCostSmokeFixture,
  SmokeFixtureDeckFactory,
  SmokeFixtureReadinessStatus,
  SmokeFixtureResetStrategy,
} from "./smoke-fixture-readiness"

export type SmokeFixtureExecutionHandoffMode =
  | "disabled"
  | "manual"
  | "playwright"

export type SmokeFixtureSessionStrategy =
  | "none"
  | "seeded-login"
  | "storage-state"

export type SmokeFixtureExecutionCheck = {
  detail: string
  id: string
  label: string
  status: SmokeFixtureReadinessStatus
}

export type SmokeFixtureExecutionTarget = {
  category: PresentationBrowserSmokeFlow["category"]
  deckFactory: SmokeFixtureDeckFactory
  detail: string
  fixtureId?: string
  flowId: string
  flowName: string
  handoffMode: SmokeFixtureExecutionHandoffMode
  mutationSensitive: boolean
  resetStrategy: SmokeFixtureResetStrategy
  sessionStrategy: SmokeFixtureSessionStrategy
  status: SmokeFixtureReadinessStatus
  stepCount: number
}

export type SmokeFixtureExecutionPlanInput = {
  allowBrowserExecution?: boolean
  appUrl?: string
  browserHandoffMode?: SmokeFixtureExecutionHandoffMode
  fixtures?: LowCostSmokeFixture[]
  flowIds?: string[]
  maxFlowCount?: number
  seededEmail?: string
  seededPassword?: string
  sessionStatePath?: string
}

export type SmokeFixtureExecutionPlanReport = {
  allowBrowserExecution: boolean
  browserHandoffMode: SmokeFixtureExecutionHandoffMode
  checks: SmokeFixtureExecutionCheck[]
  readyCount: number
  selectedFlowIds: string[]
  skippedFlowIds: string[]
  status: SmokeFixtureReadinessStatus
  summary: string
  targetCount: number
  targets: SmokeFixtureExecutionTarget[]
  totalCount: number
  unknownFlowIds: string[]
}

const defaultTargetFlowIds = [
  "auth-email-password-entry",
  "backstage-export-preflight",
  "desktop-local-file-status",
  "share-link-download-permissions",
  "cloud-sync:inspect-manual-cloud-conflict",
]

const mutationSensitiveCategories = new Set<PresentationBrowserSmokeFlow["category"]>([
  "cloud-sync",
  "share",
])

const sessionRequiredCategories = new Set<PresentationBrowserSmokeFlow["category"]>([
  "auth",
  "cloud-sync",
  "share",
])

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function flowMap(): Map<string, PresentationBrowserSmokeFlow> {
  return new Map<string, PresentationBrowserSmokeFlow>(
    presentationBrowserSmokeFlows.map((flow) => [flow.id, flow]),
  )
}

function fixtureMap(fixtures: LowCostSmokeFixture[]) {
  return new Map(fixtures.map((fixture) => [fixture.flowId, fixture]))
}

function isEmail(value: string | undefined) {
  return Boolean(value?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
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

function combineStatuses(
  statuses: SmokeFixtureReadinessStatus[],
): SmokeFixtureReadinessStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function check(
  checks: SmokeFixtureExecutionCheck[],
  id: string,
  label: string,
  status: SmokeFixtureReadinessStatus,
  detail: string,
) {
  checks.push({ detail, id, label, status })
}

function sessionStrategy(input: {
  fixture?: LowCostSmokeFixture
  seededEmail?: string
  seededPassword?: string
  sessionStatePath?: string
}): SmokeFixtureSessionStrategy {
  if (input.fixture?.sessionStatePath?.trim() || input.sessionStatePath?.trim()) {
    return "storage-state"
  }

  const hasInputCredentials = isEmail(input.seededEmail) && Boolean(input.seededPassword)
  const hasFixtureCredentials = isEmail(input.fixture?.seededEmail)

  if (hasInputCredentials || hasFixtureCredentials) return "seeded-login"

  return "none"
}

function mutationTargetStatus(input: {
  fixture?: LowCostSmokeFixture
  mutationSensitive: boolean
}) {
  if (!input.mutationSensitive) {
    return {
      detail: "Read-only selector flow; no deck mutation fixture is required.",
      status: "ready" as const,
    }
  }

  const fixture = input.fixture
  const deckFactory = fixture?.deckFactory ?? "none"
  const resetStrategy = fixture?.resetStrategy ?? "none"

  if (
    fixture?.mode === "mutation-safe" &&
    Boolean(fixture.deckId?.trim()) &&
    deckFactory !== "none" &&
    resetStrategy !== "none"
  ) {
    return {
      detail: `${fixture.label} uses ${deckFactory} with ${resetStrategy}.`,
      status: "ready" as const,
    }
  }

  return {
    detail:
      "Mutation-sensitive flow needs a fixture deck id, mutation-safe mode, reset strategy, and resettable deck factory.",
    status: "blocked" as const,
  }
}

function targetStatus(input: {
  fixture?: LowCostSmokeFixture
  flow: PresentationBrowserSmokeFlow
  seededEmail?: string
  seededPassword?: string
  sessionStatePath?: string
}) {
  const needsSession = sessionRequiredCategories.has(input.flow.category)
  const session = sessionStrategy(input)
  const mutationSensitive = mutationSensitiveCategories.has(input.flow.category)
  const mutation = mutationTargetStatus({
    fixture: input.fixture,
    mutationSensitive,
  })

  if (mutation.status === "blocked") return mutation

  if (needsSession && session === "none") {
    return {
      detail:
        "Flow needs a seeded login or storage-state fixture before a live browser handoff.",
      status: "attention" as const,
    }
  }

  if (mutationSensitive) return mutation

  return {
    detail: needsSession
      ? `Flow can use ${session} session setup.`
      : "Read-only selector flow is safe for lightweight readiness.",
    status: "ready" as const,
  }
}

export function smokeFixtureExecutionPlanReport(
  input: SmokeFixtureExecutionPlanInput = {},
): SmokeFixtureExecutionPlanReport {
  const fixtures = input.fixtures ?? []
  const browserHandoffMode = input.browserHandoffMode ?? "disabled"
  const allowBrowserExecution = input.allowBrowserExecution === true
  const maxFlowCount = Math.max(1, input.maxFlowCount ?? 5)
  const flowIds = unique(
    input.flowIds?.length
      ? input.flowIds
      : fixtures.length
        ? fixtures.map((fixture) => fixture.flowId)
        : defaultTargetFlowIds,
  )
  const selectedFlowIds = flowIds.slice(0, maxFlowCount)
  const skippedFlowIds = flowIds.slice(maxFlowCount)
  const flows = flowMap()
  const fixturesByFlow = fixtureMap(fixtures)
  const unknownFlowIds = selectedFlowIds.filter((flowId) => !flows.has(flowId))
  const selectedFlows = selectedFlowIds
    .map((flowId) => flows.get(flowId))
    .filter((flow): flow is PresentationBrowserSmokeFlow => Boolean(flow))
  const checks: SmokeFixtureExecutionCheck[] = []

  check(
    checks,
    "low-cost-flow-selection",
    "Low-cost flow selection",
    unknownFlowIds.length
      ? "blocked"
      : skippedFlowIds.length
        ? "attention"
        : selectedFlows.length
          ? "ready"
          : "attention",
    unknownFlowIds.length
      ? `Unknown smoke flow id(s): ${unknownFlowIds.join(", ")}.`
      : skippedFlowIds.length
        ? `${selectedFlows.length} flow(s) selected and ${skippedFlowIds.length} extra flow(s) held back by the ${maxFlowCount}-flow cost cap.`
        : selectedFlows.length
          ? `${selectedFlows.length} targeted low-cost flow(s) selected.`
          : "No smoke flows are selected for the execution plan.",
  )

  const targets = selectedFlows.map((flow): SmokeFixtureExecutionTarget => {
    const fixture = fixturesByFlow.get(flow.id)
    const mutationSensitive = mutationSensitiveCategories.has(flow.category)
    const needsSession = sessionRequiredCategories.has(flow.category)
    const session = needsSession
      ? sessionStrategy({
          fixture,
          seededEmail: input.seededEmail,
          seededPassword: input.seededPassword,
          sessionStatePath: input.sessionStatePath,
        })
      : "none"
    const status = targetStatus({
      fixture,
      flow,
      seededEmail: input.seededEmail,
      seededPassword: input.seededPassword,
      sessionStatePath: input.sessionStatePath,
    })

    return {
      category: flow.category,
      deckFactory: fixture?.deckFactory ?? "none",
      detail: status.detail,
      fixtureId: fixture?.id,
      flowId: flow.id,
      flowName: flow.name,
      handoffMode: browserHandoffMode,
      mutationSensitive,
      resetStrategy: fixture?.resetStrategy ?? "none",
      sessionStrategy: session,
      status: status.status,
      stepCount: flow.steps.length,
    }
  })

  const sessionTargets = targets.filter((target) =>
    sessionRequiredCategories.has(target.category),
  )
  const sessionTargetCount = sessionTargets.filter(
    (target) => target.sessionStrategy !== "none",
  ).length
  const mutationTargetCount = targets.filter(
    (target) => target.mutationSensitive,
  ).length
  const missingSessionTargets = sessionTargets.filter(
    (target) => target.sessionStrategy === "none",
  )
  const blockedMutationTargets = targets.filter(
    (target) => target.mutationSensitive && target.status === "blocked",
  )

  check(
    checks,
    "seeded-session-review",
    "Seeded session review",
    missingSessionTargets.length
      ? "attention"
      : sessionTargetCount
        ? "ready"
        : "attention",
    missingSessionTargets.length
      ? `Missing seeded login or storage-state coverage for ${missingSessionTargets
          .map((target) => target.flowId)
          .join(", ")}.`
      : sessionTargetCount
      ? `${sessionTargetCount} auth/share/cloud flow target(s) have seeded login or storage-state coverage.`
      : "No selected target has seeded login or storage-state coverage yet.",
  )

  check(
    checks,
    "mutation-safe-deck-factories",
    "Mutation-safe deck factories",
    blockedMutationTargets.length
      ? "blocked"
      : mutationTargetCount
        ? "ready"
        : "ready",
    blockedMutationTargets.length
      ? `Missing mutation-safe deck factories for ${blockedMutationTargets
          .map((target) => target.flowId)
          .join(", ")}.`
      : mutationTargetCount
      ? `${mutationTargetCount} mutation-sensitive target(s) have resettable deck-factory review.`
      : "No mutation-sensitive target is selected.",
  )

  check(
    checks,
    "browser-execution-handoff",
    "Browser execution handoff",
    browserHandoffMode === "disabled"
      ? "ready"
      : !allowBrowserExecution
        ? "blocked"
        : isHttpUrl(input.appUrl)
          ? "ready"
          : "blocked",
    browserHandoffMode === "disabled"
      ? "Browser execution stays disabled by default; this plan only prepares the handoff."
      : !allowBrowserExecution
        ? "Set explicit browser execution approval before using the optional handoff."
        : isHttpUrl(input.appUrl)
          ? `${browserHandoffMode} handoff can target ${input.appUrl}.`
          : "A valid http(s) app URL is required before enabling browser execution.",
  )

  check(
    checks,
    "lightweight-verification",
    "Lightweight verification",
    "ready",
    "The plan is static and does not run builds, deployments, browser automation, or fixture mutations.",
  )

  const allStatuses = [...checks.map((item) => item.status), ...targets.map((item) => item.status)]
  const readyCount =
    checks.filter((item) => item.status === "ready").length +
    targets.filter((item) => item.status === "ready").length
  const totalCount = checks.length + targets.length

  return {
    allowBrowserExecution,
    browserHandoffMode,
    checks,
    readyCount,
    selectedFlowIds,
    skippedFlowIds,
    status: combineStatuses(allStatuses),
    summary: `${readyCount} of ${totalCount} smoke fixture execution plan checks are ready.`,
    targetCount: targets.length,
    targets,
    totalCount,
    unknownFlowIds,
  }
}

export function serializeSmokeFixtureExecutionPlanReport(
  report: SmokeFixtureExecutionPlanReport,
) {
  return [
    `Smoke fixture execution plan: ${report.summary} Status: ${report.status}.`,
    `Browser handoff: ${report.browserHandoffMode}${
      report.allowBrowserExecution ? " allowed" : " disabled"
    }.`,
    `Selected flows: ${
      report.selectedFlowIds.length ? report.selectedFlowIds.join(", ") : "none"
    }.`,
    report.skippedFlowIds.length
      ? `Held by cost cap: ${report.skippedFlowIds.join(", ")}.`
      : "Held by cost cap: none.",
    "Targets:",
    ...report.targets.map(
      (target) =>
        `- ${target.flowId}: ${target.status}. session=${target.sessionStrategy}; deckFactory=${target.deckFactory}; reset=${target.resetStrategy}; steps=${target.stepCount}. ${target.detail}`,
    ),
    "Checks:",
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}

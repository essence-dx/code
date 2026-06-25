import {
  presentationBrowserSmokeFlows,
  presentationBrowserSmokeReadinessReport,
  type PresentationBrowserSmokeFlow,
  type PresentationBrowserSmokeReadinessInput,
  type PresentationBrowserSmokeReadinessStatus,
} from "./presentation-browser-smoke-contract"

export type PresentationSmokeExecutionFixtureMode =
  | "none"
  | "read-only"
  | "mutation-safe"

export type PresentationSmokeExecutionReadinessInput =
  PresentationBrowserSmokeReadinessInput & {
    fixtureDeckId?: string
    fixtureMode?: PresentationSmokeExecutionFixtureMode
    requireMutationSafeFixture?: boolean
    requireSeededCredentials?: boolean
    seededEmail?: string
    seededPassword?: string
  }

export type PresentationSmokeExecutionReadinessCheck = {
  detail: string
  id: string
  label: string
  status: PresentationBrowserSmokeReadinessStatus
}

export type PresentationSmokeExecutionReadinessReport = {
  checks: PresentationSmokeExecutionReadinessCheck[]
  failedCount: number
  fixtureMode: PresentationSmokeExecutionFixtureMode
  readyCount: number
  selectedFlowCount: number
  selectedFlowIds: string[]
  status: PresentationBrowserSmokeReadinessStatus
  stepCount: number
  summary: string
  totalCount: number
  warningCount: number
}

const mutationSensitiveCategories = new Set<PresentationBrowserSmokeFlow["category"]>(
  ["cloud-sync", "share"],
)

function check(
  checks: PresentationSmokeExecutionReadinessCheck[],
  id: string,
  label: string,
  status: PresentationBrowserSmokeReadinessStatus,
  detail: string,
) {
  checks.push({ detail, id, label, status })
}

function selectedFlows(
  flowId: string | undefined,
): readonly PresentationBrowserSmokeFlow[] {
  if (!flowId) return presentationBrowserSmokeFlows

  return presentationBrowserSmokeFlows.filter((flow) => flow.id === flowId)
}

function isEmail(value: string | undefined) {
  return Boolean(value?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
}

function credentialStatus(input: PresentationSmokeExecutionReadinessInput) {
  const hasEmail = Boolean(input.seededEmail?.trim())
  const hasPassword = Boolean(input.seededPassword)

  if (!hasEmail && !hasPassword) {
    return {
      detail: input.requireSeededCredentials
        ? "Seeded smoke credentials are required for this live run."
        : "No seeded smoke credentials provided; credential-free selector readiness can still run.",
      status: input.requireSeededCredentials ? "fail" : "warn",
    } satisfies Pick<
      PresentationSmokeExecutionReadinessCheck,
      "detail" | "status"
    >
  }

  if (!hasEmail || !hasPassword) {
    return {
      detail: "Seeded smoke credentials must include both email and password.",
      status: "fail",
    } satisfies Pick<
      PresentationSmokeExecutionReadinessCheck,
      "detail" | "status"
    >
  }

  if (!isEmail(input.seededEmail)) {
    return {
      detail: `Seeded smoke email must be a valid email address, got ${input.seededEmail}.`,
      status: "fail",
    } satisfies Pick<
      PresentationSmokeExecutionReadinessCheck,
      "detail" | "status"
    >
  }

  return {
    detail: `Seeded smoke credentials are present for ${input.seededEmail}.`,
    status: "pass",
  } satisfies Pick<PresentationSmokeExecutionReadinessCheck, "detail" | "status">
}

function fixtureStatus(input: {
  fixtureDeckId?: string
  fixtureMode: PresentationSmokeExecutionFixtureMode
  requireMutationSafeFixture?: boolean
  sensitiveFlowCount: number
}) {
  if (!input.sensitiveFlowCount) {
    return {
      detail: "Selected flows do not mutate cloud/share fixtures.",
      status: "pass",
    } satisfies Pick<
      PresentationSmokeExecutionReadinessCheck,
      "detail" | "status"
    >
  }

  const hasFixture = Boolean(input.fixtureDeckId?.trim())
  const mutationSafe = input.fixtureMode === "mutation-safe" && hasFixture

  if (mutationSafe) {
    return {
      detail: `${input.sensitiveFlowCount} mutation-sensitive flow(s) will use prepared fixture ${input.fixtureDeckId}.`,
      status: "pass",
    } satisfies Pick<
      PresentationSmokeExecutionReadinessCheck,
      "detail" | "status"
    >
  }

  if (input.requireMutationSafeFixture) {
    return {
      detail:
        "A mutation-safe fixture deck id is required before running the selected live browser flows.",
      status: "fail",
    } satisfies Pick<
      PresentationSmokeExecutionReadinessCheck,
      "detail" | "status"
    >
  }

  return {
    detail: `${input.sensitiveFlowCount} mutation-sensitive flow(s) are selected without a mutation-safe fixture; keep this as readiness-only or use read-only flows.`,
    status: "warn",
  } satisfies Pick<PresentationSmokeExecutionReadinessCheck, "detail" | "status">
}

function combineStatus(
  statuses: PresentationBrowserSmokeReadinessStatus[],
): PresentationBrowserSmokeReadinessStatus {
  if (statuses.includes("fail")) return "fail"
  if (statuses.includes("warn")) return "warn"
  return "pass"
}

export function presentationSmokeExecutionReadinessReport(
  input: PresentationSmokeExecutionReadinessInput = {},
): PresentationSmokeExecutionReadinessReport {
  const browserReadiness = presentationBrowserSmokeReadinessReport(input)
  const flows = selectedFlows(input.flowId)
  const fixtureMode = input.fixtureMode ?? "none"
  const checks: PresentationSmokeExecutionReadinessCheck[] = []
  const sensitiveFlowCount = flows.filter((flow) =>
    mutationSensitiveCategories.has(flow.category),
  ).length

  check(
    checks,
    "browser-readiness",
    "Browser readiness",
    browserReadiness.status,
    `${browserReadiness.selectedFlowCount} flow(s), ${browserReadiness.stepCount} step(s), ${browserReadiness.failedCount} failure(s), ${browserReadiness.warningCount} warning(s).`,
  )

  check(
    checks,
    "targeted-flow-selection",
    "Targeted flow selection",
    input.flowId
      ? flows.length === 1
        ? "pass"
        : "fail"
      : "warn",
    input.flowId
      ? flows.length === 1
        ? `Selected ${input.flowId}.`
        : `Unknown flow "${input.flowId}".`
      : `All ${presentationBrowserSmokeFlows.length} flows are selected; choose PRESENTATION_SMOKE_FLOW_ID for a low-cost targeted run.`,
  )

  const credentials = credentialStatus(input)
  check(
    checks,
    "seeded-credentials",
    "Seeded credentials",
    credentials.status,
    credentials.detail,
  )

  const fixture = fixtureStatus({
    fixtureDeckId: input.fixtureDeckId,
    fixtureMode,
    requireMutationSafeFixture: input.requireMutationSafeFixture,
    sensitiveFlowCount,
  })
  check(
    checks,
    "mutation-safe-fixture",
    "Mutation-safe fixture",
    fixture.status,
    fixture.detail,
  )

  check(
    checks,
    "lightweight-cadence",
    "Lightweight cadence",
    "pass",
    "This report validates execution prerequisites only; it does not start a browser, run a production build, or mutate live data.",
  )

  const failedCount = checks.filter((item) => item.status === "fail").length
  const warningCount = checks.filter((item) => item.status === "warn").length
  const readyCount = checks.filter((item) => item.status === "pass").length
  const status = combineStatus(checks.map((item) => item.status))

  return {
    checks,
    failedCount,
    fixtureMode,
    readyCount,
    selectedFlowCount: flows.length,
    selectedFlowIds: flows.map((flow) => flow.id),
    status,
    stepCount: flows.reduce<number>(
      (total, flow) => total + flow.steps.length,
      0,
    ),
    summary: `${readyCount} of ${checks.length} smoke execution readiness checks are ready.`,
    totalCount: checks.length,
    warningCount,
  }
}

export function serializePresentationSmokeExecutionReadinessReport(
  report: PresentationSmokeExecutionReadinessReport,
) {
  return [
    `Presentation smoke execution readiness: ${report.summary} Status: ${report.status}.`,
    `Selected flows: ${report.selectedFlowIds.length ? report.selectedFlowIds.join(", ") : "none"}.`,
    `Fixture mode: ${report.fixtureMode}.`,
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}

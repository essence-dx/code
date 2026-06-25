import {
  presentationBrowserSmokeFlows,
  type PresentationBrowserSmokeFlow,
} from "./presentation-browser-smoke-contract"
import type { PresentationSmokeExecutionFixtureMode } from "./presentation-smoke-execution-readiness"

export type SmokeFixtureReadinessStatus = "attention" | "blocked" | "ready"

export type SmokeFixtureResetStrategy =
  | "none"
  | "snapshot-reset"
  | "throwaway-copy"

export type SmokeFixtureDeckFactory =
  | "none"
  | "default-deck-copy"
  | "saved-deck-clone"
  | "revision-reset"

export type LowCostSmokeFixture = {
  deckFactory?: SmokeFixtureDeckFactory
  deckId?: string
  flowId: string
  id: string
  label: string
  mode: PresentationSmokeExecutionFixtureMode
  resetRevisionId?: string
  resetStrategy?: SmokeFixtureResetStrategy
  seededEmail?: string
  sessionStatePath?: string
}

export type SmokeFixtureReadinessCheck = {
  detail: string
  id: string
  label: string
  status: SmokeFixtureReadinessStatus
}

export type SmokeFixtureReadinessReport = {
  checks: SmokeFixtureReadinessCheck[]
  fixtureCount: number
  readyCount: number
  status: SmokeFixtureReadinessStatus
  summary: string
  targetedFlowIds: string[]
  totalCount: number
}

export type SmokeFixtureReadinessInput = {
  fixtures?: LowCostSmokeFixture[]
  maxFixtureCount?: number
  requiredFlowIds?: string[]
}

const defaultRequiredFlowIds = [
  "auth-email-password-entry",
  "desktop-local-file-status",
  "backstage-export-preflight",
  "share-link-download-permissions",
  "cloud-sync:inspect-manual-cloud-conflict",
]

const mutationSensitiveCategories = new Set<PresentationBrowserSmokeFlow["category"]>([
  "cloud-sync",
  "share",
])

function combineStatuses(
  statuses: SmokeFixtureReadinessStatus[],
): SmokeFixtureReadinessStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function check(
  checks: SmokeFixtureReadinessCheck[],
  id: string,
  label: string,
  status: SmokeFixtureReadinessStatus,
  detail: string,
) {
  checks.push({ detail, id, label, status })
}

function knownFlowIds() {
  return new Set(presentationBrowserSmokeFlows.map((flow) => flow.id))
}

function flowById() {
  return new Map(presentationBrowserSmokeFlows.map((flow) => [flow.id, flow]))
}

function isEmail(value: string | undefined) {
  return Boolean(value?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
}

export function smokeFixtureReadinessReport(
  input: SmokeFixtureReadinessInput = {},
): SmokeFixtureReadinessReport {
  const fixtures = input.fixtures ?? []
  const requiredFlowIds = input.requiredFlowIds ?? defaultRequiredFlowIds
  const flowIds = knownFlowIds()
  const flows = flowById()
  const targetedFlowIds = Array.from(
    new Set(fixtures.map((fixture) => fixture.flowId)),
  )
  const checks: SmokeFixtureReadinessCheck[] = []
  const unknownFixtureFlows = targetedFlowIds.filter(
    (flowId) => !flowIds.has(flowId),
  )
  const missingRequiredFlows = requiredFlowIds.filter(
    (flowId) => !targetedFlowIds.includes(flowId),
  )
  const mutationFixtures = fixtures.filter((fixture) =>
    mutationSensitiveCategories.has(flows.get(fixture.flowId)?.category ?? "auth"),
  )
  const unsafeMutationFixtures = mutationFixtures.filter(
    (fixture) =>
      fixture.mode !== "mutation-safe" ||
      !fixture.deckId?.trim() ||
      !fixture.resetStrategy ||
      fixture.resetStrategy === "none",
  )
  const mutationFixturesWithoutFactory = mutationFixtures.filter(
    (fixture) => !fixture.deckFactory || fixture.deckFactory === "none",
  )
  const credentialedFixtures = fixtures.filter((fixture) =>
    isEmail(fixture.seededEmail) || Boolean(fixture.sessionStatePath?.trim()),
  )
  const maxFixtureCount = input.maxFixtureCount ?? 6

  check(
    checks,
    "fixture-flow-coverage",
    "Fixture flow coverage",
    missingRequiredFlows.length ? "attention" : "ready",
    missingRequiredFlows.length
      ? `Missing low-cost fixtures for ${missingRequiredFlows.join(", ")}.`
      : `${requiredFlowIds.length} required smoke flow(s) have fixture coverage.`,
  )

  check(
    checks,
    "fixture-flow-validity",
    "Fixture flow validity",
    unknownFixtureFlows.length ? "blocked" : "ready",
    unknownFixtureFlows.length
      ? `Unknown smoke fixture flow id(s): ${unknownFixtureFlows.join(", ")}.`
      : "All fixture flow ids match registered smoke flows.",
  )

  check(
    checks,
    "fixture-cost",
    "Fixture run cost",
    fixtures.length > maxFixtureCount ? "attention" : fixtures.length ? "ready" : "attention",
    fixtures.length
      ? `${fixtures.length} fixture(s) are selected; keep live smoke below ${maxFixtureCount} targeted fixtures by default.`
      : "No smoke fixtures are registered yet.",
  )

  check(
    checks,
    "mutation-safety",
    "Mutation safety",
    unsafeMutationFixtures.length ? "blocked" : "ready",
    unsafeMutationFixtures.length
      ? `Mutation-sensitive fixtures need deck ids and reset strategies: ${unsafeMutationFixtures
          .map((fixture) => fixture.id)
          .join(", ")}.`
      : mutationFixtures.length
        ? `${mutationFixtures.length} mutation-sensitive fixture(s) are resettable.`
        : "No mutation-sensitive fixture flows are selected.",
  )

  check(
    checks,
    "seeded-credential-coverage",
    "Seeded session coverage",
    credentialedFixtures.length ? "ready" : "attention",
    credentialedFixtures.length
      ? `${credentialedFixtures.length} fixture(s) carry seeded account or storage-state metadata.`
      : "Add seeded account or storage-state metadata before running auth or cloud fixtures live.",
  )

  check(
    checks,
    "mutation-deck-factories",
    "Mutation deck factories",
    mutationFixturesWithoutFactory.length ? "blocked" : "ready",
    mutationFixturesWithoutFactory.length
      ? `Mutation-sensitive fixtures need resettable deck factories: ${mutationFixturesWithoutFactory
          .map((fixture) => fixture.id)
          .join(", ")}.`
      : mutationFixtures.length
        ? `${mutationFixtures.length} mutation-sensitive fixture(s) declare resettable deck factories.`
        : "No mutation-sensitive fixture deck factories are required.",
  )

  const readyCount = checks.filter((item) => item.status === "ready").length

  return {
    checks,
    fixtureCount: fixtures.length,
    readyCount,
    status: combineStatuses(checks.map((item) => item.status)),
    summary: `${readyCount} of ${checks.length} low-cost smoke fixture checks are ready.`,
    targetedFlowIds,
    totalCount: checks.length,
  }
}

export function serializeSmokeFixtureReadinessReport(
  report: SmokeFixtureReadinessReport,
) {
  return [
    `Smoke fixture readiness: ${report.summary} Status: ${report.status}.`,
    `Targeted flows: ${report.targetedFlowIds.length ? report.targetedFlowIds.join(", ") : "none"}.`,
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}

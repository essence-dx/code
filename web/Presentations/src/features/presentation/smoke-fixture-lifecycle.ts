import type { PresentationSmokeExecutionFixtureMode } from "./presentation-smoke-execution-readiness"
import {
  smokeFixtureExecutionPlanReport,
  type SmokeFixtureExecutionHandoffMode,
  type SmokeFixtureExecutionPlanReport,
} from "./smoke-fixture-execution-plan"
import {
  smokeFixtureReadinessReport,
  type LowCostSmokeFixture,
  type SmokeFixtureDeckFactory,
  type SmokeFixtureReadinessReport,
  type SmokeFixtureReadinessStatus,
  type SmokeFixtureResetStrategy,
} from "./smoke-fixture-readiness"

export type SmokeFixtureLifecycleCommandId =
  | "review-plan"
  | "seed-session"
  | "reset-deck"
  | "verify-readiness"
  | "browser-handoff"

export type SmokeFixtureLifecycleCommand = {
  command: string
  detail: string
  id: SmokeFixtureLifecycleCommandId
  label: string
  status: SmokeFixtureReadinessStatus
}

export type SmokeFixtureLifecyclePlanInput = {
  allowBrowserExecution?: boolean
  appUrl?: string
  browserHandoffMode?: SmokeFixtureExecutionHandoffMode
  fixtureDeckId?: string
  fixtureMode?: PresentationSmokeExecutionFixtureMode
  flowIds?: string[]
  maxFlowCount?: number
  resetRevisionId?: string
  seededEmail?: string
  seededPassword?: string
  sessionStatePath?: string
}

export type SmokeFixtureLifecyclePlan = {
  browserHandoffMode: SmokeFixtureExecutionHandoffMode
  commands: SmokeFixtureLifecycleCommand[]
  executionPlan: SmokeFixtureExecutionPlanReport
  fixtureMode: PresentationSmokeExecutionFixtureMode
  fixtures: LowCostSmokeFixture[]
  mutationFixtureCount: number
  readOnlyFixtureCount: number
  readiness: SmokeFixtureReadinessReport
  readyCount: number
  status: SmokeFixtureReadinessStatus
  summary: string
  totalCount: number
}

export type SmokeFixtureLifecycleEnv = Record<string, string | undefined>

function isEmail(value: string | undefined) {
  return Boolean(value?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
}

function positiveInt(value: string | undefined) {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function fixtureMode(
  value: string | undefined,
): PresentationSmokeExecutionFixtureMode {
  if (value === "mutation-safe" || value === "read-only") return value
  return "read-only"
}

function browserHandoffMode(
  value: string | undefined,
): SmokeFixtureExecutionHandoffMode {
  if (value === "manual" || value === "playwright") return value
  return "disabled"
}

function deckFactory(input: {
  fixtureDeckId?: string
  resetRevisionId?: string
}): SmokeFixtureDeckFactory {
  if (!input.fixtureDeckId?.trim()) return "none"
  return input.resetRevisionId?.trim() ? "revision-reset" : "saved-deck-clone"
}

function resetStrategy(fixtureDeckId: string | undefined): SmokeFixtureResetStrategy {
  return fixtureDeckId?.trim() ? "snapshot-reset" : "none"
}

function combineStatuses(
  statuses: SmokeFixtureReadinessStatus[],
): SmokeFixtureReadinessStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function lifecycleCommand(
  id: SmokeFixtureLifecycleCommandId,
  label: string,
  status: SmokeFixtureReadinessStatus,
  command: string,
  detail: string,
): SmokeFixtureLifecycleCommand {
  return { command, detail, id, label, status }
}

function buildFixtures(
  input: SmokeFixtureLifecyclePlanInput,
): LowCostSmokeFixture[] {
  const fixtureDeckId = input.fixtureDeckId
  const seededEmail = input.seededEmail
  const resetRevisionId = input.resetRevisionId
  const sessionStatePath = input.sessionStatePath
  const sharedFixtureMode =
    input.fixtureMode === "mutation-safe" ? "mutation-safe" : "read-only"
  const sharedDeckFactory = deckFactory({ fixtureDeckId, resetRevisionId })
  const sharedResetStrategy = resetStrategy(fixtureDeckId)

  return [
    {
      flowId: "auth-email-password-entry",
      id: "auth-controls",
      label: "Auth email/password controls",
      mode: "read-only",
      seededEmail,
      sessionStatePath,
    },
    {
      flowId: "desktop-local-file-status",
      id: "desktop-local-file-status",
      label: "Desktop local file status",
      mode: "read-only",
    },
    {
      flowId: "backstage-export-preflight",
      id: "backstage-export-preflight",
      label: "Backstage export preflight",
      mode: "read-only",
    },
    {
      deckFactory: sharedDeckFactory,
      deckId: fixtureDeckId,
      flowId: "share-link-download-permissions",
      id: "share-link-download-permissions",
      label: "Share link download permissions",
      mode: sharedFixtureMode,
      resetRevisionId,
      resetStrategy: sharedResetStrategy,
      seededEmail,
      sessionStatePath,
    },
    {
      deckFactory: sharedDeckFactory,
      deckId: fixtureDeckId,
      flowId: "cloud-sync:inspect-manual-cloud-conflict",
      id: "manual-cloud-conflict",
      label: "Manual cloud conflict review",
      mode: sharedFixtureMode,
      resetRevisionId,
      resetStrategy: sharedResetStrategy,
      seededEmail,
      sessionStatePath,
    },
  ]
}

function lifecycleCommands(input: {
  executionPlan: SmokeFixtureExecutionPlanReport
  fixtureDeckId?: string
  fixtureMode: PresentationSmokeExecutionFixtureMode
  readiness: SmokeFixtureReadinessReport
  resetRevisionId?: string
  seededEmail?: string
  seededPassword?: string
  sessionStatePath?: string
}): SmokeFixtureLifecycleCommand[] {
  const hasSeededSession =
    Boolean(input.sessionStatePath?.trim()) ||
    (isEmail(input.seededEmail) && Boolean(input.seededPassword))
  const hasResettableDeck =
    input.fixtureMode === "mutation-safe" &&
    Boolean(input.fixtureDeckId?.trim()) &&
    input.executionPlan.targets
      .filter((target) => target.mutationSensitive)
      .every(
        (target) =>
          target.status === "ready" &&
          target.deckFactory !== "none" &&
          target.resetStrategy !== "none",
      )
  const canRunReadiness =
    input.readiness.status !== "blocked" &&
    input.executionPlan.status !== "blocked"
  const browserHandoffReady =
    input.executionPlan.checks.find(
      (check) => check.id === "browser-execution-handoff",
    )?.status === "ready"

  return [
    lifecycleCommand(
      "review-plan",
      "Review fixture plan",
      "ready",
      "bun run production:fixtures -- --plan",
      "Prints the seeded fixture, reset, and browser handoff plan without mutating data.",
    ),
    lifecycleCommand(
      "seed-session",
      "Seed browser session",
      hasSeededSession ? "ready" : "attention",
      "bun run production:fixtures -- --seed-session",
      hasSeededSession
        ? input.sessionStatePath?.trim()
          ? `Uses Playwright storage state at ${input.sessionStatePath}.`
          : `Uses seeded email/password metadata for ${input.seededEmail}.`
        : "Provide PRESENTATION_SMOKE_STORAGE_STATE or seeded email/password env values before live auth/share/cloud smoke runs.",
    ),
    lifecycleCommand(
      "reset-deck",
      "Reset mutation deck",
      hasResettableDeck ? "ready" : "blocked",
      "bun run production:fixtures -- --reset-deck",
      hasResettableDeck
        ? input.resetRevisionId?.trim()
          ? `Resets fixture deck ${input.fixtureDeckId} from baseline revision ${input.resetRevisionId}.`
          : `Clones fixture deck ${input.fixtureDeckId} before mutation-sensitive smoke flows.`
        : "Set PRESENTATION_SMOKE_FIXTURE_MODE=mutation-safe plus a resettable fixture deck id before running mutation-sensitive smoke flows.",
    ),
    lifecycleCommand(
      "verify-readiness",
      "Verify lightweight readiness",
      canRunReadiness ? "ready" : "blocked",
      "bun run production:fixtures -- --plan && bun run test:cloud-sync-e2e:readiness",
      canRunReadiness
        ? "Static fixture and selector readiness can run without builds, deployments, browser automation, or live mutations."
        : "Fix blocked fixture readiness or execution-plan checks before running the smoke readiness handoff.",
    ),
    lifecycleCommand(
      "browser-handoff",
      "Optional browser handoff",
      browserHandoffReady ? "ready" : "blocked",
      "bun run test:presentation-smoke:bridge",
      browserHandoffReady
        ? input.executionPlan.browserHandoffMode === "disabled"
          ? "Browser execution is intentionally disabled; the runner bridge will refuse to start without explicit approval."
          : `${input.executionPlan.browserHandoffMode} browser handoff is explicitly configured and still guarded by the runner bridge.`
        : "Keep browser execution disabled or provide explicit approval plus a valid app URL before running live smoke flows.",
    ),
  ]
}

export function smokeFixtureLifecyclePlan(
  input: SmokeFixtureLifecyclePlanInput = {},
): SmokeFixtureLifecyclePlan {
  const normalizedFixtureMode = input.fixtureMode ?? "read-only"
  const browserMode = input.browserHandoffMode ?? "disabled"
  const fixtures = buildFixtures({
    ...input,
    fixtureMode: normalizedFixtureMode,
  })
  const readiness = smokeFixtureReadinessReport({ fixtures })
  const executionPlan = smokeFixtureExecutionPlanReport({
    allowBrowserExecution: input.allowBrowserExecution,
    appUrl: input.appUrl,
    browserHandoffMode: browserMode,
    fixtures,
    flowIds: input.flowIds,
    maxFlowCount: input.maxFlowCount,
    seededEmail: input.seededEmail,
    seededPassword: input.seededPassword,
    sessionStatePath: input.sessionStatePath,
  })
  const commands = lifecycleCommands({
    executionPlan,
    fixtureDeckId: input.fixtureDeckId,
    fixtureMode: normalizedFixtureMode,
    readiness,
    resetRevisionId: input.resetRevisionId,
    seededEmail: input.seededEmail,
    seededPassword: input.seededPassword,
    sessionStatePath: input.sessionStatePath,
  })
  const readyCount =
    readiness.readyCount +
    executionPlan.readyCount +
    commands.filter((command) => command.status === "ready").length
  const totalCount =
    readiness.totalCount + executionPlan.totalCount + commands.length
  const mutationFixtureCount = fixtures.filter(
    (fixture) => fixture.mode === "mutation-safe",
  ).length
  const readOnlyFixtureCount = fixtures.filter(
    (fixture) => fixture.mode === "read-only",
  ).length
  const status = combineStatuses([
    readiness.status,
    executionPlan.status,
    ...commands.map((command) => command.status),
  ])

  return {
    browserHandoffMode: browserMode,
    commands,
    executionPlan,
    fixtureMode: normalizedFixtureMode,
    fixtures,
    mutationFixtureCount,
    readOnlyFixtureCount,
    readiness,
    readyCount,
    status,
    summary: `${readyCount} of ${totalCount} production fixture lifecycle checks are ready.`,
    totalCount,
  }
}

export function smokeFixtureLifecyclePlanFromEnv(
  env: SmokeFixtureLifecycleEnv,
): SmokeFixtureLifecyclePlan {
  return smokeFixtureLifecyclePlan({
    allowBrowserExecution:
      env.PRESENTATION_SMOKE_ALLOW_BROWSER_EXECUTION === "true",
    appUrl: env.PRESENTATION_SMOKE_URL,
    browserHandoffMode: browserHandoffMode(
      env.PRESENTATION_SMOKE_BROWSER_HANDOFF,
    ),
    fixtureDeckId: env.PRESENTATION_SMOKE_FIXTURE_DECK_ID,
    fixtureMode: fixtureMode(env.PRESENTATION_SMOKE_FIXTURE_MODE),
    flowIds: env.PRESENTATION_SMOKE_FLOW_ID
      ? [env.PRESENTATION_SMOKE_FLOW_ID]
      : undefined,
    maxFlowCount: positiveInt(env.PRESENTATION_SMOKE_MAX_FLOWS),
    resetRevisionId: env.PRESENTATION_SMOKE_FIXTURE_RESET_REVISION_ID,
    seededEmail: env.PRESENTATION_SMOKE_ADMIN_EMAIL ?? env.ADMIN_EMAIL,
    seededPassword:
      env.PRESENTATION_SMOKE_ADMIN_PASSWORD ?? env.ADMIN_PASSWORD,
    sessionStatePath: env.PRESENTATION_SMOKE_STORAGE_STATE,
  })
}

export function serializeSmokeFixtureLifecyclePlan(
  report: SmokeFixtureLifecyclePlan,
) {
  return [
    `Production fixture lifecycle: ${report.summary} Status: ${report.status}.`,
    `Fixture mode: ${report.fixtureMode}. Browser handoff: ${report.browserHandoffMode}.`,
    `Fixtures: ${report.fixtures.length} total, ${report.mutationFixtureCount} mutation-safe, ${report.readOnlyFixtureCount} read-only.`,
    "Lifecycle commands:",
    ...report.commands.map(
      (command) =>
        `- ${command.label}: ${command.status}. ${command.command}. ${command.detail}`,
    ),
    "Readiness summary:",
    `- Fixtures: ${report.readiness.status}. ${report.readiness.summary}`,
    `- Execution plan: ${report.executionPlan.status}. ${report.executionPlan.summary}`,
  ].join("\n")
}

export function serializeSmokeFixtureLifecyclePlanJson(
  report: SmokeFixtureLifecyclePlan,
) {
  return JSON.stringify(report, null, 2)
}

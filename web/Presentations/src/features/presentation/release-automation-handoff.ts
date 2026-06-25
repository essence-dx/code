import type { CloudSyncE2eReadinessReport } from "./cloud-sync-e2e-readiness"
import type { DesktopPackagingReadinessReport } from "./desktop-packaging-readiness"
import type { DesktopReleaseRegistrationReport } from "./desktop-release-registration"
import type { PresentationSmokeExecutionReadinessReport } from "./presentation-smoke-execution-readiness"
import type { SmokeFixtureExecutionPlanReport } from "./smoke-fixture-execution-plan"
import { serializeSmokeFixtureExecutionPlanReport } from "./smoke-fixture-execution-plan"
import type { SmokeFixtureLifecyclePlan } from "./smoke-fixture-lifecycle"
import { serializeSmokeFixtureLifecyclePlan } from "./smoke-fixture-lifecycle"
import type { ReleaseEnvironmentReadinessReport } from "./release-environment-readiness"
import { serializeReleaseEnvironmentReadinessReport } from "./release-environment-readiness"

export type ReleaseAutomationHandoffStatus =
  | "attention"
  | "blocked"
  | "ready"

export type ReleaseAutomationHandoffSection = {
  detail: string
  id: string
  label: string
  readyCount: number
  status: ReleaseAutomationHandoffStatus
  totalCount: number
}

export type ReleaseAutomationHandoffReport = {
  cloudSyncReadiness?: CloudSyncE2eReadinessReport
  desktopPackaging: DesktopPackagingReadinessReport
  desktopRegistration: DesktopReleaseRegistrationReport
  environment: ReleaseEnvironmentReadinessReport
  generatedAt: string
  nextActions: string[]
  readyCount: number
  sections: ReleaseAutomationHandoffSection[]
  smokeExecution: PresentationSmokeExecutionReadinessReport
  smokeExecutionPlan?: SmokeFixtureExecutionPlanReport
  smokeFixtureLifecycle?: SmokeFixtureLifecyclePlan
  status: ReleaseAutomationHandoffStatus
  summary: string
  target: string
  totalCount: number
}

export type ReleaseAutomationHandoffInput = {
  cloudSyncReadiness?: CloudSyncE2eReadinessReport
  desktopPackaging: DesktopPackagingReadinessReport
  desktopRegistration: DesktopReleaseRegistrationReport
  environment: ReleaseEnvironmentReadinessReport
  generatedAt?: string
  smokeExecution: PresentationSmokeExecutionReadinessReport
  smokeExecutionPlan?: SmokeFixtureExecutionPlanReport
  smokeFixtureLifecycle?: SmokeFixtureLifecyclePlan
  target?: string
}

function statusFromDesktop(
  status: DesktopPackagingReadinessReport["status"],
): ReleaseAutomationHandoffStatus {
  if (status === "blocked") return "blocked"
  if (status === "attention") return "attention"
  return "ready"
}

function statusFromPassWarnFail(
  status: "fail" | "pass" | "warn",
): ReleaseAutomationHandoffStatus {
  if (status === "fail") return "blocked"
  if (status === "warn") return "attention"
  return "ready"
}

function combineStatus(
  statuses: ReleaseAutomationHandoffStatus[],
): ReleaseAutomationHandoffStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function section(input: ReleaseAutomationHandoffSection) {
  return input
}

function sectionAction(section: ReleaseAutomationHandoffSection) {
  if (section.status === "ready") return ""

  return `${section.label}: ${section.detail}`
}

export function releaseAutomationHandoffReport(
  input: ReleaseAutomationHandoffInput,
): ReleaseAutomationHandoffReport {
  const sections = [
    section({
      detail: input.desktopPackaging.summary,
      id: "desktop-packaging",
      label: "Desktop packaging",
      readyCount: input.desktopPackaging.readyCheckCount,
      status: statusFromDesktop(input.desktopPackaging.status),
      totalCount: input.desktopPackaging.totalCheckCount,
    }),
    section({
      detail: input.desktopRegistration.summary,
      id: "desktop-registration",
      label: "Desktop release registration",
      readyCount: input.desktopRegistration.readyCheckCount,
      status: statusFromDesktop(input.desktopRegistration.status),
      totalCount: input.desktopRegistration.totalCheckCount,
    }),
    section({
      detail: input.smokeExecution.summary,
      id: "smoke-execution",
      label: "Smoke execution prerequisites",
      readyCount: input.smokeExecution.readyCount,
      status: statusFromPassWarnFail(input.smokeExecution.status),
      totalCount: input.smokeExecution.totalCount,
    }),
    ...(input.smokeExecutionPlan
      ? [
          section({
            detail: input.smokeExecutionPlan.summary,
            id: "smoke-execution-plan",
            label: "Smoke fixture execution plan",
            readyCount: input.smokeExecutionPlan.readyCount,
            status: input.smokeExecutionPlan.status,
            totalCount: input.smokeExecutionPlan.totalCount,
          }),
        ]
      : []),
    ...(input.smokeFixtureLifecycle
      ? [
          section({
            detail: input.smokeFixtureLifecycle.summary,
            id: "smoke-fixture-lifecycle",
            label: "Production fixture lifecycle",
            readyCount: input.smokeFixtureLifecycle.readyCount,
            status: input.smokeFixtureLifecycle.status,
            totalCount: input.smokeFixtureLifecycle.totalCount,
          }),
        ]
      : []),
    section({
      detail: input.environment.summary,
      id: "release-environment",
      label: "Vercel, Turso, and auth environment",
      readyCount: input.environment.readyCount,
      status: statusFromPassWarnFail(input.environment.status),
      totalCount: input.environment.totalCount,
    }),
    ...(input.cloudSyncReadiness
      ? [
          section({
            detail: `${input.cloudSyncReadiness.selectedFlowCount} flow(s), ${input.cloudSyncReadiness.stepCount} step(s), ${input.cloudSyncReadiness.failedCount} failure(s), and ${input.cloudSyncReadiness.warningCount} warning(s).`,
            id: "cloud-sync-readiness",
            label: "Cloud sync browser readiness",
            readyCount:
              input.cloudSyncReadiness.checks.length -
              input.cloudSyncReadiness.failedCount -
              input.cloudSyncReadiness.warningCount,
            status: statusFromPassWarnFail(input.cloudSyncReadiness.status),
            totalCount: input.cloudSyncReadiness.checks.length,
          }),
        ]
      : []),
  ]
  const readyCount = sections.reduce((total, item) => total + item.readyCount, 0)
  const totalCount = sections.reduce((total, item) => total + item.totalCount, 0)
  const status = combineStatus(sections.map((item) => item.status))
  const nextActions = sections.map(sectionAction).filter(Boolean)

  return {
    cloudSyncReadiness: input.cloudSyncReadiness,
    desktopPackaging: input.desktopPackaging,
    desktopRegistration: input.desktopRegistration,
    environment: input.environment,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    nextActions,
    readyCount,
    sections,
    smokeExecution: input.smokeExecution,
    smokeExecutionPlan: input.smokeExecutionPlan,
    smokeFixtureLifecycle: input.smokeFixtureLifecycle,
    status,
    summary: `${readyCount} of ${totalCount} release automation handoff checks are ready.`,
    target: input.target ?? "local-release-readiness",
    totalCount,
  }
}

export function serializeReleaseAutomationHandoffReport(
  report: ReleaseAutomationHandoffReport,
) {
  return [
    `Release automation handoff: ${report.summary} Status: ${report.status}.`,
    `Target: ${report.target}.`,
    `Generated: ${report.generatedAt}.`,
    "Sections:",
    ...report.sections.map(
      (section) =>
        `- ${section.label}: ${section.status}. ${section.readyCount}/${section.totalCount} ready. ${section.detail}`,
    ),
    "Environment:",
    serializeReleaseEnvironmentReadinessReport(report.environment),
    ...(report.smokeExecutionPlan
      ? [
          "Smoke execution plan:",
          serializeSmokeFixtureExecutionPlanReport(report.smokeExecutionPlan),
        ]
      : []),
    ...(report.smokeFixtureLifecycle
      ? [
          "Production fixture lifecycle:",
          serializeSmokeFixtureLifecyclePlan(report.smokeFixtureLifecycle),
        ]
      : []),
    "Next actions:",
    ...(report.nextActions.length ? report.nextActions : ["No blocking release handoff actions."]),
    "Lightweight commands:",
    "- bun run release:handoff",
    "- bun run production:health",
    "- bun run production:fixtures",
    "- bun run test:presentation",
    "- bun run typecheck",
    "- bun run desktop:preflight",
  ].join("\n")
}

export function serializeReleaseAutomationHandoffJson(
  report: ReleaseAutomationHandoffReport,
) {
  return JSON.stringify(report, null, 2)
}

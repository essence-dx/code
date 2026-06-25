import type { CloudDataHealthReport } from "./cloud-data-health"
import { serializeCloudDataHealthReport } from "./cloud-data-health"
import type { DesktopLocalFileDiagnosticsReport } from "./desktop-local-file-diagnostics"
import { serializeDesktopLocalFileDiagnosticsReport } from "./desktop-local-file-diagnostics"
import type { ProductionDataOperationsReport } from "./production-data-operations"
import { serializeProductionDataOperationsReport } from "./production-data-operations"
import type { SmokeFixtureReadinessReport } from "./smoke-fixture-readiness"
import { serializeSmokeFixtureReadinessReport } from "./smoke-fixture-readiness"
import type { SmokeFixtureExecutionPlanReport } from "./smoke-fixture-execution-plan"
import { serializeSmokeFixtureExecutionPlanReport } from "./smoke-fixture-execution-plan"
import type { SmokeFixtureLifecyclePlan } from "./smoke-fixture-lifecycle"
import { serializeSmokeFixtureLifecyclePlan } from "./smoke-fixture-lifecycle"

export type ProductionReadinessHealthStatus =
  | "attention"
  | "blocked"
  | "ready"

export type ProductionReadinessHealthSection = {
  detail: string
  id: string
  label: string
  readyCount: number
  status: ProductionReadinessHealthStatus
  totalCount: number
}

export type ProductionReadinessHealthReport = {
  cloudData: CloudDataHealthReport
  dataOperations?: ProductionDataOperationsReport
  desktopLocalFiles: DesktopLocalFileDiagnosticsReport
  generatedAt: string
  readyCount: number
  sections: ProductionReadinessHealthSection[]
  smokeExecutionPlan?: SmokeFixtureExecutionPlanReport
  smokeFixtureLifecycle?: SmokeFixtureLifecyclePlan
  smokeFixtures: SmokeFixtureReadinessReport
  status: ProductionReadinessHealthStatus
  summary: string
  totalCount: number
}

export type ProductionReadinessHealthInput = {
  cloudData: CloudDataHealthReport
  dataOperations?: ProductionDataOperationsReport
  desktopLocalFiles: DesktopLocalFileDiagnosticsReport
  generatedAt?: string
  smokeExecutionPlan?: SmokeFixtureExecutionPlanReport
  smokeFixtureLifecycle?: SmokeFixtureLifecyclePlan
  smokeFixtures: SmokeFixtureReadinessReport
}

function combineStatuses(
  statuses: ProductionReadinessHealthStatus[],
): ProductionReadinessHealthStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

export function productionReadinessHealthReport(
  input: ProductionReadinessHealthInput,
): ProductionReadinessHealthReport {
  const sections = [
    {
      detail: input.desktopLocalFiles.summary,
      id: "desktop-local-files",
      label: "Desktop local files",
      readyCount: input.desktopLocalFiles.readyCount,
      status: input.desktopLocalFiles.status,
      totalCount: input.desktopLocalFiles.totalCount,
    },
    {
      detail: input.smokeFixtures.summary,
      id: "smoke-fixtures",
      label: "Low-cost smoke fixtures",
      readyCount: input.smokeFixtures.readyCount,
      status: input.smokeFixtures.status,
      totalCount: input.smokeFixtures.totalCount,
    },
    ...(input.smokeExecutionPlan
      ? [
          {
            detail: input.smokeExecutionPlan.summary,
            id: "smoke-execution-plan",
            label: "Smoke fixture execution plan",
            readyCount: input.smokeExecutionPlan.readyCount,
            status: input.smokeExecutionPlan.status,
            totalCount: input.smokeExecutionPlan.totalCount,
          },
        ]
      : []),
    ...(input.smokeFixtureLifecycle
      ? [
          {
            detail: input.smokeFixtureLifecycle.summary,
            id: "smoke-fixture-lifecycle",
            label: "Smoke fixture lifecycle",
            readyCount: input.smokeFixtureLifecycle.readyCount,
            status: input.smokeFixtureLifecycle.status,
            totalCount: input.smokeFixtureLifecycle.totalCount,
          },
        ]
      : []),
    {
      detail: input.cloudData.summary,
      id: "cloud-data-health",
      label: "Admin, auth, and deck data",
      readyCount: input.cloudData.readyCount,
      status: input.cloudData.status,
      totalCount: input.cloudData.totalCount,
    },
    ...(input.dataOperations
      ? [
          {
            detail: input.dataOperations.summary,
            id: "production-data-operations",
            label: "Production data operations",
            readyCount: input.dataOperations.readyCount,
            status: input.dataOperations.status,
            totalCount: input.dataOperations.totalCount,
          },
        ]
      : []),
  ] satisfies ProductionReadinessHealthSection[]
  const readyCount = sections.reduce((total, item) => total + item.readyCount, 0)
  const totalCount = sections.reduce((total, item) => total + item.totalCount, 0)

  return {
    cloudData: input.cloudData,
    dataOperations: input.dataOperations,
    desktopLocalFiles: input.desktopLocalFiles,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    readyCount,
    sections,
    smokeExecutionPlan: input.smokeExecutionPlan,
    smokeFixtureLifecycle: input.smokeFixtureLifecycle,
    smokeFixtures: input.smokeFixtures,
    status: combineStatuses(sections.map((item) => item.status)),
    summary: `${readyCount} of ${totalCount} production readiness health checks are ready.`,
    totalCount,
  }
}

export function serializeProductionReadinessHealthReport(
  report: ProductionReadinessHealthReport,
) {
  return [
    `Production readiness health: ${report.summary} Status: ${report.status}.`,
    `Generated: ${report.generatedAt}.`,
    "Sections:",
    ...report.sections.map(
      (section) =>
        `- ${section.label}: ${section.status}. ${section.readyCount}/${section.totalCount} ready. ${section.detail}`,
    ),
    "Desktop diagnostics:",
    serializeDesktopLocalFileDiagnosticsReport(report.desktopLocalFiles),
    "Smoke fixtures:",
    serializeSmokeFixtureReadinessReport(report.smokeFixtures),
    ...(report.smokeExecutionPlan
      ? [
          "Smoke execution plan:",
          serializeSmokeFixtureExecutionPlanReport(report.smokeExecutionPlan),
        ]
      : []),
    ...(report.smokeFixtureLifecycle
      ? [
          "Smoke fixture lifecycle:",
          serializeSmokeFixtureLifecyclePlan(report.smokeFixtureLifecycle),
        ]
      : []),
    "Data health:",
    serializeCloudDataHealthReport(report.cloudData),
    ...(report.dataOperations
      ? [
          "Data operations:",
          serializeProductionDataOperationsReport(report.dataOperations),
        ]
      : []),
  ].join("\n")
}

export function serializeProductionReadinessHealthJson(
  report: ProductionReadinessHealthReport,
) {
  return JSON.stringify(report, null, 2)
}

import type { DeploymentEnvironmentDriftReport } from "@/features/projects/deployment-environment-drift";
import type { FreeTierResourceId, FreeTierResourceStatus } from "@/features/projects/free-tier-resource-monitor";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

export type CostQuotaForecastScenarioId = "desktop-campaign" | "maintenance-release" | "public-launch";
export type CostQuotaForecastStatus = "blocked" | "safe" | "watch";

export interface CostQuotaForecastFreeTierRow {
  id: FreeTierResourceId;
  label: string;
  ownerHint: string;
  status: FreeTierResourceStatus;
  usageLabel: string;
  usagePercent: number;
}

export interface CostQuotaForecastFreeTierSource {
  generatedAt: string;
  rows: CostQuotaForecastFreeTierRow[];
  summary: {
    blockedCount: number;
    readyCount: number;
    totalCount: number;
    watchCount: number;
    weightedUsagePercent: number;
    worstStatus: FreeTierResourceStatus;
  };
}

export interface CostQuotaForecastProjection {
  currentUsagePercent: number;
  deltaPercent: number;
  headroomPercent: number;
  label: string;
  ownerHint: string;
  projectedUsagePercent: number;
  resourceId: FreeTierResourceId;
  status: CostQuotaForecastStatus;
}

export interface CostQuotaForecastScenario {
  evidence: string;
  id: CostQuotaForecastScenarioId;
  label: string;
  nextAction: string;
  projections: CostQuotaForecastProjection[];
  status: CostQuotaForecastStatus;
  totalDeltaPercent: number;
  worstProjectedUsagePercent: number;
}

export interface CostQuotaForecastReport {
  generatedAt: string;
  scenarios: CostQuotaForecastScenario[];
  summary: {
    blockedScenarioCount: number;
    forecastScore: number;
    maxProjectedUsagePercent: number;
    nextAction: string;
    safeScenarioCount: number;
    totalScenarioCount: number;
    watchScenarioCount: number;
    worstStatus: CostQuotaForecastStatus;
  };
}

export interface CreateCostQuotaForecastSimulatorInput {
  deploymentEnvironmentDrift: DeploymentEnvironmentDriftReport | null;
  freeTierResourceMonitor: CostQuotaForecastFreeTierSource;
  generatedAt?: string;
  releaseCalendar: WorkspaceReleaseCalendarReport;
}

interface ScenarioDefinition {
  deltas: Record<FreeTierResourceId, number>;
  id: CostQuotaForecastScenarioId;
  label: string;
}

const scenarioDefinitions: ScenarioDefinition[] = [
  {
    deltas: {
      "brevo-email": 8,
      "storage-artifacts": 4,
      "turso-database": 5,
      "vercel-deployment": 10,
      "worker-queue": 5,
    },
    id: "maintenance-release",
    label: "Maintenance release",
  },
  {
    deltas: {
      "brevo-email": 18,
      "storage-artifacts": 18,
      "turso-database": 12,
      "vercel-deployment": 22,
      "worker-queue": 10,
    },
    id: "public-launch",
    label: "Public launch",
  },
  {
    deltas: {
      "brevo-email": 24,
      "storage-artifacts": 30,
      "turso-database": 14,
      "vercel-deployment": 16,
      "worker-queue": 36,
    },
    id: "desktop-campaign",
    label: "Desktop campaign",
  },
];

const statusRank: Record<CostQuotaForecastStatus, number> = {
  blocked: 0,
  watch: 1,
  safe: 2,
};

const statusScore: Record<CostQuotaForecastStatus, number> = {
  blocked: 0,
  safe: 100,
  watch: 65,
};

function clampPercent(value: number) {
  return Math.max(0, Math.round(value));
}

function calendarPressure(report: WorkspaceReleaseCalendarReport) {
  const { blockedCount, dueCount, scheduledCount } = report.summary;

  return Math.min(24, blockedCount * 7 + dueCount * 3 + Math.min(scheduledCount, 4));
}

function environmentPressure(report: DeploymentEnvironmentDriftReport | null) {
  if (!report) {
    return 8;
  }

  return Math.min(30, report.summary.blockedCount * 9 + report.summary.watchCount * 4 + report.summary.driftCount);
}

function statusFromProjection(projectedUsagePercent: number, resourceStatus: FreeTierResourceStatus, environmentBlocked: boolean): CostQuotaForecastStatus {
  if (resourceStatus === "blocked" || projectedUsagePercent >= 100 || environmentBlocked) {
    return "blocked";
  }

  return resourceStatus === "watch" || projectedUsagePercent >= 80 ? "watch" : "safe";
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function createProjection(input: {
  calendarPressurePercent: number;
  environmentBlocked: boolean;
  environmentPressurePercent: number;
  row: CostQuotaForecastFreeTierRow;
  scenario: ScenarioDefinition;
}): CostQuotaForecastProjection {
  const baseDelta = input.scenario.deltas[input.row.id] ?? 0;
  const pressureDelta = Math.round(input.calendarPressurePercent * 0.35 + input.environmentPressurePercent * 0.25);
  const deltaPercent = baseDelta + pressureDelta;
  const projectedUsagePercent = clampPercent(input.row.usagePercent + deltaPercent);
  const status = statusFromProjection(projectedUsagePercent, input.row.status, input.environmentBlocked);

  return {
    currentUsagePercent: input.row.usagePercent,
    deltaPercent,
    headroomPercent: Math.max(0, 100 - projectedUsagePercent),
    label: input.row.label,
    ownerHint: input.row.ownerHint,
    projectedUsagePercent,
    resourceId: input.row.id,
    status,
  };
}

function createScenario(input: {
  calendarPressurePercent: number;
  definition: ScenarioDefinition;
  environmentBlocked: boolean;
  environmentPressurePercent: number;
  freeTierResourceMonitor: CostQuotaForecastFreeTierSource;
  releaseCalendar: WorkspaceReleaseCalendarReport;
}): CostQuotaForecastScenario {
  const projections = input.freeTierResourceMonitor.rows.map((row) =>
    createProjection({
      calendarPressurePercent: input.calendarPressurePercent,
      environmentBlocked: input.environmentBlocked,
      environmentPressurePercent: input.environmentPressurePercent,
      row,
      scenario: input.definition,
    }),
  );
  const status = projections.reduce<CostQuotaForecastStatus>((worst, projection) => (statusRank[projection.status] < statusRank[worst] ? projection.status : worst), "safe");
  const worstProjectedUsagePercent = Math.max(...projections.map((projection) => projection.projectedUsagePercent), 0);
  const totalDeltaPercent = Math.round(projections.reduce((sum, projection) => sum + projection.deltaPercent, 0) / Math.max(projections.length, 1));

  return {
    evidence: `${countLabel(input.releaseCalendar.summary.blockedCount, "blocked milestone")}, ${countLabel(input.releaseCalendar.summary.dueCount, "due milestone")}, ${
      input.freeTierResourceMonitor.summary.weightedUsagePercent
    }% current average load.`,
    id: input.definition.id,
    label: input.definition.label,
    nextAction:
      status === "safe"
        ? "Campaign fits inside the current free-tier guardrails."
        : status === "watch"
          ? "Reduce optional campaign volume or clear due release milestones before launch."
          : "Reduce quota pressure, clear environment drift, or split this campaign before release.",
    projections,
    status,
    totalDeltaPercent,
    worstProjectedUsagePercent,
  };
}

function summarizeScenarios(scenarios: CostQuotaForecastScenario[]): CostQuotaForecastReport["summary"] {
  const worstStatus = scenarios.reduce<CostQuotaForecastStatus>((worst, scenario) => (statusRank[scenario.status] < statusRank[worst] ? scenario.status : worst), "safe");
  const maxProjectedUsagePercent = Math.max(...scenarios.map((scenario) => scenario.worstProjectedUsagePercent), 0);

  return {
    blockedScenarioCount: scenarios.filter((scenario) => scenario.status === "blocked").length,
    forecastScore: Math.round(scenarios.reduce((sum, scenario) => sum + statusScore[scenario.status], 0) / Math.max(scenarios.length, 1)),
    maxProjectedUsagePercent,
    nextAction:
      worstStatus === "safe"
        ? "Current release campaigns fit inside the free-tier forecast."
        : worstStatus === "watch"
          ? "Review watched projections before starting a large release campaign."
          : "Reduce quota pressure before starting the next release campaign.",
    safeScenarioCount: scenarios.filter((scenario) => scenario.status === "safe").length,
    totalScenarioCount: scenarios.length,
    watchScenarioCount: scenarios.filter((scenario) => scenario.status === "watch").length,
    worstStatus,
  };
}

export function createCostQuotaForecastSimulator(input: CreateCostQuotaForecastSimulatorInput): CostQuotaForecastReport {
  const calendarPressurePercent = calendarPressure(input.releaseCalendar);
  const environmentPressurePercent = environmentPressure(input.deploymentEnvironmentDrift);
  const environmentBlocked = (input.deploymentEnvironmentDrift?.summary.blockedCount ?? 0) > 0;
  const scenarios = scenarioDefinitions.map((definition) =>
    createScenario({
      calendarPressurePercent,
      definition,
      environmentBlocked,
      environmentPressurePercent,
      freeTierResourceMonitor: input.freeTierResourceMonitor,
      releaseCalendar: input.releaseCalendar,
    }),
  );

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    scenarios,
    summary: summarizeScenarios(scenarios),
  };
}

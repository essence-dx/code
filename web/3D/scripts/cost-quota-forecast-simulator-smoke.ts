import { strict as assert } from "node:assert";
import type { DeploymentEnvironmentDriftReport } from "@/features/projects/deployment-environment-drift";
import {
  createCostQuotaForecastSimulator,
  type CostQuotaForecastFreeTierSource,
} from "@/features/projects/cost-quota-forecast-simulator";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

const generatedAt = "2026-05-16T18:00:00.000Z";

const freeTierResourceMonitor: CostQuotaForecastFreeTierSource = {
  generatedAt,
  rows: [
    {
      id: "vercel-deployment",
      label: "Vercel deployment",
      ownerHint: "Web release owner",
      status: "ready",
      usageLabel: "1 deployment signal",
      usagePercent: 10,
    },
    {
      id: "turso-database",
      label: "Turso database",
      ownerHint: "Data owner",
      status: "ready",
      usageLabel: "0 database signals",
      usagePercent: 12,
    },
    {
      id: "brevo-email",
      label: "Brevo email",
      ownerHint: "Messaging owner",
      status: "ready",
      usageLabel: "44/300 email jobs",
      usagePercent: 15,
    },
    {
      id: "storage-artifacts",
      label: "Storage artifacts",
      ownerHint: "Asset owner",
      status: "ready",
      usageLabel: "60/250 artifacts",
      usagePercent: 24,
    },
    {
      id: "worker-queue",
      label: "Background worker queue",
      ownerHint: "Worker owner",
      status: "ready",
      usageLabel: "3/25 active jobs",
      usagePercent: 12,
    },
  ],
  summary: {
    blockedCount: 0,
    readyCount: 5,
    totalCount: 5,
    watchCount: 0,
    weightedUsagePercent: 15,
    worstStatus: "ready",
  },
};

const releaseCalendar: WorkspaceReleaseCalendarReport = {
  generatedAt,
  milestones: [],
  summary: {
    appPackageCount: 1,
    blockedCount: 0,
    desktopChannelCount: 3,
    doneCount: 4,
    dueCount: 1,
    nextMilestoneAt: "2026-05-17T18:00:00.000Z",
    postDeployCount: 1,
    reviewGateCount: 4,
    scheduledCount: 3,
    totalCount: 8,
  },
};

const cleanDrift: DeploymentEnvironmentDriftReport = {
  generatedAt,
  rows: [],
  summary: {
    blockedCount: 0,
    driftCount: 0,
    environmentScore: 100,
    readyCount: 4,
    totalCount: 4,
    watchCount: 0,
    worstStatus: "ready",
  },
};

const readyForecast = createCostQuotaForecastSimulator({
  deploymentEnvironmentDrift: cleanDrift,
  freeTierResourceMonitor,
  generatedAt,
  releaseCalendar,
});

assert.equal(readyForecast.summary.totalScenarioCount, 3);
assert.equal(readyForecast.summary.blockedScenarioCount, 0);
assert.equal(readyForecast.summary.worstStatus, "safe");
assert.equal(readyForecast.summary.forecastScore, 100);
assert.equal(readyForecast.scenarios.find((scenario) => scenario.id === "maintenance-release")?.status, "safe");

const pressuredForecast = createCostQuotaForecastSimulator({
  deploymentEnvironmentDrift: {
    ...cleanDrift,
    summary: {
      ...cleanDrift.summary,
      blockedCount: 2,
      driftCount: 9,
      environmentScore: 35,
      readyCount: 1,
      watchCount: 1,
      worstStatus: "blocked",
    },
  },
  freeTierResourceMonitor: {
    ...freeTierResourceMonitor,
    rows: freeTierResourceMonitor.rows.map((row) =>
      row.id === "brevo-email" || row.id === "storage-artifacts" || row.id === "worker-queue" ? { ...row, status: "watch", usagePercent: 72 } : row,
    ),
    summary: {
      ...freeTierResourceMonitor.summary,
      readyCount: 2,
      watchCount: 3,
      weightedUsagePercent: 58,
      worstStatus: "watch",
    },
  },
  generatedAt,
  releaseCalendar: {
    ...releaseCalendar,
    summary: {
      ...releaseCalendar.summary,
      blockedCount: 2,
      dueCount: 5,
    },
  },
});

assert.equal(pressuredForecast.summary.blockedScenarioCount, 3);
assert.equal(pressuredForecast.summary.worstStatus, "blocked");
assert.ok(pressuredForecast.summary.maxProjectedUsagePercent > 100);
assert.ok(pressuredForecast.scenarios.find((scenario) => scenario.id === "desktop-campaign")?.projections.some((projection) => projection.status === "blocked"));
assert.match(pressuredForecast.summary.nextAction, /Reduce quota pressure/);

console.log("cost quota forecast simulator smoke passed");

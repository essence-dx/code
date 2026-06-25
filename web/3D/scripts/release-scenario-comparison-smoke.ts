import { strict as assert } from "node:assert";
import { createReleaseScenarioComparisonReport } from "@/features/projects/release-scenario-comparison";
import type { CostQuotaForecastReport } from "@/features/projects/cost-quota-forecast-simulator";
import type { ExecutiveActionOwnershipMatrix } from "@/features/projects/executive-action-ownership";
import type { ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceSignal } from "@/features/projects/executive-release-intelligence";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ReleaseDrillSimulationReport } from "@/features/projects/release-drill-simulation";

const generatedAt = "2026-05-16T12:00:00.000Z";

function signal(input: Partial<ExecutiveReleaseIntelligenceSignal> & Pick<ExecutiveReleaseIntelligenceSignal, "domain" | "id" | "label" | "status">): ExecutiveReleaseIntelligenceSignal {
  const base: ExecutiveReleaseIntelligenceSignal = {
    detail: `${input.label} detail`,
    domain: input.domain,
    evidence: `${input.label} evidence`,
    evidenceCount: 2,
    id: input.id,
    label: input.label,
    nextAction: `Resolve ${input.label}`,
    ownerHint: `${input.domain} owner`,
    score: input.status === "blocked" ? 38 : input.status === "watch" ? 72 : 93,
    severity: input.status === "blocked" ? "critical" : input.status === "watch" ? "warning" : "info",
    status: input.status,
    updatedAt: generatedAt,
    value: input.status,
  };

  return {
    ...base,
    ...input,
  };
}

const costQuotaForecast: CostQuotaForecastReport = {
  generatedAt,
  scenarios: [
    {
      evidence: "1 blocked milestone, 0 due milestones, 62% current average load.",
      id: "maintenance-release",
      label: "Maintenance release",
      nextAction: "Reduce optional volume before maintenance.",
      projections: [],
      status: "safe",
      totalDeltaPercent: 9,
      worstProjectedUsagePercent: 72,
    },
    {
      evidence: "1 blocked milestone, 0 due milestones, 62% current average load.",
      id: "public-launch",
      label: "Public launch",
      nextAction: "Split public launch before release.",
      projections: [],
      status: "blocked",
      totalDeltaPercent: 28,
      worstProjectedUsagePercent: 108,
    },
    {
      evidence: "1 blocked milestone, 0 due milestones, 62% current average load.",
      id: "desktop-campaign",
      label: "Desktop campaign",
      nextAction: "Reduce package artifact pressure.",
      projections: [],
      status: "watch",
      totalDeltaPercent: 22,
      worstProjectedUsagePercent: 88,
    },
  ],
  summary: {
    blockedScenarioCount: 1,
    forecastScore: 55,
    maxProjectedUsagePercent: 108,
    nextAction: "Reduce quota pressure before starting the next release campaign.",
    safeScenarioCount: 1,
    totalScenarioCount: 3,
    watchScenarioCount: 1,
    worstStatus: "blocked",
  },
};

const executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport = {
  criticalPath: [
    signal({
      domain: "launch",
      id: "launch:promotion-decision",
      label: "Launch promotion readiness",
      nextAction: "Repair public launch smoke.",
      ownerHint: "Release owner",
      score: 35,
      status: "blocked",
    }),
  ],
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "executive.csv",
  executiveMemo: "Do not promote public launch while smoke is blocked.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "executive.json",
  signals: [
    signal({
      domain: "launch",
      id: "launch:promotion-decision",
      label: "Launch promotion readiness",
      nextAction: "Repair public launch smoke.",
      ownerHint: "Release owner",
      score: 35,
      status: "blocked",
    }),
    signal({
      domain: "cost",
      id: "cost:quota-forecast",
      label: "Cost and quota forecast",
      nextAction: "Reduce quota pressure.",
      ownerHint: "Operations owner",
      score: 55,
      status: "blocked",
    }),
    signal({
      domain: "incident",
      id: "incident:history",
      label: "Incident pressure",
      nextAction: "Close critical incidents.",
      ownerHint: "Incident owner",
      score: 64,
      status: "watch",
    }),
    signal({
      domain: "evidence",
      id: "evidence:bundle-graph",
      label: "Evidence coverage",
      score: 91,
      status: "ready",
    }),
  ],
  summary: {
    blockedCount: 2,
    costScore: 55,
    domainCoverage: ["launch", "cost", "incident", "evidence"],
    evidenceScore: 91,
    executiveScore: 61,
    governanceScore: 80,
    incidentScore: 64,
    launchScore: 35,
    lowestDomain: "launch",
    readyCount: 1,
    riskScore: 82,
    signalCount: 4,
    status: "blocked",
    topAction: "Repair public launch smoke.",
    watchCount: 1,
  },
};

const executiveActionOwnership: ExecutiveActionOwnershipMatrix = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "ownership.csv",
  generatedAt,
  rows: [
    {
      action: "Repair public launch smoke.",
      detail: "Public launch is blocked.",
      domain: "launch",
      dueAt: "2026-05-16T13:00:00.000Z",
      dueWindowLabel: "Due in 1h",
      evidenceLinks: [{ href: "/projects?workspaceId=workspace-1#release-runbook", kind: "runbook", label: "Runbook evidence", sourceId: "launch:promotion-decision" }],
      id: "executive:launch:promotion-decision",
      ownerEmail: "release@example.com",
      ownerName: "Release Owner",
      ownerSource: "runbook",
      projectName: "Launch scene",
      riskScore: 35,
      signalLabel: "Launch promotion readiness",
      status: "blocked",
    },
    {
      action: "Close critical incidents.",
      detail: "Incident pressure needs review.",
      domain: "incident",
      dueAt: "2026-05-17T12:00:00.000Z",
      dueWindowLabel: "Due in 24h",
      evidenceLinks: [{ href: "/projects?workspaceId=workspace-1#executive-release-intelligence", kind: "executive", label: "Executive signal", sourceId: "incident:history" }],
      id: "executive:incident:history",
      ownerEmail: null,
      ownerName: "Incident owner",
      ownerSource: "hint",
      projectName: null,
      riskScore: 62,
      signalLabel: "Incident pressure",
      status: "watch",
    },
  ],
  summary: {
    blockedCount: 1,
    dueSoonCount: 2,
    nextAction: "Assign owners to every executive action and attach runbook evidence before the release window.",
    overdueCount: 0,
    ownerCoveragePercent: 50,
    ownershipScore: 63,
    readyCount: 0,
    status: "blocked",
    totalCount: 2,
    unassignedCount: 1,
    watchCount: 1,
  },
};

const incidentHistory: ProjectIncidentHistory = {
  generatedAt,
  incidents: [
    {
      actionLabel: "Run deploy smoke",
      count: 2,
      details: ["Viewer: 500", "Embed: 500"],
      id: "project-1:post-deploy-failure:2026-05-16T11:00:00.000Z",
      kind: "post-deploy-failure",
      message: "Viewer and embed failed after deployment.",
      occurredAt: "2026-05-16T11:00:00.000Z",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "critical",
      source: "post-deploy-smoke",
      title: "Post-deploy smoke failed",
    },
  ],
  summary: {
    blockedReviewCount: 0,
    criticalCount: 1,
    failedExportCount: 0,
    impactedProjectCount: 1,
    postDeployFailureCount: 1,
    totalCount: 1,
    warningCount: 0,
  },
};

const releaseDrillSimulation: ReleaseDrillSimulationReport = {
  generatedAt,
  rows: [
    {
      blastRadius: "Public viewer links and embeds.",
      evidence: "0/2 runbook records complete, 1 blocked milestone.",
      exercise: ["Confirm previous stable deploy."],
      id: "rollback",
      label: "Rollback rehearsal",
      nextAction: "Clear blocked runbook items.",
      ownerHint: "Release owner",
      recoveryTargetMinutes: 30,
      status: "watch",
      successCriteria: ["Previous deploy is identified."],
    },
    {
      blastRadius: "Signed desktop bundles.",
      evidence: "2 valid, 0 expiring, 0 blocked certificate rows.",
      exercise: ["Simulate certificate replacement."],
      id: "certificate-expiry",
      label: "Certificate expiry drill",
      nextAction: "Keep certificate evidence attached.",
      ownerHint: "Signing owner",
      recoveryTargetMinutes: 45,
      status: "ready",
      successCriteria: ["Replacement fingerprint is valid."],
    },
    {
      blastRadius: "Public viewer and API helpers.",
      evidence: "Failing synthetic report.",
      exercise: ["Force one public route to fail."],
      id: "deploy-smoke-failure",
      label: "Deploy smoke failure drill",
      nextAction: "Resolve failed public checks.",
      ownerHint: "Web release owner",
      recoveryTargetMinutes: 20,
      status: "blocked",
      successCriteria: ["Latest smoke run passes."],
    },
    {
      blastRadius: "Native CAD imports.",
      evidence: "4 succeeded, 0 active, 0 retryable, 0 failed CAD jobs.",
      exercise: ["Mark one adapter unavailable."],
      id: "cad-worker-outage",
      label: "CAD worker outage drill",
      nextAction: "Keep worker outputs attached.",
      ownerHint: "CAD pipeline owner",
      recoveryTargetMinutes: 60,
      status: "ready",
      successCriteria: ["Affected jobs are identified."],
    },
  ],
  summary: {
    blockedCount: 1,
    missingCount: 0,
    readyCount: 2,
    score: 66,
    totalCount: 4,
    watchCount: 1,
    worstStatus: "blocked",
  },
};

const report = createReleaseScenarioComparisonReport({
  costQuotaForecast,
  executiveActionOwnership,
  executiveReleaseIntelligence,
  generatedAt,
  incidentHistory,
  releaseDrillSimulation,
  workspaceId: "workspace-1",
});

assert.equal(report.rows.length, 4);
assert.equal(report.summary.totalCount, 4);
assert.equal(report.rows.some((row) => row.id === "incident-rollback"), true);
assert.equal(report.rows.find((row) => row.id === "public-launch")?.status, "blocked");
assert.equal(report.rows.find((row) => row.id === "maintenance-release")?.status, "watch");
assert.equal(report.rows.find((row) => row.id === "incident-rollback")?.ownerActions.some((action) => action.ownerName === "Incident owner"), true);
assert.equal(report.recommendedScenario.id, "maintenance-release");
assert.match(report.summary.nextAction, /Maintenance release/);
assert.match(report.csvContent, /scenario,status,readiness_score,owner_load_score,cost_score,risk_score,rollback_score,next_action/);
assert.match(report.csvDataUri, /^data:text\/csv/);

console.log("release scenario comparison smoke passed");

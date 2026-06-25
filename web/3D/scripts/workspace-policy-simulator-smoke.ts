import { strict as assert } from "node:assert";
import {
  createWorkspacePolicySimulationReport,
  createWorkspacePolicySimulationReportFromSources,
  type WorkspacePolicySimulationChange,
} from "@/features/projects/workspace-policy-simulator";
import type { CostQuotaForecastReport } from "@/features/projects/cost-quota-forecast-simulator";
import type { PolicyAsCodeReport } from "@/features/projects/policy-as-code-checks";
import type { ReleaseReadinessWebhookReport } from "@/features/projects/release-readiness-webhooks";

const generatedAt = "2026-05-16T20:00:00.000Z";

const riskyChanges: WorkspacePolicySimulationChange[] = [
  {
    affectedProjectCount: 4,
    domain: "permission",
    grantsEditorAccess: true,
    id: "public-editor-rollout",
    label: "Open public editor rollout",
    opensPublicSurface: true,
    requiresReview: false,
  },
  {
    auditLogDays: 120,
    commentDays: 30,
    destructiveCleanup: true,
    domain: "retention",
    evidencePacketDays: 90,
    id: "short-retention",
    label: "Shorten retention windows",
    requiresApproval: false,
    versionDays: 14,
  },
  {
    blockedGateCount: 2,
    bypassesApproval: false,
    domain: "release",
    id: "strict-release-gates",
    label: "Enforce strict release gates",
    pendingGateCount: 1,
    publicSurfaceCount: 3,
  },
  {
    domain: "quota",
    id: "launch-campaign",
    label: "Large launch campaign",
    projections: [
      { label: "Vercel deployment", projectedUsagePercent: 96, resourceId: "vercel-deployment" },
      { label: "Brevo email", projectedUsagePercent: 84, resourceId: "brevo-email" },
    ],
  },
  {
    domain: "webhook",
    id: "trusted-webhook-cutover",
    label: "Require trusted provider webhooks",
    missingTrustedProviderCount: 1,
    providerCount: 4,
    replayProtectionEnabled: false,
    retryingDeliveryCount: 2,
    trustedSignatureRequired: true,
  },
];

const riskyReport = createWorkspacePolicySimulationReport({
  changes: riskyChanges,
  generatedAt,
  workspaceId: "workspace-risky",
});

assert.equal(riskyReport.summary.totalCount, 5);
assert.equal(riskyReport.summary.blockedCount, 4);
assert.equal(riskyReport.summary.watchCount, 1);
assert.equal(riskyReport.summary.readyCount, 0);
assert.equal(riskyReport.summary.approvalRequiredCount, 4);
assert.equal(riskyReport.summary.worstStatus, "blocked");
assert.match(riskyReport.summary.nextAction, /Block enforcement/);
assert.equal(riskyReport.rows.find((row) => row.domain === "quota")?.status, "watch");
assert.equal(riskyReport.rows.find((row) => row.domain === "webhook")?.status, "blocked");
assert.match(riskyReport.csvContent, /domain,status,label,approval_required,blockers,warnings,next_action/);
assert.match(riskyReport.csvDataUri, /^data:text\/csv/);
assert.equal(riskyReport.csvFileName, "workspace-risky-policy-simulation.csv");

const readyReport = createWorkspacePolicySimulationReport({
  changes: [
    {
      affectedProjectCount: 2,
      domain: "permission",
      grantsEditorAccess: false,
      id: "reviewed-public-links",
      label: "Reviewed public links",
      opensPublicSurface: false,
      requiresReview: true,
    },
    {
      auditLogDays: 730,
      commentDays: 365,
      destructiveCleanup: false,
      domain: "retention",
      evidencePacketDays: 730,
      id: "approved-retention",
      label: "Approved retention floor",
      requiresApproval: true,
      versionDays: 180,
    },
    {
      blockedGateCount: 0,
      bypassesApproval: false,
      domain: "release",
      id: "approved-release-gates",
      label: "Approved release gates",
      pendingGateCount: 0,
      publicSurfaceCount: 2,
    },
    {
      domain: "quota",
      id: "maintenance-campaign",
      label: "Maintenance campaign",
      projections: [{ label: "Turso database", projectedUsagePercent: 44, resourceId: "turso-database" }],
    },
    {
      domain: "webhook",
      id: "trusted-webhooks",
      label: "Trusted webhooks",
      missingTrustedProviderCount: 0,
      providerCount: 4,
      replayProtectionEnabled: true,
      retryingDeliveryCount: 0,
      trustedSignatureRequired: true,
    },
  ],
  generatedAt,
});

assert.equal(readyReport.summary.simulationScore, 100);
assert.equal(readyReport.summary.readyCount, 5);
assert.equal(readyReport.summary.blockerCount, 0);

const policyAsCodeReport: PolicyAsCodeReport = {
  generatedAt,
  rows: [
    {
      evidence: "2 public permission issues.",
      failCount: 2,
      id: "publish-permissions",
      label: "Publish permissions",
      nextAction: "Approve publish permissions.",
      ownerHint: "Publishing owner",
      passCount: 1,
      ruleCount: 4,
      rules: [],
      status: "blocked",
      warningCount: 0,
    },
    {
      evidence: "Retention has one stale policy.",
      failCount: 0,
      id: "retention-windows",
      label: "Retention windows",
      nextAction: "Refresh retention.",
      ownerHint: "Compliance owner",
      passCount: 3,
      ruleCount: 4,
      rules: [],
      status: "watch",
      warningCount: 1,
    },
    {
      evidence: "Release approvals are clean.",
      failCount: 0,
      id: "release-approvals",
      label: "Release approvals",
      nextAction: "Keep release gates attached.",
      ownerHint: "Launch owner",
      passCount: 4,
      ruleCount: 4,
      rules: [],
      status: "ready",
      warningCount: 0,
    },
    {
      evidence: "Public surfaces are clean.",
      failCount: 0,
      id: "public-surface-guardrails",
      label: "Public surfaces",
      nextAction: "Keep snapshots fresh.",
      ownerHint: "Release operator",
      passCount: 4,
      ruleCount: 4,
      rules: [],
      status: "ready",
      warningCount: 0,
    },
  ],
  summary: {
    blockedCount: 1,
    failedRuleCount: 2,
    passedRuleCount: 12,
    policyScore: 66,
    readyCount: 2,
    totalCount: 4,
    warningRuleCount: 1,
    watchCount: 1,
    worstStatus: "blocked",
  },
};

const costQuotaForecast: CostQuotaForecastReport = {
  generatedAt,
  scenarios: [
    {
      evidence: "Public launch has watched quota pressure.",
      id: "public-launch",
      label: "Public launch",
      nextAction: "Reduce optional campaign volume.",
      projections: [
        {
          currentUsagePercent: 60,
          deltaPercent: 25,
          headroomPercent: 15,
          label: "Brevo email",
          ownerHint: "Messaging owner",
          projectedUsagePercent: 85,
          resourceId: "brevo-email",
          status: "watch",
        },
      ],
      status: "watch",
      totalDeltaPercent: 25,
      worstProjectedUsagePercent: 85,
    },
  ],
  summary: {
    blockedScenarioCount: 0,
    forecastScore: 65,
    maxProjectedUsagePercent: 85,
    nextAction: "Review watched projections.",
    safeScenarioCount: 0,
    totalScenarioCount: 1,
    watchScenarioCount: 1,
    worstStatus: "watch",
  },
};

const releaseReadinessWebhooks: ReleaseReadinessWebhookReport = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "webhooks.csv",
  generatedAt,
  rows: [],
  summary: {
    blockedCount: 1,
    missingProviderCount: 1,
    providerCoverage: {
      brevo: 1,
      "desktop-updater": 0,
      turso: 1,
      vercel: 1,
    },
    readinessScore: 67,
    readyCount: 2,
    status: "blocked",
    totalCount: 3,
    watchCount: 0,
  },
};

const sourceReport = createWorkspacePolicySimulationReportFromSources({
  activeProjectCount: 6,
  costQuotaForecast,
  generatedAt,
  memberCount: 5,
  policyAsCodeReport,
  releaseReadinessWebhooks,
  workspaceId: "workspace-source",
});

assert.equal(sourceReport.summary.totalCount, 5);
assert.equal(sourceReport.rows.find((row) => row.domain === "permission")?.status, "blocked");
assert.equal(sourceReport.rows.find((row) => row.domain === "retention")?.status, "watch");
assert.equal(sourceReport.rows.find((row) => row.domain === "quota")?.status, "watch");
assert.equal(sourceReport.rows.find((row) => row.domain === "webhook")?.status, "blocked");

console.log("workspace policy simulator smoke passed");

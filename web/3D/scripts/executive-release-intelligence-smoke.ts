import { strict as assert } from "node:assert";
import { createExecutiveReleaseIntelligenceReport } from "@/features/projects/executive-release-intelligence";
import type { CostQuotaForecastReport } from "@/features/projects/cost-quota-forecast-simulator";
import type { DeployPromotionDecisionBoard } from "@/features/projects/deploy-promotion-decision-board";
import type { GovernanceTimelineReport } from "@/features/projects/governance-timeline";
import type { OperationalAnomalyDetectionReport } from "@/features/projects/operational-anomaly-detection";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { ReleaseReadinessWebhookReport } from "@/features/projects/release-readiness-webhooks";
import type { WorkspaceEvidenceGraphReport } from "@/features/projects/workspace-evidence-graph";
import type { WorkspacePolicySimulationReport } from "@/features/projects/workspace-policy-simulator";
import type { WorkspaceRiskDigestReport } from "@/features/projects/workspace-risk-digest";

const generatedAt = "2026-05-16T23:30:00.000Z";

const deployPromotionDecisionBoard: DeployPromotionDecisionBoard = {
  blockerCount: 2,
  decision: "blocked",
  decisionLabel: "Promotion blocked",
  generatedAt,
  milestoneFocus: [],
  nextAction: {
    actionLabel: "Inspect failed checks",
    detail: "Post-deploy smoke and runbook blockers must clear.",
    evidenceCount: 2,
    id: "post-deploy-smoke",
    source: "post-deploy",
    status: "blocked",
    title: "Post-deploy smoke",
    value: "75% failing",
  },
  promotionScore: 42,
  runbookCompletionPercent: 50,
  runbookFocus: [],
  signals: [
    {
      actionLabel: "Inspect failed checks",
      detail: "Post-deploy smoke is failing.",
      evidenceCount: 2,
      id: "post-deploy-smoke",
      source: "post-deploy",
      status: "blocked",
      title: "Post-deploy smoke",
      value: "75% failing",
    },
  ],
  smokeIssueRows: [],
  summary: {
    calendarBlockedCount: 1,
    calendarDueCount: 1,
    calendarNextMilestoneAt: generatedAt,
    postDeployHistoryCount: 4,
    postDeployPassStreak: 0,
    riskScore: 64,
    runbookBlockedCount: 1,
    runbookCompleteCount: 1,
    runbookTotalCount: 2,
  },
  warningCount: 1,
};

const governanceTimelineReport: GovernanceTimelineReport = {
  events: [
    {
      actorLabel: "Release owner",
      correlationCount: 2,
      detail: "Release governance policy changed while incidents are open.",
      evidence: "Policy and incident events happened in the same launch window.",
      id: "governance:critical",
      occurredAt: generatedAt,
      ownerHint: "Governance owner",
      projectId: "project-1",
      projectName: "Launch scene",
      relatedEventIds: ["incident:1"],
      relatedSources: ["incident", "audit"],
      severity: "critical",
      source: "audit",
      statusLabel: "danger",
      title: "Launch governance exception",
    },
  ],
  generatedAt,
  summary: {
    correlatedCount: 1,
    criticalCount: 1,
    earliestAt: generatedAt,
    healthyCount: 0,
    infoCount: 0,
    latestAt: generatedAt,
    sourceCounts: {
      audit: 1,
      incident: 0,
      postmortem: 0,
      "release-drill": 0,
      "resource-guardrail": 0,
      slo: 0,
    },
    timelineScore: 48,
    totalCount: 1,
    warningCount: 0,
  },
};

const workspacePolicySimulation: WorkspacePolicySimulationReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "policy.csv",
  generatedAt,
  rows: [
    {
      approvalRequired: true,
      blockers: ["Release gates cannot be bypassed."],
      domain: "release",
      evidence: "2 release blockers.",
      id: "release-policy",
      impact: "Blocks public promotion.",
      label: "Release policy change",
      nextAction: "Keep release approval gates enforced.",
      ownerHint: "Launch owner",
      riskScore: 0,
      severity: "critical",
      status: "blocked",
      warnings: [],
    },
  ],
  summary: {
    approvalRequiredCount: 1,
    blockedCount: 1,
    blockerCount: 1,
    nextAction: "Block enforcement until release gates pass.",
    readyCount: 0,
    simulationScore: 36,
    totalCount: 1,
    warningCount: 0,
    watchCount: 0,
    worstStatus: "blocked",
  },
};

const costQuotaForecast: CostQuotaForecastReport = {
  generatedAt,
  scenarios: [],
  summary: {
    blockedScenarioCount: 1,
    forecastScore: 54,
    maxProjectedUsagePercent: 106,
    nextAction: "Reduce quota pressure before the next release campaign.",
    safeScenarioCount: 0,
    totalScenarioCount: 3,
    watchScenarioCount: 1,
    worstStatus: "blocked",
  },
};

const workspaceRiskDigest: WorkspaceRiskDigestReport = {
  actionItems: [
    {
      detail: "Desktop signing and public health blockers remain open.",
      evidenceCount: 3,
      id: "risk:blockers",
      label: "Resolve launch blockers",
      priority: "high",
      source: "trust",
    },
  ],
  audit: {
    dangerCount: 1,
    newestAt: generatedAt,
    rows: [],
    totalCount: 2,
    warningCount: 1,
  },
  generatedAt,
  incidents: {
    criticalCount: 1,
    incidents: [],
    totalCount: 2,
    warningCount: 1,
  },
  packetId: "risk-digest-workspace-20260516",
  publicHealth: {
    failedCount: 1,
    snapshotDiffCount: 1,
    snapshots: [],
    totalCount: 4,
    warningCount: 1,
  },
  riskLevel: "critical",
  runbook: {
    blockedCount: 1,
    nextDueAt: generatedAt,
    records: [],
    totalCount: 2,
  },
  schemaVersion: 1,
  score: 44,
  trust: {
    projectRows: [],
    projectWithBlockerCount: 1,
    trustScore: 72,
  },
  workspace: {
    id: "workspace-1",
    name: "Launch Workspace",
    role: "owner",
  },
};

const incidentHistory: ProjectIncidentHistory = {
  generatedAt,
  incidents: [
    {
      actionLabel: "Run deploy smoke",
      count: 1,
      details: ["Public embed returned 500."],
      id: "incident-1",
      kind: "post-deploy-failure",
      message: "Public embed failed after deployment.",
      occurredAt: generatedAt,
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "critical",
      source: "post-deploy-smoke",
      title: "Post-deploy smoke failed",
    },
  ],
  summary: {
    blockedReviewCount: 1,
    criticalCount: 1,
    failedExportCount: 0,
    impactedProjectCount: 1,
    postDeployFailureCount: 1,
    totalCount: 1,
    warningCount: 0,
  },
};

const releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary = {
  auditEventCount: 5,
  cadJobCount: 3,
  certificateRecordCount: 2,
  complianceReportCount: 2,
  fileCount: 8,
  highPriorityActionCount: 1,
  projectCount: 2,
  publicSurfaceSnapshotCount: 4,
  releaseBlockerCount: 3,
  riskLevel: "critical",
  riskScore: 44,
  runbookRecordCount: 2,
  totalByteSize: 54000,
};

const operationalAnomalyDetection: OperationalAnomalyDetectionReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "anomalies.csv",
  generatedAt,
  rows: [
    {
      affectedCount: 3,
      confidence: 91,
      detail: "Email and webhook delivery are failing together.",
      evidence: "Brevo delivery failed and webhook retry was exhausted.",
      id: "correlation:email-webhook",
      label: "Email and webhook failure correlation",
      nextAction: "Repair Brevo sender and webhook secret.",
      observedAt: generatedAt,
      severity: "critical",
      signals: ["email", "webhook"],
      source: "correlation",
    },
  ],
  summary: {
    anomalyScore: 31,
    correlatedCount: 1,
    criticalCount: 1,
    infoCount: 0,
    sourceCoverage: ["email-delivery", "webhook-delivery", "correlation"],
    status: "blocked",
    topSource: "correlation",
    totalCount: 1,
    warningCount: 0,
  },
};

const releaseReadinessWebhooks: ReleaseReadinessWebhookReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "webhooks.csv",
  generatedAt,
  rows: [],
  summary: {
    blockedCount: 1,
    missingProviderCount: 1,
    providerCoverage: {
      brevo: 1,
      "desktop-updater": 0,
      turso: 0,
      vercel: 0,
    },
    readinessScore: 38,
    readyCount: 0,
    status: "blocked",
    totalCount: 1,
    watchCount: 0,
  },
};

const workspaceEvidenceGraph: WorkspaceEvidenceGraphReport = {
  generatedAt,
  links: [],
  nodes: [],
  summary: {
    artifactNodeCount: 2,
    auditNodeCount: 2,
    connectedNodeCount: 3,
    coverageScore: 58,
    criticalNodeCount: 1,
    incidentNodeCount: 1,
    linkCount: 2,
    nodeCount: 5,
    orphanRiskCount: 1,
    policyNodeCount: 1,
    releasePacketNodeCount: 1,
    sourceRecordNodeCount: 1,
    warningNodeCount: 2,
  },
};

const blockedReport = createExecutiveReleaseIntelligenceReport({
  costQuotaForecast,
  deployPromotionDecisionBoard,
  generatedAt,
  governanceTimelineReport,
  incidentHistory,
  operationalAnomalyDetection,
  releaseEvidenceBundleSummary,
  releaseReadinessWebhooks,
  workspaceEvidenceGraph,
  workspaceId: "workspace-1",
  workspacePolicySimulation,
  workspaceRiskDigest,
});

assert.equal(blockedReport.summary.status, "blocked");
assert.equal(blockedReport.summary.signalCount, 7);
assert.ok(blockedReport.summary.executiveScore < 60);
assert.ok(blockedReport.summary.blockedCount >= 5);
assert.deepEqual(
  new Set(blockedReport.summary.domainCoverage),
  new Set(["automation", "cost", "evidence", "governance", "incident", "launch", "risk"]),
);
assert.equal(blockedReport.criticalPath[0]?.status, "blocked");
assert.match(blockedReport.executiveMemo, /Do not promote/);
assert.match(blockedReport.csvContent, /domain,status,label,score,value,evidence,next_action/);
assert.match(blockedReport.csvDataUri, /^data:text\/csv/);
assert.match(blockedReport.jsonDataUri, /^data:application\/json/);

const readyReport = createExecutiveReleaseIntelligenceReport({
  costQuotaForecast: {
    ...costQuotaForecast,
    summary: {
      ...costQuotaForecast.summary,
      blockedScenarioCount: 0,
      forecastScore: 96,
      maxProjectedUsagePercent: 63,
      safeScenarioCount: 3,
      watchScenarioCount: 0,
      worstStatus: "safe",
    },
  },
  deployPromotionDecisionBoard: {
    ...deployPromotionDecisionBoard,
    blockerCount: 0,
    decision: "ready",
    decisionLabel: "Ready to promote",
    promotionScore: 96,
    warningCount: 0,
  },
  generatedAt,
  governanceTimelineReport: {
    ...governanceTimelineReport,
    events: [],
    summary: {
      ...governanceTimelineReport.summary,
      correlatedCount: 0,
      criticalCount: 0,
      healthyCount: 3,
      timelineScore: 97,
      totalCount: 3,
      warningCount: 0,
    },
  },
  incidentHistory: {
    ...incidentHistory,
    incidents: [],
    summary: {
      blockedReviewCount: 0,
      criticalCount: 0,
      failedExportCount: 0,
      impactedProjectCount: 0,
      postDeployFailureCount: 0,
      totalCount: 0,
      warningCount: 0,
    },
  },
  operationalAnomalyDetection: {
    ...operationalAnomalyDetection,
    rows: [],
    summary: {
      anomalyScore: 100,
      correlatedCount: 0,
      criticalCount: 0,
      infoCount: 0,
      sourceCoverage: [],
      status: "ready",
      topSource: null,
      totalCount: 0,
      warningCount: 0,
    },
  },
  releaseEvidenceBundleSummary: {
    ...releaseEvidenceBundleSummary,
    highPriorityActionCount: 0,
    releaseBlockerCount: 0,
    riskLevel: "healthy",
    riskScore: 96,
  },
  releaseReadinessWebhooks: {
    ...releaseReadinessWebhooks,
    summary: {
      ...releaseReadinessWebhooks.summary,
      blockedCount: 0,
      missingProviderCount: 0,
      readinessScore: 100,
      readyCount: 4,
      status: "ready",
      totalCount: 4,
    },
  },
  workspaceEvidenceGraph: {
    ...workspaceEvidenceGraph,
    summary: {
      ...workspaceEvidenceGraph.summary,
      coverageScore: 96,
      criticalNodeCount: 0,
      orphanRiskCount: 0,
      warningNodeCount: 0,
    },
  },
  workspacePolicySimulation: {
    ...workspacePolicySimulation,
    rows: [],
    summary: {
      approvalRequiredCount: 0,
      blockedCount: 0,
      blockerCount: 0,
      nextAction: "Safe to enforce.",
      readyCount: 5,
      simulationScore: 100,
      totalCount: 5,
      warningCount: 0,
      watchCount: 0,
      worstStatus: "ready",
    },
  },
  workspaceRiskDigest: {
    ...workspaceRiskDigest,
    actionItems: [],
    riskLevel: "healthy",
    score: 96,
  },
  workspaceId: "workspace-1",
});

assert.equal(readyReport.summary.status, "ready");
assert.ok(readyReport.summary.executiveScore >= 90);
assert.equal(readyReport.summary.blockedCount, 0);
assert.match(readyReport.executiveMemo, /Ready to promote/);

console.log("executive release intelligence smoke passed");

import type { CostQuotaForecastReport, CostQuotaForecastStatus } from "@/features/projects/cost-quota-forecast-simulator";
import type { DeployPromotionDecision, DeployPromotionDecisionBoard } from "@/features/projects/deploy-promotion-decision-board";
import type { GovernanceTimelineReport } from "@/features/projects/governance-timeline";
import type { OperationalAnomalyDetectionReport } from "@/features/projects/operational-anomaly-detection";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { ReleaseReadinessWebhookReport } from "@/features/projects/release-readiness-webhooks";
import type { WorkspaceEvidenceGraphReport } from "@/features/projects/workspace-evidence-graph";
import type { WorkspacePolicySimulationReport } from "@/features/projects/workspace-policy-simulator";
import type { WorkspaceRiskDigestReport, WorkspaceRiskDigestLevel } from "@/features/projects/workspace-risk-digest";

export type ExecutiveReleaseIntelligenceDomain = "automation" | "cost" | "evidence" | "governance" | "incident" | "launch" | "risk";
export type ExecutiveReleaseIntelligenceSeverity = "critical" | "info" | "warning";
export type ExecutiveReleaseIntelligenceStatus = "blocked" | "ready" | "watch";

export interface ExecutiveReleaseIntelligenceSignal {
  detail: string;
  domain: ExecutiveReleaseIntelligenceDomain;
  evidence: string;
  evidenceCount: number;
  id: string;
  label: string;
  nextAction: string;
  ownerHint: string;
  score: number;
  severity: ExecutiveReleaseIntelligenceSeverity;
  status: ExecutiveReleaseIntelligenceStatus;
  updatedAt: string | null;
  value: string;
}

export interface ExecutiveReleaseIntelligenceReport {
  criticalPath: ExecutiveReleaseIntelligenceSignal[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  signals: ExecutiveReleaseIntelligenceSignal[];
  summary: {
    blockedCount: number;
    costScore: number;
    domainCoverage: ExecutiveReleaseIntelligenceDomain[];
    evidenceScore: number;
    executiveScore: number;
    governanceScore: number;
    incidentScore: number;
    launchScore: number;
    lowestDomain: ExecutiveReleaseIntelligenceDomain;
    readyCount: number;
    riskScore: number;
    signalCount: number;
    status: ExecutiveReleaseIntelligenceStatus;
    topAction: string;
    watchCount: number;
  };
}

export interface CreateExecutiveReleaseIntelligenceReportInput {
  costQuotaForecast: CostQuotaForecastReport | null;
  deployPromotionDecisionBoard: DeployPromotionDecisionBoard;
  generatedAt?: string;
  governanceTimelineReport: GovernanceTimelineReport;
  incidentHistory: ProjectIncidentHistory;
  operationalAnomalyDetection: OperationalAnomalyDetectionReport | null;
  releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary;
  releaseReadinessWebhooks: ReleaseReadinessWebhookReport | null;
  workspaceEvidenceGraph: WorkspaceEvidenceGraphReport | null;
  workspaceId?: string;
  workspacePolicySimulation: WorkspacePolicySimulationReport | null;
  workspaceRiskDigest: WorkspaceRiskDigestReport;
}

const statusRank: Record<ExecutiveReleaseIntelligenceStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<ExecutiveReleaseIntelligenceStatus, number> = {
  blocked: 0,
  ready: 100,
  watch: 68,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "workspace"
  );
}

function severityForStatus(status: ExecutiveReleaseIntelligenceStatus): ExecutiveReleaseIntelligenceSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" ? "warning" : "info";
}

function statusFromScore(score: number): ExecutiveReleaseIntelligenceStatus {
  if (score < 60) {
    return "blocked";
  }

  return score < 86 ? "watch" : "ready";
}

function worstStatus(statuses: ExecutiveReleaseIntelligenceStatus[]) {
  return statuses.reduce<ExecutiveReleaseIntelligenceStatus>((worst, status) => (statusRank[status] < statusRank[worst] ? status : worst), "ready");
}

function costStatus(status: CostQuotaForecastStatus): ExecutiveReleaseIntelligenceStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "watch" ? "watch" : "ready";
}

function decisionStatus(decision: DeployPromotionDecision): ExecutiveReleaseIntelligenceStatus {
  return decision;
}

function riskStatus(level: WorkspaceRiskDigestLevel, score: number): ExecutiveReleaseIntelligenceStatus {
  if (level === "critical" || score < 60) {
    return "blocked";
  }

  return level === "watch" || score < 86 ? "watch" : "ready";
}

function createSignal(input: Omit<ExecutiveReleaseIntelligenceSignal, "score" | "severity" | "status"> & { score: number; status?: ExecutiveReleaseIntelligenceStatus }): ExecutiveReleaseIntelligenceSignal {
  const score = clampScore(input.score);
  const status = input.status ?? statusFromScore(score);

  return {
    ...input,
    evidenceCount: Math.max(0, input.evidenceCount),
    score,
    severity: severityForStatus(status),
    status,
  };
}

function createLaunchSignal(report: DeployPromotionDecisionBoard): ExecutiveReleaseIntelligenceSignal {
  const status = decisionStatus(report.decision);

  return createSignal({
    detail: report.nextAction.detail,
    domain: "launch",
    evidence: `${countLabel(report.blockerCount, "blocker")}, ${countLabel(report.warningCount, "watch signal")}, ${report.runbookCompletionPercent}% runbook completion.`,
    evidenceCount: report.blockerCount + report.warningCount + report.summary.postDeployHistoryCount,
    id: "launch:promotion-decision",
    label: "Launch promotion readiness",
    nextAction: report.nextAction.actionLabel,
    ownerHint: "Release owner",
    score: report.promotionScore,
    status,
    updatedAt: report.generatedAt,
    value: report.decisionLabel,
  });
}

function createGovernanceSignal(input: {
  governanceTimelineReport: GovernanceTimelineReport;
  workspacePolicySimulation: WorkspacePolicySimulationReport | null;
}): ExecutiveReleaseIntelligenceSignal {
  const timeline = input.governanceTimelineReport.summary;
  const policyScore = input.workspacePolicySimulation?.summary.simulationScore ?? 82;
  const score = average([timeline.timelineScore, policyScore]);
  const status = worstStatus([
    timeline.criticalCount > 0 ? "blocked" : timeline.warningCount > 0 ? "watch" : "ready",
    input.workspacePolicySimulation
      ? input.workspacePolicySimulation.summary.worstStatus === "blocked"
        ? "blocked"
        : input.workspacePolicySimulation.summary.worstStatus === "watch"
          ? "watch"
          : "ready"
      : "watch",
    statusFromScore(score),
  ]);

  return createSignal({
    detail:
      input.workspacePolicySimulation?.summary.nextAction ??
      `${countLabel(timeline.criticalCount, "critical governance event")} and ${countLabel(timeline.warningCount, "warning event")} are visible on the governance timeline.`,
    domain: "governance",
    evidence: `${timeline.timelineScore}/100 timeline, ${policyScore}/100 policy simulation, ${countLabel(timeline.correlatedCount, "correlated event")}.`,
    evidenceCount: timeline.totalCount + (input.workspacePolicySimulation?.summary.totalCount ?? 0),
    id: "governance:timeline-policy",
    label: "Governance and policy control",
    nextAction: status === "ready" ? "Keep policy simulation and governance timeline evidence attached." : "Clear governance timeline and policy simulation blockers before approval.",
    ownerHint: "Governance owner",
    score,
    status,
    updatedAt: input.governanceTimelineReport.summary.latestAt ?? input.governanceTimelineReport.generatedAt,
    value: `${timeline.timelineScore}/100 timeline`,
  });
}

function createAutomationSignal(input: {
  operationalAnomalyDetection: OperationalAnomalyDetectionReport | null;
  releaseReadinessWebhooks: ReleaseReadinessWebhookReport | null;
}): ExecutiveReleaseIntelligenceSignal {
  const anomalyScore = input.operationalAnomalyDetection?.summary.anomalyScore ?? 78;
  const webhookScore = input.releaseReadinessWebhooks?.summary.readinessScore ?? 70;
  const score = average([anomalyScore, webhookScore]);
  const status = worstStatus([
    input.operationalAnomalyDetection?.summary.status ?? "watch",
    input.releaseReadinessWebhooks?.summary.status ?? "watch",
    statusFromScore(score),
  ]);

  return createSignal({
    detail:
      status === "ready"
        ? "Release automation, webhooks, and correlated operational signals are ready."
        : "Release automation has webhook, anomaly, or provider coverage work before executive approval.",
    domain: "automation",
    evidence: `${anomalyScore}/100 anomaly score, ${webhookScore}/100 webhook readiness, ${countLabel(input.releaseReadinessWebhooks?.summary.missingProviderCount ?? 0, "missing provider")}.`,
    evidenceCount: (input.operationalAnomalyDetection?.summary.totalCount ?? 0) + (input.releaseReadinessWebhooks?.summary.totalCount ?? 0),
    id: "automation:webhook-anomaly",
    label: "Automation integrity",
    nextAction: status === "ready" ? "Keep webhook evidence fresh through the next release window." : "Repair webhook provider coverage and correlated operational anomalies.",
    ownerHint: "Automation owner",
    score,
    status,
    updatedAt: input.operationalAnomalyDetection?.generatedAt ?? input.releaseReadinessWebhooks?.generatedAt ?? null,
    value: `${score}/100 automation`,
  });
}

function createCostSignal(report: CostQuotaForecastReport | null): ExecutiveReleaseIntelligenceSignal {
  const score = report?.summary.forecastScore ?? 70;
  const status = report ? costStatus(report.summary.worstStatus) : "watch";

  return createSignal({
    detail: report?.summary.nextAction ?? "Cost and quota forecast has not been calculated for this dashboard load.",
    domain: "cost",
    evidence: report
      ? `${countLabel(report.summary.blockedScenarioCount, "blocked scenario")}, ${countLabel(report.summary.watchScenarioCount, "watched scenario")}, ${report.summary.maxProjectedUsagePercent}% max projected usage.`
      : "No quota forecast report is available.",
    evidenceCount: report?.summary.totalScenarioCount ?? 1,
    id: "cost:quota-forecast",
    label: "Cost and quota forecast",
    nextAction: report?.summary.nextAction ?? "Refresh quota forecast before a large release campaign.",
    ownerHint: "Operations owner",
    score,
    status,
    updatedAt: report?.generatedAt ?? null,
    value: report ? `${report.summary.maxProjectedUsagePercent}% max projection` : "No forecast",
  });
}

function createRiskSignal(report: WorkspaceRiskDigestReport): ExecutiveReleaseIntelligenceSignal {
  const status = riskStatus(report.riskLevel, report.score);

  return createSignal({
    detail: report.actionItems[0]?.detail ?? "Workspace risk digest has no open action items.",
    domain: "risk",
    evidence: `${countLabel(report.actionItems.length, "action item")}, ${countLabel(report.audit.dangerCount, "danger audit event")}, ${countLabel(report.publicHealth.failedCount, "failed public surface")}.`,
    evidenceCount: report.actionItems.length + report.audit.totalCount + report.incidents.totalCount,
    id: "risk:digest",
    label: "Workspace risk posture",
    nextAction: status === "ready" ? "Keep risk digest packet attached to release evidence." : "Resolve high-priority risk digest action items before executive approval.",
    ownerHint: "Risk owner",
    score: report.score,
    status,
    updatedAt: report.generatedAt,
    value: `${report.score}/100 ${report.riskLevel}`,
  });
}

function createIncidentSignal(report: ProjectIncidentHistory): ExecutiveReleaseIntelligenceSignal {
  const score = clampScore(100 - report.summary.criticalCount * 22 - report.summary.warningCount * 9 - report.summary.impactedProjectCount * 3);
  const status = report.summary.criticalCount > 0 ? "blocked" : report.summary.warningCount > 0 ? "watch" : statusFromScore(score);

  return createSignal({
    detail: report.incidents[0]?.message ?? "No active release incidents are currently visible.",
    domain: "incident",
    evidence: `${countLabel(report.summary.criticalCount, "critical incident")}, ${countLabel(report.summary.warningCount, "warning incident")}, ${countLabel(report.summary.impactedProjectCount, "impacted project")}.`,
    evidenceCount: report.summary.totalCount,
    id: "incident:history",
    label: "Incident pressure",
    nextAction: status === "ready" ? "Keep incident history attached to the release packet." : "Close or postmortem critical incidents before approval.",
    ownerHint: "Incident owner",
    score,
    status,
    updatedAt: report.incidents[0]?.occurredAt ?? report.generatedAt,
    value: `${report.summary.totalCount} incidents`,
  });
}

function createEvidenceSignal(input: {
  releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary;
  workspaceEvidenceGraph: WorkspaceEvidenceGraphReport | null;
}): ExecutiveReleaseIntelligenceSignal {
  const graphScore = input.workspaceEvidenceGraph?.summary.coverageScore ?? 72;
  const bundleScore = input.releaseEvidenceBundleSummary.riskScore;
  const blockerPenalty = input.releaseEvidenceBundleSummary.releaseBlockerCount * 5;
  const graphPenalty =
    (input.workspaceEvidenceGraph?.summary.orphanRiskCount ?? 0) * 4 +
    (input.workspaceEvidenceGraph?.summary.criticalNodeCount ?? 0) * 4 +
    (input.workspaceEvidenceGraph?.summary.warningNodeCount ?? 0) * 2;
  const score = clampScore(average([bundleScore, graphScore]) - blockerPenalty - graphPenalty);
  const status = worstStatus([
    input.releaseEvidenceBundleSummary.releaseBlockerCount > 0 || input.releaseEvidenceBundleSummary.riskLevel === "critical" ? "blocked" : input.releaseEvidenceBundleSummary.riskLevel === "watch" ? "watch" : "ready",
    (input.workspaceEvidenceGraph?.summary.orphanRiskCount ?? 0) > 0 || (input.workspaceEvidenceGraph?.summary.criticalNodeCount ?? 0) > 0 ? "watch" : "ready",
    statusFromScore(score),
  ]);

  return createSignal({
    detail:
      status === "ready"
        ? "Release packet and evidence graph coverage are ready for reviewer handoff."
        : "Evidence packet or evidence graph coverage needs blocker cleanup before executive sign-off.",
    domain: "evidence",
    evidence: `${input.releaseEvidenceBundleSummary.fileCount} bundle files, ${countLabel(input.releaseEvidenceBundleSummary.releaseBlockerCount, "release blocker")}, ${
      input.workspaceEvidenceGraph?.summary.coverageScore ?? 0
    }/100 graph coverage.`,
    evidenceCount: input.releaseEvidenceBundleSummary.fileCount + (input.workspaceEvidenceGraph?.summary.linkCount ?? 0),
    id: "evidence:bundle-graph",
    label: "Evidence coverage",
    nextAction: status === "ready" ? "Archive executive packet evidence after promotion." : "Close evidence bundle blockers and connect orphan risk records.",
    ownerHint: "Evidence owner",
    score,
    status,
    updatedAt: input.workspaceEvidenceGraph?.generatedAt ?? null,
    value: `${input.releaseEvidenceBundleSummary.fileCount} files`,
  });
}

function signalSort(first: ExecutiveReleaseIntelligenceSignal, second: ExecutiveReleaseIntelligenceSignal) {
  return statusRank[first.status] - statusRank[second.status] || first.score - second.score || second.evidenceCount - first.evidenceCount || first.label.localeCompare(second.label);
}

function createCsv(signals: ExecutiveReleaseIntelligenceSignal[]) {
  const header = ["domain", "status", "label", "score", "value", "evidence", "next_action"];
  const rows = signals.map((signal) =>
    [signal.domain, signal.status, signal.label, signal.score, signal.value, signal.evidence, signal.nextAction].map((value) => escapeCsvValue(value)).join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

function createSummary(signals: ExecutiveReleaseIntelligenceSignal[]): ExecutiveReleaseIntelligenceReport["summary"] {
  const sorted = [...signals].sort(signalSort);
  const executiveScore = average(signals.map((signal) => signal.score));
  const status = worstStatus([...signals.map((signal) => signal.status), statusFromScore(executiveScore)]);
  const scoreByDomain = Object.fromEntries(signals.map((signal) => [signal.domain, signal.score])) as Record<ExecutiveReleaseIntelligenceDomain, number>;
  const lowestDomain = sorted[0]?.domain ?? "launch";

  return {
    blockedCount: signals.filter((signal) => signal.status === "blocked").length,
    costScore: scoreByDomain.cost ?? 0,
    domainCoverage: signals.map((signal) => signal.domain),
    evidenceScore: scoreByDomain.evidence ?? 0,
    executiveScore,
    governanceScore: scoreByDomain.governance ?? 0,
    incidentScore: scoreByDomain.incident ?? 0,
    launchScore: scoreByDomain.launch ?? 0,
    lowestDomain,
    readyCount: signals.filter((signal) => signal.status === "ready").length,
    riskScore: scoreByDomain.risk ?? 0,
    signalCount: signals.length,
    status,
    topAction: sorted[0]?.nextAction ?? "Keep executive report evidence current.",
    watchCount: signals.filter((signal) => signal.status === "watch").length,
  };
}

function createExecutiveMemo(summary: ExecutiveReleaseIntelligenceReport["summary"]) {
  if (summary.status === "blocked") {
    return `Do not promote. ${countLabel(summary.blockedCount, "executive blocker")} remain and the lowest domain is ${summary.lowestDomain}. ${summary.topAction}`;
  }

  if (summary.status === "watch") {
    return `Promote only with owner review. ${countLabel(summary.watchCount, "watch signal")} remain and ${summary.lowestDomain} is the weakest domain. ${summary.topAction}`;
  }

  return `Ready to promote. All executive release domains are above the approval threshold; archive the evidence packet after promotion.`;
}

function createJsonContent(report: Omit<ExecutiveReleaseIntelligenceReport, "csvContent" | "csvDataUri" | "jsonContent" | "jsonDataUri">) {
  return JSON.stringify(
    {
      criticalPath: report.criticalPath,
      executiveMemo: report.executiveMemo,
      generatedAt: report.generatedAt,
      schemaVersion: 1,
      signals: report.signals,
      summary: report.summary,
    },
    null,
    2,
  );
}

export function createExecutiveReleaseIntelligenceReport(input: CreateExecutiveReleaseIntelligenceReportInput): ExecutiveReleaseIntelligenceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const signals = [
    createLaunchSignal(input.deployPromotionDecisionBoard),
    createGovernanceSignal({
      governanceTimelineReport: input.governanceTimelineReport,
      workspacePolicySimulation: input.workspacePolicySimulation,
    }),
    createAutomationSignal({
      operationalAnomalyDetection: input.operationalAnomalyDetection,
      releaseReadinessWebhooks: input.releaseReadinessWebhooks,
    }),
    createCostSignal(input.costQuotaForecast),
    createRiskSignal(input.workspaceRiskDigest),
    createIncidentSignal(input.incidentHistory),
    createEvidenceSignal({
      releaseEvidenceBundleSummary: input.releaseEvidenceBundleSummary,
      workspaceEvidenceGraph: input.workspaceEvidenceGraph,
    }),
  ].sort(signalSort);
  const summary = createSummary(signals);
  const executiveMemo = createExecutiveMemo(summary);
  const csvContent = createCsv(signals);
  const filePrefix = `${slug(input.workspaceId ?? input.workspaceRiskDigest.workspace.id)}-executive-release-intelligence`;
  const baseReport = {
    criticalPath: signals.filter((signal) => signal.status !== "ready").slice(0, 5),
    csvFileName: `${filePrefix}.csv`,
    executiveMemo,
    generatedAt,
    jsonFileName: `${filePrefix}.json`,
    signals,
    summary,
  };
  const jsonContent = createJsonContent(baseReport);

  return {
    ...baseReport,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
  };
}

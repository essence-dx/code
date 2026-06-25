import type { BoardAssuranceExceptionWorkflowReport } from "@/features/projects/board-assurance-exceptions";
import type { BoardEvidenceAcceptanceCampaignReport } from "@/features/projects/board-evidence-acceptance-campaign";
import type { BoardReleaseVarianceDashboard, BoardReleaseVarianceMetricId } from "@/features/projects/board-release-variance-dashboard";

export type BoardApprovalScenarioForecastId = "blocker-drift" | "exception-expiry" | "incident-recurrence" | "runbook-completion";
export type BoardApprovalScenarioForecastStatus = "blocked" | "ready" | "watch";
export type BoardApprovalScenarioForecastDriver = BoardReleaseVarianceMetricId | "acceptance" | "exception-workflow";

export interface BoardApprovalScenarioForecastRow {
  detail: string;
  driver: BoardApprovalScenarioForecastDriver;
  evidence: string;
  id: BoardApprovalScenarioForecastId;
  label: string;
  nextAction: string;
  projectedImpactScore: number;
  riskProbabilityPercent: number;
  status: BoardApprovalScenarioForecastStatus;
}

export interface BoardApprovalScenarioForecastReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  forecastId: string;
  generatedAt: string;
  rows: BoardApprovalScenarioForecastRow[];
  summary: {
    blockedCount: number;
    forecastScore: number;
    highestRiskPercent: number;
    readyCount: number;
    rowCount: number;
    status: BoardApprovalScenarioForecastStatus;
    watchCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardApprovalScenarioForecastInput {
  acceptanceCampaign?: BoardEvidenceAcceptanceCampaignReport | null;
  exceptionWorkflow?: BoardAssuranceExceptionWorkflowReport | null;
  generatedAt?: string;
  varianceDashboard: BoardReleaseVarianceDashboard;
  workspaceId?: string;
}

const statusRank: Record<BoardApprovalScenarioForecastStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const forecastPriority: Record<BoardApprovalScenarioForecastId, number> = {
  "exception-expiry": 0,
  "runbook-completion": 1,
  "blocker-drift": 2,
  "incident-recurrence": 3,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusFromRisk(riskProbabilityPercent: number): BoardApprovalScenarioForecastStatus {
  if (riskProbabilityPercent >= 70) {
    return "blocked";
  }

  return riskProbabilityPercent >= 35 ? "watch" : "ready";
}

function findVarianceMetric(report: BoardReleaseVarianceDashboard, id: BoardReleaseVarianceMetricId) {
  return report.rows.find((row) => row.id === id) ?? null;
}

function exceptionExpiryForecast(input: CreateBoardApprovalScenarioForecastInput): BoardApprovalScenarioForecastRow {
  const summary = input.exceptionWorkflow?.summary;
  const expiringCount = summary?.expiringSoonCount ?? 0;
  const expiredCount = summary?.expiredCount ?? 0;
  const blockedCount = summary?.releaseGateBlockedCount ?? 0;
  const riskProbabilityPercent = clamp(expiredCount * 100 + expiringCount * 70 + blockedCount * 20);
  const projectedImpactScore = clamp(100 - expiredCount * 65 - expiringCount * 50 - blockedCount * 20);

  return {
    detail:
      expiringCount > 0 || expiredCount > 0
      ? `${expiredCount} expired and ${expiringCount} expiring board exception${expiringCount === 1 ? "" : "s"} can invalidate approval evidence.`
        : "No expiring board assurance exceptions are currently forecast.",
    driver: "exception-workflow",
    evidence: summary
      ? `${summary.approvedCount} approved, ${summary.expiringSoonCount} expiring, ${summary.expiredCount} expired, ${summary.releaseGateBlockedCount} release-gate blocked.`
      : "No exception workflow is attached.",
    id: "exception-expiry",
    label: "Exception expiry",
    nextAction:
      riskProbabilityPercent >= 70
        ? "Renew or close expiring board exceptions before the review window."
        : riskProbabilityPercent >= 35
          ? "Confirm exception expiry dates before board closeout."
          : "Keep exception expiry evidence in the board packet.",
    projectedImpactScore,
    riskProbabilityPercent,
    status: statusFromRisk(riskProbabilityPercent),
  };
}

function runbookCompletionForecast(input: CreateBoardApprovalScenarioForecastInput): BoardApprovalScenarioForecastRow {
  const metric = findVarianceMetric(input.varianceDashboard, "runbook-follow-through");
  const completionPercent = metric?.currentValue ?? 100;
  const blockedPenalty = metric?.status === "blocked" ? 30 : metric?.status === "watch" ? 10 : 0;
  const missingPercent = clamp(100 - completionPercent);
  const riskProbabilityPercent = clamp(missingPercent + blockedPenalty);
  const projectedImpactScore = clamp(completionPercent - blockedPenalty - Math.max(0, -(metric?.delta ?? 0)) * 0.125);

  return {
    detail: metric?.detail ?? "Runbook completion evidence has not been calculated.",
    driver: "runbook-follow-through",
    evidence: metric ? `${metric.currentValue}% current completion with ${metric.delta}% delta.` : "No runbook variance row is attached.",
    id: "runbook-completion",
    label: "Runbook completion",
    nextAction:
      riskProbabilityPercent >= 70
        ? "Complete or exception open runbook rows before board approval can close."
        : riskProbabilityPercent >= 35
          ? "Confirm runbook owners and due dates before board review."
          : "Archive completed runbook proof with the approval packet.",
    projectedImpactScore,
    riskProbabilityPercent,
    status: statusFromRisk(riskProbabilityPercent),
  };
}

function blockerDriftForecast(input: CreateBoardApprovalScenarioForecastInput): BoardApprovalScenarioForecastRow {
  const metric = findVarianceMetric(input.varianceDashboard, "blocker-drift");
  const blockedAcceptanceCount = input.acceptanceCampaign?.summary.blockedCount ?? 0;
  const pendingAcceptanceCount = input.acceptanceCampaign?.summary.pendingCount ?? 0;
  const drift = metric?.delta ?? 0;
  const riskProbabilityPercent = clamp(Math.max(0, drift) * 35 + blockedAcceptanceCount * 15);
  const projectedImpactScore = clamp(100 - Math.max(0, drift) * 30 - blockedAcceptanceCount * 15);

  return {
    detail: metric?.detail ?? "Blocker drift evidence has not been calculated.",
    driver: "blocker-drift",
    evidence: `${drift} blocker drift, ${blockedAcceptanceCount} blocked acceptance scope${blockedAcceptanceCount === 1 ? "" : "s"}, ${pendingAcceptanceCount} pending.`,
    id: "blocker-drift",
    label: "Blocker drift",
    nextAction:
      riskProbabilityPercent >= 70
        ? "Stop approval closeout until blocker drift and blocked attestations are resolved."
        : riskProbabilityPercent >= 35
          ? "Review blocker drift with owners before board closeout."
          : "Keep blocker drift evidence in the assurance archive.",
    projectedImpactScore,
    riskProbabilityPercent,
    status: statusFromRisk(riskProbabilityPercent),
  };
}

function incidentRecurrenceForecast(input: CreateBoardApprovalScenarioForecastInput): BoardApprovalScenarioForecastRow {
  const metric = findVarianceMetric(input.varianceDashboard, "incident-recurrence");
  const recurrenceCount = metric?.currentValue ?? 0;
  const riskProbabilityPercent = clamp(recurrenceCount * 25 + (metric?.status === "blocked" ? 10 : 0));
  const projectedImpactScore = clamp(100 - recurrenceCount * 15);

  return {
    detail: metric?.detail ?? "Incident recurrence evidence has not been calculated.",
    driver: "incident-recurrence",
    evidence: `${recurrenceCount} recurring incident signal${recurrenceCount === 1 ? "" : "s"} in the board variance dashboard.`,
    id: "incident-recurrence",
    label: "Incident recurrence",
    nextAction:
      riskProbabilityPercent >= 70
        ? "Attach incident remediation proof before board approval closeout."
        : riskProbabilityPercent >= 35
          ? "Review recurring incident mitigations with board owners."
          : "Continue monitoring incident recurrence through release closure.",
    projectedImpactScore,
    riskProbabilityPercent,
    status: statusFromRisk(riskProbabilityPercent),
  };
}

function sortRows(rows: BoardApprovalScenarioForecastRow[]) {
  return [...rows].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      second.riskProbabilityPercent - first.riskProbabilityPercent ||
      forecastPriority[first.id] - forecastPriority[second.id],
  );
}

function createSummary(rows: BoardApprovalScenarioForecastRow[]): BoardApprovalScenarioForecastReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: BoardApprovalScenarioForecastStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows[0] ?? null;

  return {
    blockedCount,
    forecastScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.projectedImpactScore, 0) / rows.length) : 100,
    highestRiskPercent: Math.max(...rows.map((row) => row.riskProbabilityPercent), 0),
    nextAction:
      status === "ready"
        ? "Archive board approval scenario forecast with the review packet."
        : (nextRow?.nextAction ?? "Review board approval forecast before closeout."),
    readyCount,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createCsv(rows: BoardApprovalScenarioForecastRow[]) {
  const header = ["forecast", "status", "risk_probability_percent", "projected_impact_score", "driver", "next_action"];
  const body = rows.map((row) => [row.id, row.status, row.riskProbabilityPercent, row.projectedImpactScore, row.driver, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardApprovalScenarioForecast(input: CreateBoardApprovalScenarioForecastInput): BoardApprovalScenarioForecastReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.varianceDashboard.workspaceId;
  const rows = sortRows([
    exceptionExpiryForecast(input),
    runbookCompletionForecast(input),
    blockerDriftForecast(input),
    incidentRecurrenceForecast(input),
  ]);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-approval-scenario-forecast-${dateStamp(generatedAt)}.csv`,
    forecastId: `board-approval-scenario-forecast-${slug(workspaceId)}-${dateStamp(generatedAt)}`,
    generatedAt,
    rows,
    summary: createSummary(rows),
    workspaceId,
  };
}

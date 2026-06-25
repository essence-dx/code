import type { CostQuotaForecastReport, CostQuotaForecastScenario, CostQuotaForecastScenarioId, CostQuotaForecastStatus } from "@/features/projects/cost-quota-forecast-simulator";
import type { ExecutiveActionOwnershipMatrix, ExecutiveActionOwnershipRow, ExecutiveActionOwnershipStatus } from "@/features/projects/executive-action-ownership";
import type {
  ExecutiveReleaseIntelligenceDomain,
  ExecutiveReleaseIntelligenceReport,
  ExecutiveReleaseIntelligenceSignal,
  ExecutiveReleaseIntelligenceStatus,
} from "@/features/projects/executive-release-intelligence";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ReleaseDrillScenario, ReleaseDrillSimulationReport, ReleaseDrillSimulationRow, ReleaseDrillStatus } from "@/features/projects/release-drill-simulation";

export type ReleaseScenarioComparisonId = "desktop-campaign" | "incident-rollback" | "maintenance-release" | "public-launch";
export type ReleaseScenarioComparisonStatus = "blocked" | "ready" | "watch";
export type ReleaseScenarioComparisonEvidenceKind = "cost" | "drill" | "executive" | "incident" | "ownership";

export interface ReleaseScenarioComparisonEvidence {
  detail: string;
  kind: ReleaseScenarioComparisonEvidenceKind;
  label: string;
  score: number;
  status: ReleaseScenarioComparisonStatus;
}

export interface ReleaseScenarioComparisonOwnerAction {
  action: string;
  dueAt: string;
  dueWindowLabel: string;
  evidenceHref: string | null;
  ownerEmail: string | null;
  ownerName: string;
  status: ExecutiveActionOwnershipStatus;
}

export interface ReleaseScenarioComparisonRow {
  blockerCount: number;
  costScore: number;
  description: string;
  evidence: ReleaseScenarioComparisonEvidence[];
  id: ReleaseScenarioComparisonId;
  label: string;
  nextAction: string;
  ownerActions: ReleaseScenarioComparisonOwnerAction[];
  ownerLoadScore: number;
  readinessScore: number;
  riskScore: number;
  rollbackScore: number;
  status: ReleaseScenarioComparisonStatus;
  warningCount: number;
}

export interface ReleaseScenarioComparisonReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  recommendedScenario: ReleaseScenarioComparisonRow;
  rows: ReleaseScenarioComparisonRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    recommendedScenarioId: ReleaseScenarioComparisonId;
    scenarioScore: number;
    status: ReleaseScenarioComparisonStatus;
    totalCount: number;
    watchCount: number;
  };
}

export interface CreateReleaseScenarioComparisonReportInput {
  costQuotaForecast: CostQuotaForecastReport | null;
  executiveActionOwnership: ExecutiveActionOwnershipMatrix | null;
  executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport;
  generatedAt?: string;
  incidentHistory: ProjectIncidentHistory;
  releaseDrillSimulation: ReleaseDrillSimulationReport;
  workspaceId?: string;
}

interface ScenarioDefinition {
  costScenarioId: CostQuotaForecastScenarioId | null;
  description: string;
  drillIds: ReleaseDrillScenario[];
  executiveDomains: ExecutiveReleaseIntelligenceDomain[];
  id: ReleaseScenarioComparisonId;
  label: string;
  ownerDomains: ExecutiveReleaseIntelligenceDomain[];
}

const scenarioDefinitions: ScenarioDefinition[] = [
  {
    costScenarioId: "public-launch",
    description: "Highest-visibility path for public viewers, embeds, API helper traffic, and executive launch approval.",
    drillIds: ["deploy-smoke-failure", "rollback"],
    executiveDomains: ["launch", "cost", "incident", "risk", "evidence"],
    id: "public-launch",
    label: "Public launch",
    ownerDomains: ["launch", "cost", "incident", "risk"],
  },
  {
    costScenarioId: "maintenance-release",
    description: "Lower-blast-radius patch window for routine fixes, evidence refreshes, and guarded public-surface checks.",
    drillIds: ["rollback"],
    executiveDomains: ["automation", "cost", "evidence", "governance"],
    id: "maintenance-release",
    label: "Maintenance release",
    ownerDomains: ["automation", "cost", "governance"],
  },
  {
    costScenarioId: "desktop-campaign",
    description: "Package-heavy release path for desktop channels, signed artifacts, updater metadata, and CAD-backed assets.",
    drillIds: ["certificate-expiry", "cad-worker-outage"],
    executiveDomains: ["cost", "evidence", "launch"],
    id: "desktop-campaign",
    label: "Desktop campaign",
    ownerDomains: ["cost", "evidence", "launch"],
  },
  {
    costScenarioId: null,
    description: "Emergency recovery path for active incidents, rollback rehearsal, and post-deploy smoke recovery.",
    drillIds: ["rollback", "deploy-smoke-failure"],
    executiveDomains: ["incident", "launch", "risk"],
    id: "incident-rollback",
    label: "Incident rollback",
    ownerDomains: ["incident", "launch", "risk"],
  },
];

const scenarioSortOrder: Record<ReleaseScenarioComparisonId, number> = {
  "maintenance-release": 0,
  "desktop-campaign": 1,
  "incident-rollback": 2,
  "public-launch": 3,
};

const statusRank: Record<ReleaseScenarioComparisonStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const costStatusScore: Record<CostQuotaForecastStatus, number> = {
  blocked: 20,
  safe: 100,
  watch: 70,
};

const drillStatusScore: Record<ReleaseDrillStatus, number> = {
  blocked: 25,
  missing: 35,
  ready: 100,
  watch: 70,
};

const executiveStatusScore: Record<ExecutiveReleaseIntelligenceStatus, number> = {
  blocked: 35,
  ready: 100,
  watch: 72,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[], fallback = 100) {
  return values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : fallback;
}

function escapeCsvValue(value: string | number) {
  const text = String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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
      .slice(0, 64) || "workspace"
  );
}

function toComparisonStatus(status: CostQuotaForecastStatus | ExecutiveReleaseIntelligenceStatus | ReleaseDrillStatus): ReleaseScenarioComparisonStatus {
  if (status === "blocked" || status === "missing") {
    return "blocked";
  }

  if (status === "safe") {
    return "ready";
  }

  return status;
}

function statusFromScore(score: number): ReleaseScenarioComparisonStatus {
  if (score < 60) {
    return "blocked";
  }

  return score < 88 ? "watch" : "ready";
}

function evidenceStatus(evidence: ReleaseScenarioComparisonEvidence[]) {
  return evidence.reduce<ReleaseScenarioComparisonStatus>((worst, item) => (statusRank[item.status] < statusRank[worst] ? item.status : worst), "ready");
}

function findCostScenario(report: CostQuotaForecastReport | null, id: CostQuotaForecastScenarioId | null) {
  if (!report || !id) {
    return null;
  }

  return report.scenarios.find((scenario) => scenario.id === id) ?? null;
}

function costScore(scenario: CostQuotaForecastScenario | null, id: ReleaseScenarioComparisonId) {
  if (!scenario) {
    return id === "incident-rollback" ? 82 : 68;
  }

  return clampScore(costStatusScore[scenario.status] - Math.max(0, scenario.worstProjectedUsagePercent - 95) - Math.max(0, scenario.totalDeltaPercent - 24));
}

function drillScore(rows: ReleaseDrillSimulationRow[]) {
  return average(rows.map((row) => drillStatusScore[row.status]), 72);
}

function relevantSignals(signals: ExecutiveReleaseIntelligenceSignal[], domains: ExecutiveReleaseIntelligenceDomain[]) {
  const domainSet = new Set(domains);

  return signals.filter((signal) => domainSet.has(signal.domain));
}

function signalScore(signals: ExecutiveReleaseIntelligenceSignal[]) {
  return average(
    signals.map((signal) => Math.min(signal.score, executiveStatusScore[signal.status])),
    76,
  );
}

function incidentScore(incidentHistory: ProjectIncidentHistory, scenarioId: ReleaseScenarioComparisonId) {
  const baseScore = 100 - incidentHistory.summary.criticalCount * 24 - incidentHistory.summary.warningCount * 10 - incidentHistory.summary.impactedProjectCount * 4;
  const scenarioPenalty = scenarioId === "public-launch" ? 10 : scenarioId === "incident-rollback" ? 18 : scenarioId === "desktop-campaign" ? 4 : 0;

  return clampScore(baseScore - scenarioPenalty);
}

function ownerRows(matrix: ExecutiveActionOwnershipMatrix | null, domains: ExecutiveReleaseIntelligenceDomain[]) {
  if (!matrix) {
    return [];
  }

  const domainSet = new Set(domains);

  return matrix.rows.filter((row) => domainSet.has(row.domain));
}

function ownerScore(rows: ExecutiveActionOwnershipRow[], fallback: number) {
  if (rows.length === 0) {
    return fallback;
  }

  const unassignedPenalty = rows.filter((row) => !row.ownerEmail).length * 12;
  const blockedPenalty = rows.filter((row) => row.status === "blocked" || row.status === "overdue").length * 8;

  return clampScore(average(rows.map((row) => row.riskScore), fallback) - unassignedPenalty - blockedPenalty);
}

function createOwnerActions(rows: ExecutiveActionOwnershipRow[]): ReleaseScenarioComparisonOwnerAction[] {
  return rows.slice(0, 4).map((row) => ({
    action: row.action,
    dueAt: row.dueAt,
    dueWindowLabel: row.dueWindowLabel,
    evidenceHref: row.evidenceLinks[0]?.href ?? null,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    status: row.status,
  }));
}

function costEvidence(scenario: CostQuotaForecastScenario | null, score: number): ReleaseScenarioComparisonEvidence {
  return {
    detail: scenario?.evidence ?? "No free-tier forecast scenario is available for this path.",
    kind: "cost",
    label: scenario?.label ?? "No quota forecast",
    score,
    status: scenario ? toComparisonStatus(scenario.status) : "watch",
  };
}

function drillEvidence(rows: ReleaseDrillSimulationRow[], score: number): ReleaseScenarioComparisonEvidence {
  const worst = rows.reduce<ReleaseDrillStatus>((current, row) => (drillStatusScore[row.status] < drillStatusScore[current] ? row.status : current), "ready");

  return {
    detail: rows.length > 0 ? rows.map((row) => `${row.label}: ${row.evidence}`).join(" | ") : "No drill evidence is available for this scenario.",
    kind: "drill",
    label: rows.length > 0 ? `${rows.length} release drill${rows.length === 1 ? "" : "s"}` : "Missing drill evidence",
    score,
    status: rows.length > 0 ? toComparisonStatus(worst) : "watch",
  };
}

function executiveEvidence(signals: ExecutiveReleaseIntelligenceSignal[], score: number): ReleaseScenarioComparisonEvidence {
  const worst = signals.reduce<ExecutiveReleaseIntelligenceStatus>((current, signal) => (executiveStatusScore[signal.status] < executiveStatusScore[current] ? signal.status : current), "ready");

  return {
    detail: signals.length > 0 ? signals.map((signal) => `${signal.label}: ${signal.value}`).join(" | ") : "No executive intelligence signal is mapped to this path.",
    kind: "executive",
    label: signals.length > 0 ? `${signals.length} executive signal${signals.length === 1 ? "" : "s"}` : "No executive signals",
    score,
    status: signals.length > 0 ? toComparisonStatus(worst) : "watch",
  };
}

function incidentEvidence(history: ProjectIncidentHistory, score: number, scenarioId: ReleaseScenarioComparisonId): ReleaseScenarioComparisonEvidence {
  const status: ReleaseScenarioComparisonStatus =
    history.summary.criticalCount > 0 && (scenarioId === "public-launch" || scenarioId === "incident-rollback") ? "blocked" : history.summary.totalCount > 0 ? "watch" : "ready";

  return {
    detail: `${history.summary.criticalCount} critical, ${history.summary.warningCount} warning, ${history.summary.impactedProjectCount} impacted project${history.summary.impactedProjectCount === 1 ? "" : "s"}.`,
    kind: "incident",
    label: "Incident pressure",
    score,
    status,
  };
}

function ownershipEvidence(rows: ExecutiveActionOwnershipRow[], score: number): ReleaseScenarioComparisonEvidence {
  const blockedCount = rows.filter((row) => row.status === "blocked" || row.status === "overdue").length;
  const unassignedCount = rows.filter((row) => !row.ownerEmail).length;
  const status: ReleaseScenarioComparisonStatus = blockedCount > 0 ? "blocked" : unassignedCount > 0 || score < 88 ? "watch" : "ready";

  return {
    detail: `${rows.length} owner action${rows.length === 1 ? "" : "s"}, ${unassignedCount} unassigned, ${blockedCount} blocked or overdue.`,
    kind: "ownership",
    label: "Owner load",
    score,
    status,
  };
}

function hasHardBlocker(input: {
  costScenario: CostQuotaForecastScenario | null;
  definition: ScenarioDefinition;
  drillRows: ReleaseDrillSimulationRow[];
  evidence: ReleaseScenarioComparisonEvidence[];
  executiveSignals: ExecutiveReleaseIntelligenceSignal[];
}) {
  if (input.definition.id === "maintenance-release") {
    return false;
  }

  if (input.costScenario?.status === "blocked" && input.definition.id !== "incident-rollback") {
    return true;
  }

  if (input.definition.id === "public-launch" && input.executiveSignals.some((signal) => signal.domain === "launch" && signal.status === "blocked")) {
    return true;
  }

  if (input.definition.id === "desktop-campaign" && input.drillRows.some((row) => (row.id === "certificate-expiry" || row.id === "cad-worker-outage") && (row.status === "blocked" || row.status === "missing"))) {
    return true;
  }

  if (input.definition.id === "incident-rollback" && input.drillRows.some((row) => row.id === "rollback" && (row.status === "blocked" || row.status === "missing"))) {
    return true;
  }

  return input.evidence.filter((item) => item.status === "blocked").length >= 3;
}

function createNextAction(input: {
  definition: ScenarioDefinition;
  status: ReleaseScenarioComparisonStatus;
  costScenario: CostQuotaForecastScenario | null;
  drillRows: ReleaseDrillSimulationRow[];
  ownerActions: ReleaseScenarioComparisonOwnerAction[];
}) {
  if (input.status === "ready") {
    return `${input.definition.label} is the strongest path. Keep evidence fresh and collect approval sign-off.`;
  }

  const ownerAction = input.ownerActions.find((action) => action.status === "blocked" || action.status === "overdue" || !action.ownerEmail);

  if (ownerAction) {
    return `${input.definition.label}: ${ownerAction.action}`;
  }

  const drillAction = input.drillRows.find((row) => row.status === "blocked" || row.status === "missing" || row.status === "watch")?.nextAction;

  if (drillAction) {
    return `${input.definition.label}: ${drillAction}`;
  }

  if (input.costScenario && input.costScenario.status !== "safe") {
    return `${input.definition.label}: ${input.costScenario.nextAction}`;
  }

  return `${input.definition.label}: Review remaining watched evidence before approval.`;
}

function createRow(input: CreateReleaseScenarioComparisonReportInput, definition: ScenarioDefinition): ReleaseScenarioComparisonRow {
  const costScenario = findCostScenario(input.costQuotaForecast, definition.costScenarioId);
  const scenarioCostScore = costScore(costScenario, definition.id);
  const drillRows = input.releaseDrillSimulation.rows.filter((row) => definition.drillIds.includes(row.id));
  const scenarioRollbackScore = drillScore(drillRows);
  const executiveSignals = relevantSignals(input.executiveReleaseIntelligence.signals, definition.executiveDomains);
  const executiveScore = signalScore(executiveSignals);
  const scenarioIncidentScore = incidentScore(input.incidentHistory, definition.id);
  const scenarioRiskScore = clampScore(average([executiveScore, scenarioIncidentScore], 76) - (definition.id === "incident-rollback" ? 8 : 0));
  const rows = ownerRows(input.executiveActionOwnership, definition.ownerDomains);
  const scenarioOwnerScore = ownerScore(rows, definition.id === "incident-rollback" ? 72 : 92);
  const ownerActions = createOwnerActions(rows);
  const readinessScore = clampScore(scenarioCostScore * 0.25 + scenarioOwnerScore * 0.2 + scenarioRiskScore * 0.35 + scenarioRollbackScore * 0.2 - (definition.id === "desktop-campaign" ? 5 : 0));
  const evidence = [
    costEvidence(costScenario, scenarioCostScore),
    drillEvidence(drillRows, scenarioRollbackScore),
    executiveEvidence(executiveSignals, executiveScore),
    incidentEvidence(input.incidentHistory, scenarioIncidentScore, definition.id),
    ownershipEvidence(rows, scenarioOwnerScore),
  ];
  const baseStatus = statusFromScore(readinessScore);
  const worstEvidenceStatus = definition.id === "maintenance-release" && evidenceStatus(evidence) === "blocked" ? "watch" : evidenceStatus(evidence);
  const status = hasHardBlocker({ costScenario, definition, drillRows, evidence, executiveSignals }) ? "blocked" : statusRank[worstEvidenceStatus] < statusRank[baseStatus] ? worstEvidenceStatus : baseStatus;

  return {
    blockerCount: evidence.filter((item) => item.status === "blocked").length,
    costScore: scenarioCostScore,
    description: definition.description,
    evidence,
    id: definition.id,
    label: definition.label,
    nextAction: createNextAction({
      costScenario,
      definition,
      drillRows,
      ownerActions,
      status,
    }),
    ownerActions,
    ownerLoadScore: scenarioOwnerScore,
    readinessScore,
    riskScore: scenarioRiskScore,
    rollbackScore: scenarioRollbackScore,
    status,
    warningCount: evidence.filter((item) => item.status === "watch").length,
  };
}

function sortRows(first: ReleaseScenarioComparisonRow, second: ReleaseScenarioComparisonRow) {
  return statusRank[second.status] - statusRank[first.status] || second.readinessScore - first.readinessScore || scenarioSortOrder[first.id] - scenarioSortOrder[second.id];
}

function createCsv(rows: ReleaseScenarioComparisonRow[]) {
  const header = ["scenario", "status", "readiness_score", "owner_load_score", "cost_score", "risk_score", "rollback_score", "next_action"];
  const csvRows = rows.map((row) =>
    [row.label, row.status, row.readinessScore, row.ownerLoadScore, row.costScore, row.riskScore, row.rollbackScore, row.nextAction].map((value) => escapeCsvValue(value)).join(","),
  );

  return [header.join(","), ...csvRows].join("\n");
}

function getRecommendedScenario(rows: ReleaseScenarioComparisonRow[]) {
  const recommendedScenario = rows[0];

  if (!recommendedScenario) {
    throw new Error("Release scenario comparison requires at least one scenario definition.");
  }

  return recommendedScenario;
}

function summarize(rows: ReleaseScenarioComparisonRow[]): ReleaseScenarioComparisonReport["summary"] {
  const recommendedScenario = getRecommendedScenario(rows);
  const status = rows.reduce<ReleaseScenarioComparisonStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "ready");

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    nextAction: `${recommendedScenario.label} is the current recommended path. ${recommendedScenario.nextAction}`,
    readyCount: rows.filter((row) => row.status === "ready").length,
    recommendedScenarioId: recommendedScenario.id,
    scenarioScore: average(rows.map((row) => row.readinessScore), 0),
    status,
    totalCount: rows.length,
    watchCount: rows.filter((row) => row.status === "watch").length,
  };
}

export function createReleaseScenarioComparisonReport(input: CreateReleaseScenarioComparisonReportInput): ReleaseScenarioComparisonReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = scenarioDefinitions.map((definition) => createRow({ ...input, generatedAt }, definition)).sort(sortRows);
  const summary = summarize(rows);
  const recommendedScenario = getRecommendedScenario(rows);
  const csvContent = createCsv(rows);
  const filePrefix = `${slug(input.workspaceId ?? "workspace")}-release-scenario-comparison`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${filePrefix}.csv`,
    generatedAt,
    recommendedScenario,
    rows,
    summary,
  };
}

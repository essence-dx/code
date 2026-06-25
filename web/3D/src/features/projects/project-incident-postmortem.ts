import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ProjectIncident, ProjectIncidentHistory, ProjectIncidentKind, ProjectIncidentSeverity } from "@/features/projects/project-incident-history";
import type { ReleaseDrillHistoryReport, ReleaseDrillHistoryScenarioRecord } from "@/features/projects/release-drill-history";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

export type ProjectIncidentPostmortemStatus = "blocked" | "ready" | "watch";

export interface ProjectIncidentPostmortemSmokeSignal {
  issues: string[];
  label: string;
  url: string;
}

export interface ProjectIncidentPostmortemDrillSignal {
  dueAt: string;
  label: string;
  lastRunAt: string;
  nextAction: string;
  outcome: ReleaseDrillHistoryScenarioRecord["outcome"];
}

export interface ProjectIncidentPostmortemRemediation {
  completedAt: string;
  evidence: string[];
  ownerName: string;
  title: string;
}

export interface ProjectIncidentPostmortemTemplate {
  completedRemediations: ProjectIncidentPostmortemRemediation[];
  failedSmokeChecks: ProjectIncidentPostmortemSmokeSignal[];
  followUpActions: string[];
  generatedAt: string;
  id: string;
  incident: {
    details: string[];
    id: string;
    kind: ProjectIncidentKind;
    message: string;
    occurredAt: string | null;
    projectId: string;
    projectName: string;
    severity: ProjectIncidentSeverity;
    source: ProjectIncident["source"];
    title: string;
  };
  ownerHint: string;
  readinessScore: number;
  relatedReleaseDrills: ProjectIncidentPostmortemDrillSignal[];
  status: ProjectIncidentPostmortemStatus;
  timelinePrompts: string[];
}

export interface ProjectIncidentPostmortemReport {
  generatedAt: string;
  summary: {
    blockedCount: number;
    completedRemediationCount: number;
    criticalTemplateCount: number;
    failedSmokeCheckCount: number;
    linkedDrillCount: number;
    readyCount: number;
    templateCount: number;
    watchCount: number;
  };
  templates: ProjectIncidentPostmortemTemplate[];
}

export interface CreateProjectIncidentPostmortemReportInput {
  generatedAt?: string;
  incidentHistory: ProjectIncidentHistory;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  releaseDrillHistory: ReleaseDrillHistoryReport | null;
  releaseRunbookReport: WorkspaceReleaseRunbookReport;
}

const drillIdsByIncidentKind: Record<ProjectIncidentKind, ReleaseDrillHistoryScenarioRecord["id"][]> = {
  "blocked-review-gate": ["rollback"],
  "failed-export": ["cad-worker-outage", "rollback"],
  "post-deploy-failure": ["deploy-smoke-failure", "rollback"],
};

function dateOnly(value: string | null) {
  if (!value) {
    return "No timestamp";
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

function failedSmokeChecksForIncident(incident: ProjectIncident, summary: PostDeploySyntheticDashboardSummary | null): ProjectIncidentPostmortemSmokeSignal[] {
  if (!summary || summary.status !== "fail" || summary.projectId !== incident.projectId) {
    return [];
  }

  return summary.issueRows.map((row) => ({
    issues: row.issues.length > 0 ? row.issues : [`${row.label} returned ${row.httpStatus ?? "no response"}.`],
    label: row.label,
    url: row.url,
  }));
}

function latestRelatedDrills(incident: ProjectIncident, history: ReleaseDrillHistoryReport | null): ProjectIncidentPostmortemDrillSignal[] {
  const latestRecord = history?.records[0];

  if (!latestRecord) {
    return [];
  }

  const expectedIds = new Set(drillIdsByIncidentKind[incident.kind]);

  return latestRecord.drillRows
    .filter((row) => expectedIds.has(row.id))
    .map((row) => ({
      dueAt: row.dueAt,
      label: row.label,
      lastRunAt: row.lastRunAt,
      nextAction: row.nextAction,
      outcome: row.outcome,
    }));
}

function completedRemediationsForIncident(incident: ProjectIncident, report: WorkspaceReleaseRunbookReport): ProjectIncidentPostmortemRemediation[] {
  const records = report.records.filter((record) => record.status === "complete" && (record.projectId === incident.projectId || record.projectId === null));

  return records.slice(0, 3).map((record) => ({
    completedAt: record.completedAt ?? record.dueAt,
    evidence: record.checklistEvidence,
    ownerName: record.ownerName,
    title: record.title,
  }));
}

function ownerHintForIncident(incident: ProjectIncident) {
  if (incident.kind === "post-deploy-failure") {
    return "Web release owner";
  }

  if (incident.kind === "failed-export") {
    return "Export owner";
  }

  return "Review owner";
}

function createTimelinePrompts(incident: ProjectIncident, smokeChecks: ProjectIncidentPostmortemSmokeSignal[], drills: ProjectIncidentPostmortemDrillSignal[]) {
  return [
    `Incident detected: ${dateOnly(incident.occurredAt)} from ${incident.source}.`,
    smokeChecks.length > 0 ? `Failed smoke checks: ${smokeChecks.map((check) => check.label).join(", ")}.` : "No failed smoke check row was linked to this incident.",
    drills.length > 0 ? `Latest related drill: ${drills[0]!.label} ended ${drills[0]!.outcome}.` : "No saved release drill has been linked yet.",
  ];
}

function createFollowUpActions(incident: ProjectIncident, smokeChecks: ProjectIncidentPostmortemSmokeSignal[], drills: ProjectIncidentPostmortemDrillSignal[], remediations: ProjectIncidentPostmortemRemediation[]) {
  const actions = [
    incident.actionLabel,
    ...smokeChecks.flatMap((check) => check.issues.map((issue) => `Verify ${check.label}: ${issue}`)),
    ...drills.filter((drill) => drill.outcome !== "ready").map((drill) => drill.nextAction),
  ];

  if (remediations.length === 0) {
    actions.push("Attach at least one completed runbook remediation before closing the postmortem.");
  }

  return Array.from(new Set(actions)).slice(0, 6);
}

function readinessScore(input: {
  drills: ProjectIncidentPostmortemDrillSignal[];
  incident: ProjectIncident;
  remediations: ProjectIncidentPostmortemRemediation[];
  smokeChecks: ProjectIncidentPostmortemSmokeSignal[];
}) {
  const detailScore = input.incident.details.length > 0 ? 20 : 0;
  const smokeScore = input.incident.kind === "post-deploy-failure" ? (input.smokeChecks.length > 0 ? 25 : 0) : 15;
  const drillScore = input.drills.length > 0 ? 25 : 0;
  const remediationScore = input.remediations.length > 0 ? 30 : 0;

  return Math.min(100, detailScore + smokeScore + drillScore + remediationScore);
}

function statusForScore(score: number, incident: ProjectIncident, remediations: ProjectIncidentPostmortemRemediation[]): ProjectIncidentPostmortemStatus {
  if (incident.severity === "critical" && remediations.length === 0) {
    return "blocked";
  }

  if (score >= 80) {
    return "ready";
  }

  return score >= 45 ? "watch" : "blocked";
}

function createTemplate(input: {
  generatedAt: string;
  incident: ProjectIncident;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  releaseDrillHistory: ReleaseDrillHistoryReport | null;
  releaseRunbookReport: WorkspaceReleaseRunbookReport;
}): ProjectIncidentPostmortemTemplate {
  const failedSmokeChecks = failedSmokeChecksForIncident(input.incident, input.postDeploySummary);
  const relatedReleaseDrills = latestRelatedDrills(input.incident, input.releaseDrillHistory);
  const completedRemediations = completedRemediationsForIncident(input.incident, input.releaseRunbookReport);
  const score = readinessScore({
    drills: relatedReleaseDrills,
    incident: input.incident,
    remediations: completedRemediations,
    smokeChecks: failedSmokeChecks,
  });

  return {
    completedRemediations,
    failedSmokeChecks,
    followUpActions: createFollowUpActions(input.incident, failedSmokeChecks, relatedReleaseDrills, completedRemediations),
    generatedAt: input.generatedAt,
    id: `postmortem:${input.incident.id}`,
    incident: {
      details: input.incident.details,
      id: input.incident.id,
      kind: input.incident.kind,
      message: input.incident.message,
      occurredAt: input.incident.occurredAt,
      projectId: input.incident.projectId,
      projectName: input.incident.projectName,
      severity: input.incident.severity,
      source: input.incident.source,
      title: input.incident.title,
    },
    ownerHint: ownerHintForIncident(input.incident),
    readinessScore: score,
    relatedReleaseDrills,
    status: statusForScore(score, input.incident, completedRemediations),
    timelinePrompts: createTimelinePrompts(input.incident, failedSmokeChecks, relatedReleaseDrills),
  };
}

function summarizeTemplates(templates: ProjectIncidentPostmortemTemplate[]): ProjectIncidentPostmortemReport["summary"] {
  return {
    blockedCount: templates.filter((template) => template.status === "blocked").length,
    completedRemediationCount: templates.reduce((sum, template) => sum + template.completedRemediations.length, 0),
    criticalTemplateCount: templates.filter((template) => template.incident.severity === "critical").length,
    failedSmokeCheckCount: templates.reduce((sum, template) => sum + template.failedSmokeChecks.length, 0),
    linkedDrillCount: templates.reduce((sum, template) => sum + template.relatedReleaseDrills.length, 0),
    readyCount: templates.filter((template) => template.status === "ready").length,
    templateCount: templates.length,
    watchCount: templates.filter((template) => template.status === "watch").length,
  };
}

export function createProjectIncidentPostmortemReport(input: CreateProjectIncidentPostmortemReportInput): ProjectIncidentPostmortemReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const templates = input.incidentHistory.incidents.slice(0, 12).map((incident) =>
    createTemplate({
      generatedAt,
      incident,
      postDeploySummary: input.postDeploySummary,
      releaseDrillHistory: input.releaseDrillHistory,
      releaseRunbookReport: input.releaseRunbookReport,
    }),
  );

  return {
    generatedAt,
    summary: summarizeTemplates(templates),
    templates,
  };
}

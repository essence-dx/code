import type { ProjectAuditSearchRow } from "@/features/projects/project-audit-search";
import type { ProjectIncident, ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ProjectPublicSurfaceHealthSnapshot, ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import type { WorkspaceSecurityComplianceProjectRow, WorkspaceSecurityComplianceReport } from "@/features/projects/workspace-security-compliance";
import type { WorkspaceReleaseRunbookRecord, WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceRole } from "@/features/workspaces/types";

export type WorkspaceRiskDigestFormat = "audit-csv" | "csv" | "json";
export type WorkspaceRiskDigestLevel = "critical" | "healthy" | "watch";
export type WorkspaceRiskDigestPriority = "high" | "low" | "medium";

export interface WorkspaceRiskDigestActionItem {
  detail: string;
  evidenceCount: number;
  id: string;
  label: string;
  priority: WorkspaceRiskDigestPriority;
  source: "audit" | "incidents" | "public-health" | "runbook" | "trust";
}

export interface WorkspaceRiskDigestReport {
  actionItems: WorkspaceRiskDigestActionItem[];
  audit: {
    dangerCount: number;
    newestAt: string | null;
    rows: ProjectAuditSearchRow[];
    totalCount: number;
    warningCount: number;
  };
  generatedAt: string;
  incidents: {
    criticalCount: number;
    incidents: ProjectIncident[];
    totalCount: number;
    warningCount: number;
  };
  packetId: string;
  publicHealth: {
    failedCount: number;
    snapshotDiffCount: number;
    snapshots: ProjectPublicSurfaceHealthSnapshot[];
    totalCount: number;
    warningCount: number;
  };
  riskLevel: WorkspaceRiskDigestLevel;
  runbook: {
    blockedCount: number;
    nextDueAt: string | null;
    records: WorkspaceReleaseRunbookRecord[];
    totalCount: number;
  };
  schemaVersion: 1;
  score: number;
  trust: {
    projectRows: WorkspaceSecurityComplianceProjectRow[];
    projectWithBlockerCount: number;
    trustScore: number;
  };
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

export interface CreateWorkspaceRiskDigestInput {
  auditRows: ProjectAuditSearchRow[];
  generatedAt?: string;
  incidents: ProjectIncidentHistory;
  publicHealth: ProjectPublicSurfaceHealthReport;
  runbook: WorkspaceReleaseRunbookReport;
  trust: WorkspaceSecurityComplianceReport;
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioPenalty(part: number, total: number, weight: number) {
  return total > 0 ? (part / total) * weight : 0;
}

function createPacketId(workspaceId: string, generatedAt: string) {
  const date = generatedAt.slice(0, 10).replaceAll("-", "");
  const slug = workspaceId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `risk-digest-${slug || "workspace"}-${date}`;
}

function scoreDigest(input: CreateWorkspaceRiskDigestInput) {
  const publicPenalty =
    ratioPenalty(input.publicHealth.summary.failCount, input.publicHealth.summary.totalCount, 20) +
    ratioPenalty(input.publicHealth.summary.warnCount, input.publicHealth.summary.totalCount, 8) +
    ratioPenalty(input.publicHealth.summary.screenshotPendingCount, input.publicHealth.summary.totalCount, 5);
  const runbookPenalty =
    ratioPenalty(input.runbook.summary.blockedCount, input.runbook.summary.totalCount, 20) +
    ratioPenalty(input.runbook.summary.inProgressCount, input.runbook.summary.totalCount, 8);
  const incidentPenalty = Math.min(20, input.incidents.summary.criticalCount * 4 + input.incidents.summary.warningCount * 2);
  const auditDangerCount = input.auditRows.filter((row) => row.status === "danger").length;
  const auditWarningCount = input.auditRows.filter((row) => row.status === "warning").length;
  const auditPenalty = Math.min(15, auditDangerCount * 2 + auditWarningCount);

  return clampScore(input.trust.summary.trustScore - publicPenalty - runbookPenalty - incidentPenalty - auditPenalty);
}

function riskLevel(score: number): WorkspaceRiskDigestLevel {
  if (score < 55) {
    return "critical";
  }

  return score < 82 ? "watch" : "healthy";
}

function addActionItem(items: WorkspaceRiskDigestActionItem[], item: WorkspaceRiskDigestActionItem | null) {
  if (item) {
    items.push(item);
  }
}

function createActionItems(input: CreateWorkspaceRiskDigestInput): WorkspaceRiskDigestActionItem[] {
  const items: WorkspaceRiskDigestActionItem[] = [];
  const failedSurfaceCount = input.publicHealth.summary.failCount;
  const runbookBlockedCount = input.runbook.summary.blockedCount;
  const criticalIncidentCount = input.incidents.summary.criticalCount;
  const auditDangerCount = input.auditRows.filter((row) => row.status === "danger").length;
  const trustBlockerCount = input.trust.summary.projectWithBlockerCount;

  addActionItem(
    items,
    trustBlockerCount > 0
      ? {
          detail: `${trustBlockerCount} project${trustBlockerCount === 1 ? "" : "s"} have compliance, signing, retention, review, or export blockers.`,
          evidenceCount: trustBlockerCount,
          id: "trust-project-blockers",
          label: "Resolve project trust blockers",
          priority: input.trust.summary.trustScore < 55 ? "high" : "medium",
          source: "trust",
        }
      : null,
  );
  addActionItem(
    items,
    failedSurfaceCount > 0
      ? {
          detail: `${failedSurfaceCount} public viewer, embed, API, or app package surface${failedSurfaceCount === 1 ? "" : "s"} failed health checks.`,
          evidenceCount: failedSurfaceCount,
          id: "public-surface-failures",
          label: "Repair public surface failures",
          priority: "high",
          source: "public-health",
        }
      : null,
  );
  addActionItem(
    items,
    runbookBlockedCount > 0
      ? {
          detail: `${runbookBlockedCount} release runbook record${runbookBlockedCount === 1 ? "" : "s"} are blocked before handoff.`,
          evidenceCount: runbookBlockedCount,
          id: "blocked-runbook-records",
          label: "Unblock release runbook records",
          priority: "high",
          source: "runbook",
        }
      : null,
  );
  addActionItem(
    items,
    criticalIncidentCount > 0
      ? {
          detail: `${criticalIncidentCount} critical incident${criticalIncidentCount === 1 ? "" : "s"} require owner review.`,
          evidenceCount: criticalIncidentCount,
          id: "critical-incidents",
          label: "Review critical incidents",
          priority: "high",
          source: "incidents",
        }
      : null,
  );
  addActionItem(
    items,
    auditDangerCount > 0
      ? {
          detail: `${auditDangerCount} blocked audit event${auditDangerCount === 1 ? "" : "s"} are included in the packet.`,
          evidenceCount: auditDangerCount,
          id: "blocked-audit-events",
          label: "Inspect blocked audit events",
          priority: "medium",
          source: "audit",
        }
      : null,
  );

  return items.sort((first, second) => {
    const rank: Record<WorkspaceRiskDigestPriority, number> = { high: 0, medium: 1, low: 2 };

    return rank[first.priority] - rank[second.priority] || second.evidenceCount - first.evidenceCount || first.label.localeCompare(second.label);
  });
}

export function createWorkspaceRiskDigest(input: CreateWorkspaceRiskDigestInput): WorkspaceRiskDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const score = scoreDigest(input);
  const auditRows = [...input.auditRows].sort((first, second) => second.occurredAt.localeCompare(first.occurredAt));
  const publicSnapshots = [...input.publicHealth.snapshots].sort((first, second) => {
    const statusRank = { fail: 0, warn: 1, pass: 2 };

    return statusRank[first.status] - statusRank[second.status] || second.checkedAt.localeCompare(first.checkedAt);
  });
  const runbookRecords = [...input.runbook.records].sort((first, second) => {
    const statusRank = { blocked: 0, "in-progress": 1, scheduled: 2, complete: 3 };

    return statusRank[first.status] - statusRank[second.status] || first.dueAt.localeCompare(second.dueAt);
  });

  return {
    actionItems: createActionItems(input),
    audit: {
      dangerCount: auditRows.filter((row) => row.status === "danger").length,
      newestAt: auditRows[0]?.occurredAt ?? null,
      rows: auditRows.slice(0, 80),
      totalCount: auditRows.length,
      warningCount: auditRows.filter((row) => row.status === "warning").length,
    },
    generatedAt,
    incidents: {
      criticalCount: input.incidents.summary.criticalCount,
      incidents: input.incidents.incidents.slice(0, 40),
      totalCount: input.incidents.summary.totalCount,
      warningCount: input.incidents.summary.warningCount,
    },
    packetId: createPacketId(input.workspace.id, generatedAt),
    publicHealth: {
      failedCount: input.publicHealth.summary.failCount,
      snapshotDiffCount: input.publicHealth.summary.screenshotDiffCount,
      snapshots: publicSnapshots.slice(0, 80),
      totalCount: input.publicHealth.summary.totalCount,
      warningCount: input.publicHealth.summary.warnCount,
    },
    riskLevel: riskLevel(score),
    runbook: {
      blockedCount: input.runbook.summary.blockedCount,
      nextDueAt: input.runbook.summary.nextDueAt,
      records: runbookRecords.slice(0, 80),
      totalCount: input.runbook.summary.totalCount,
    },
    schemaVersion: 1,
    score,
    trust: {
      projectRows: input.trust.projectRows.slice(0, 80),
      projectWithBlockerCount: input.trust.summary.projectWithBlockerCount,
      trustScore: input.trust.summary.trustScore,
    },
    workspace: input.workspace,
  };
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createWorkspaceRiskDigestCsv(report: WorkspaceRiskDigestReport) {
  const rows: string[][] = [
    ["section", "metric", "value", "detail"],
    ["workspace", "name", report.workspace.name, report.workspace.id],
    ["workspace", "riskLevel", report.riskLevel, report.packetId],
    ["workspace", "score", String(report.score), report.generatedAt],
    ["trust", "trustScore", String(report.trust.trustScore), `${report.trust.projectWithBlockerCount} projects with blockers`],
    ["publicHealth", "failed", String(report.publicHealth.failedCount), `${report.publicHealth.warningCount} warnings`],
    ["runbook", "blocked", String(report.runbook.blockedCount), report.runbook.nextDueAt ?? "no due date"],
    ["incidents", "critical", String(report.incidents.criticalCount), `${report.incidents.warningCount} warnings`],
    ["audit", "blocked", String(report.audit.dangerCount), `${report.audit.warningCount} warnings`],
    ...report.actionItems.map((item) => ["action", item.priority, item.label, item.detail]),
    ...report.incidents.incidents.slice(0, 12).map((incident) => ["incident", incident.severity, incident.projectName, incident.message]),
    ...report.audit.rows.slice(0, 12).map((row) => ["audit", row.status, row.projectName, `${row.title}: ${row.description}`]),
  ];

  return rows.map((row) => row.map((value) => escapeCsvValue(value)).join(",")).join("\n");
}

export function createWorkspaceRiskDigestAuditCsv(report: WorkspaceRiskDigestReport) {
  const rows: string[][] = [
    ["eventId", "projectId", "projectName", "status", "category", "action", "title", "description", "actorName", "actorEmail", "resourceType", "resourceId", "occurredAt"],
    ...report.audit.rows.map((row) => [
      row.eventId,
      row.projectId,
      row.projectName,
      row.status,
      row.category,
      row.action ?? "",
      row.title,
      row.description,
      row.actorName ?? "",
      row.actorEmail ?? "",
      row.resourceType ?? "",
      row.resourceId ?? "",
      row.occurredAt,
    ]),
  ];

  return rows.map((row) => row.map((value) => escapeCsvValue(value)).join(",")).join("\n");
}

export function createWorkspaceRiskDigestJson(report: WorkspaceRiskDigestReport) {
  return JSON.stringify(report, null, 2);
}

export function createWorkspaceRiskDigestExportBody(report: WorkspaceRiskDigestReport, format: WorkspaceRiskDigestFormat) {
  if (format === "json") {
    return createWorkspaceRiskDigestJson(report);
  }

  return format === "audit-csv" ? createWorkspaceRiskDigestAuditCsv(report) : createWorkspaceRiskDigestCsv(report);
}

export function createWorkspaceRiskDigestFileName(report: WorkspaceRiskDigestReport, format: WorkspaceRiskDigestFormat) {
  return format === "audit-csv" ? `${report.packetId}-audit.csv` : `${report.packetId}.${format}`;
}

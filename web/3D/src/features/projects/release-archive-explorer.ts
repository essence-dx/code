import type { FreeTierResourceMonitorReport, FreeTierResourceStatus } from "@/features/projects/free-tier-resource-monitor";
import type { ProjectIncidentPostmortemReport, ProjectIncidentPostmortemStatus } from "@/features/projects/project-incident-postmortem";
import type { ReleaseDrillHistoryReport } from "@/features/projects/release-drill-history";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { WorkspaceBackupRestoreRehearsalReport, WorkspaceBackupRestoreStatus } from "@/features/projects/workspace-backup-restore-rehearsal";

export type ReleaseArchiveExplorerId =
  | "incident-postmortems"
  | "release-drill-history"
  | "release-evidence-bundles"
  | "resource-guardrail-snapshots"
  | "restore-rehearsals";

export type ReleaseArchiveExplorerStatus = "blocked" | "ready" | "watch";

export interface ReleaseArchiveExplorerRow {
  downloadHref: string | null;
  evidence: string;
  id: ReleaseArchiveExplorerId;
  label: string;
  latestActivityAt: string | null;
  nextAction: string;
  ownerHint: string;
  recordCount: number;
  status: ReleaseArchiveExplorerStatus;
}

export interface ReleaseArchiveExplorerReport {
  generatedAt: string;
  rows: ReleaseArchiveExplorerRow[];
  summary: {
    blockedCount: number;
    downloadableCount: number;
    evidenceRecordCount: number;
    governanceScore: number;
    latestActivityAt: string | null;
    readyCount: number;
    totalCount: number;
    watchCount: number;
    worstStatus: ReleaseArchiveExplorerStatus;
  };
}

export interface CreateReleaseArchiveExplorerReportInput {
  backupRestoreRehearsal: WorkspaceBackupRestoreRehearsalReport;
  freeTierResourceMonitor: FreeTierResourceMonitorReport;
  generatedAt?: string;
  hasReleaseEvidenceBundleDownload: boolean;
  incidentPostmortemReport: ProjectIncidentPostmortemReport;
  releaseDrillHistory: ReleaseDrillHistoryReport | null;
  releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary;
  workspaceId: string;
}

const statusRank: Record<ReleaseArchiveExplorerStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<ReleaseArchiveExplorerStatus, number> = {
  blocked: 0,
  watch: 65,
  ready: 100,
};

function encodedWorkspacePath(workspaceId: string, suffix: string) {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}/${suffix}`;
}

function fromRestoreStatus(status: WorkspaceBackupRestoreStatus): ReleaseArchiveExplorerStatus {
  return status;
}

function fromResourceStatus(status: FreeTierResourceStatus): ReleaseArchiveExplorerStatus {
  return status;
}

function postmortemStatus(summary: ProjectIncidentPostmortemReport["summary"]): ProjectIncidentPostmortemStatus {
  if (summary.blockedCount > 0) {
    return "blocked";
  }

  return summary.watchCount > 0 ? "watch" : "ready";
}

function evidenceBundleRow(input: CreateReleaseArchiveExplorerReportInput, generatedAt: string): ReleaseArchiveExplorerRow {
  const summary = input.releaseEvidenceBundleSummary;
  const status: ReleaseArchiveExplorerStatus = summary.releaseBlockerCount > 0 || summary.highPriorityActionCount > 0 ? "blocked" : summary.fileCount > 0 && summary.projectCount > 0 ? "ready" : "watch";

  return {
    downloadHref: input.hasReleaseEvidenceBundleDownload ? encodedWorkspacePath(input.workspaceId, "release-evidence-bundle") : null,
    evidence: `${summary.fileCount} files, ${summary.projectCount} projects, ${summary.auditEventCount} audit events, ${summary.releaseBlockerCount} release blockers.`,
    id: "release-evidence-bundles",
    label: "Release evidence bundles",
    latestActivityAt: generatedAt,
    nextAction:
      status === "blocked"
        ? "Reduce release blockers and regenerate the release evidence bundle before external handoff."
        : status === "watch"
          ? "Create at least one project-backed evidence bundle before governance review."
          : "Download the current evidence bundle and keep the hash with release notes.",
    ownerHint: "Launch owner",
    recordCount: summary.fileCount,
    status,
  };
}

function postmortemRow(report: ProjectIncidentPostmortemReport): ReleaseArchiveExplorerRow {
  const status = postmortemStatus(report.summary);

  return {
    downloadHref: null,
    evidence: `${report.summary.templateCount} templates, ${report.summary.completedRemediationCount} remediations, ${report.summary.failedSmokeCheckCount} failed smoke checks linked.`,
    id: "incident-postmortems",
    label: "Incident postmortems",
    latestActivityAt: report.generatedAt,
    nextAction:
      status === "blocked"
        ? "Complete remediation evidence for blocked postmortems before closing the release."
        : status === "watch"
          ? "Attach missing smoke, drill, or remediation context to watched postmortems."
          : "Keep postmortem templates current when new release incidents appear.",
    ownerHint: "Incident owner",
    recordCount: report.summary.templateCount,
    status,
  };
}

function drillHistoryRow(history: ReleaseDrillHistoryReport | null, workspaceId: string, generatedAt: string): ReleaseArchiveExplorerRow {
  const summary = history?.summary;
  const status: ReleaseArchiveExplorerStatus = !summary || summary.totalRecordCount === 0 ? "watch" : summary.blockedRunCount > 0 ? "blocked" : summary.watchRunCount > 0 ? "watch" : "ready";

  return {
    downloadHref: summary && summary.totalRecordCount > 0 ? encodedWorkspacePath(workspaceId, "release-drill-history") : null,
    evidence: summary
      ? `${summary.totalRecordCount} saved runs, ${summary.totalDrillCount} scenario rows, latest hash ${summary.latestContentHash ?? "not saved"}.`
      : "No release drill history has been saved yet.",
    id: "release-drill-history",
    label: "Release drill history",
    latestActivityAt: summary?.latestSavedAt ?? generatedAt,
    nextAction:
      status === "blocked"
        ? "Rerun or remediate blocked release drill scenarios before launch."
        : status === "watch"
          ? "Save a fresh release drill run and resolve watched scenarios."
          : "Keep the latest JSON and CSV drill exports attached to release records.",
    ownerHint: "Release owner",
    recordCount: summary?.totalRecordCount ?? 0,
    status,
  };
}

function restoreRehearsalRow(report: WorkspaceBackupRestoreRehearsalReport): ReleaseArchiveExplorerRow {
  const status = fromRestoreStatus(report.summary.worstStatus);

  return {
    downloadHref: null,
    evidence: `${report.summary.readyCount}/${report.summary.totalCount} restore scopes ready, ${report.summary.blockedCount} blocked, ${report.summary.score}/100 score.`,
    id: "restore-rehearsals",
    label: "Restore rehearsals",
    latestActivityAt: report.generatedAt,
    nextAction:
      status === "blocked"
        ? "Clear blocked restore rehearsal scopes before freezing the governance packet."
        : status === "watch"
          ? "Run one clean restore rehearsal for watched backup scopes."
          : "Keep the clean workspace restore notes beside the release archive.",
    ownerHint: "Workspace owner",
    recordCount: report.summary.totalCount,
    status,
  };
}

function resourceGuardrailRow(report: FreeTierResourceMonitorReport): ReleaseArchiveExplorerRow {
  const status = fromResourceStatus(report.summary.worstStatus);

  return {
    downloadHref: null,
    evidence: `${report.summary.readyCount}/${report.summary.totalCount} resource guardrails ready, ${report.summary.weightedUsagePercent}% average load, ${report.summary.blockedCount} blocked.`,
    id: "resource-guardrail-snapshots",
    label: "Resource guardrail snapshots",
    latestActivityAt: report.generatedAt,
    nextAction:
      status === "blocked"
        ? "Resolve blocked Vercel, Turso, Brevo, storage, or worker guardrails before growing release traffic."
        : status === "watch"
          ? "Review watched free-tier guardrails before starting a larger release batch."
          : "Snapshot free-tier guardrails after each substantial release.",
    ownerHint: "Operations owner",
    recordCount: report.summary.totalCount,
    status,
  };
}

function latestTimestamp(rows: ReleaseArchiveExplorerRow[]) {
  return rows
    .map((row) => row.latestActivityAt)
    .filter((value): value is string => Boolean(value))
    .sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0] ?? null;
}

function summarizeRows(rows: ReleaseArchiveExplorerRow[]): ReleaseArchiveExplorerReport["summary"] {
  const worstStatus = rows.reduce<ReleaseArchiveExplorerStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "ready");

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    downloadableCount: rows.filter((row) => row.downloadHref).length,
    evidenceRecordCount: rows.reduce((sum, row) => sum + row.recordCount, 0),
    governanceScore: Math.round(rows.reduce((sum, row) => sum + statusScore[row.status], 0) / Math.max(rows.length, 1)),
    latestActivityAt: latestTimestamp(rows),
    readyCount: rows.filter((row) => row.status === "ready").length,
    totalCount: rows.length,
    watchCount: rows.filter((row) => row.status === "watch").length,
    worstStatus,
  };
}

export function createReleaseArchiveExplorerReport(input: CreateReleaseArchiveExplorerReportInput): ReleaseArchiveExplorerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = [
    evidenceBundleRow(input, generatedAt),
    postmortemRow(input.incidentPostmortemReport),
    drillHistoryRow(input.releaseDrillHistory, input.workspaceId, generatedAt),
    restoreRehearsalRow(input.backupRestoreRehearsal),
    resourceGuardrailRow(input.freeTierResourceMonitor),
  ];

  return {
    generatedAt,
    rows,
    summary: summarizeRows(rows),
  };
}

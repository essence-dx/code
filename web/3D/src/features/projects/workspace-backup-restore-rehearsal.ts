import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { ProjectAuditSearchResult } from "@/features/projects/project-audit-search";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

export type WorkspaceBackupRestoreScope = "assets" | "audit-logs" | "evidence-packets" | "projects" | "release-runbooks";
export type WorkspaceBackupRestoreStatus = "blocked" | "ready" | "watch";

export interface WorkspaceBackupRestoreRow {
  backupTarget: string;
  evidence: string;
  id: WorkspaceBackupRestoreScope;
  label: string;
  nextAction: string;
  ownerHint: string;
  recoveryTargetMinutes: number;
  restoreExercise: string;
  sourceCount: number;
  status: WorkspaceBackupRestoreStatus;
}

export interface WorkspaceBackupRestoreRehearsalReport {
  generatedAt: string;
  rows: WorkspaceBackupRestoreRow[];
  summary: {
    blockedCount: number;
    readyCount: number;
    score: number;
    totalCount: number;
    watchCount: number;
    worstStatus: WorkspaceBackupRestoreStatus;
  };
  workspaceName: string;
}

export interface CreateWorkspaceBackupRestoreRehearsalReportInput {
  artifactRegistryReport: ProjectArtifactRegistryReport;
  auditSearchResult: ProjectAuditSearchResult;
  generatedAt?: string;
  projectCount: number;
  releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary;
  releaseRunbookReport: WorkspaceReleaseRunbookReport;
  workspaceName: string;
}

const statusRank: Record<WorkspaceBackupRestoreStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<WorkspaceBackupRestoreStatus, number> = {
  blocked: 0,
  watch: 65,
  ready: 100,
};

function summarizeRows(rows: WorkspaceBackupRestoreRow[]): WorkspaceBackupRestoreRehearsalReport["summary"] {
  const score = Math.round(rows.reduce((total, row) => total + statusScore[row.status], 0) / Math.max(rows.length, 1));
  const worstStatus = rows.reduce<WorkspaceBackupRestoreStatus>(
    (worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst),
    "ready",
  );

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    score,
    totalCount: rows.length,
    watchCount: rows.filter((row) => row.status === "watch").length,
    worstStatus,
  };
}

function projectRow(projectCount: number): WorkspaceBackupRestoreRow {
  const status: WorkspaceBackupRestoreStatus = projectCount > 0 ? "ready" : "watch";

  return {
    backupTarget: "Workspace project snapshots and scene JSON exports",
    evidence: `${projectCount} active project${projectCount === 1 ? "" : "s"} available for snapshot rehearsal.`,
    id: "projects",
    label: "Project snapshots",
    nextAction: status === "ready" ? "Run one restore rehearsal from the latest project snapshot before the next release." : "Create or recover one active project before declaring restore coverage.",
    ownerHint: "Workspace owner",
    recoveryTargetMinutes: 30,
    restoreExercise: "Restore a project snapshot into a private workspace and compare scene metadata, folder ownership, and share settings.",
    sourceCount: projectCount,
    status,
  };
}

function assetRow(report: ProjectArtifactRegistryReport): WorkspaceBackupRestoreRow {
  const { availableCount, blockedCount, draftCount, totalCount } = report.summary;
  const status: WorkspaceBackupRestoreStatus = blockedCount > 0 ? "blocked" : availableCount > 0 ? "ready" : "watch";

  return {
    backupTarget: "Artifact registry, signed package rows, public assets, and lineage snapshots",
    evidence: `${availableCount}/${totalCount} artifacts available, ${draftCount} draft, ${blockedCount} blocked.`,
    id: "assets",
    label: "Asset registry",
    nextAction:
      status === "blocked"
        ? "Clear blocked artifact rows before using this workspace as a release restore source."
        : status === "watch"
          ? "Publish or ingest at least one registry artifact before the next restore drill."
          : "Sample one public asset and one private lineage snapshot during the restore rehearsal.",
    ownerHint: "Asset owner",
    recoveryTargetMinutes: 45,
    restoreExercise: "Rehydrate registry rows into a clean workspace and verify paths, auth requirements, and signing states stay intact.",
    sourceCount: totalCount,
    status,
  };
}

function auditRow(result: ProjectAuditSearchResult): WorkspaceBackupRestoreRow {
  const { danger, warning } = result.summary.statusCounts;
  const status: WorkspaceBackupRestoreStatus = result.summary.total === 0 ? "blocked" : danger > 0 || warning > 0 ? "watch" : "ready";

  return {
    backupTarget: "Workspace audit search export with permission, publish, export, release, comment, and version events",
    evidence: `${result.summary.total} audit rows across ${result.summary.projectCount} projects, ${danger} danger, ${warning} warning.`,
    id: "audit-logs",
    label: "Audit log export",
    nextAction:
      status === "blocked"
        ? "Capture at least one immutable project audit event before release evidence backup."
        : status === "watch"
          ? "Review danger and warning audit rows before freezing the restore packet."
          : "Export JSON and CSV audit logs and verify they can be searched after restore.",
    ownerHint: "Compliance owner",
    recoveryTargetMinutes: 20,
    restoreExercise: "Import the audit export into a review workspace and search by project, actor, status, and release source.",
    sourceCount: result.summary.total,
    status,
  };
}

function runbookRow(report: WorkspaceReleaseRunbookReport): WorkspaceBackupRestoreRow {
  const { blockedCount, completeCount, totalCount } = report.summary;
  const status: WorkspaceBackupRestoreStatus = blockedCount > 0 ? "blocked" : totalCount === 0 || completeCount < totalCount ? "watch" : "ready";

  return {
    backupTarget: "Release runbook records, owners, due dates, attachments, comments, and transition history",
    evidence: `${completeCount}/${totalCount} runbook records complete, ${blockedCount} blocked.`,
    id: "release-runbooks",
    label: "Release runbooks",
    nextAction:
      status === "blocked"
        ? "Resolve blocked runbook records before snapshotting the release packet."
        : status === "watch"
          ? "Complete or explicitly reschedule open runbook records before final restore rehearsal."
          : "Restore runbook records and confirm owner assignments, evidence, and attachments survive.",
    ownerHint: "Release owner",
    recoveryTargetMinutes: 35,
    restoreExercise: "Restore runbook records into a clean workspace and verify checklist evidence maps back to release milestones.",
    sourceCount: totalCount,
    status,
  };
}

function evidenceRow(summary: ReleaseEvidenceBundleSummary): WorkspaceBackupRestoreRow {
  const status: WorkspaceBackupRestoreStatus = summary.releaseBlockerCount > 0 ? "blocked" : summary.fileCount > 0 && summary.projectCount > 0 ? "ready" : "watch";

  return {
    backupTarget: "Release evidence bundle with risk digest, audit CSV, compliance reports, public health, runbooks, certificates, and CAD jobs",
    evidence: `${summary.fileCount} files, ${summary.projectCount} projects, ${summary.releaseBlockerCount} release blockers, ${summary.riskScore}/100 risk score.`,
    id: "evidence-packets",
    label: "Evidence packet",
    nextAction:
      status === "blocked"
        ? "Reduce release blockers before freezing the backup packet for external handoff."
        : status === "watch"
          ? "Generate a project-backed evidence packet before running the restore rehearsal."
          : "Download the evidence packet and verify file hashes after importing it into a clean workspace.",
    ownerHint: "Launch owner",
    recoveryTargetMinutes: 25,
    restoreExercise: "Download the evidence bundle, verify the manifest hash, and confirm every included file opens in the restored workspace.",
    sourceCount: summary.fileCount,
    status,
  };
}

export function createWorkspaceBackupRestoreRehearsalReport(input: CreateWorkspaceBackupRestoreRehearsalReportInput): WorkspaceBackupRestoreRehearsalReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = [
    projectRow(input.projectCount),
    assetRow(input.artifactRegistryReport),
    auditRow(input.auditSearchResult),
    runbookRow(input.releaseRunbookReport),
    evidenceRow(input.releaseEvidenceBundleSummary),
  ];

  return {
    generatedAt,
    rows,
    summary: summarizeRows(rows),
    workspaceName: input.workspaceName,
  };
}

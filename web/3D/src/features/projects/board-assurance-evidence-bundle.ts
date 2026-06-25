import { createHash } from "node:crypto";
import type { BoardAssuranceExceptionStatus, BoardAssuranceExceptionWorkflowReport } from "@/features/projects/board-assurance-exceptions";
import type { BoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type { BoardDecisionReplayAuditReport, BoardDecisionReplayAuditStatus } from "@/features/projects/board-decision-replay-audit";
import type { BoardDecisionReplaySnapshotHistoryReport } from "@/features/projects/board-decision-replay-snapshots";
import type { ProjectIncidentPostmortemReport } from "@/features/projects/project-incident-postmortem";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

export type BoardAssuranceEvidenceBundleStatus = "blocked" | "ready" | "watch";
export type BoardAssuranceEvidenceBundleFileKind =
  | "approval-history"
  | "bundle-manifest"
  | "exception-workflow"
  | "incident-postmortems"
  | "replay-audit"
  | "replay-snapshots"
  | "runbook-proof";

export interface BoardAssuranceEvidenceBundleFile {
  body: string;
  byteSize: number;
  contentHash: string;
  contentType: string;
  kind: BoardAssuranceEvidenceBundleFileKind;
  label: string;
  nextAction: string;
  path: string;
  recordCount: number;
  status: BoardAssuranceEvidenceBundleStatus;
}

export interface BoardAssuranceEvidenceBundleSummary {
  approvalRecordCount: number;
  blockedEvidenceCount: number;
  completedRunbookCount: number;
  evidenceScore: number;
  exceptionCount: number;
  fileCount: number;
  incidentPostmortemCount: number;
  readyEvidenceCount: number;
  replayRowCount: number;
  replaySnapshotCount: number;
  status: BoardAssuranceEvidenceBundleStatus;
  totalByteSize: number;
  totalRunbookCount: number;
  watchEvidenceCount: number;
  nextAction: string;
}

export interface BoardAssuranceEvidenceBundleReport {
  bundleId: string;
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: BoardAssuranceEvidenceBundleFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  schemaVersion: 1;
  summary: BoardAssuranceEvidenceBundleSummary;
  workspaceId: string;
}

export interface CreateBoardAssuranceEvidenceBundleReportInput {
  approvalHistory?: BoardApprovalPacketHistoryReport | null;
  exceptionWorkflow?: BoardAssuranceExceptionWorkflowReport | null;
  generatedAt?: string;
  incidentPostmortemReport: ProjectIncidentPostmortemReport;
  replayAudit: BoardDecisionReplayAuditReport;
  replaySnapshotHistory?: BoardDecisionReplaySnapshotHistoryReport | null;
  runbookReport: WorkspaceReleaseRunbookReport;
  workspaceId?: string;
}

const statusRank: Record<BoardAssuranceEvidenceBundleStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<BoardAssuranceEvidenceBundleStatus, number> = {
  blocked: 35,
  ready: 100,
  watch: 70,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function canonicalJson(value: unknown) {
  return JSON.stringify(JSON.parse(stableJson(value)), null, 2);
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function contentHash(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function createBundleId(workspaceId: string, generatedAt: string) {
  return `board-assurance-evidence-${slug(workspaceId)}-${dateStamp(generatedAt)}`;
}

function replayStatus(status: BoardDecisionReplayAuditStatus): BoardAssuranceEvidenceBundleStatus {
  return status;
}

function approvalHistoryStatus(history: BoardApprovalPacketHistoryReport | null | undefined): BoardAssuranceEvidenceBundleStatus {
  if (!history || history.summary.activeCount === 0) {
    return "blocked";
  }

  if (history.summary.blockedPacketCount > 0) {
    return "blocked";
  }

  if (history.summary.watchPacketCount > 0 || history.summary.revokedCount > 0) {
    return "watch";
  }

  return "ready";
}

function replaySnapshotStatus(history: BoardDecisionReplaySnapshotHistoryReport | null | undefined): BoardAssuranceEvidenceBundleStatus {
  const latest = history?.records[0] ?? null;

  if (!history || history.records.length === 0 || !latest) {
    return "watch";
  }

  return replayStatus(latest.status);
}

function postmortemStatus(report: ProjectIncidentPostmortemReport): BoardAssuranceEvidenceBundleStatus {
  if (report.summary.blockedCount > 0) {
    return "blocked";
  }

  if (report.summary.watchCount > 0 || report.summary.templateCount === 0) {
    return "watch";
  }

  return "ready";
}

function runbookStatus(report: WorkspaceReleaseRunbookReport): BoardAssuranceEvidenceBundleStatus {
  if (report.summary.blockedCount > 0) {
    return "blocked";
  }

  return report.summary.completeCount >= report.summary.totalCount ? "ready" : "watch";
}

function exceptionStatus(status: BoardAssuranceExceptionStatus): BoardAssuranceEvidenceBundleStatus {
  if (status === "approved") {
    return "ready";
  }

  if (status === "pending" || status === "request-needed") {
    return "watch";
  }

  return "blocked";
}

function exceptionWorkflowStatus(workflow: BoardAssuranceExceptionWorkflowReport | null | undefined): BoardAssuranceEvidenceBundleStatus {
  if (!workflow || workflow.summary.totalCount === 0) {
    return "ready";
  }

  return exceptionStatus(workflow.summary.status);
}

function createFile(input: {
  body: string;
  contentType: string;
  kind: BoardAssuranceEvidenceBundleFileKind;
  label: string;
  nextAction: string;
  path: string;
  recordCount: number;
  status: BoardAssuranceEvidenceBundleStatus;
}): BoardAssuranceEvidenceBundleFile {
  return {
    ...input,
    byteSize: byteSize(input.body),
    contentHash: contentHash(input.body),
  };
}

function createApprovalHistoryFile(history: BoardApprovalPacketHistoryReport | null | undefined): BoardAssuranceEvidenceBundleFile {
  const status = approvalHistoryStatus(history);

  return createFile({
    body: canonicalJson({
      csvContent: history?.csvContent ?? "",
      records: history?.records ?? [],
      summary: history?.summary ?? null,
    }),
    contentType: "application/json; charset=utf-8",
    kind: "approval-history",
    label: "Board approval history",
    nextAction:
      status === "blocked"
        ? "Save an active board approval packet before closing the assurance bundle."
        : status === "watch"
          ? "Review watched or revoked approval packet history before external circulation."
          : "Keep the active approval packet history with the assurance evidence.",
    path: "approvals/board-approval-history.json",
    recordCount: history?.records.length ?? 0,
    status,
  });
}

function createReplayAuditFile(report: BoardDecisionReplayAuditReport): BoardAssuranceEvidenceBundleFile {
  const status = replayStatus(report.summary.status);

  return createFile({
    body: canonicalJson(report),
    contentType: "application/json; charset=utf-8",
    kind: "replay-audit",
    label: "Board decision replay audit",
    nextAction: report.summary.nextAction,
    path: "replay/board-decision-replay-audit.json",
    recordCount: report.rows.length,
    status,
  });
}

function createReplaySnapshotFile(history: BoardDecisionReplaySnapshotHistoryReport | null | undefined): BoardAssuranceEvidenceBundleFile {
  const status = replaySnapshotStatus(history);

  return createFile({
    body: canonicalJson({
      records: history?.records ?? [],
      summary: history?.summary ?? null,
      trends: history?.trends ?? [],
    }),
    contentType: "application/json; charset=utf-8",
    kind: "replay-snapshots",
    label: "Persisted replay snapshots",
    nextAction:
      status === "watch" && (!history || history.records.length === 0)
        ? "Save a board decision replay audit snapshot so the bundle has a persisted replay baseline."
        : status === "blocked"
          ? "Resolve blocked replay snapshot trends before board assurance closure."
          : "Archive replay snapshot history with the board assurance bundle.",
    path: "replay/board-decision-replay-snapshots.json",
    recordCount: history?.records.length ?? 0,
    status,
  });
}

function createPostmortemFile(report: ProjectIncidentPostmortemReport): BoardAssuranceEvidenceBundleFile {
  const status = postmortemStatus(report);

  return createFile({
    body: canonicalJson(report),
    contentType: "application/json; charset=utf-8",
    kind: "incident-postmortems",
    label: "Incident postmortems",
    nextAction:
      status === "blocked"
        ? "Complete blocked postmortem remediation before accepting the board assurance packet."
        : status === "watch"
          ? "Link incident postmortems and remediation proof before final release closure."
          : "Keep completed postmortems and remediation evidence attached.",
    path: "incidents/incident-postmortems.json",
    recordCount: report.templates.length,
    status,
  });
}

function createRunbookProofFile(report: WorkspaceReleaseRunbookReport): BoardAssuranceEvidenceBundleFile {
  const status = runbookStatus(report);

  return createFile({
    body: canonicalJson({
      completedRecords: report.records.filter((record) => record.status === "complete"),
      generatedAt: report.generatedAt,
      openRecords: report.records.filter((record) => record.status !== "complete"),
      summary: report.summary,
    }),
    contentType: "application/json; charset=utf-8",
    kind: "runbook-proof",
    label: "Release runbook completion proof",
    nextAction:
      status === "blocked"
        ? "Clear blocked runbook rows and attach completion evidence before board closure."
        : status === "watch"
          ? "Complete or reschedule open runbook rows before board assurance closure."
          : "Archive completed runbook proof with the board assurance packet.",
    path: "runbook/release-runbook-completion-proof.json",
    recordCount: report.records.length,
    status,
  });
}

function createExceptionWorkflowFile(workflow: BoardAssuranceExceptionWorkflowReport | null | undefined): BoardAssuranceEvidenceBundleFile {
  const status = exceptionWorkflowStatus(workflow);

  return createFile({
    body: canonicalJson({
      generatedAt: workflow?.generatedAt ?? null,
      rows: workflow?.rows ?? [],
      summary: workflow?.summary ?? null,
      workspaceId: workflow?.workspaceId ?? null,
    }),
    contentType: "application/json; charset=utf-8",
    kind: "exception-workflow",
    label: "Board assurance exception workflow",
    nextAction:
      workflow?.summary.nextAction ??
      (status === "ready" ? "No board assurance exceptions are needed for the current replay audit." : "Create scoped exceptions for unresolved replay blockers."),
    path: "exceptions/board-assurance-exception-workflow.json",
    recordCount: workflow?.rows.length ?? 0,
    status,
  });
}

function summarizeFiles(input: {
  approvalHistory: BoardApprovalPacketHistoryReport | null | undefined;
  exceptionWorkflow: BoardAssuranceExceptionWorkflowReport | null | undefined;
  files: BoardAssuranceEvidenceBundleFile[];
  incidentPostmortemReport: ProjectIncidentPostmortemReport;
  replayAudit: BoardDecisionReplayAuditReport;
  replaySnapshotHistory: BoardDecisionReplaySnapshotHistoryReport | null | undefined;
  runbookReport: WorkspaceReleaseRunbookReport;
}): BoardAssuranceEvidenceBundleSummary {
  const blockedEvidenceCount = input.files.filter((file) => file.status === "blocked").length;
  const watchEvidenceCount = input.files.filter((file) => file.status === "watch").length;
  const readyEvidenceCount = input.files.filter((file) => file.status === "ready").length;
  const status: BoardAssuranceEvidenceBundleStatus = blockedEvidenceCount > 0 ? "blocked" : watchEvidenceCount > 0 ? "watch" : "ready";
  const nextFile = [...input.files].sort((first, second) => statusRank[first.status] - statusRank[second.status])[0] ?? null;

  return {
    approvalRecordCount: input.approvalHistory?.records.length ?? 0,
    blockedEvidenceCount,
    completedRunbookCount: input.runbookReport.summary.completeCount,
    evidenceScore: input.files.length > 0 ? Math.round(input.files.reduce((sum, file) => sum + statusScore[file.status], 0) / input.files.length) : 100,
    exceptionCount: input.exceptionWorkflow?.rows.length ?? 0,
    fileCount: input.files.length,
    incidentPostmortemCount: input.incidentPostmortemReport.summary.templateCount,
    nextAction:
      status === "ready"
        ? "Archive the complete board assurance evidence bundle with the release record."
        : (nextFile?.nextAction ?? "Resolve board assurance evidence gaps before release closure."),
    readyEvidenceCount,
    replayRowCount: input.replayAudit.rows.length,
    replaySnapshotCount: input.replaySnapshotHistory?.records.length ?? 0,
    status,
    totalByteSize: input.files.reduce((sum, file) => sum + file.byteSize, 0),
    totalRunbookCount: input.runbookReport.summary.totalCount,
    watchEvidenceCount,
  };
}

function createManifestFile(input: {
  bundleId: string;
  files: BoardAssuranceEvidenceBundleFile[];
  generatedAt: string;
  summary: BoardAssuranceEvidenceBundleSummary;
  workspaceId: string;
}): BoardAssuranceEvidenceBundleFile {
  return createFile({
    body: canonicalJson({
      bundleId: input.bundleId,
      files: input.files.map((file) => ({
        byteSize: file.byteSize,
        contentHash: file.contentHash,
        kind: file.kind,
        label: file.label,
        path: file.path,
        recordCount: file.recordCount,
        status: file.status,
      })),
      generatedAt: input.generatedAt,
      schemaVersion: 1,
      summary: {
        ...input.summary,
        fileCount: input.files.length + 1,
      },
      workspaceId: input.workspaceId,
    }),
    contentType: "application/json; charset=utf-8",
    kind: "bundle-manifest",
    label: "Board assurance bundle manifest",
    nextAction: "Verify each file hash before sending the board assurance bundle outside the workspace.",
    path: "manifest/board-assurance-manifest.json",
    recordCount: input.files.length,
    status: "ready",
  });
}

function createCsv(files: BoardAssuranceEvidenceBundleFile[]) {
  const header = ["kind", "label", "status", "records", "content_hash", "byte_size", "next_action"];
  const rows = files.map((file) =>
    [file.kind, file.label, file.status, file.recordCount, file.contentHash, file.byteSize, file.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

export function createBoardAssuranceEvidenceBundleReport(input: CreateBoardAssuranceEvidenceBundleReportInput): BoardAssuranceEvidenceBundleReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.replayAudit.workspaceId;
  const bundleId = createBundleId(workspaceId, generatedAt);
  const sourceFiles = [
    createApprovalHistoryFile(input.approvalHistory),
    createReplayAuditFile(input.replayAudit),
    createReplaySnapshotFile(input.replaySnapshotHistory),
    createPostmortemFile(input.incidentPostmortemReport),
    createRunbookProofFile(input.runbookReport),
    createExceptionWorkflowFile(input.exceptionWorkflow),
  ];
  const sourceSummary = summarizeFiles({
    approvalHistory: input.approvalHistory,
    exceptionWorkflow: input.exceptionWorkflow,
    files: sourceFiles,
    incidentPostmortemReport: input.incidentPostmortemReport,
    replayAudit: input.replayAudit,
    replaySnapshotHistory: input.replaySnapshotHistory,
    runbookReport: input.runbookReport,
  });
  const files = [
    ...sourceFiles,
    createManifestFile({
      bundleId,
      files: sourceFiles,
      generatedAt,
      summary: sourceSummary,
      workspaceId,
    }),
  ];
  const summary = summarizeFiles({
    approvalHistory: input.approvalHistory,
    exceptionWorkflow: input.exceptionWorkflow,
    files,
    incidentPostmortemReport: input.incidentPostmortemReport,
    replayAudit: input.replayAudit,
    replaySnapshotHistory: input.replaySnapshotHistory,
    runbookReport: input.runbookReport,
  });
  const csvContent = createCsv(files);
  const csvFileName = `${bundleId}.csv`;
  const jsonFileName = `${bundleId}.json`;
  const jsonContent = canonicalJson({
    bundleId,
    files,
    generatedAt,
    schemaVersion: 1,
    summary,
    workspaceId,
  });

  return {
    bundleId,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName,
    files,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName,
    schemaVersion: 1,
    summary,
    workspaceId,
  };
}

import { createHash } from "node:crypto";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { createProjectComplianceDownload } from "@/features/projects/project-compliance-download";
import type { ProjectComplianceReport } from "@/features/projects/project-compliance-report";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import {
  createWorkspaceRiskDigestAuditCsv,
  createWorkspaceRiskDigestJson,
  type WorkspaceRiskDigestLevel,
  type WorkspaceRiskDigestReport,
} from "@/features/projects/workspace-risk-digest";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceRole } from "@/features/workspaces/types";

export type ReleaseEvidenceBundleFileKind = "audit-csv" | "cad-jobs" | "certificates" | "compliance-report" | "public-health" | "risk-digest" | "runbook";

export interface ReleaseEvidenceBundleFile {
  body: string;
  byteSize: number;
  contentHash: string;
  contentType: string;
  kind: ReleaseEvidenceBundleFileKind;
  label: string;
  path: string;
  projectId: string | null;
}

export interface ReleaseEvidenceBundleSummary {
  auditEventCount: number;
  cadJobCount: number;
  certificateRecordCount: number;
  complianceReportCount: number;
  fileCount: number;
  highPriorityActionCount: number;
  projectCount: number;
  publicSurfaceSnapshotCount: number;
  releaseBlockerCount: number;
  riskLevel: WorkspaceRiskDigestLevel;
  riskScore: number;
  runbookRecordCount: number;
  totalByteSize: number;
}

export interface ReleaseEvidenceBundle {
  bundleId: string;
  files: ReleaseEvidenceBundleFile[];
  generatedAt: string;
  schemaVersion: 1;
  summary: ReleaseEvidenceBundleSummary;
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

export interface CreateReleaseEvidenceBundleInput {
  cadConversionQueueReport: ProjectCadConversionQueueReport;
  complianceReports: ProjectComplianceReport[];
  generatedAt?: string;
  projectCount: number;
  publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport;
  riskDigest: WorkspaceRiskDigestReport;
  runbookReport: WorkspaceReleaseRunbookReport;
  certificateReport: ProjectAppPackageCertificateReport;
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function contentHash(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
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

function jsonBody(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function createFile(input: {
  body: string;
  contentType: string;
  kind: ReleaseEvidenceBundleFileKind;
  label: string;
  path: string;
  projectId?: string | null;
}): ReleaseEvidenceBundleFile {
  return {
    ...input,
    byteSize: byteSize(input.body),
    contentHash: contentHash(input.body),
    projectId: input.projectId ?? null,
  };
}

function createBundleId(workspaceId: string, generatedAt: string) {
  const date = generatedAt.slice(0, 10).replaceAll("-", "");

  return `release-evidence-${slug(workspaceId)}-${date}`;
}

export function createReleaseEvidenceBundlePreview(input: Omit<CreateReleaseEvidenceBundleInput, "complianceReports"> & { complianceReportCount: number }): ReleaseEvidenceBundleSummary {
  return {
    auditEventCount: input.riskDigest.audit.rows.length,
    cadJobCount: input.cadConversionQueueReport.summary.totalCount,
    certificateRecordCount: input.certificateReport.summary.totalRequiredCount,
    complianceReportCount: input.complianceReportCount,
    fileCount: 6 + input.complianceReportCount,
    highPriorityActionCount: input.riskDigest.actionItems.filter((item) => item.priority === "high").length,
    projectCount: input.projectCount,
    publicSurfaceSnapshotCount: input.publicSurfaceHealthReport.snapshots.length,
    releaseBlockerCount:
      input.riskDigest.actionItems.filter((item) => item.priority === "high").length +
      input.publicSurfaceHealthReport.summary.failCount +
      input.runbookReport.summary.blockedCount +
      input.certificateReport.summary.blockedCount +
      input.cadConversionQueueReport.summary.failedCount +
      input.cadConversionQueueReport.summary.retryableCount,
    riskLevel: input.riskDigest.riskLevel,
    riskScore: input.riskDigest.score,
    runbookRecordCount: input.runbookReport.records.length,
    totalByteSize: 0,
  };
}

export function createReleaseEvidenceBundle(input: CreateReleaseEvidenceBundleInput): ReleaseEvidenceBundle {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceSlug = slug(input.riskDigest.workspace.name);
  const complianceFiles = input.complianceReports.map((report) => {
    const download = createProjectComplianceDownload(report.project.name, report);

    return createFile({
      body: download.body,
      contentType: download.contentType,
      kind: "compliance-report",
      label: `${report.project.name} compliance report`,
      path: `compliance/${report.project.id}-${download.fileName}`,
      projectId: report.project.id,
    });
  });
  const files = [
    createFile({
      body: createWorkspaceRiskDigestJson(input.riskDigest),
      contentType: "application/json; charset=utf-8",
      kind: "risk-digest",
      label: "Workspace risk digest",
      path: "risk/risk-digest.json",
    }),
    createFile({
      body: createWorkspaceRiskDigestAuditCsv(input.riskDigest),
      contentType: "text/csv; charset=utf-8",
      kind: "audit-csv",
      label: "Workspace audit events",
      path: "risk/audit-events.csv",
    }),
    ...complianceFiles,
    createFile({
      body: jsonBody(input.publicSurfaceHealthReport),
      contentType: "application/json; charset=utf-8",
      kind: "public-health",
      label: "Public surface health snapshots",
      path: "public-health/public-surface-health-snapshots.json",
    }),
    createFile({
      body: jsonBody(input.runbookReport),
      contentType: "application/json; charset=utf-8",
      kind: "runbook",
      label: "Release runbook records",
      path: "runbook/release-runbook-records.json",
    }),
    createFile({
      body: jsonBody(input.certificateReport),
      contentType: "application/json; charset=utf-8",
      kind: "certificates",
      label: "Native package certificate records",
      path: "certificates/native-package-certificates.json",
    }),
    createFile({
      body: jsonBody(input.cadConversionQueueReport),
      contentType: "application/json; charset=utf-8",
      kind: "cad-jobs",
      label: "CAD conversion job summaries",
      path: "cad/cad-conversion-jobs.json",
    }),
  ];
  const preview = createReleaseEvidenceBundlePreview({
    ...input,
    complianceReportCount: input.complianceReports.length,
  });

  return {
    bundleId: createBundleId(`${workspaceSlug}-${input.riskDigest.workspace.id}`, generatedAt),
    files,
    generatedAt,
    schemaVersion: 1,
    summary: {
      ...preview,
      fileCount: files.length,
      totalByteSize: files.reduce((sum, file) => sum + file.byteSize, 0),
    },
    workspace: input.riskDigest.workspace,
  };
}

export function createReleaseEvidenceBundleFileName(bundle: ReleaseEvidenceBundle) {
  return `${bundle.bundleId}.json`;
}

export function createReleaseEvidenceBundleDownload(bundle: ReleaseEvidenceBundle) {
  const body = jsonBody(bundle);

  return {
    body,
    contentDisposition: `attachment; filename="${createReleaseEvidenceBundleFileName(bundle)}"`,
    contentHash: contentHash(body),
    contentType: "application/json; charset=utf-8",
    fileName: createReleaseEvidenceBundleFileName(bundle),
  };
}

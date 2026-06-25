import type { ProjectAppPackageCertificateReport, ProjectAppPackageCertificateStatus } from "@/features/projects/app-package-certificates";
import type { ProjectCadConversionJobRecord, ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { ProjectArtifactRegistryEntry, ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { ProjectPublicSurfaceHealthReport, ProjectPublicSurfaceHealthSnapshot } from "@/features/projects/public-surface-health";
import type { ReleaseOperationsArtifactRow, ReleaseOperationsDashboard, ReleaseOperationsTargetRow } from "@/features/projects/release-operations-dashboard";

export type ProjectArtifactProvenanceKind = "cad-output" | "certificate" | "desktop-bundle" | "public-asset";
export type ProjectArtifactProvenanceStatus = "blocked" | "missing" | "verified" | "warning";

export interface ProjectArtifactProvenanceRow {
  actual: string;
  artifactRef: string | null;
  evidence: string;
  expected: string;
  id: string;
  kind: ProjectArtifactProvenanceKind;
  label: string;
  nextAction: string;
  projectName: string;
  source: string;
  status: ProjectArtifactProvenanceStatus;
  verifiedAt: string | null;
}

export interface ProjectArtifactProvenanceReport {
  generatedAt: string;
  rows: ProjectArtifactProvenanceRow[];
  summary: {
    blockedCount: number;
    cadOutputCount: number;
    certificateCount: number;
    desktopBundleCount: number;
    missingCount: number;
    publicAssetCount: number;
    score: number;
    totalCount: number;
    verifiedCount: number;
    warningCount: number;
    worstStatus: ProjectArtifactProvenanceStatus;
  };
}

export interface CreateProjectArtifactProvenanceReportInput {
  artifactRegistryReport: ProjectArtifactRegistryReport;
  cadConversionQueueReport: ProjectCadConversionQueueReport;
  certificateReport: ProjectAppPackageCertificateReport;
  generatedAt?: string;
  publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport;
  releaseOperationsDashboard?: ReleaseOperationsDashboard | null;
}

const statusRank: Record<ProjectArtifactProvenanceStatus, number> = {
  blocked: 0,
  missing: 1,
  warning: 2,
  verified: 3,
};

const certificateStatusMap: Record<ProjectAppPackageCertificateStatus, ProjectArtifactProvenanceStatus> = {
  expired: "blocked",
  expiring: "warning",
  mismatch: "blocked",
  missing: "missing",
  revoked: "blocked",
  valid: "verified",
};

function summarize(rows: ProjectArtifactProvenanceRow[]): ProjectArtifactProvenanceReport["summary"] {
  const weightedScore = rows.reduce((score, row) => {
    if (row.status === "verified") {
      return score + 1;
    }

    return row.status === "warning" ? score + 0.5 : score;
  }, 0);

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    cadOutputCount: rows.filter((row) => row.kind === "cad-output").length,
    certificateCount: rows.filter((row) => row.kind === "certificate").length,
    desktopBundleCount: rows.filter((row) => row.kind === "desktop-bundle").length,
    missingCount: rows.filter((row) => row.status === "missing").length,
    publicAssetCount: rows.filter((row) => row.kind === "public-asset").length,
    score: rows.length > 0 ? Math.round((weightedScore / rows.length) * 100) : 0,
    totalCount: rows.length,
    verifiedCount: rows.filter((row) => row.status === "verified").length,
    warningCount: rows.filter((row) => row.status === "warning").length,
    worstStatus: [...rows].sort((first, second) => statusRank[first.status] - statusRank[second.status])[0]?.status ?? "missing",
  };
}

function certificateRows(report: ProjectAppPackageCertificateReport): ProjectArtifactProvenanceRow[] {
  return report.rows.map((row) => {
    const certificate = row.certificate;
    const status = certificateStatusMap[row.status];

    return {
      actual: certificate ? certificate.fingerprintSha256 : row.status,
      artifactRef: row.artifactId,
      evidence: certificate ? `${certificate.issuer} / ${certificate.serialNumber}` : row.issue ?? "No certificate evidence attached.",
      expected: `${row.platform} ${row.presetLabel} certificate with a valid SHA-256 fingerprint.`,
      id: `certificate:${row.sourceKey}:${row.platform}`,
      kind: "certificate",
      label: `${row.label} ${row.platform} certificate`,
      nextAction:
        status === "verified"
          ? "Keep this certificate attached to the package evidence."
          : status === "warning"
            ? "Renew or replace the certificate before the expiration window closes."
            : "Attach a valid matching certificate before promotion.",
      projectName: row.projectName,
      source: row.sourceKey,
      status,
      verifiedAt: certificate?.verifiedAt ?? null,
    };
  });
}

function desktopArtifactRows(dashboard: ReleaseOperationsDashboard | null | undefined): ProjectArtifactProvenanceRow[] {
  if (!dashboard) {
    return [
      {
        actual: "release operations unavailable",
        artifactRef: null,
        evidence: "Desktop release scan has not been loaded for this workspace.",
        expected: "Signed desktop bundle scan with updater URL and signature evidence.",
        id: "desktop-bundle:missing-scan",
        kind: "desktop-bundle",
        label: "Desktop release scan",
        nextAction: "Run desktop release artifact discovery before promotion.",
        projectName: "Desktop release",
        source: "release-operations",
        status: "missing",
        verifiedAt: null,
      },
    ];
  }

  const artifactRows = dashboard.artifactRows.map((artifact) => desktopArtifactRow(artifact, dashboard.generatedAt));
  const missingRows = dashboard.targetRows.filter((target) => target.missing).map((target) => missingDesktopTargetRow(target, dashboard.generatedAt));

  return [...artifactRows, ...missingRows];
}

function desktopArtifactRow(artifact: ReleaseOperationsArtifactRow, generatedAt: string): ProjectArtifactProvenanceRow {
  return {
    actual: artifact.signed ? "signature attached" : "unsigned",
    artifactRef: artifact.path,
    evidence: artifact.signed ? artifact.url : "No .sig evidence was discovered beside this bundle.",
    expected: `${artifact.target} ${artifact.arch} desktop bundle with updater URL and signature.`,
    id: `desktop-bundle:${artifact.target}:${artifact.arch}:${artifact.path}`,
    kind: "desktop-bundle",
    label: `${artifact.target} ${artifact.arch} bundle`,
    nextAction: artifact.signed ? "Keep this bundle in the updater manifest." : "Attach a signature file before channel promotion.",
    projectName: "Desktop release",
    source: artifact.path,
    status: artifact.signed ? "verified" : "blocked",
    verifiedAt: artifact.signed ? generatedAt : null,
  };
}

function missingDesktopTargetRow(target: ReleaseOperationsTargetRow, generatedAt: string): ProjectArtifactProvenanceRow {
  return {
    actual: "missing",
    artifactRef: target.target,
    evidence: `No selected signed ${target.target} artifact is available.`,
    expected: `${target.target} desktop bundle selected for updater release.`,
    id: `desktop-bundle:missing:${target.target}`,
    kind: "desktop-bundle",
    label: `${target.target} target coverage`,
    nextAction: "Add a signed bundle for this target or remove it from required release coverage.",
    projectName: "Desktop release",
    source: "release-operations",
    status: "missing",
    verifiedAt: generatedAt,
  };
}

function cadRows(report: ProjectCadConversionQueueReport): ProjectArtifactProvenanceRow[] {
  if (report.jobs.length === 0) {
    return [
      {
        actual: "no CAD outputs",
        artifactRef: null,
        evidence: "No CAD conversion worker records are available.",
        expected: "CAD worker output path, diagnostics, and final status.",
        id: "cad-output:no-jobs",
        kind: "cad-output",
        label: "CAD worker outputs",
        nextAction: "Queue at least one native CAD conversion before relying on CAD output provenance.",
        projectName: "Workspace CAD",
        source: "cad-conversion-worker",
        status: "missing",
        verifiedAt: report.generatedAt,
      },
    ];
  }

  return report.jobs.map(cadJobRow);
}

function cadJobRow(job: ProjectCadConversionJobRecord): ProjectArtifactProvenanceRow {
  const succeeded = job.status === "succeeded" && Boolean(job.resultPath);
  const blocked = job.status === "failed" || job.status === "retryable-failed";
  const status: ProjectArtifactProvenanceStatus = succeeded ? "verified" : blocked ? "blocked" : "warning";

  return {
    actual: job.resultPath ?? job.status,
    artifactRef: job.id ?? `${job.projectId}:${job.sourceFileName}`,
    evidence: job.logs.at(-1)?.message ?? job.command,
    expected: `${job.adapterId.toUpperCase()} ${job.target.toUpperCase()} output with diagnostics and result path.`,
    id: `cad-output:${job.projectId}:${job.sourceFileName}:${job.queuedAt}`,
    kind: "cad-output",
    label: job.outputFileName,
    nextAction:
      status === "verified"
        ? "Keep the result path attached to the release evidence."
        : blocked
          ? "Inspect worker logs and retry with a healthy adapter."
          : "Wait for the worker to finish and attach the output path.",
    projectName: job.projectName,
    source: job.command,
    status,
    verifiedAt: succeeded ? job.finishedAt ?? job.updatedAt : null,
  };
}

function publicAssetRows(input: {
  artifactRegistryReport: ProjectArtifactRegistryReport;
  publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport;
}): ProjectArtifactProvenanceRow[] {
  const publicAssets = input.artifactRegistryReport.entries.filter((entry) => entry.kind === "public-asset");

  if (publicAssets.length === 0 && input.publicSurfaceHealthReport.snapshots.length === 0) {
    return [
      {
        actual: "no public assets",
        artifactRef: null,
        evidence: "No public asset registry entries or public health snapshots are available.",
        expected: "Public URL or path with passing public surface health.",
        id: "public-asset:no-assets",
        kind: "public-asset",
        label: "Public assets",
        nextAction: "Publish a viewer, embed, API payload, or app package before launch.",
        projectName: "Public surfaces",
        source: "artifact-registry",
        status: "missing",
        verifiedAt: input.publicSurfaceHealthReport.generatedAt,
      },
    ];
  }

  const rows = publicAssets.map((entry) =>
    publicAssetRegistryRow(
      entry,
      input.publicSurfaceHealthReport.snapshots.find((snapshot) => snapshot.projectId === entry.projectId && snapshot.sourceKey.endsWith(`:${entry.artifactId}`)) ?? null,
    ),
  );
  const registryRefs = new Set(publicAssets.map((entry) => `${entry.projectId}:${entry.artifactId}`));
  const healthOnlyRows = input.publicSurfaceHealthReport.snapshots
    .filter((snapshot) => !registryRefs.has(`${snapshot.projectId}:${snapshot.sourceKey.split(":").at(-1) ?? ""}`))
    .map(publicSurfaceSnapshotRow);

  return [...rows, ...healthOnlyRows];
}

function publicAssetRegistryRow(entry: ProjectArtifactRegistryEntry, snapshot: ProjectPublicSurfaceHealthSnapshot | null): ProjectArtifactProvenanceRow {
  const hasLocation = Boolean(entry.url || entry.path);
  const blocked = entry.status === "blocked" || snapshot?.status === "fail";
  const warning = entry.status === "draft" || snapshot?.status === "warn" || entry.visibility !== "public" || !hasLocation;
  const status: ProjectArtifactProvenanceStatus = blocked ? "blocked" : warning ? "warning" : "verified";

  return {
    actual: snapshot ? snapshot.status : entry.status,
    artifactRef: entry.artifactId,
    evidence: snapshot?.issues[0] ?? entry.url ?? entry.path ?? "No URL or path evidence attached.",
    expected: "Public asset with a location and passing health snapshot.",
    id: `public-asset:${entry.sourceKey}`,
    kind: "public-asset",
    label: entry.label,
    nextAction:
      status === "verified"
        ? "Keep this public asset in the release evidence bundle."
        : blocked
          ? "Fix the blocked public artifact or remove it from launch scope."
          : "Attach a public location and refresh public surface health.",
    projectName: entry.projectName,
    source: entry.sourceKey,
    status,
    verifiedAt: status === "verified" ? snapshot?.checkedAt ?? entry.updatedAt : null,
  };
}

function publicSurfaceSnapshotRow(snapshot: ProjectPublicSurfaceHealthSnapshot): ProjectArtifactProvenanceRow {
  const status: ProjectArtifactProvenanceStatus = snapshot.status === "pass" ? "verified" : snapshot.status === "warn" ? "warning" : "blocked";

  return {
    actual: snapshot.status,
    artifactRef: snapshot.sourceKey,
    evidence: snapshot.issues[0] ?? snapshot.url ?? snapshot.path ?? "No public surface detail attached.",
    expected: `${snapshot.surface} public surface with passing health.`,
    id: `public-asset:health:${snapshot.sourceKey}`,
    kind: "public-asset",
    label: snapshot.label,
    nextAction: status === "verified" ? "Keep this public surface monitored." : "Resolve public surface health before launch.",
    projectName: snapshot.projectName,
    source: snapshot.sourceKey,
    status,
    verifiedAt: status === "verified" ? snapshot.checkedAt : null,
  };
}

export function createProjectArtifactProvenanceReport(input: CreateProjectArtifactProvenanceReportInput): ProjectArtifactProvenanceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = [
    ...certificateRows(input.certificateReport),
    ...desktopArtifactRows(input.releaseOperationsDashboard),
    ...cadRows(input.cadConversionQueueReport),
    ...publicAssetRows({
      artifactRegistryReport: input.artifactRegistryReport,
      publicSurfaceHealthReport: input.publicSurfaceHealthReport,
    }),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.kind.localeCompare(second.kind) || first.label.localeCompare(second.label));

  return {
    generatedAt,
    rows,
    summary: summarize(rows),
  };
}

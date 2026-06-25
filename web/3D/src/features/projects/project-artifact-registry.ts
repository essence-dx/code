import type { AppPackagePresetId } from "@/features/projects/app-package-export";
import type { ProjectExportLineageArtifact, ProjectExportLineageReport } from "@/features/projects/project-export-lineage";

export type ProjectArtifactRegistryKind = "compliance-export" | "lineage-snapshot" | "public-asset" | "signed-app-bundle";
export type ProjectArtifactRegistrySignatureState = "certificate-required" | "not-required" | "signed" | "unsigned";
export type ProjectArtifactRegistryStatus = "available" | "blocked" | "draft";
export type ProjectArtifactRegistryVisibility = "private" | "public";

export type ProjectArtifactRegistryMetadata = Record<string, boolean | number | string | null>;

export interface ProjectArtifactRegistryEntry {
  artifactId: string;
  id?: string;
  kind: ProjectArtifactRegistryKind;
  label: string;
  metadata: ProjectArtifactRegistryMetadata | null;
  path: string | null;
  projectId: string;
  projectName: string;
  registeredAt: string;
  requiresAuth: boolean;
  signatureState: ProjectArtifactRegistrySignatureState;
  sourceKey: string;
  sourceVersionId: string;
  status: ProjectArtifactRegistryStatus;
  updatedAt: string;
  url: string | null;
  visibility: ProjectArtifactRegistryVisibility;
}

export interface ProjectArtifactRegistryReport {
  entries: ProjectArtifactRegistryEntry[];
  generatedAt: string;
  summary: {
    availableCount: number;
    blockedCount: number;
    complianceExportCount: number;
    draftCount: number;
    lineageSnapshotCount: number;
    privateCount: number;
    publicAssetCount: number;
    publicCount: number;
    signedBundleCount: number;
    totalCount: number;
  };
}

export interface CreateProjectArtifactRegistryReportInput {
  generatedAt?: string;
  lineageReports: ProjectExportLineageReport[];
}

function registryKindForArtifact(artifact: ProjectExportLineageArtifact): ProjectArtifactRegistryKind {
  if (artifact.kind === "app-package") {
    return "signed-app-bundle";
  }

  if (artifact.kind === "compliance-report") {
    return "compliance-export";
  }

  return "public-asset";
}

function signatureStateForArtifact(artifact: ProjectExportLineageArtifact): ProjectArtifactRegistrySignatureState {
  return artifact.kind === "app-package" ? "certificate-required" : "not-required";
}

function metadataForArtifact(artifact: ProjectExportLineageArtifact): ProjectArtifactRegistryMetadata {
  return {
    blockedReason: artifact.blockedReason,
    lineageKind: artifact.kind,
    presetId: artifact.presetId ?? null,
    public: artifact.public,
    requiresAuth: artifact.requiresAuth,
  };
}

function createArtifactEntry(input: {
  artifact: ProjectExportLineageArtifact;
  generatedAt: string;
  report: ProjectExportLineageReport;
}): ProjectArtifactRegistryEntry {
  const kind = registryKindForArtifact(input.artifact);
  const sourceKey = `${input.report.project.id}:${kind}:${input.artifact.id}`;

  return {
    artifactId: input.artifact.id,
    kind,
    label: input.artifact.label,
    metadata: metadataForArtifact(input.artifact),
    path: input.artifact.path,
    projectId: input.report.project.id,
    projectName: input.report.project.name,
    registeredAt: input.generatedAt,
    requiresAuth: input.artifact.requiresAuth,
    signatureState: signatureStateForArtifact(input.artifact),
    sourceKey,
    sourceVersionId: input.artifact.sourceVersionId,
    status: input.artifact.status,
    updatedAt: input.generatedAt,
    url: input.artifact.url,
    visibility: input.artifact.public ? "public" : "private",
  };
}

function createLineageSnapshotEntry(report: ProjectExportLineageReport, generatedAt: string): ProjectArtifactRegistryEntry {
  const artifactId = `lineage-snapshot:${report.project.id}:${report.sourceVersion.id}`;

  return {
    artifactId,
    kind: "lineage-snapshot",
    label: "Lineage snapshot",
    metadata: {
      activeSceneId: report.activeSceneId,
      availableCount: report.summary.availableCount,
      blockedCount: report.summary.blockedCount,
      draftCount: report.summary.draftCount,
      sourceVersionName: report.sourceVersion.name,
    },
    path: null,
    projectId: report.project.id,
    projectName: report.project.name,
    registeredAt: generatedAt,
    requiresAuth: true,
    signatureState: "not-required",
    sourceKey: `${report.project.id}:lineage-snapshot:${report.sourceVersion.id}`,
    sourceVersionId: report.sourceVersion.id,
    status: "available",
    updatedAt: generatedAt,
    url: null,
    visibility: "private",
  };
}

function summarizeEntries(entries: ProjectArtifactRegistryEntry[]): ProjectArtifactRegistryReport["summary"] {
  return {
    availableCount: entries.filter((entry) => entry.status === "available").length,
    blockedCount: entries.filter((entry) => entry.status === "blocked").length,
    complianceExportCount: entries.filter((entry) => entry.kind === "compliance-export").length,
    draftCount: entries.filter((entry) => entry.status === "draft").length,
    lineageSnapshotCount: entries.filter((entry) => entry.kind === "lineage-snapshot").length,
    privateCount: entries.filter((entry) => entry.visibility === "private").length,
    publicAssetCount: entries.filter((entry) => entry.kind === "public-asset").length,
    publicCount: entries.filter((entry) => entry.visibility === "public").length,
    signedBundleCount: entries.filter((entry) => entry.kind === "signed-app-bundle").length,
    totalCount: entries.length,
  };
}

export function createProjectArtifactRegistryEntries(input: CreateProjectArtifactRegistryReportInput): ProjectArtifactRegistryEntry[] {
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  return input.lineageReports.flatMap((report) => [
    ...report.artifacts.map((artifact) => createArtifactEntry({ artifact, generatedAt, report })),
    createLineageSnapshotEntry(report, generatedAt),
  ]);
}

export function createProjectArtifactRegistryReport(input: CreateProjectArtifactRegistryReportInput): ProjectArtifactRegistryReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const entries = createProjectArtifactRegistryEntries({
    generatedAt,
    lineageReports: input.lineageReports,
  }).sort((first, second) => first.projectName.localeCompare(second.projectName) || first.kind.localeCompare(second.kind) || first.label.localeCompare(second.label));

  return {
    entries,
    generatedAt,
    summary: summarizeEntries(entries),
  };
}

export function createProjectArtifactRegistryReportFromEntries(entries: ProjectArtifactRegistryEntry[], generatedAt = new Date().toISOString()): ProjectArtifactRegistryReport {
  const sortedEntries = [...entries].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt) || first.projectName.localeCompare(second.projectName));

  return {
    entries: sortedEntries,
    generatedAt,
    summary: summarizeEntries(sortedEntries),
  };
}

export function artifactRegistryPresetLabel(presetId: AppPackagePresetId | string | null | undefined) {
  return presetId ? `Preset ${presetId}` : "No preset";
}

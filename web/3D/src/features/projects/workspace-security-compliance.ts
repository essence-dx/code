import type { ProjectAccessRole } from "@/features/projects/access-types";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { ProjectDataRetentionPurgeReviewStatus } from "@/features/projects/project-data-retention";
import type { ProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { getProjectReviewGate } from "@/features/projects/project-review-gates";
import { projectReviewSurfaceKeys, projectReviewSurfaceLabels, resolveShareSettings, type ProjectReviewSurface } from "@/features/projects/share-settings";
import type { WorkspaceMemberRow, WorkspaceRole } from "@/features/workspaces/types";

type DateLike = Date | string | null | undefined;

export interface WorkspaceSecurityComplianceProjectSource {
  archivedAt: DateLike;
  id: string;
  name: string;
  shareSettings: unknown;
}

export interface WorkspaceSecurityComplianceGrantSource {
  role: ProjectAccessRole;
  userId: string;
}

export interface WorkspaceSecurityComplianceRetentionPolicySource {
  projectId: string;
  purgeReviewStatus: ProjectDataRetentionPurgeReviewStatus;
  updatedAt: DateLike;
}

export interface WorkspaceSecurityComplianceRoleSummary {
  count: number;
  label: string;
  role: WorkspaceRole;
}

export interface WorkspaceSecurityComplianceGrantSummary {
  directProjectGrantCount: number;
  folderGrantCount: number;
  roleCounts: Record<ProjectAccessRole, number>;
  totalGrantCount: number;
}

export interface WorkspaceSecurityComplianceRetentionSummary {
  coveragePercent: number;
  coveredProjectCount: number;
  missingProjects: { id: string; name: string }[];
  missingProjectCount: number;
  purgeApprovedCount: number;
  purgeApprovalRequestedCount: number;
  stalePolicyCount: number;
}

export interface WorkspaceSecurityComplianceReviewSurfaceSummary {
  blockedCount: number;
  label: string;
  surface: ProjectReviewSurface;
}

export interface WorkspaceSecurityComplianceProjectRow {
  artifactBlockedCount: number;
  artifactCertificateRequiredCount: number;
  blockedSurfaces: string[];
  exportBlockedCount: number;
  exportDraftCount: number;
  id: string;
  name: string;
  retentionCovered: boolean;
  retentionPurgeStatus: ProjectDataRetentionPurgeReviewStatus | null;
  risk: "blocked" | "healthy" | "watch";
}

export interface WorkspaceSecurityComplianceReport {
  generatedAt: string;
  grants: WorkspaceSecurityComplianceGrantSummary;
  projectRows: WorkspaceSecurityComplianceProjectRow[];
  retention: WorkspaceSecurityComplianceRetentionSummary;
  reviewSurfaces: WorkspaceSecurityComplianceReviewSurfaceSummary[];
  roles: WorkspaceSecurityComplianceRoleSummary[];
  summary: {
    activeProjectCount: number;
    artifactBlockedCount: number;
    exportBlockedCount: number;
    exportDraftCount: number;
    memberCount: number;
    projectWithBlockerCount: number;
    signedBundleCertificateRequiredCount: number;
    totalProjectCount: number;
    trustScore: number;
  };
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

export interface CreateWorkspaceSecurityComplianceReportInput {
  appPackageCertificateReport?: ProjectAppPackageCertificateReport;
  artifactRegistryReport: ProjectArtifactRegistryReport;
  exportLineageReports: ProjectExportLineageReport[];
  folderAccessGrants: WorkspaceSecurityComplianceGrantSource[];
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  projectAccessGrants: WorkspaceSecurityComplianceGrantSource[];
  projects: WorkspaceSecurityComplianceProjectSource[];
  retentionPolicies: WorkspaceSecurityComplianceRetentionPolicySource[];
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  admin: "Admins",
  editor: "Editors",
  owner: "Owners",
  viewer: "Viewers",
};

const grantRoleDefaults: Record<ProjectAccessRole, number> = {
  admin: 0,
  editor: 0,
  viewer: 0,
};

function isArchived(value: DateLike) {
  return Boolean(value);
}

function toDate(value: DateLike) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 100;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countWorkspaceRoles(members: WorkspaceMemberRow[]) {
  const counts = members.reduce<Record<WorkspaceRole, number>>(
    (summary, member) => ({
      ...summary,
      [member.role]: summary[member.role] + 1,
    }),
    { admin: 0, editor: 0, owner: 0, viewer: 0 },
  );

  return (Object.keys(counts) as WorkspaceRole[]).map((role) => ({
    count: counts[role],
    label: workspaceRoleLabels[role],
    role,
  }));
}

function countGrantRoles(grants: WorkspaceSecurityComplianceGrantSource[]) {
  return grants.reduce<Record<ProjectAccessRole, number>>(
    (summary, grant) => ({
      ...summary,
      [grant.role]: summary[grant.role] + 1,
    }),
    { ...grantRoleDefaults },
  );
}

function createReviewSurfaceSummary(projects: WorkspaceSecurityComplianceProjectSource[]) {
  return projectReviewSurfaceKeys.map<WorkspaceSecurityComplianceReviewSurfaceSummary>((surface) => ({
    blockedCount: projects.filter((project) => !getProjectReviewGate(resolveShareSettings(project.shareSettings), surface).allowed).length,
    label: projectReviewSurfaceLabels[surface],
    surface,
  }));
}

function rowRisk(row: Omit<WorkspaceSecurityComplianceProjectRow, "risk">): WorkspaceSecurityComplianceProjectRow["risk"] {
  if (row.artifactBlockedCount > 0 || row.exportBlockedCount > 0 || row.blockedSurfaces.length > 1) {
    return "blocked";
  }

  if (!row.retentionCovered || row.exportDraftCount > 0 || row.artifactCertificateRequiredCount > 0 || row.blockedSurfaces.length > 0) {
    return "watch";
  }

  return "healthy";
}

function createProjectRows(input: {
  appPackageCertificateReport?: ProjectAppPackageCertificateReport;
  artifactRegistryReport: ProjectArtifactRegistryReport;
  exportLineageReports: ProjectExportLineageReport[];
  projects: WorkspaceSecurityComplianceProjectSource[];
  retentionPoliciesByProjectId: Map<string, WorkspaceSecurityComplianceRetentionPolicySource>;
}) {
  const lineageByProjectId = new Map(input.exportLineageReports.map((report) => [report.project.id, report]));
  const artifactEntriesByProjectId = input.artifactRegistryReport.entries.reduce<Map<string, ProjectArtifactRegistryReport["entries"]>>((entries, artifact) => {
    const projectEntries = entries.get(artifact.projectId) ?? [];

    projectEntries.push(artifact);
    entries.set(artifact.projectId, projectEntries);

    return entries;
  }, new Map());
  const certificateRowsByProjectId = input.appPackageCertificateReport?.rows.reduce<Map<string, ProjectAppPackageCertificateReport["rows"]>>((rows, certificateRow) => {
    const projectRows = rows.get(certificateRow.projectId) ?? [];

    projectRows.push(certificateRow);
    rows.set(certificateRow.projectId, projectRows);

    return rows;
  }, new Map());

  return input.projects
    .map<WorkspaceSecurityComplianceProjectRow>((project) => {
      const settings = resolveShareSettings(project.shareSettings);
      const blockedSurfaces = projectReviewSurfaceKeys
        .filter((surface) => !getProjectReviewGate(settings, surface).allowed)
        .map((surface) => projectReviewSurfaceLabels[surface]);
      const policy = input.retentionPoliciesByProjectId.get(project.id);
      const lineageReport = lineageByProjectId.get(project.id);
      const artifactEntries = artifactEntriesByProjectId.get(project.id) ?? [];
      const certificateRows = certificateRowsByProjectId?.get(project.id) ?? null;
      const rowWithoutRisk = {
        artifactBlockedCount: artifactEntries.filter((artifact) => artifact.status === "blocked").length,
        artifactCertificateRequiredCount: certificateRows
          ? certificateRows.filter((row) => row.status !== "valid").length
          : artifactEntries.filter((artifact) => artifact.signatureState === "certificate-required").length,
        blockedSurfaces,
        exportBlockedCount: lineageReport?.summary.blockedCount ?? 0,
        exportDraftCount: lineageReport?.summary.draftCount ?? 0,
        id: project.id,
        name: project.name,
        retentionCovered: Boolean(policy),
        retentionPurgeStatus: policy?.purgeReviewStatus ?? null,
      };

      return {
        ...rowWithoutRisk,
        risk: rowRisk(rowWithoutRisk),
      };
    })
    .sort((first, second) => {
      const riskRank = { blocked: 0, watch: 1, healthy: 2 };

      return riskRank[first.risk] - riskRank[second.risk] || first.name.localeCompare(second.name);
    });
}

function createTrustScore(input: {
  appPackageCertificateReport?: ProjectAppPackageCertificateReport;
  artifactRegistryReport: ProjectArtifactRegistryReport;
  exportLineageReports: ProjectExportLineageReport[];
  projects: WorkspaceSecurityComplianceProjectSource[];
  retentionCoveragePercent: number;
  reviewBlockedSurfaceCount: number;
}) {
  const totalReviewSurfaceCount = input.projects.length * projectReviewSurfaceKeys.length;
  const totalLineageArtifacts = input.exportLineageReports.reduce((sum, report) => sum + report.summary.totalCount, 0);
  const blockedLineageArtifacts = input.exportLineageReports.reduce((sum, report) => sum + report.summary.blockedCount + report.summary.draftCount, 0);
  const blockedRegistryEntries = input.artifactRegistryReport.summary.blockedCount + input.artifactRegistryReport.summary.draftCount;
  const certificateRequiredEntries =
    input.appPackageCertificateReport?.rows.filter((row) => row.status !== "valid").length ??
    input.artifactRegistryReport.entries.filter((entry) => entry.signatureState === "certificate-required").length;
  const certificateRequiredTotal = input.appPackageCertificateReport?.summary.totalRequiredCount ?? input.artifactRegistryReport.summary.signedBundleCount;
  const reviewPenalty = totalReviewSurfaceCount > 0 ? (input.reviewBlockedSurfaceCount / totalReviewSurfaceCount) * 25 : 0;
  const retentionPenalty = ((100 - input.retentionCoveragePercent) / 100) * 25;
  const lineagePenalty = totalLineageArtifacts > 0 ? (blockedLineageArtifacts / totalLineageArtifacts) * 20 : 0;
  const artifactPenalty =
    input.artifactRegistryReport.summary.totalCount > 0 ? (blockedRegistryEntries / input.artifactRegistryReport.summary.totalCount) * 20 : 0;
  const signingPenalty =
    certificateRequiredTotal > 0 ? (certificateRequiredEntries / certificateRequiredTotal) * 10 : 0;

  return clampScore(100 - reviewPenalty - retentionPenalty - lineagePenalty - artifactPenalty - signingPenalty);
}

export function createWorkspaceSecurityComplianceReport(input: CreateWorkspaceSecurityComplianceReportInput): WorkspaceSecurityComplianceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const generatedAtDate = toDate(generatedAt) ?? new Date();
  const activeProjects = input.projects.filter((project) => !isArchived(project.archivedAt));
  const retentionPoliciesByProjectId = new Map(input.retentionPolicies.map((policy) => [policy.projectId, policy]));
  const coveredProjectCount = activeProjects.filter((project) => retentionPoliciesByProjectId.has(project.id)).length;
  const missingProjects = activeProjects.filter((project) => !retentionPoliciesByProjectId.has(project.id)).map((project) => ({ id: project.id, name: project.name }));
  const staleCutoff = new Date(generatedAtDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  const stalePolicyCount = input.retentionPolicies.filter((policy) => {
    const updatedAt = toDate(policy.updatedAt);

    return !updatedAt || updatedAt.getTime() < staleCutoff.getTime();
  }).length;
  const retentionCoveragePercent = percent(coveredProjectCount, activeProjects.length);
  const reviewSurfaces = createReviewSurfaceSummary(activeProjects);
  const reviewBlockedSurfaceCount = reviewSurfaces.reduce((sum, surface) => sum + surface.blockedCount, 0);
  const projectRows = createProjectRows({
    appPackageCertificateReport: input.appPackageCertificateReport,
    artifactRegistryReport: input.artifactRegistryReport,
    exportLineageReports: input.exportLineageReports,
    projects: activeProjects,
    retentionPoliciesByProjectId,
  });
  const allGrants = [...input.projectAccessGrants, ...input.folderAccessGrants];
  const directProjectGrantCount = input.projectAccessGrants.length;
  const folderGrantCount = input.folderAccessGrants.length;

  return {
    generatedAt,
    grants: {
      directProjectGrantCount,
      folderGrantCount,
      roleCounts: countGrantRoles(allGrants),
      totalGrantCount: directProjectGrantCount + folderGrantCount,
    },
    projectRows,
    retention: {
      coveragePercent: retentionCoveragePercent,
      coveredProjectCount,
      missingProjects,
      missingProjectCount: missingProjects.length,
      purgeApprovedCount: input.retentionPolicies.filter((policy) => policy.purgeReviewStatus === "approved").length,
      purgeApprovalRequestedCount: input.retentionPolicies.filter((policy) => policy.purgeReviewStatus === "requested").length,
      stalePolicyCount,
    },
    reviewSurfaces,
    roles: countWorkspaceRoles(input.members),
    summary: {
      activeProjectCount: activeProjects.length,
      artifactBlockedCount: input.artifactRegistryReport.summary.blockedCount,
      exportBlockedCount: input.exportLineageReports.reduce((sum, report) => sum + report.summary.blockedCount, 0),
      exportDraftCount: input.exportLineageReports.reduce((sum, report) => sum + report.summary.draftCount, 0),
      memberCount: input.members.length,
      projectWithBlockerCount: projectRows.filter((row) => row.risk !== "healthy").length,
      signedBundleCertificateRequiredCount:
        input.appPackageCertificateReport?.rows.filter((row) => row.status !== "valid").length ??
        input.artifactRegistryReport.entries.filter((entry) => entry.signatureState === "certificate-required").length,
      totalProjectCount: input.projects.length,
      trustScore: createTrustScore({
        appPackageCertificateReport: input.appPackageCertificateReport,
        artifactRegistryReport: input.artifactRegistryReport,
        exportLineageReports: input.exportLineageReports,
        projects: activeProjects,
        retentionCoveragePercent,
        reviewBlockedSurfaceCount,
      }),
    },
    workspace: input.workspace,
  };
}

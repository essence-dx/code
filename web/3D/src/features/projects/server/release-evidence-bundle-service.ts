import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { project, projectAccessGrant, projectDataRetentionPolicy, projectFolder, projectFolderAccessGrant, projectVersion } from "@/db/schema";
import { createDashboardPostDeploySyntheticSmokeSummary, readPostDeploySyntheticSmokeHistory, readPostDeploySyntheticSmokeReport } from "@/features/deployment/server/post-deploy-synthetic-source";
import { createProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import { createProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { createProjectAuditSearchRows } from "@/features/projects/project-audit-search";
import { createProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import { createProjectComplianceReport } from "@/features/projects/project-compliance-report";
import { createProjectExportLineageReport, type ProjectExportLineageVersionSource } from "@/features/projects/project-export-lineage";
import { createProjectIncidentHistory } from "@/features/projects/project-incident-history";
import { createProjectPublicSurfaceHealthReport, createProjectPublicSurfaceHealthReportFromSnapshots } from "@/features/projects/public-surface-health";
import { createReleaseEvidenceBundle, createReleaseEvidenceBundleDownload } from "@/features/projects/release-evidence-bundle";
import { listProjectAppPackageCertificates } from "@/features/projects/server/app-package-certificate-service";
import { listProjectCadConversionJobs } from "@/features/projects/server/cad-conversion-job-service";
import { loadProjectAuditSnapshot } from "@/features/projects/server/project-audit-service";
import { listProjectPublicSurfaceHealthSnapshots } from "@/features/projects/server/public-surface-health-service";
import { createWorkspaceRiskDigest } from "@/features/projects/workspace-risk-digest";
import { createWorkspaceSecurityComplianceReport } from "@/features/projects/workspace-security-compliance";
import { createWorkspaceReleaseRunbookReport, createWorkspaceReleaseRunbookReportFromRecords } from "@/features/workspaces/release-runbook";
import { listWorkspaceReleaseRunbookRecords } from "@/features/workspaces/server/workspace-release-runbook-service";
import { getWorkspaceDashboard } from "@/features/workspaces/server/workspace-service";
import { createWorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

type ReleaseEvidenceBundleResult =
  | {
      body: string;
      contentDisposition: string;
      contentHash: string;
      contentType: string;
      fileName: string;
    }
  | { error: string; status: 403 | 404 };

const managerRoles = new Set(["admin", "owner"]);

function groupVersionsByProject(versions: Array<ProjectExportLineageVersionSource & { projectId: string }>) {
  return versions.reduce<Map<string, ProjectExportLineageVersionSource[]>>((groups, version) => {
    const entries = groups.get(version.projectId) ?? [];

    entries.push(version);
    groups.set(version.projectId, entries);

    return groups;
  }, new Map());
}

async function listActiveWorkspaceProjects(workspaceId: string) {
  return getDb()
    .select()
    .from(project)
    .where(and(eq(project.workspaceId, workspaceId), isNull(project.archivedAt)))
    .orderBy(desc(project.updatedAt));
}

async function listWorkspaceProjectVersions(projectIds: string[]) {
  if (projectIds.length === 0) {
    return [];
  }

  return getDb()
    .select({
      createdAt: projectVersion.createdAt,
      id: projectVersion.id,
      name: projectVersion.name,
      projectId: projectVersion.projectId,
    })
    .from(projectVersion)
    .where(inArray(projectVersion.projectId, projectIds))
    .orderBy(desc(projectVersion.createdAt))
    .limit(240);
}

async function listWorkspaceGrantsAndRetention(workspaceId: string, projectIds: string[]) {
  const folders = await getDb().select({ id: projectFolder.id }).from(projectFolder).where(eq(projectFolder.workspaceId, workspaceId));
  const folderIds = folders.map((folder) => folder.id);
  const [projectGrants, folderGrants, retentionPolicies] = await Promise.all([
    projectIds.length > 0
      ? getDb()
          .select({ role: projectAccessGrant.role, userId: projectAccessGrant.userId })
          .from(projectAccessGrant)
          .where(inArray(projectAccessGrant.projectId, projectIds))
      : [],
    folderIds.length > 0
      ? getDb()
          .select({ role: projectFolderAccessGrant.role, userId: projectFolderAccessGrant.userId })
          .from(projectFolderAccessGrant)
          .where(inArray(projectFolderAccessGrant.folderId, folderIds))
      : [],
    projectIds.length > 0
      ? getDb()
          .select({
            projectId: projectDataRetentionPolicy.projectId,
            purgeReviewStatus: projectDataRetentionPolicy.purgeReviewStatus,
            updatedAt: projectDataRetentionPolicy.updatedAt,
          })
          .from(projectDataRetentionPolicy)
          .where(inArray(projectDataRetentionPolicy.projectId, projectIds))
      : [],
  ]);

  return {
    folderGrants,
    projectGrants,
    retentionPolicies,
  };
}

export async function createWorkspaceReleaseEvidenceBundleDownload(input: {
  currentUserId: string;
  currentUserName: string | null | undefined;
  origin: string;
  workspaceId: string;
}): Promise<ReleaseEvidenceBundleResult> {
  const workspaceDashboard = await getWorkspaceDashboard(input.currentUserId, input.currentUserName, input.workspaceId).catch(() => null);

  if (!workspaceDashboard) {
    return { error: "Workspace access is required.", status: 403 };
  }

  if (!managerRoles.has(workspaceDashboard.role)) {
    return { error: "Only workspace owners and admins can export release evidence bundles.", status: 403 };
  }

  const now = new Date();
  const generatedAt = now.toISOString();
  const projects = await listActiveWorkspaceProjects(workspaceDashboard.id);

  if (projects.length === 0) {
    return { error: "No active projects are available for a release evidence bundle.", status: 404 };
  }

  const projectIds = projects.map((entry) => entry.id);
  const versionsByProjectId = groupVersionsByProject(await listWorkspaceProjectVersions(projectIds));
  const lineageReports = projects.map((entry) =>
    createProjectExportLineageReport({
      generatedAt,
      origin: input.origin,
      project: entry,
      sceneData: entry.sceneData,
      versions: versionsByProjectId.get(entry.id) ?? [],
    }),
  );
  const artifactRegistryReport = createProjectArtifactRegistryReport({
    generatedAt,
    lineageReports,
  });
  const certificates = await listProjectAppPackageCertificates(projectIds);
  const certificateReport = createProjectAppPackageCertificateReport({
    artifactRegistryReport,
    certificates,
    generatedAt,
    now,
  });
  const cadJobs = await listProjectCadConversionJobs(projectIds);
  const cadConversionQueueReport = createProjectCadConversionQueueReport(cadJobs, generatedAt);
  const publicHealthHistory = await listProjectPublicSurfaceHealthSnapshots({
    currentUserId: input.currentUserId,
    workspaceId: workspaceDashboard.id,
  });
  const publicSurfaceHealthReport =
    "error" in publicHealthHistory || publicHealthHistory.snapshots.length === 0
      ? createProjectPublicSurfaceHealthReport({
          generatedAt,
          lineageReports,
        })
      : createProjectPublicSurfaceHealthReportFromSnapshots(publicHealthHistory.snapshots.slice(0, 160), publicHealthHistory.snapshots, generatedAt);
  const postDeploySmokeReport = readPostDeploySyntheticSmokeReport();
  const postDeploySmokeReports = [
    ...(postDeploySmokeReport ? [postDeploySmokeReport] : []),
    ...readPostDeploySyntheticSmokeHistory().filter((report) => report.generatedAt !== postDeploySmokeReport?.generatedAt),
  ];
  const releaseCalendarReport = createWorkspaceReleaseCalendarReport({
    now,
    postDeploySummary: createDashboardPostDeploySyntheticSmokeSummary(),
    projects,
    releaseReadinessChecklist: null,
    workspaceId: workspaceDashboard.id,
  });
  const runbookHistory = await listWorkspaceReleaseRunbookRecords({
    currentUserId: input.currentUserId,
    workspaceId: workspaceDashboard.id,
  });
  const runbookReport =
    "error" in runbookHistory || runbookHistory.records.length === 0
      ? createWorkspaceReleaseRunbookReport({
          generatedAt,
          members: workspaceDashboard.members,
          releaseCalendar: releaseCalendarReport,
          workspaceId: workspaceDashboard.id,
        })
      : createWorkspaceReleaseRunbookReportFromRecords(runbookHistory.records.slice(0, 160), runbookHistory.records, generatedAt);
  const access = await listWorkspaceGrantsAndRetention(workspaceDashboard.id, projectIds);
  const securityComplianceReport = createWorkspaceSecurityComplianceReport({
    appPackageCertificateReport: certificateReport,
    artifactRegistryReport,
    exportLineageReports: lineageReports,
    folderAccessGrants: access.folderGrants,
    generatedAt,
    members: workspaceDashboard.members,
    projectAccessGrants: access.projectGrants,
    projects,
    retentionPolicies: access.retentionPolicies,
    workspace: {
      id: workspaceDashboard.id,
      name: workspaceDashboard.name,
      role: workspaceDashboard.role,
    },
  });
  const complianceReports = await Promise.all(
    projects.map(async (entry) => {
      const snapshot = await loadProjectAuditSnapshot(entry);

      return createProjectComplianceReport({
        accessGrants: snapshot.accessGrants,
        auditLog: snapshot.auditLog,
        generatedAt,
        origin: input.origin,
        project: entry,
        sceneData: snapshot.sceneData,
        versions: snapshot.versions,
      });
    }),
  );
  const auditRows = createProjectAuditSearchRows(
    complianceReports.map((report) => ({
      auditLog: {
        events: report.audit.events,
        summary: report.audit.summary,
      },
      id: report.project.id,
      name: report.project.name,
    })),
  );
  const riskDigest = createWorkspaceRiskDigest({
    auditRows,
    generatedAt,
    incidents: createProjectIncidentHistory({
      now,
      postDeployReports: postDeploySmokeReports,
      projects,
    }),
    publicHealth: publicSurfaceHealthReport,
    runbook: runbookReport,
    trust: securityComplianceReport,
    workspace: {
      id: workspaceDashboard.id,
      name: workspaceDashboard.name,
      role: workspaceDashboard.role,
    },
  });
  const bundle = createReleaseEvidenceBundle({
    cadConversionQueueReport,
    certificateReport,
    complianceReports,
    generatedAt,
    projectCount: projects.length,
    publicSurfaceHealthReport,
    riskDigest,
    runbookReport,
  });

  return createReleaseEvidenceBundleDownload(bundle);
}

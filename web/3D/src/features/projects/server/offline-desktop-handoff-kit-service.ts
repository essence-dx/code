import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { project, projectVersion } from "@/db/schema";
import { createProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import { createProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { createDesktopSigningPlan } from "@/features/projects/desktop-signing-workflow";
import { createOfflineDesktopHandoffKit, createOfflineDesktopHandoffKitDownload } from "@/features/projects/offline-desktop-handoff-kit";
import { createProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { listProjectAppPackageCertificates } from "@/features/projects/server/app-package-certificate-service";
import { listProjectCadConversionJobs } from "@/features/projects/server/cad-conversion-job-service";
import { createDesktopReleaseOperationsSnapshot } from "@/features/projects/server/desktop-release-source";
import { getWorkspaceDashboard } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type OfflineDesktopHandoffKitResult =
  | {
      body: string;
      contentHash: string;
      fileName: string;
      mimeType: "application/json;charset=utf-8";
    }
  | {
      error: string;
      status: 403 | 404;
    };

const managerRoles = new Set<WorkspaceRole>(["admin", "owner"]);

async function listWorkspaceProjects(workspaceId: string) {
  return getDb().select().from(project).where(eq(project.workspaceId, workspaceId)).orderBy(desc(project.updatedAt));
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

export async function createWorkspaceOfflineDesktopHandoffKitDownload(input: {
  currentUserId: string;
  currentUserName: string;
  origin: string;
  workspaceId: string;
}): Promise<OfflineDesktopHandoffKitResult> {
  const workspaceDashboard = await getWorkspaceDashboard(input.currentUserId, input.currentUserName, input.workspaceId).catch(() => null);

  if (!workspaceDashboard) {
    return { error: "Workspace access is required.", status: 403 };
  }

  if (!managerRoles.has(workspaceDashboard.role)) {
    return { error: "Only workspace owners and admins can export offline desktop handoff kits.", status: 403 };
  }

  const projects = (await listWorkspaceProjects(workspaceDashboard.id)).filter((entry) => !entry.archivedAt);

  if (projects.length === 0) {
    return { error: "No active projects are available for an offline desktop handoff kit.", status: 404 };
  }

  const projectIds = projects.map((entry) => entry.id);
  const versions = await listWorkspaceProjectVersions(projectIds);
  const versionsByProjectId = versions.reduce<Map<string, typeof versions>>((groups, version) => {
    const entries = groups.get(version.projectId) ?? [];

    entries.push(version);
    groups.set(version.projectId, entries);

    return groups;
  }, new Map());
  const lineageReports = projects.map((entry) =>
    createProjectExportLineageReport({
      origin: input.origin,
      project: entry,
      sceneData: entry.sceneData,
      versions: versionsByProjectId.get(entry.id) ?? [],
    }),
  );
  const artifactRegistryReport = createProjectArtifactRegistryReport({ lineageReports });
  const certificateReport = createProjectAppPackageCertificateReport({
    artifactRegistryReport,
    certificates: await listProjectAppPackageCertificates(projectIds),
  });
  const cadConversionQueueReport = createProjectCadConversionQueueReport(await listProjectCadConversionJobs(projectIds));
  const desktopRelease = createDesktopReleaseOperationsSnapshot(input.origin);
  const signingPlan = createDesktopSigningPlan(process.env);
  const kit = createOfflineDesktopHandoffKit({
    appPackageCertificateReport: certificateReport,
    cadConversionQueueReport,
    metadata: desktopRelease.metadata,
    releaseOperationsDashboard: desktopRelease.dashboard,
    scan: desktopRelease.scan,
    signingPlan,
    workspace: {
      id: workspaceDashboard.id,
      name: workspaceDashboard.name,
      role: workspaceDashboard.role,
    },
  });

  return createOfflineDesktopHandoffKitDownload(kit);
}

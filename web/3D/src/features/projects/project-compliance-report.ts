import { createExportManifest } from "@/features/editor/utils/export-manifest";
import type { SceneDocument } from "@/features/editor/types";
import type { ProjectAuditAccessGrantSource, ProjectAuditProjectSource } from "./project-audit-log";
import { createProjectExportLineageReport, type ProjectExportLineageReport, type ProjectExportLineageVersionSource } from "./project-export-lineage";
import { getProjectReviewGate, type ProjectReviewGate } from "./project-review-gates";
import {
  projectReviewSurfaceKeys,
  projectReviewSurfaceLabels,
  resolveShareSettings,
  type SharePermission,
  type ShareSettings,
} from "./share-settings";
import type { ProjectAuditLog } from "./types";

type DateLike = Date | string | null | undefined;

const sharePermissionLabels: Record<SharePermission, string> = {
  allowCodeExport: "Code snippets",
  allowEmbed: "Embeds",
  allowPublicApi: "Scene API",
  allowView: "Public viewer",
  allowViewerDownload: "Viewer and app package downloads",
};

export interface ProjectComplianceReportInput {
  accessGrants: ProjectAuditAccessGrantSource[];
  auditLog: ProjectAuditLog;
  generatedAt?: string;
  origin?: string | null;
  project: ProjectAuditProjectSource;
  sceneData: SceneDocument | null;
  versions?: ProjectExportLineageVersionSource[];
}

export interface ProjectComplianceReport {
  audit: {
    eventCount: number;
    events: ProjectAuditLog["events"];
    summary: ProjectAuditLog["summary"];
  };
  exports: {
    available: boolean;
    capabilities: ReturnType<typeof createExportManifest>["capabilities"] | null;
    generatedAt: string | null;
    optimization: ReturnType<typeof createExportManifest>["optimization"] | null;
    readiness: ReturnType<typeof createExportManifest>["readiness"] | null;
    scenes: ReturnType<typeof createExportManifest>["scenes"];
    summary: ReturnType<typeof createExportManifest>["summary"] | null;
    supportedExports: string[];
    supportedImports: string[];
  };
  generatedAt: string;
  lineage: ProjectExportLineageReport;
  permissions: {
    accessGrantCount: number;
    grants: Array<{
      createdAt: string | null;
      email: string;
      id: string;
      name: string | null;
      role: string;
      updatedAt: string | null;
      userId: string;
    }>;
    ownerUserId: string;
  };
  project: {
    archivedAt: string | null;
    createdAt: string | null;
    description: string;
    id: string;
    name: string;
    publishedAt: string | null;
    shareId: string | null;
    updatedAt: string | null;
  };
  publishing: {
    published: boolean;
    shareId: string | null;
    sharePermissions: Array<{
      allowed: boolean;
      label: string;
      permission: SharePermission;
    }>;
  };
  release: {
    appPackage: ProjectReviewGate;
    blockers: string[];
    desktopRelease: ProjectReviewGate;
    ready: boolean;
  };
  review: {
    approvedCount: number;
    blockers: string[];
    surfaceCount: number;
    surfaces: Array<ProjectReviewGate & {
      note?: string;
      reviewerName?: string;
      updatedAt?: string;
    }>;
  };
  schemaVersion: 1;
}

function toIso(value: DateLike) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getSharePermissions(settings: ShareSettings) {
  return (Object.keys(sharePermissionLabels) as SharePermission[]).map((permission) => ({
    allowed: Boolean(settings[permission]),
    label: sharePermissionLabels[permission],
    permission,
  }));
}

function getReviewSurfaces(settings: ShareSettings) {
  return projectReviewSurfaceKeys.map((surface) => {
    const decision = settings.reviewWorkflow[surface];

    return {
      ...getProjectReviewGate(settings, surface),
      note: decision.note,
      reviewerName: decision.reviewerName,
      updatedAt: decision.updatedAt,
    };
  });
}

function getProjectFileSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "essence-spline-project"
  );
}

export function getProjectComplianceFileName(projectName: string) {
  return `${getProjectFileSlug(projectName)}-compliance-report.json`;
}

export function createProjectComplianceReport(input: ProjectComplianceReportInput): ProjectComplianceReport {
  const settings = resolveShareSettings(input.project.shareSettings);
  const exportManifest = input.sceneData ? createExportManifest(input.sceneData) : null;
  const reviewSurfaces = getReviewSurfaces(settings);
  const reviewBlockers = reviewSurfaces.filter((surface) => !surface.allowed).map((surface) => `${projectReviewSurfaceLabels[surface.surface]} is ${surface.status}.`);
  const desktopRelease = getProjectReviewGate(settings, "desktopRelease");
  const appPackage = getProjectReviewGate(settings, "appPackage");
  const releaseBlockers = [desktopRelease, appPackage].filter((gate) => !gate.allowed).map((gate) => gate.message);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const lineage = createProjectExportLineageReport({
    generatedAt,
    origin: input.origin,
    project: input.project,
    sceneData: input.sceneData,
    versions: input.versions,
  });

  return {
    audit: {
      eventCount: input.auditLog.events.length,
      events: input.auditLog.events,
      summary: input.auditLog.summary,
    },
    exports: {
      available: Boolean(exportManifest),
      capabilities: exportManifest?.capabilities ?? null,
      generatedAt: exportManifest?.generatedAt ?? null,
      optimization: exportManifest?.optimization ?? null,
      readiness: exportManifest?.readiness ?? null,
      scenes: exportManifest?.scenes ?? [],
      summary: exportManifest?.summary ?? null,
      supportedExports: exportManifest?.supportedExports ?? [],
      supportedImports: exportManifest?.supportedImports ?? [],
    },
    generatedAt,
    lineage,
    permissions: {
      accessGrantCount: input.accessGrants.length,
      grants: input.accessGrants.map((grant) => ({
        createdAt: toIso(grant.createdAt),
        email: grant.email,
        id: grant.id,
        name: grant.name,
        role: grant.role,
        updatedAt: toIso(grant.updatedAt),
        userId: grant.userId,
      })),
      ownerUserId: input.project.userId,
    },
    project: {
      archivedAt: toIso(input.project.archivedAt),
      createdAt: toIso(input.project.createdAt),
      description: input.project.description,
      id: input.project.id,
      name: input.project.name,
      publishedAt: toIso(input.project.publishedAt),
      shareId: input.project.shareId,
      updatedAt: toIso(input.project.updatedAt),
    },
    publishing: {
      published: Boolean(input.project.publishedAt && input.project.shareId),
      shareId: input.project.shareId,
      sharePermissions: getSharePermissions(settings),
    },
    release: {
      appPackage,
      blockers: releaseBlockers,
      desktopRelease,
      ready: releaseBlockers.length === 0,
    },
    review: {
      approvedCount: reviewSurfaces.filter((surface) => surface.allowed).length,
      blockers: reviewBlockers,
      surfaceCount: reviewSurfaces.length,
      surfaces: reviewSurfaces,
    },
    schemaVersion: 1,
  };
}

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createWorkspaceBackupRestoreCenter } from "@/features/operations/workspace-backup-restore";

describe("workspace backup restore center", () => {
  test("creates a manifest, integrity checks, dry-run restore report, and rollback playbooks", () => {
    const launchProject = createProject({
      id: "project-launch",
      name: "Launch system",
      publicShareId: "public-launch",
      updatedAt: "2026-05-18T09:00:00.000Z",
    });
    const missingSnapshotProject = createProject({
      id: "project-missing-snapshot",
      name: "Missing snapshot",
      approvalStatus: "in-review",
      updatedAt: "2026-05-18T10:00:00.000Z",
    });
    const center = createWorkspaceBackupRestoreCenter({
      projects: [launchProject, missingSnapshotProject],
      templates: [createTemplate()],
      projectVersions: [
        createVersion({
          id: "version-launch",
          projectId: launchProject.id,
          createdAt: "2026-05-18T09:05:00.000Z",
        }),
      ],
      serverExportJobs: [
        createExportJob({
          id: "export-launch",
          projectId: launchProject.id,
          completedAt: "2026-05-18T09:08:00.000Z",
          updatedAt: "2026-05-18T09:08:00.000Z",
        }),
        createExportJob({
          id: "export-failed",
          projectId: missingSnapshotProject.id,
          status: "failed",
          failureMessage: "Renderer timed out",
          completedAt: null,
          updatedAt: "2026-05-18T10:06:00.000Z",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "website-launch",
          projectId: launchProject.id,
          customDomains: [
            createDomain({
              id: "domain-good",
              status: "verified",
              platformStatus: "attached",
            }),
          ],
        }),
        createWebsitePublish({
          id: "website-review",
          projectId: missingSnapshotProject.id,
          customDomains: [
            createDomain({
              id: "domain-bad",
              status: "pending",
              platformStatus: "error",
              platformError: "DNS record missing",
            }),
          ],
        }),
      ],
      websiteFormSubmissions: [
        {
          id: "submission-1",
          publishId: "website-launch",
          projectId: launchProject.id,
          websiteTitle: "Launch",
          sectionId: "contact",
          payload: { email: "customer@example.com" },
          createdAt: "2026-05-18T09:10:00.000Z",
        },
      ],
      campaigns: [
        createCampaign({
          deliverables: [
            createDeliverable({
              id: "deliverable-launch",
              projectId: launchProject.id,
              projectName: launchProject.name,
            }),
            createDeliverable({
              id: "deliverable-orphan",
              projectId: "missing-project",
              projectName: "Removed project",
            }),
          ],
        }),
      ],
      assetAudit: createAssetAudit({
        skippedProjectReferenceCount: 2,
      }),
      auditLogs: [
        {
          id: "audit-1",
          action: "project.created",
          targetType: "project",
          targetId: launchProject.id,
          summary: "Created launch system",
          actorEmail: "studio@example.com",
          metadata: {},
          createdAt: "2026-05-18T08:00:00.000Z",
        },
      ],
    });

    assert.equal(center.manifest.kind, "essence-studio.workspace-backup");
    assert.equal(center.manifest.counts.activeProjects, 2);
    assert.equal(center.manifest.counts.templates, 1);
    assert.equal(center.manifest.counts.websites, 2);
    assert.equal(center.manifest.counts.formSubmissions, 1);
    assert.equal(center.manifest.generatedAt, "2026-05-18T10:06:00.000Z");
    assert.equal(
      center.manifestDownload.fileName,
      "workspace-backup-2026-05-18.json",
    );
    assert.equal(
      center.manifestDownload.href.startsWith("data:application/json"),
      true,
    );

    const launchSnapshot = center.manifest.projectSnapshots.find(
      (snapshot) => snapshot.projectId === launchProject.id,
    );
    assert.equal(launchSnapshot?.latestVersionId, "version-launch");
    assert.equal(launchSnapshot?.latestCompletedExportId, "export-launch");
    assert.equal(launchSnapshot?.publicSurfaceCount, 2);

    assert.equal(center.status, "blocked");
    assert.equal(
      center.integrityChecks.find((check) => check.id === "version-snapshots")
        ?.status,
      "blocked",
    );
    assert.equal(
      center.integrityChecks.find((check) => check.id === "website-domains")
        ?.affectedCount,
      1,
    );
    assert.equal(
      center.integrityChecks.find((check) => check.id === "campaign-links")
        ?.status,
      "blocked",
    );

    assert.equal(center.dryRun.summary.restorableProjects, 1);
    assert.equal(center.dryRun.summary.blockedProjects, 1);
    assert.equal(
      center.dryRun.projects.find(
        (project) => project.projectId === missingSnapshotProject.id,
      )?.status,
      "blocked",
    );
    assert.equal(
      center.rollbackPlaybooks.some(
        (playbook) => playbook.id === "project-version-rollback",
      ),
      true,
    );
    assert.equal(
      center.rollbackPlaybooks.some(
        (playbook) => playbook.id === "export-artifact-rollback",
      ),
      true,
    );
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Create version snapshots"),
      ),
      true,
    );
  });

  test("marks a fully snapshotted workspace ready for backup and restore", () => {
    const project = createProject({
      id: "project-ready",
      name: "Ready launch",
      publicShareId: "public-ready",
      updatedAt: "2026-05-18T11:00:00.000Z",
    });
    const center = createWorkspaceBackupRestoreCenter({
      projects: [project],
      templates: [createTemplate({ marketplaceStatus: "published" })],
      projectVersions: [
        createVersion({
          projectId: project.id,
          createdAt: "2026-05-18T11:01:00.000Z",
        }),
      ],
      serverExportJobs: [
        createExportJob({
          projectId: project.id,
          updatedAt: "2026-05-18T11:02:00.000Z",
          completedAt: "2026-05-18T11:02:00.000Z",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          projectId: project.id,
          customDomains: [
            createDomain({
              status: "verified",
              platformStatus: "attached",
            }),
          ],
        }),
      ],
      websiteFormSubmissions: [],
      campaigns: [
        createCampaign({
          deliverables: [
            createDeliverable({
              projectId: project.id,
              projectName: project.name,
              status: "done",
            }),
          ],
        }),
      ],
      assetAudit: createAssetAudit(),
      auditLogs: [
        {
          id: "audit-ready",
          action: "project.created",
          targetType: "project",
          targetId: project.id,
          summary: "Created ready launch",
          actorEmail: "studio@example.com",
          metadata: {},
          createdAt: "2026-05-18T10:00:00.000Z",
        },
      ],
    });

    assert.equal(center.status, "ready");
    assert.equal(center.score >= 90, true);
    assert.equal(
      center.integrityChecks.every((check) => check.status === "ready"),
      true,
    );
    assert.equal(center.dryRun.summary.restorableProjects, 1);
    assert.equal(center.dryRun.summary.blockedProjects, 0);
    assert.equal(center.dryRun.summary.restorableWebsites, 1);
    assert.equal(
      center.rollbackPlaybooks.every((playbook) => playbook.targets > 0),
      true,
    );
    assert.deepEqual(center.nextActions, []);
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project",
    name: "Project",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Launch template",
    creatorName: "Studio",
    creatorEmail: "studio@example.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "draft",
    marketplaceCollection: "Launch",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: null,
    marketplaceUseCount: 0,
    marketplaceViewCount: 0,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version",
    projectId: "project",
    name: "Snapshot",
    thumbnail: null,
    createdAt: "2026-05-18T08:01:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export",
    projectId: "project",
    projectName: "Project",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "project.pdf",
    status: "completed",
    progress: 100,
    artifactName: "project.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 42_000,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:02:00.000Z",
    completedAt: "2026-05-18T08:02:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "website",
    projectId: "project",
    projectName: "Project",
    slug: "project",
    title: "Project",
    seoTitle: "Project",
    seoDescription: "Project website",
    status: "published",
    publishedAt: "2026-05-18T08:03:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:03:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createDomain(
  overrides: Partial<WebsitePublishSummary["customDomains"][number]> = {},
): WebsitePublishSummary["customDomains"][number] {
  return {
    id: "domain",
    publishId: "website",
    projectId: "project",
    domain: "launch.example.com",
    status: "pending",
    verificationName: "_essence",
    verificationValue: "verify",
    verifiedAt: null,
    platformStatus: "manual",
    platformError: null,
    platformAttachedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign",
    name: "Launch campaign",
    brief: "Launch",
    goal: "Awareness",
    audience: "Customers",
    status: "active",
    primaryBrandColor: null,
    brandLogoName: null,
    brandFontFamily: null,
    launchAt: null,
    deliverables: [],
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createDeliverable(
  overrides: Partial<CampaignBoardSummary["deliverables"][number]> = {},
): CampaignBoardSummary["deliverables"][number] {
  return {
    id: "deliverable",
    projectId: "project",
    projectName: "Project",
    projectThumbnail: null,
    projectWidth: 1080,
    projectHeight: 1080,
    projectSourceProjectId: null,
    projectVariantProfileId: null,
    projectVariantName: null,
    role: "Social post",
    channel: "social",
    status: "planned",
    approvalStatus: "approved",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createAssetAudit(
  overrides: Partial<AssetLibraryAudit> = {},
): AssetLibraryAudit {
  return {
    quotaBytes: 250_000_000,
    totalBytes: 120_000,
    usagePercent: 0.1,
    assetCount: 4,
    duplicateCount: 0,
    duplicateBytes: 0,
    projectManifestCount: 6,
    skippedProjectReferenceCount: 0,
    scopes: [
      {
        scope: "uploads",
        label: "Uploads",
        count: 2,
        totalBytes: 40_000,
      },
      {
        scope: "brand",
        label: "Brand",
        count: 1,
        totalBytes: 20_000,
      },
      {
        scope: "projects",
        label: "Project assets",
        count: 6,
        totalBytes: 60_000,
      },
    ],
    records: [],
    largestAssets: [],
    duplicateGroups: [],
    ...overrides,
  };
}

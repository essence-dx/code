import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { ProjectSummary } from "@/features/editor/types";
import type {
  WorkspaceBackupManifest,
  WorkspaceBackupRestoreContext,
} from "@/features/operations/workspace-backup-restore-types";
import {
  createLatestCompletedExportMap,
  createLatestVersionMap,
  createProjectRestoreStatus,
  createStableFingerprint,
  groupExportFailures,
  latestTimestamp,
  sortByNewest,
} from "@/features/operations/workspace-backup-restore-utils";

export function createBackupManifest(
  context: WorkspaceBackupRestoreContext,
): WorkspaceBackupManifest {
  const latestVersions = createLatestVersionMap(context.projectVersions);
  const latestCompletedExports = createLatestCompletedExportMap(
    context.serverExportJobs,
  );
  const failedExports = groupExportFailures(context.serverExportJobs);
  const websitesByProject = createWebsitesByProject(context.websitePublishes);
  const campaignDeliverablesByProject = createCampaignDeliverablesByProject(
    context.campaigns,
  );
  const projectSnapshots = sortByNewest(
    context.activeProjects.map((project) => {
      const latestVersion = latestVersions.get(project.id) ?? null;
      const latestExport = latestCompletedExports.get(project.id) ?? null;
      const projectWebsites = websitesByProject.get(project.id) ?? [];
      const campaignDeliverables =
        campaignDeliverablesByProject.get(project.id) ?? [];
      const failedExportCount = failedExports.get(project.id)?.length ?? 0;
      const publicSurfaceCount =
        (project.publicShareId ? 1 : 0) +
        (project.editShareId && project.editSharePermission === "edit"
          ? 1
          : 0) +
        projectWebsites.filter((website) => website.status === "published")
          .length;

      return {
        projectId: project.id,
        name: project.name,
        dimensions: `${project.width}x${project.height}`,
        approvalStatus: project.approvalStatus,
        updatedAt: project.updatedAt,
        latestVersionId: latestVersion?.id ?? null,
        latestVersionAt: latestVersion?.createdAt ?? null,
        latestCompletedExportId: latestExport?.id ?? null,
        latestCompletedExportAt: latestExport?.completedAt ?? null,
        failedExportCount,
        websiteCount: projectWebsites.length,
        campaignDeliverableCount: campaignDeliverables.length,
        publicSurfaceCount,
        restoreStatus: createProjectRestoreStatus({
          latestVersionId: latestVersion?.id ?? null,
          latestCompletedExportId: latestExport?.id ?? null,
          failedExportCount,
        }),
      };
    }),
    (snapshot) => snapshot.updatedAt,
  );
  const templateSnapshots = sortByNewest(
    context.templates.map((template) => ({
      templateId: template.id,
      name: template.name,
      marketplaceStatus: template.marketplaceStatus,
      approvalStatus: template.approvalStatus,
      updatedAt: template.updatedAt,
      included: template.marketplaceStatus !== "archived",
    })),
    (snapshot) => snapshot.updatedAt,
  );
  const websiteSnapshots = sortByNewest(
    context.websitePublishes.map((website) => createWebsiteSnapshot(website)),
    (snapshot) =>
      context.websitePublishes.find(
        (website) => website.id === snapshot.publishId,
      )?.updatedAt,
  );
  const campaignSnapshots = sortByNewest(
    context.campaigns.map((campaign) =>
      createCampaignSnapshot(campaign, context.activeProjects),
    ),
    (snapshot) =>
      context.campaigns.find((campaign) => campaign.id === snapshot.campaignId)
        ?.updatedAt,
  );
  const generatedAt = latestTimestamp([
    ...context.projects.map((project) => project.updatedAt),
    ...context.templates.map((template) => template.updatedAt),
    ...context.projectVersions.map((version) => version.createdAt),
    ...context.serverExportJobs.map((job) => job.updatedAt),
    ...context.serverExportJobs.map((job) => job.completedAt),
    ...context.websitePublishes.map((publish) => publish.updatedAt),
    ...context.websitePublishes.flatMap((publish) =>
      publish.customDomains.map((domain) => domain.updatedAt),
    ),
    ...context.websiteFormSubmissions.map((submission) => submission.createdAt),
    ...context.campaigns.map((campaign) => campaign.updatedAt),
    ...context.auditLogs.map((log) => log.createdAt),
    ...context.assetAudit.records.map((record) => record.updatedAt),
  ]);
  const counts = {
    activeProjects: context.activeProjects.length,
    deletedProjects: context.deletedProjects.length,
    templates: context.templates.length,
    projectVersions: context.projectVersions.length,
    completedExports: context.serverExportJobs.filter(
      (job) => job.status === "completed",
    ).length,
    failedExports: context.serverExportJobs.filter(
      (job) => job.status === "failed",
    ).length,
    websites: context.websitePublishes.length,
    customDomains: context.websitePublishes.reduce(
      (total, publish) => total + publish.customDomains.length,
      0,
    ),
    formSubmissions: context.websiteFormSubmissions.length,
    campaigns: context.campaigns.length,
    campaignDeliverables: context.campaigns.reduce(
      (total, campaign) => total + campaign.deliverables.length,
      0,
    ),
    assetRecords: context.assetAudit.records.length,
    projectAssetReferences: context.assetAudit.projectManifestCount,
    auditLogs: context.auditLogs.length,
  };

  return {
    kind: "essence-studio.workspace-backup",
    schemaVersion: 1,
    generatedAt,
    fingerprint: createStableFingerprint([
      generatedAt,
      ...context.projects.map(
        (project) => `${project.id}:${project.updatedAt}`,
      ),
      ...context.templates.map(
        (template) => `${template.id}:${template.updatedAt}`,
      ),
      ...context.serverExportJobs.map((job) => `${job.id}:${job.updatedAt}`),
      ...context.websitePublishes.map(
        (publish) => `${publish.id}:${publish.updatedAt}`,
      ),
      ...context.campaigns.map(
        (campaign) => `${campaign.id}:${campaign.updatedAt}`,
      ),
    ]),
    counts,
    projectSnapshots,
    templateSnapshots,
    websiteSnapshots,
    campaignSnapshots,
    assetSummary: {
      quotaBytes: context.assetAudit.quotaBytes,
      totalBytes: context.assetAudit.totalBytes,
      assetCount: context.assetAudit.assetCount,
      duplicateCount: context.assetAudit.duplicateCount,
      duplicateBytes: context.assetAudit.duplicateBytes,
      projectManifestCount: context.assetAudit.projectManifestCount,
      skippedProjectReferenceCount:
        context.assetAudit.skippedProjectReferenceCount,
    },
    auditSummary: {
      totalLogs: context.auditLogs.length,
      latestActivityAt:
        sortByNewest(context.auditLogs, (log) => log.createdAt)[0]?.createdAt ??
        null,
      actionKinds: [
        ...new Set(context.auditLogs.map((log) => log.action)),
      ].sort(),
    },
  };
}

function createWebsiteSnapshot(website: WebsitePublishSummary) {
  const platformErrorCount = website.customDomains.filter(
    (domain) => domain.platformStatus === "error",
  ).length;
  const verifiedDomainCount = website.customDomains.filter(
    (domain) =>
      domain.status === "verified" && domain.platformStatus === "attached",
  ).length;

  return {
    publishId: website.id,
    projectId: website.projectId,
    title: website.title,
    slug: website.slug,
    status: website.status,
    domainCount: website.customDomains.length,
    verifiedDomainCount,
    platformErrorCount,
    restoreStatus:
      platformErrorCount > 0
        ? "blocked"
        : verifiedDomainCount === website.customDomains.length
          ? "ready"
          : "review",
  } satisfies WorkspaceBackupManifest["websiteSnapshots"][number];
}

function createCampaignSnapshot(
  campaign: CampaignBoardSummary,
  activeProjects: ProjectSummary[],
) {
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const linkedDeliverables = campaign.deliverables.filter(
    (deliverable) =>
      deliverable.projectId && activeProjectIds.has(deliverable.projectId),
  );

  return {
    campaignId: campaign.id,
    name: campaign.name,
    status: campaign.status,
    deliverableCount: campaign.deliverables.length,
    linkedDeliverableCount: linkedDeliverables.length,
    restoreStatus:
      linkedDeliverables.length === campaign.deliverables.length
        ? "ready"
        : "blocked",
  } satisfies WorkspaceBackupManifest["campaignSnapshots"][number];
}

function createWebsitesByProject(websites: WebsitePublishSummary[]) {
  const websitesByProject = new Map<string, WebsitePublishSummary[]>();

  for (const website of websites) {
    const existing = websitesByProject.get(website.projectId) ?? [];
    existing.push(website);
    websitesByProject.set(website.projectId, existing);
  }

  return websitesByProject;
}

function createCampaignDeliverablesByProject(
  campaigns: CampaignBoardSummary[],
) {
  const deliverablesByProject = new Map<
    string,
    CampaignBoardSummary["deliverables"]
  >();

  for (const campaign of campaigns) {
    for (const deliverable of campaign.deliverables) {
      if (!deliverable.projectId) continue;

      const existing = deliverablesByProject.get(deliverable.projectId) ?? [];
      existing.push(deliverable);
      deliverablesByProject.set(deliverable.projectId, existing);
    }
  }

  return deliverablesByProject;
}

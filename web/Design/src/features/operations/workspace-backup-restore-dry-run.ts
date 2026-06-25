import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { ProjectSummary } from "@/features/editor/types";
import type {
  WorkspaceBackupManifest,
  WorkspaceBackupRestoreContext,
  WorkspaceBackupRestoreStatus,
  WorkspaceRestoreCampaignDryRun,
  WorkspaceRestoreDryRunReport,
  WorkspaceRestoreProjectDryRun,
  WorkspaceRestoreWebsiteDryRun,
} from "@/features/operations/workspace-backup-restore-types";
import {
  averageScore,
  createProjectRestoreStatus,
  statusToScore,
  timestamp,
  worstStatus,
} from "@/features/operations/workspace-backup-restore-utils";

export function createDryRunReport(
  context: WorkspaceBackupRestoreContext,
  manifest: WorkspaceBackupManifest,
): WorkspaceRestoreDryRunReport {
  const projectRows = createProjectDryRunRows(context, manifest);
  const websiteRows = context.websitePublishes.map((website) =>
    createWebsiteDryRunRow(website, context.activeProjects),
  );
  const campaignRows = context.campaigns.map((campaign) =>
    createCampaignDryRunRow(campaign, context.activeProjects),
  );
  const statuses = [
    ...projectRows.map((row) => row.status),
    ...websiteRows.map((row) => row.status),
    ...campaignRows.map((row) => row.status),
  ];
  const status = worstStatus(statuses);

  return {
    status,
    score: averageScore(statuses.map(statusToScore)),
    summary: {
      restorableProjects: projectRows.filter((row) => row.status === "ready")
        .length,
      needsReviewProjects: projectRows.filter((row) => row.status === "review")
        .length,
      blockedProjects: projectRows.filter((row) => row.status === "blocked")
        .length,
      restorableTemplates: manifest.templateSnapshots.filter(
        (snapshot) => snapshot.included,
      ).length,
      restorableWebsites: websiteRows.filter((row) => row.status === "ready")
        .length,
      restorableCampaigns: campaignRows.filter((row) => row.status === "ready")
        .length,
      skippedDeletedProjects: context.deletedProjects.length,
    },
    projects: projectRows,
    websites: websiteRows,
    campaigns: campaignRows,
  };
}

function createProjectDryRunRows(
  context: WorkspaceBackupRestoreContext,
  manifest: WorkspaceBackupManifest,
): WorkspaceRestoreProjectDryRun[] {
  const createdOrder = [...context.activeProjects].sort(
    (left, right) => timestamp(left.createdAt) - timestamp(right.createdAt),
  );
  const orderByProject = new Map(
    createdOrder.map((project, index) => [project.id, index + 1]),
  );

  return manifest.projectSnapshots.map((snapshot) => {
    const missingVersion = !snapshot.latestVersionId;
    const missingExport = !snapshot.latestCompletedExportId;
    const status = createProjectRestoreStatus(snapshot);

    return {
      projectId: snapshot.projectId,
      name: snapshot.name,
      restoreOrder: orderByProject.get(snapshot.projectId) ?? 1,
      status,
      latestVersionId: snapshot.latestVersionId,
      latestCompletedExportId: snapshot.latestCompletedExportId,
      reason:
        status === "ready"
          ? "Version snapshot and export artifact are ready."
          : missingVersion && missingExport
            ? "Missing version snapshot and completed export artifact."
            : missingVersion
              ? "Missing version snapshot for rollback."
              : "Missing completed export artifact for handoff restore.",
    };
  });
}

function createWebsiteDryRunRow(
  website: WebsitePublishSummary,
  activeProjects: ProjectSummary[],
): WorkspaceRestoreWebsiteDryRun {
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const badDomains = website.customDomains.filter(
    (domain) =>
      domain.status !== "verified" || domain.platformStatus !== "attached",
  );
  const hasPlatformError = badDomains.some(
    (domain) => domain.platformStatus === "error",
  );
  const status: WorkspaceBackupRestoreStatus = !activeProjectIds.has(
    website.projectId,
  )
    ? "blocked"
    : hasPlatformError
      ? "blocked"
      : badDomains.length || website.status !== "published"
        ? "review"
        : "ready";

  return {
    publishId: website.id,
    title: website.title,
    status,
    reason:
      status === "ready"
        ? "Published website and domains can be restored."
        : !activeProjectIds.has(website.projectId)
          ? "Source project is missing or deleted."
          : hasPlatformError
            ? "Domain platform status must be repaired."
            : "Website publish state or DNS verification needs review.",
  };
}

function createCampaignDryRunRow(
  campaign: CampaignBoardSummary,
  activeProjects: ProjectSummary[],
): WorkspaceRestoreCampaignDryRun {
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const invalidDeliverables = campaign.deliverables.filter(
    (deliverable) =>
      !deliverable.projectId || !activeProjectIds.has(deliverable.projectId),
  );
  const status: WorkspaceBackupRestoreStatus = invalidDeliverables.length
    ? "blocked"
    : campaign.deliverables.length
      ? "ready"
      : "review";

  return {
    campaignId: campaign.id,
    name: campaign.name,
    status,
    reason:
      status === "ready"
        ? "Campaign deliverables can be reconnected to active projects."
        : invalidDeliverables.length
          ? "Some deliverables point to missing or deleted projects."
          : "Campaign has no deliverables to restore.",
  };
}

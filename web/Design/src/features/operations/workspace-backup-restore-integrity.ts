import type {
  WorkspaceBackupIntegrityCheck,
  WorkspaceBackupManifest,
  WorkspaceBackupRestoreContext,
} from "@/features/operations/workspace-backup-restore-types";
import {
  createLatestCompletedExportMap,
  createLatestVersionMap,
  pluralize,
} from "@/features/operations/workspace-backup-restore-utils";

export function createIntegrityChecks(
  context: WorkspaceBackupRestoreContext,
  manifest: WorkspaceBackupManifest,
): WorkspaceBackupIntegrityCheck[] {
  const latestVersions = createLatestVersionMap(context.projectVersions);
  const latestExports = createLatestCompletedExportMap(
    context.serverExportJobs,
  );
  const activeProjectIds = new Set(
    context.activeProjects.map((project) => project.id),
  );
  const missingVersionProjects = context.activeProjects.filter(
    (project) => !latestVersions.has(project.id),
  );
  const missingExportProjects = context.activeProjects.filter(
    (project) => !latestExports.has(project.id),
  );
  const failedExportProjects = new Set(
    context.serverExportJobs
      .filter((job) => job.status === "failed")
      .map((job) => job.projectId),
  );
  const brokenDomains = context.websitePublishes.flatMap((publish) =>
    publish.customDomains
      .filter(
        (domain) =>
          domain.status !== "verified" || domain.platformStatus !== "attached",
      )
      .map((domain) => ({
        publish,
        domain,
      })),
  );
  const hasDomainPlatformError = brokenDomains.some(
    ({ domain }) => domain.platformStatus === "error",
  );
  const brokenCampaignDeliverables = context.campaigns.flatMap((campaign) =>
    campaign.deliverables
      .filter(
        (deliverable) =>
          !deliverable.projectId ||
          !activeProjectIds.has(deliverable.projectId),
      )
      .map((deliverable) => ({ campaign, deliverable })),
  );
  const assetManifestIssueCount =
    context.assetAudit.skippedProjectReferenceCount +
    Math.max(
      context.activeProjects.length - context.assetAudit.projectManifestCount,
      0,
    );

  return [
    {
      id: "version-snapshots",
      title: "Project version snapshots",
      scope: "Projects",
      status: missingVersionProjects.length ? "blocked" : "ready",
      affectedCount: missingVersionProjects.length,
      detail: missingVersionProjects.length
        ? `${pluralize(missingVersionProjects.length, "project")} need saved snapshots before restore can be trusted.`
        : "Every active project has at least one version snapshot.",
      remediation:
        "Create version snapshots for active projects before export.",
      affectedNames: missingVersionProjects.map((project) => project.name),
    },
    {
      id: "completed-exports",
      title: "Completed export artifacts",
      scope: "Exports",
      status:
        missingExportProjects.length || failedExportProjects.size
          ? missingExportProjects.length
            ? "blocked"
            : "review"
          : "ready",
      affectedCount: new Set([
        ...missingExportProjects.map((project) => project.id),
        ...failedExportProjects,
      ]).size,
      detail:
        missingExportProjects.length || failedExportProjects.size
          ? "Some projects lack a completed durable export or have recent failed export jobs."
          : "Every active project has a completed export artifact.",
      remediation: "Run durable exports and resolve failed jobs before backup.",
      affectedNames: [
        ...missingExportProjects.map((project) => project.name),
        ...context.activeProjects
          .filter((project) => failedExportProjects.has(project.id))
          .map((project) => project.name),
      ],
    },
    {
      id: "website-domains",
      title: "Published website domains",
      scope: "Website publishing",
      status: brokenDomains.length
        ? hasDomainPlatformError
          ? "blocked"
          : "review"
        : "ready",
      affectedCount: brokenDomains.length,
      detail: brokenDomains.length
        ? `${pluralize(brokenDomains.length, "domain")} need verification or platform repair before restore.`
        : "Published website domains are verified and attached.",
      remediation:
        "Verify DNS and attach domains before including website restores.",
      affectedNames: brokenDomains.map(
        ({ publish, domain }) => `${publish.title}: ${domain.domain}`,
      ),
    },
    {
      id: "campaign-links",
      title: "Campaign deliverable links",
      scope: "Campaigns",
      status: brokenCampaignDeliverables.length ? "blocked" : "ready",
      affectedCount: brokenCampaignDeliverables.length,
      detail: brokenCampaignDeliverables.length
        ? "Some campaign deliverables reference missing or deleted projects."
        : "Campaign deliverables point to active projects.",
      remediation: "Reconnect campaign deliverables to active projects.",
      affectedNames: brokenCampaignDeliverables.map(
        ({ campaign, deliverable }) => `${campaign.name}: ${deliverable.role}`,
      ),
    },
    {
      id: "asset-manifests",
      title: "Project asset manifests",
      scope: "Assets",
      status: assetManifestIssueCount ? "review" : "ready",
      affectedCount: assetManifestIssueCount,
      detail: assetManifestIssueCount
        ? "Asset manifests have skipped references or missing project coverage."
        : "Project asset manifests are present without skipped references.",
      remediation:
        "Refresh project asset manifests and resolve skipped references.",
      affectedNames:
        context.assetAudit.skippedProjectReferenceCount > 0
          ? [
              `${context.assetAudit.skippedProjectReferenceCount} skipped references`,
            ]
          : [],
    },
    {
      id: "audit-coverage",
      title: "Restore audit trail",
      scope: "Audit logs",
      status: manifest.auditSummary.totalLogs ? "ready" : "review",
      affectedCount: manifest.auditSummary.totalLogs ? 0 : 1,
      detail: manifest.auditSummary.totalLogs
        ? "Workspace backup includes recent audit activity context."
        : "No audit activity is available to explain workspace changes.",
      remediation:
        "Capture audit logs for backup, restore, and rollback review.",
      affectedNames: [],
    },
  ];
}

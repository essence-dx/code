import type {
  WorkspaceBackupManifest,
  WorkspaceBackupRestoreContext,
  WorkspaceRollbackPlaybook,
} from "@/features/operations/workspace-backup-restore-types";
import {
  createCoverageStatus,
  pluralize,
} from "@/features/operations/workspace-backup-restore-utils";

export function createRollbackPlaybooks(
  context: WorkspaceBackupRestoreContext,
  manifest: WorkspaceBackupManifest,
): WorkspaceRollbackPlaybook[] {
  const versionedProjects = manifest.projectSnapshots.filter(
    (snapshot) => snapshot.latestVersionId,
  );
  const exportedProjects = manifest.projectSnapshots.filter(
    (snapshot) => snapshot.latestCompletedExportId,
  );
  const attachedDomains = context.websitePublishes.flatMap((publish) =>
    publish.customDomains.filter(
      (domain) =>
        domain.status === "verified" && domain.platformStatus === "attached",
    ),
  );
  const restorableCampaigns = manifest.campaignSnapshots.filter(
    (snapshot) => snapshot.restoreStatus === "ready",
  );

  return [
    {
      id: "project-version-rollback",
      title: "Project version rollback",
      status: createCoverageStatus(
        versionedProjects.length,
        context.activeProjects.length,
      ),
      detail: `${pluralize(versionedProjects.length, "project")} can roll back to a named version snapshot.`,
      targets: versionedProjects.length,
      steps: [
        "Open the version history for the affected project.",
        "Restore the latest backup manifest version snapshot.",
        "Re-run project audit checks before publishing or exporting.",
      ],
      nextAction:
        versionedProjects.length === context.activeProjects.length
          ? "Version rollback targets are ready."
          : "Create snapshots for projects missing rollback versions.",
    },
    {
      id: "export-artifact-rollback",
      title: "Export artifact rollback",
      status: createCoverageStatus(
        exportedProjects.length,
        context.activeProjects.length,
      ),
      detail: `${pluralize(exportedProjects.length, "project")} have durable export artifacts available.`,
      targets: exportedProjects.length,
      steps: [
        "Locate the completed export artifact listed in the manifest.",
        "Download or re-issue the stored artifact for the stakeholder channel.",
        "Queue a fresh export after project restore to refresh timestamps.",
      ],
      nextAction:
        exportedProjects.length === context.activeProjects.length
          ? "Export rollback artifacts are ready."
          : "Run exports for projects without durable artifacts.",
    },
    {
      id: "website-domain-rollback",
      title: "Website domain rollback",
      status: context.websitePublishes.length
        ? attachedDomains.length
          ? "ready"
          : "blocked"
        : "ready",
      detail: `${pluralize(attachedDomains.length, "domain")} can be reattached from verified publish records.`,
      targets: attachedDomains.length,
      steps: [
        "Restore the website publish record from the manifest.",
        "Verify DNS ownership before reconnecting the custom domain.",
        "Reattach the domain and refresh platform status.",
      ],
      nextAction:
        context.websitePublishes.length && !attachedDomains.length
          ? "Verify and attach at least one custom domain before relying on rollback."
          : "Website domain rollback is ready.",
    },
    {
      id: "campaign-board-rollback",
      title: "Campaign board rollback",
      status: context.campaigns.length
        ? restorableCampaigns.length
          ? "ready"
          : "blocked"
        : "ready",
      detail: `${pluralize(restorableCampaigns.length, "campaign")} have restorable deliverable links.`,
      targets: restorableCampaigns.length,
      steps: [
        "Restore the campaign board metadata and launch target.",
        "Reconnect deliverables to the manifest project IDs.",
        "Re-run bulk schedule or handoff workflows after link checks pass.",
      ],
      nextAction:
        context.campaigns.length && !restorableCampaigns.length
          ? "Reconnect campaign deliverables before rollback."
          : "Campaign rollback is ready.",
    },
  ];
}

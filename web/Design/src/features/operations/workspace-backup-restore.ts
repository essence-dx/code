import { createDryRunReport } from "@/features/operations/workspace-backup-restore-dry-run";
import { createIntegrityChecks } from "@/features/operations/workspace-backup-restore-integrity";
import { createBackupManifest } from "@/features/operations/workspace-backup-restore-manifest";
import { createRollbackPlaybooks } from "@/features/operations/workspace-backup-restore-playbooks";
import type {
  WorkspaceBackupIntegrityCheck,
  WorkspaceBackupRestoreCenter,
  WorkspaceBackupRestoreContext,
  WorkspaceBackupRestoreInput,
  WorkspaceRestoreDryRunReport,
  WorkspaceRollbackPlaybook,
} from "@/features/operations/workspace-backup-restore-types";
import {
  averageScore,
  createManifestDownload,
  pluralize,
  scoreToStatus,
  statusToScore,
} from "@/features/operations/workspace-backup-restore-utils";

export type {
  WorkspaceBackupIntegrityCheck,
  WorkspaceBackupIntegrityCheckId,
  WorkspaceBackupManifest,
  WorkspaceBackupManifestCounts,
  WorkspaceBackupManifestDownload,
  WorkspaceBackupRestoreCenter,
  WorkspaceBackupRestoreInput,
  WorkspaceBackupRestoreStatus,
  WorkspaceCampaignBackupSnapshot,
  WorkspaceProjectBackupSnapshot,
  WorkspaceRestoreCampaignDryRun,
  WorkspaceRestoreDryRunReport,
  WorkspaceRestoreProjectDryRun,
  WorkspaceRestoreWebsiteDryRun,
  WorkspaceRollbackPlaybook,
  WorkspaceRollbackPlaybookId,
  WorkspaceTemplateBackupSnapshot,
  WorkspaceWebsiteBackupSnapshot,
} from "@/features/operations/workspace-backup-restore-types";

export function createWorkspaceBackupRestoreCenter(
  input: WorkspaceBackupRestoreInput,
): WorkspaceBackupRestoreCenter {
  const context: WorkspaceBackupRestoreContext = {
    ...input,
    activeProjects: input.projects.filter((project) => !project.deletedAt),
    deletedProjects: input.projects.filter((project) =>
      Boolean(project.deletedAt),
    ),
  };
  const manifest = createBackupManifest(context);
  const integrityChecks = createIntegrityChecks(context, manifest);
  const dryRun = createDryRunReport(context, manifest);
  const rollbackPlaybooks = createRollbackPlaybooks(context, manifest);
  const score = averageScore([
    ...integrityChecks.map((check) => statusToScore(check.status)),
    dryRun.score,
    ...rollbackPlaybooks.map((playbook) => statusToScore(playbook.status)),
  ]);
  const status = scoreToStatus(
    score,
    integrityChecks.some((check) => check.status === "blocked") ||
      dryRun.status === "blocked" ||
      rollbackPlaybooks.some((playbook) => playbook.status === "blocked"),
  );

  return {
    status,
    score,
    manifest,
    manifestDownload: createManifestDownload(manifest),
    integrityChecks,
    dryRun,
    rollbackPlaybooks,
    nextActions: createNextActions(integrityChecks, dryRun, rollbackPlaybooks),
    totals: {
      activeProjects: context.activeProjects.length,
      projectSnapshots: manifest.projectSnapshots.filter(
        (snapshot) => snapshot.latestVersionId,
      ).length,
      completedExports: manifest.counts.completedExports,
      restorableProjects: dryRun.summary.restorableProjects,
      blockedChecks: integrityChecks.filter(
        (check) => check.status === "blocked",
      ).length,
      rollbackPlaybooks: rollbackPlaybooks.length,
    },
  };
}

function createNextActions(
  checks: WorkspaceBackupIntegrityCheck[],
  dryRun: WorkspaceRestoreDryRunReport,
  playbooks: WorkspaceRollbackPlaybook[],
) {
  const actions = [
    ...checks
      .filter((check) => check.status !== "ready")
      .sort(
        (left, right) =>
          statusToScore(left.status) - statusToScore(right.status) ||
          right.affectedCount - left.affectedCount,
      )
      .map((check) => check.remediation),
    ...playbooks
      .filter((playbook) => playbook.status !== "ready")
      .map((playbook) => playbook.nextAction),
  ];

  if (dryRun.summary.blockedProjects > 0) {
    actions.push(
      `Review ${pluralize(dryRun.summary.blockedProjects, "blocked project")} in the dry-run restore report.`,
    );
  }

  return [...new Set(actions)].slice(0, 5);
}

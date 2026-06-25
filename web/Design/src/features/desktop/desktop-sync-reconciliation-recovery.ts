import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesktopOfflineSyncCenter } from "@/features/desktop/desktop-offline-sync-center";
import type {
  DesktopSyncAuditTrailItem,
  DesktopSyncConflictDiff,
  DesktopSyncRecoveryChoice,
  DesktopSyncRecoveryChoiceKind,
  DesktopSyncStaleAssetRepair,
} from "@/features/desktop/desktop-sync-reconciliation-types";
import {
  aggregateDesktopSyncStatus,
  isDesktopSyncAuditAction,
  riskFromDesktopSyncStatus,
  sortByDesktopSyncStatusThenNewest,
  uniqueDesktopSyncValues,
} from "@/features/desktop/desktop-sync-reconciliation-utils";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import { sortByNewest } from "@/features/operations/workspace-backup-restore-utils";

export function createDesktopSyncAuditTrail(input: {
  auditLogs: WorkspaceAuditLogSummary[];
  affectedProjectIds: string[];
}) {
  const affectedProjectIds = new Set(input.affectedProjectIds);
  const relevantLogs = input.auditLogs.filter((log) => {
    if (isDesktopSyncAuditAction(log.action)) return true;
    if (log.targetId && affectedProjectIds.has(log.targetId)) return true;

    return false;
  });

  return sortByNewest(relevantLogs, (log) => log.createdAt)
    .slice(0, 10)
    .map(
      (log): DesktopSyncAuditTrailItem => ({
        id: log.id,
        action: log.action,
        summary: log.summary,
        targetType: log.targetType,
        targetId: log.targetId,
        actorEmail: log.actorEmail,
        createdAt: log.createdAt,
        relevance: createAuditRelevance(log),
      }),
    );
}

export function createDesktopSyncRecoveryChoices(input: {
  conflictDiffs: DesktopSyncConflictDiff[];
  staleAssetRepairs: DesktopSyncStaleAssetRepair[];
  failedExports: ServerExportJobSummary[];
  auditTrail: DesktopSyncAuditTrailItem[];
  activeProjectCount: number;
  offlineSyncCenter: DesktopOfflineSyncCenter;
}) {
  const choices: DesktopSyncRecoveryChoice[] = [];
  const addChoice = (choice: DesktopSyncRecoveryChoice) => choices.push(choice);
  const mergeDiffs = byRecommendedChoice(input.conflictDiffs, "merge-review");
  const localDiffs = byRecommendedChoice(input.conflictDiffs, "keep-local");
  const cloudDiffs = byRecommendedChoice(input.conflictDiffs, "restore-cloud");

  if (mergeDiffs.length) {
    addChoice({
      id: "merge-review",
      kind: "merge-review",
      title: "Review desktop and shared-edit conflicts",
      detail: `${mergeDiffs.length} project${mergeDiffs.length === 1 ? "" : "s"} need a side-by-side local/cloud merge decision before sync continues.`,
      status: aggregateDesktopSyncStatus(mergeDiffs),
      riskLevel: riskFromDesktopSyncStatus(
        aggregateDesktopSyncStatus(mergeDiffs),
      ),
      projectIds: uniqueDesktopSyncValues(
        mergeDiffs.map((diff) => diff.projectId),
      ),
      commandLabel: "Open merge review",
      evidence: mergeDiffs.flatMap((diff) => diff.evidence).slice(0, 4),
    });
  }

  if (localDiffs.length) {
    addChoice({
      id: "keep-local",
      kind: "keep-local",
      title: "Promote local desktop state to cloud",
      detail: `${localDiffs.length} project${localDiffs.length === 1 ? "" : "s"} have local metadata newer than their cloud version or export snapshot.`,
      status: aggregateDesktopSyncStatus(localDiffs),
      riskLevel: riskFromDesktopSyncStatus(
        aggregateDesktopSyncStatus(localDiffs),
      ),
      projectIds: uniqueDesktopSyncValues(
        localDiffs.map((diff) => diff.projectId),
      ),
      commandLabel: "Promote local copy",
      evidence: localDiffs.flatMap((diff) => diff.evidence).slice(0, 4),
    });
  }

  if (cloudDiffs.length) {
    addChoice({
      id: "restore-cloud",
      kind: "restore-cloud",
      title: "Restore the newest cloud snapshot locally",
      detail: `${cloudDiffs.length} project${cloudDiffs.length === 1 ? "" : "s"} have newer cloud version evidence than local project metadata.`,
      status: aggregateDesktopSyncStatus(cloudDiffs),
      riskLevel: riskFromDesktopSyncStatus(
        aggregateDesktopSyncStatus(cloudDiffs),
      ),
      projectIds: uniqueDesktopSyncValues(
        cloudDiffs.map((diff) => diff.projectId),
      ),
      commandLabel: "Restore cloud snapshot",
      evidence: cloudDiffs.flatMap((diff) => diff.evidence).slice(0, 4),
    });
  }

  if (input.staleAssetRepairs.length) {
    addChoice({
      id: "repair-assets",
      kind: "repair-assets",
      title: "Repair stale offline asset manifests",
      detail: `${input.staleAssetRepairs.length} project manifest${input.staleAssetRepairs.length === 1 ? "" : "s"} need skipped-reference or staleness repair.`,
      status: aggregateDesktopSyncStatus(input.staleAssetRepairs),
      riskLevel: riskFromDesktopSyncStatus(
        aggregateDesktopSyncStatus(input.staleAssetRepairs),
      ),
      projectIds: uniqueDesktopSyncValues(
        input.staleAssetRepairs.map((repair) => repair.projectId),
      ),
      commandLabel: "Repair manifests",
      evidence: input.staleAssetRepairs
        .map((repair) => repair.detail)
        .slice(0, 4),
    });
  }

  if (input.failedExports.length) {
    addChoice({
      id: "retry-export",
      kind: "retry-export",
      title: "Retry failed desktop handoff exports",
      detail: `${input.failedExports.length} failed export${input.failedExports.length === 1 ? "" : "s"} block clean offline project packaging.`,
      status: "blocked",
      riskLevel: "high",
      projectIds: uniqueDesktopSyncValues(
        input.failedExports.map((job) => job.projectId),
      ),
      commandLabel: "Retry exports",
      evidence: input.failedExports
        .map(
          (job) =>
            `${job.fileName}: ${job.failureMessage ?? "Export failed before handoff."}`,
        )
        .slice(0, 4),
    });
  }

  if (input.auditTrail.length === 0 && input.activeProjectCount > 0) {
    addChoice({
      id: "audit-sync",
      kind: "audit-sync",
      title: "Create a sync audit trail",
      detail:
        "No project, asset, approval, or automation audit events are available for offline reconciliation evidence.",
      status: input.offlineSyncCenter.status === "ready" ? "review" : "blocked",
      riskLevel: input.offlineSyncCenter.status === "ready" ? "medium" : "high",
      projectIds: [],
      commandLabel: "Record sync evidence",
      evidence: input.offlineSyncCenter.nextActions.slice(0, 4),
    });
  }

  return sortByDesktopSyncStatusThenNewest(choices, (choice) => choice.id);
}

export function createDesktopSyncNextActions(
  choices: DesktopSyncRecoveryChoice[],
) {
  if (!choices.length) return ["Desktop and cloud copies are aligned."];

  return choices
    .slice(0, 4)
    .map((choice) => `${choice.commandLabel}: ${choice.detail}`);
}

function byRecommendedChoice(
  diffs: DesktopSyncConflictDiff[],
  choice: DesktopSyncRecoveryChoiceKind,
) {
  return diffs.filter((diff) => diff.recommendedChoice === choice);
}

function createAuditRelevance(log: WorkspaceAuditLogSummary) {
  if (log.action.startsWith("asset.")) return "Asset manifest or cleanup event";
  if (log.action.startsWith("project.")) return "Project lifecycle event";
  if (log.action.startsWith("automation.")) return "Automation recovery event";
  if (log.action.startsWith("release.")) return "Release override event";
  if (log.action === "approval.updated") return "Approval state event";

  return "Workspace sync evidence";
}

import type {
  DesktopSyncAuditTrailItem,
  DesktopSyncConflictDiff,
  DesktopSyncRecoveryChoice,
  DesktopSyncReconciliationCenter,
  DesktopSyncReconciliationPacket,
  DesktopSyncReconciliationStatus,
  DesktopSyncStaleAssetRepair,
} from "@/features/desktop/desktop-sync-reconciliation-types";
import { createStableFingerprint } from "@/features/operations/workspace-backup-restore-utils";

export function createDesktopSyncReconciliationPacket(input: {
  generatedAt: string;
  status: DesktopSyncReconciliationStatus;
  score: number;
  totals: DesktopSyncReconciliationCenter["totals"];
  conflictDiffs: DesktopSyncConflictDiff[];
  recoveryChoices: DesktopSyncRecoveryChoice[];
  staleAssetRepairs: DesktopSyncStaleAssetRepair[];
  auditTrail: DesktopSyncAuditTrailItem[];
}): DesktopSyncReconciliationPacket {
  const fingerprint = createStableFingerprint([
    input.generatedAt,
    input.status,
    String(input.score),
    ...input.conflictDiffs.map((diff) => `${diff.projectId}:${diff.updatedAt}`),
    ...input.recoveryChoices.map((choice) => `${choice.id}:${choice.status}`),
    ...input.staleAssetRepairs.map(
      (repair) => `${repair.projectId}:${repair.updatedAt}`,
    ),
    ...input.auditTrail.map((log) => `${log.id}:${log.createdAt}`),
  ]);
  const body = {
    kind: "essence-studio.desktop-sync-reconciliation",
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    fingerprint,
    status: input.status,
    score: input.score,
    totals: input.totals,
    conflictDiffs: input.conflictDiffs,
    recoveryChoices: input.recoveryChoices,
    staleAssetRepairs: input.staleAssetRepairs,
    auditTrail: input.auditTrail,
  };
  const json = JSON.stringify(body, null, 2);
  const fileDate = input.generatedAt.slice(0, 10) || "workspace";

  return {
    fileName: `desktop-sync-reconciliation-${fileDate}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
    fingerprint,
  };
}

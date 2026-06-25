import type { LocalMaintenanceRecoveryId, LocalMaintenanceRecoveryItem } from "@/lib/operations/local-maintenance-recovery-queue";

export type LocalMaintenanceRecoveryCompletionStatus = "pending" | "resolved";

export interface LocalMaintenanceRecoveryCompletionItem {
  id: LocalMaintenanceRecoveryId;
  label: string;
  status: LocalMaintenanceRecoveryCompletionStatus;
  count: number;
  detail: string;
}

export interface LocalMaintenanceRecoveryCompletionReport {
  status: LocalMaintenanceRecoveryCompletionStatus;
  pendingCount: number;
  resolvedCount: number;
  items: LocalMaintenanceRecoveryCompletionItem[];
}

const recoveryCompletionDefinitions: Record<LocalMaintenanceRecoveryId, { label: string; resolvedDetail: string }> = {
  "refresh-proof": {
    label: "Proof refresh",
    resolvedDetail: "Release and desktop proof freshness issues are resolved in the current scan.",
  },
  "relink-media": {
    label: "Media relink",
    resolvedDetail: "Missing media sources are resolved in the current scan.",
  },
  "retry-exports": {
    label: "Export retry",
    resolvedDetail: "Failed export jobs are resolved in the current scan.",
  },
  "review-cloud-conflicts": {
    label: "Cloud conflict cleanup",
    resolvedDetail: "Reviewed cloud-version conflicts are resolved in the current scan.",
  },
};

export function createLocalMaintenanceRecoveryCompletionReport(
  pendingRecoveries: LocalMaintenanceRecoveryItem[],
): LocalMaintenanceRecoveryCompletionReport {
  const pendingById = new Map(pendingRecoveries.map((item) => [item.id, item]));
  const items = (Object.keys(recoveryCompletionDefinitions) as LocalMaintenanceRecoveryId[]).map((id) => {
    const pending = pendingById.get(id);
    const definition = recoveryCompletionDefinitions[id];

    return {
      id,
      label: definition.label,
      status: pending ? "pending" : "resolved",
      count: pending?.count ?? 0,
      detail: pending?.detail ?? definition.resolvedDetail,
    } satisfies LocalMaintenanceRecoveryCompletionItem;
  });
  const pendingCount = items.filter((item) => item.status === "pending").length;

  return {
    status: pendingCount > 0 ? "pending" : "resolved",
    pendingCount,
    resolvedCount: items.length - pendingCount,
    items,
  };
}

export function localMaintenanceRecoveryCompletionLabel(status: LocalMaintenanceRecoveryCompletionStatus) {
  return status === "pending" ? "Pending" : "Resolved";
}

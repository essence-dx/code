import {
  getLatestLibraries,
  getPercent,
  getPublishedLibraries,
  getRolloutFile,
  getRolloutLibraries,
  sortRolloutFiles,
  sum,
} from "@/features/admin/admin-library-rollout-monitor-analysis";
import {
  getAvailableUpdatesRow,
  getDetachedComponentsRow,
  getReleaseAdoptionRow,
  getSubscriptionCoverageRow,
  getSubscriptionDriftRow,
} from "@/features/admin/admin-library-rollout-monitor-rows";
import type { DesignDocument } from "@/features/editor/types";

export type AdminLibraryRolloutStatus = "ready" | "review" | "blocked";

export type AdminLibraryRolloutKind =
  | "adoption"
  | "detached"
  | "drift"
  | "subscriptions"
  | "updates";

export type AdminLibraryRolloutRow = {
  id: string;
  status: AdminLibraryRolloutStatus;
  kind: AdminLibraryRolloutKind;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  target: string | null;
  latestAt: string | null;
};

export type AdminLibraryRolloutFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  publishedLibraryCount: number;
  librarySubscriptionCount: number;
  subscribedComponentCount: number;
  subscribedInstanceCount: number;
  updateAvailableComponentCount: number;
  pendingUpdateInstanceCount: number;
  detachedComponentCount: number;
  detachedInstanceCount: number;
  subscriptionDriftCount: number;
  orphanSubscriptionCount: number;
  adoptedLatestComponentCount: number;
  releaseAdoptionPercent: number;
  latestSubscriptionAt: string | null;
  status: AdminLibraryRolloutStatus;
};

export type AdminLibraryRolloutLibrary = {
  libraryId: string;
  libraryName: string;
  teamName: string;
  latestVersion: number;
  publishedFileName: string | null;
  subscribedFileCount: number;
  subscribedComponentCount: number;
  subscribedInstanceCount: number;
  updateAvailableComponentCount: number;
  pendingUpdateInstanceCount: number;
  detachedComponentCount: number;
  subscriptionDriftCount: number;
  adoptedLatestComponentCount: number;
  releaseAdoptionPercent: number;
  latestActivityAt: string | null;
  status: AdminLibraryRolloutStatus;
};

export type AdminLibraryRolloutMonitorReport = {
  generatedAt: string;
  status: AdminLibraryRolloutStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  publishedLibraryCount: number;
  librarySubscriptionCount: number;
  subscribedFileCount: number;
  subscribedComponentCount: number;
  subscribedInstanceCount: number;
  updateAvailableComponentCount: number;
  pendingUpdateInstanceCount: number;
  detachedComponentCount: number;
  detachedInstanceCount: number;
  subscriptionDriftCount: number;
  orphanSubscriptionCount: number;
  adoptedLatestComponentCount: number;
  releaseAdoptionPercent: number;
  rows: AdminLibraryRolloutRow[];
  libraries: AdminLibraryRolloutLibrary[];
  files: AdminLibraryRolloutFile[];
};

export type AdminLibraryRolloutFileInput = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
};

export type AdminLibraryRolloutMonitorInput = {
  files: AdminLibraryRolloutFileInput[];
  generatedAt?: string;
};

export function getAdminLibraryRolloutMonitorReport({
  files,
  generatedAt = new Date().toISOString(),
}: AdminLibraryRolloutMonitorInput): AdminLibraryRolloutMonitorReport {
  const publishedLibraries = getPublishedLibraries(files);
  const latestLibraries = getLatestLibraries(publishedLibraries);
  const rolloutFiles = files
    .map((file) => getRolloutFile(file, latestLibraries))
    .filter((file): file is AdminLibraryRolloutFile => Boolean(file))
    .sort(sortRolloutFiles);
  const rolloutLibraries = getRolloutLibraries({
    files,
    latestLibraries,
  });
  const rows = [
    getSubscriptionCoverageRow({
      rolloutLibraries,
      rolloutFiles,
      publishedLibraries,
    }),
    getSubscriptionDriftRow(rolloutFiles),
    getAvailableUpdatesRow(rolloutFiles),
    getDetachedComponentsRow(rolloutFiles),
    getReleaseAdoptionRow({ rolloutFiles, publishedLibraries }),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminLibraryRolloutStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const subscribedComponentCount = sum(
    rolloutFiles.map((file) => file.subscribedComponentCount),
  );
  const adoptedLatestComponentCount = sum(
    rolloutFiles.map((file) => file.adoptedLatestComponentCount),
  );

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),
    readyCount,
    reviewCount,
    blockedCount,
    publishedLibraryCount: publishedLibraries.length,
    librarySubscriptionCount: sum(
      rolloutFiles.map((file) => file.librarySubscriptionCount),
    ),
    subscribedFileCount: rolloutFiles.filter(
      (file) =>
        file.librarySubscriptionCount > 0 || file.subscribedComponentCount > 0,
    ).length,
    subscribedComponentCount,
    subscribedInstanceCount: sum(
      rolloutFiles.map((file) => file.subscribedInstanceCount),
    ),
    updateAvailableComponentCount: sum(
      rolloutFiles.map((file) => file.updateAvailableComponentCount),
    ),
    pendingUpdateInstanceCount: sum(
      rolloutFiles.map((file) => file.pendingUpdateInstanceCount),
    ),
    detachedComponentCount: sum(
      rolloutFiles.map((file) => file.detachedComponentCount),
    ),
    detachedInstanceCount: sum(
      rolloutFiles.map((file) => file.detachedInstanceCount),
    ),
    subscriptionDriftCount: sum(
      rolloutFiles.map((file) => file.subscriptionDriftCount),
    ),
    orphanSubscriptionCount: sum(
      rolloutFiles.map((file) => file.orphanSubscriptionCount),
    ),
    adoptedLatestComponentCount,
    releaseAdoptionPercent: getPercent(
      adoptedLatestComponentCount,
      subscribedComponentCount,
    ),
    rows,
    libraries: rolloutLibraries,
    files: rolloutFiles,
  };
}

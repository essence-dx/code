import type { AdminLibraryRolloutMonitorReport } from "@/features/admin/admin-library-rollout-monitor";

export function getAdminLibraryRolloutMonitorJson(
  report: AdminLibraryRolloutMonitorReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminLibraryRolloutMonitorCsv(
  report: AdminLibraryRolloutMonitorReport,
) {
  return [
    [
      "id",
      "status",
      "kind",
      "label",
      "value",
      "latest_at",
      "target",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.kind,
        row.label,
        row.value,
        row.latestAt,
        row.target,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "library_id",
      "library_name",
      "team_name",
      "latest_version",
      "published_file",
      "subscribed_files",
      "subscribed_components",
      "subscribed_instances",
      "update_available_components",
      "pending_update_instances",
      "detached_components",
      "subscription_drift",
      "adopted_latest_components",
      "release_adoption_percent",
      "latest_activity_at",
      "status",
    ].join(","),
    ...report.libraries.map((library) =>
      [
        library.libraryId,
        library.libraryName,
        library.teamName,
        library.latestVersion,
        library.publishedFileName,
        library.subscribedFileCount,
        library.subscribedComponentCount,
        library.subscribedInstanceCount,
        library.updateAvailableComponentCount,
        library.pendingUpdateInstanceCount,
        library.detachedComponentCount,
        library.subscriptionDriftCount,
        library.adoptedLatestComponentCount,
        library.releaseAdoptionPercent,
        library.latestActivityAt,
        library.status,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "file_id",
      "file_name",
      "owner_email",
      "published_libraries",
      "subscriptions",
      "subscribed_components",
      "subscribed_instances",
      "update_available_components",
      "pending_update_instances",
      "detached_components",
      "detached_instances",
      "subscription_drift",
      "orphan_subscriptions",
      "adopted_latest_components",
      "release_adoption_percent",
      "latest_subscription_at",
      "status",
    ].join(","),
    ...report.files.map((file) =>
      [
        file.fileId,
        file.fileName,
        file.ownerEmail,
        file.publishedLibraryCount,
        file.librarySubscriptionCount,
        file.subscribedComponentCount,
        file.subscribedInstanceCount,
        file.updateAvailableComponentCount,
        file.pendingUpdateInstanceCount,
        file.detachedComponentCount,
        file.detachedInstanceCount,
        file.subscriptionDriftCount,
        file.orphanSubscriptionCount,
        file.adoptedLatestComponentCount,
        file.releaseAdoptionPercent,
        file.latestSubscriptionAt,
        file.status,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminLibraryRolloutMonitorMarkdown(
  report: AdminLibraryRolloutMonitorReport,
) {
  return [
    "# Organization Library Rollout Monitor",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Published libraries: ${report.publishedLibraryCount}`,
    `- Library subscriptions: ${report.librarySubscriptionCount}`,
    `- Subscribed files: ${report.subscribedFileCount}`,
    `- Subscribed components: ${report.subscribedComponentCount}`,
    `- Subscribed instances: ${report.subscribedInstanceCount}`,
    `- Available updates: ${report.updateAvailableComponentCount}`,
    `- Pending update instances: ${report.pendingUpdateInstanceCount}`,
    `- Detached components: ${report.detachedComponentCount}`,
    `- Detached instances: ${report.detachedInstanceCount}`,
    `- Subscription drift: ${report.subscriptionDriftCount}`,
    `- Orphan subscriptions: ${report.orphanSubscriptionCount}`,
    `- Release adoption: ${report.releaseAdoptionPercent}%`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Libraries",
    "",
    ...(report.libraries.length > 0
      ? report.libraries.map(
          (library) =>
            `- [${library.status}] ${library.libraryName} v${library.latestVersion}: ${library.releaseAdoptionPercent}% adoption, ${library.subscribedFileCount} files, ${library.subscribedComponentCount} components, ${library.updateAvailableComponentCount} updates, ${library.detachedComponentCount} detached.`,
        )
      : ["- No library rollout rows loaded."]),
    "",
    "## Files",
    "",
    ...(report.files.length > 0
      ? report.files.map(
          (file) =>
            `- [${file.status}] ${file.fileName}: ${file.releaseAdoptionPercent}% adoption, ${file.subscribedComponentCount} components, ${file.updateAvailableComponentCount} updates, ${file.detachedComponentCount} detached.`,
        )
      : ["- No library files loaded."]),
  ].join("\n");
}

function escapeCsvCell(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

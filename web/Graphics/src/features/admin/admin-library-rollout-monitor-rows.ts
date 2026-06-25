import type {
  AdminLibraryRolloutFile,
  AdminLibraryRolloutLibrary,
  AdminLibraryRolloutRow,
} from "@/features/admin/admin-library-rollout-monitor";
import {
  getLatestDate,
  getPercent,
  READY_ADOPTION_PERCENT,
  sum,
  type PublishedLibrary,
} from "@/features/admin/admin-library-rollout-monitor-analysis";

export function getSubscriptionCoverageRow({
  rolloutLibraries,
  rolloutFiles,
  publishedLibraries,
}: {
  rolloutLibraries: AdminLibraryRolloutLibrary[];
  rolloutFiles: AdminLibraryRolloutFile[];
  publishedLibraries: PublishedLibrary[];
}): AdminLibraryRolloutRow {
  const subscribedFileCount = rolloutFiles.filter(
    (file) =>
      file.librarySubscriptionCount > 0 || file.subscribedComponentCount > 0,
  ).length;

  if (rolloutLibraries.length === 0) {
    return {
      id: "library-subscriptions-missing",
      status: "blocked",
      kind: "subscriptions",
      label: "Library subscriptions",
      value: "0",
      detail:
        "No published libraries or subscribed library components were found in the admin file window.",
      recommendation:
        "Publish at least one component library and import it into a product file before monitoring rollout health.",
      target: null,
      latestAt: null,
    };
  }

  return {
    id: "library-subscription-coverage",
    status: subscribedFileCount > 0 ? "ready" : "review",
    kind: "subscriptions",
    label: "Library subscriptions",
    value: `${subscribedFileCount} file${subscribedFileCount === 1 ? "" : "s"}`,
    detail: `${publishedLibraries.length} published librar${publishedLibraries.length === 1 ? "y" : "ies"} and ${subscribedFileCount} subscribing file${subscribedFileCount === 1 ? "" : "s"} are visible.`,
    recommendation:
      subscribedFileCount > 0
        ? "Keep subscriber files in this rollout monitor before approving library releases."
        : "Import the latest library package into at least one product file to verify adoption.",
    target: rolloutLibraries[0]?.libraryName ?? null,
    latestAt: getLatestDate(
      rolloutLibraries.map((library) => library.latestActivityAt),
    ),
  };
}

export function getSubscriptionDriftRow(
  files: AdminLibraryRolloutFile[],
): AdminLibraryRolloutRow {
  const driftCount = sum(files.map((file) => file.subscriptionDriftCount));
  const orphanCount = sum(files.map((file) => file.orphanSubscriptionCount));
  const target = files.find(
    (file) => file.subscriptionDriftCount > 0 || file.orphanSubscriptionCount > 0,
  );

  return {
    id: "library-subscription-drift",
    status: driftCount > 0 || orphanCount > 0 ? "review" : "ready",
    kind: "drift",
    label: "Subscription drift",
    value: `${driftCount} drift / ${orphanCount} orphan`,
    detail:
      driftCount > 0 || orphanCount > 0
        ? `${driftCount} subscribed components lag behind known library versions, and ${orphanCount} subscriptions have no local imported component.`
        : "Subscribed components match their known library subscription versions.",
    recommendation:
      driftCount > 0 || orphanCount > 0
        ? "Refresh library imports or remove orphaned subscriptions before release adoption review."
        : "Keep this drift report attached to organization library rollout notes.",
    target: target?.fileName ?? null,
    latestAt: target?.latestSubscriptionAt ?? null,
  };
}

export function getAvailableUpdatesRow(
  files: AdminLibraryRolloutFile[],
): AdminLibraryRolloutRow {
  const updateCount = sum(files.map((file) => file.updateAvailableComponentCount));
  const pendingInstanceCount = sum(
    files.map((file) => file.pendingUpdateInstanceCount),
  );
  const target = files.find(
    (file) =>
      file.updateAvailableComponentCount > 0 ||
      file.pendingUpdateInstanceCount > 0,
  );

  return {
    id: "library-available-updates",
    status: updateCount > 0 || pendingInstanceCount > 0 ? "review" : "ready",
    kind: "updates",
    label: "Available updates",
    value: `${updateCount} components / ${pendingInstanceCount} instances`,
    detail:
      updateCount > 0 || pendingInstanceCount > 0
        ? `${updateCount} library components have available updates, affecting ${pendingInstanceCount} pending instance review rows.`
        : "No available library updates are waiting in the loaded file window.",
    recommendation:
      updateCount > 0 || pendingInstanceCount > 0
        ? "Review and accept library updates before measuring final release adoption."
        : "Keep update review clear before publishing the next organization library release.",
    target: target?.fileName ?? null,
    latestAt: target?.latestSubscriptionAt ?? null,
  };
}

export function getDetachedComponentsRow(
  files: AdminLibraryRolloutFile[],
): AdminLibraryRolloutRow {
  const detachedComponentCount = sum(
    files.map((file) => file.detachedComponentCount),
  );
  const detachedInstanceCount = sum(files.map((file) => file.detachedInstanceCount));
  const target = files.find(
    (file) => file.detachedComponentCount > 0 || file.detachedInstanceCount > 0,
  );

  return {
    id: "library-detached-components",
    status:
      detachedComponentCount > 0 || detachedInstanceCount > 0
        ? "review"
        : "ready",
    kind: "detached",
    label: "Detached components",
    value: `${detachedComponentCount} components / ${detachedInstanceCount} instances`,
    detail:
      detachedComponentCount > 0 || detachedInstanceCount > 0
        ? `${detachedComponentCount} library components are detached from future updates, affecting ${detachedInstanceCount} instance review rows.`
        : "No detached library components are visible in the loaded file window.",
    recommendation:
      detachedComponentCount > 0 || detachedInstanceCount > 0
        ? "Re-link intentionally reusable components or document why detached forks should stay local."
        : "Keep detachments visible so local forks do not silently miss organization updates.",
    target: target?.fileName ?? null,
    latestAt: target?.latestSubscriptionAt ?? null,
  };
}

export function getReleaseAdoptionRow({
  rolloutFiles,
  publishedLibraries,
}: {
  rolloutFiles: AdminLibraryRolloutFile[];
  publishedLibraries: PublishedLibrary[];
}): AdminLibraryRolloutRow {
  const subscribedComponentCount = sum(
    rolloutFiles.map((file) => file.subscribedComponentCount),
  );
  const adoptedLatestComponentCount = sum(
    rolloutFiles.map((file) => file.adoptedLatestComponentCount),
  );
  const adoptionPercent = getPercent(
    adoptedLatestComponentCount,
    subscribedComponentCount,
  );
  const target = rolloutFiles
    .filter((file) => file.subscribedComponentCount > 0)
    .sort((first, second) => first.releaseAdoptionPercent - second.releaseAdoptionPercent)[0];

  if (publishedLibraries.length > 0 && subscribedComponentCount === 0) {
    return {
      id: "library-release-adoption-missing",
      status: "review",
      kind: "adoption",
      label: "Release adoption",
      value: "0%",
      detail:
        "Published organization libraries exist, but no subscribed components are visible in the loaded file window.",
      recommendation:
        "Import the published libraries into product files so adoption can be measured.",
      target: publishedLibraries[0]?.fileName ?? null,
      latestAt: getLatestDate(publishedLibraries.map((library) => library.updatedAt)),
    };
  }

  return {
    id: "library-release-adoption",
    status:
      subscribedComponentCount === 0 || adoptionPercent < READY_ADOPTION_PERCENT
        ? "review"
        : "ready",
    kind: "adoption",
    label: "Release adoption",
    value: `${adoptionPercent}%`,
    detail: `${adoptedLatestComponentCount} of ${subscribedComponentCount} subscribed components are on the latest known library version.`,
    recommendation:
      adoptionPercent >= READY_ADOPTION_PERCENT
        ? "Adoption meets the organization rollout threshold."
        : "Drive rollout above the organization threshold by accepting updates in the lowest-adoption files.",
    target: target?.fileName ?? null,
    latestAt: target?.latestSubscriptionAt ?? null,
  };
}

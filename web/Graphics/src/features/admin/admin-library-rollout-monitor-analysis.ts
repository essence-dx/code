import {
  getComponentAnalyticsSummary,
  getComponentUsageAnalytics,
} from "@/features/editor/component-analytics";
import { getComponentInstanceReview } from "@/features/editor/component-instance-review";
import type {
  AdminLibraryRolloutFile,
  AdminLibraryRolloutFileInput,
  AdminLibraryRolloutLibrary,
  AdminLibraryRolloutStatus,
} from "@/features/admin/admin-library-rollout-monitor";
import type {
  DesignComponent,
  DesignLibraryMetadata,
} from "@/features/editor/types";

export type PublishedLibrary = DesignLibraryMetadata & {
  fileId: string;
  fileName: string;
  ownerEmail: string;
};

export type LatestLibrary = {
  libraryId: string;
  libraryName: string;
  teamName: string;
  version: number;
  updatedAt: string;
  fileName: string | null;
};

export const READY_ADOPTION_PERCENT = 80;

export function getPublishedLibraries(
  files: AdminLibraryRolloutFileInput[],
): PublishedLibrary[] {
  return files
    .map((file) =>
      file.document.libraryMetadata
        ? {
            ...file.document.libraryMetadata,
            fileId: file.fileId,
            fileName: file.fileName,
            ownerEmail: file.ownerEmail,
          }
        : null,
    )
    .filter((library): library is PublishedLibrary => Boolean(library));
}

export function getLatestLibraries(publishedLibraries: PublishedLibrary[]) {
  const libraries = new Map<string, LatestLibrary>();

  for (const library of publishedLibraries) {
    const current = libraries.get(library.id);

    if (!current || isNewerLibrary(library, current)) {
      libraries.set(library.id, {
        libraryId: library.id,
        libraryName: library.name,
        teamName: library.teamName,
        version: library.version,
        updatedAt: library.updatedAt,
        fileName: library.fileName,
      });
    }
  }

  return libraries;
}

export function getRolloutFile(
  file: AdminLibraryRolloutFileInput,
  latestLibraries: Map<string, LatestLibrary>,
): AdminLibraryRolloutFile | null {
  const document = file.document;
  const components = Object.values(document.components ?? {});
  const sourcedComponents = components.filter(hasLibrarySource);
  const subscriptions = Object.values(document.librarySubscriptions ?? {});
  const publishedLibraryCount = document.libraryMetadata ? 1 : 0;

  if (
    publishedLibraryCount === 0 &&
    sourcedComponents.length === 0 &&
    subscriptions.length === 0
  ) {
    return null;
  }

  const pendingUpdates = document.pendingLibraryComponentUpdates ?? {};
  const analytics = getComponentUsageAnalytics(components, document.pages);
  const analyticsSummary = getComponentAnalyticsSummary(components, analytics);
  const instanceReview = getComponentInstanceReview(
    components,
    document.pages,
    pendingUpdates,
  );
  const subscriptionById = new Map(
    subscriptions.map((subscription) => [subscription.id, subscription]),
  );
  const subscribedInstanceCount = sourcedComponents.reduce(
    (count, component) =>
      count + (analytics[component.id]?.instanceCount ?? 0),
    0,
  );
  const updateAvailableComponentCount = sourcedComponents.filter((component) =>
    hasAvailableUpdate(component, pendingUpdates),
  ).length;
  const detachedComponentCount = sourcedComponents.filter(
    (component) => component.librarySource.status === "detached",
  ).length;
  const subscriptionDriftCount = sourcedComponents.filter((component) =>
    hasSubscriptionDrift(component, subscriptionById, latestLibraries),
  ).length;
  const adoptedLatestComponentCount = sourcedComponents.filter((component) =>
    hasAdoptedLatestRelease(component, subscriptionById, latestLibraries),
  ).length;
  const sourceLibraryIds = new Set(
    sourcedComponents.map((component) => component.librarySource.libraryId),
  );
  const orphanSubscriptionCount = subscriptions.filter(
    (subscription) => !sourceLibraryIds.has(subscription.id),
  ).length;

  return {
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    publishedLibraryCount,
    librarySubscriptionCount: subscriptions.length,
    subscribedComponentCount: sourcedComponents.length,
    subscribedInstanceCount,
    updateAvailableComponentCount,
    pendingUpdateInstanceCount: instanceReview.pendingUpdateInstanceCount,
    detachedComponentCount,
    detachedInstanceCount: instanceReview.detachedInstanceCount,
    subscriptionDriftCount,
    orphanSubscriptionCount,
    adoptedLatestComponentCount,
    releaseAdoptionPercent: getPercent(
      adoptedLatestComponentCount,
      sourcedComponents.length,
    ),
    latestSubscriptionAt: getLatestDate([
      ...subscriptions.map((subscription) => subscription.updatedAt),
      ...sourcedComponents.map((component) => component.librarySource.updatedAt),
      document.libraryMetadata?.updatedAt,
    ]),
    status: getRolloutFileStatus({
      publishedLibraryCount,
      componentCount: analyticsSummary.componentCount,
      subscribedComponentCount: sourcedComponents.length,
      updateAvailableComponentCount,
      detachedComponentCount,
      subscriptionDriftCount,
      orphanSubscriptionCount,
    }),
  };
}

export function getRolloutLibraries({
  files,
  latestLibraries,
}: {
  files: AdminLibraryRolloutFileInput[];
  latestLibraries: Map<string, LatestLibrary>;
}) {
  const libraries = new Map<string, AdminLibraryRolloutLibrary>();

  for (const latest of latestLibraries.values()) {
    libraries.set(latest.libraryId, {
      libraryId: latest.libraryId,
      libraryName: latest.libraryName,
      teamName: latest.teamName,
      latestVersion: latest.version,
      publishedFileName: latest.fileName,
      subscribedFileCount: 0,
      subscribedComponentCount: 0,
      subscribedInstanceCount: 0,
      updateAvailableComponentCount: 0,
      pendingUpdateInstanceCount: 0,
      detachedComponentCount: 0,
      subscriptionDriftCount: 0,
      adoptedLatestComponentCount: 0,
      releaseAdoptionPercent: 0,
      latestActivityAt: latest.updatedAt,
      status: "ready",
    });
  }

  for (const file of files) {
    const components = Object.values(file.document.components ?? {});
    const pendingUpdates = file.document.pendingLibraryComponentUpdates ?? {};
    const analytics = getComponentUsageAnalytics(components, file.document.pages);
    const subscriptions = Object.values(file.document.librarySubscriptions ?? {});
    const subscriptionById = new Map(
      subscriptions.map((subscription) => [subscription.id, subscription]),
    );
    const instanceReview = getComponentInstanceReview(
      components,
      file.document.pages,
      pendingUpdates,
    );
    const sourceComponentsByLibrary = groupByLibrary(
      components.filter(hasLibrarySource),
    );

    for (const subscription of subscriptions) {
      const library = ensureRolloutLibrary(libraries, subscription, null);
      library.latestActivityAt = getLatestDate([
        library.latestActivityAt,
        subscription.updatedAt,
      ]);
    }

    for (const [libraryId, sourcedComponents] of sourceComponentsByLibrary) {
      const firstSource = sourcedComponents[0]?.librarySource;

      if (!firstSource) {
        continue;
      }

      const library = ensureRolloutLibrary(
        libraries,
        subscriptionById.get(libraryId) ?? null,
        firstSource,
      );
      const subscribedInstanceCount = sourcedComponents.reduce(
        (count, component) =>
          count + (analytics[component.id]?.instanceCount ?? 0),
        0,
      );
      const updateAvailableComponentCount = sourcedComponents.filter(
        (component) => hasAvailableUpdate(component, pendingUpdates),
      ).length;
      const detachedComponentCount = sourcedComponents.filter(
        (component) => component.librarySource.status === "detached",
      ).length;
      const subscriptionDriftCount = sourcedComponents.filter((component) =>
        hasSubscriptionDrift(component, subscriptionById, latestLibraries),
      ).length;
      const adoptedLatestComponentCount = sourcedComponents.filter((component) =>
        hasAdoptedLatestRelease(component, subscriptionById, latestLibraries),
      ).length;

      library.subscribedFileCount += 1;
      library.subscribedComponentCount += sourcedComponents.length;
      library.subscribedInstanceCount += subscribedInstanceCount;
      library.updateAvailableComponentCount += updateAvailableComponentCount;
      library.pendingUpdateInstanceCount += instanceReview.rows.filter(
        (row) =>
          row.status === "pending-update" &&
          sourcedComponents.some((component) => component.id === row.componentId),
      ).length;
      library.detachedComponentCount += detachedComponentCount;
      library.subscriptionDriftCount += subscriptionDriftCount;
      library.adoptedLatestComponentCount += adoptedLatestComponentCount;
      library.latestActivityAt = getLatestDate([
        library.latestActivityAt,
        ...sourcedComponents.map((component) => component.librarySource.updatedAt),
      ]);
    }
  }

  return Array.from(libraries.values())
    .map((library) => ({
      ...library,
      releaseAdoptionPercent: getPercent(
        library.adoptedLatestComponentCount,
        library.subscribedComponentCount,
      ),
      status: getRolloutLibraryStatus(library),
    }))
    .sort(sortRolloutLibraries);
}

export function sortRolloutFiles(
  first: AdminLibraryRolloutFile,
  second: AdminLibraryRolloutFile,
) {
  const statusDifference =
    getStatusPriority(first.status) - getStatusPriority(second.status);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return (
    second.subscriptionDriftCount +
    second.updateAvailableComponentCount -
    (first.subscriptionDriftCount + first.updateAvailableComponentCount)
  );
}

function hasLibrarySource(
  component: DesignComponent,
): component is DesignComponent & {
  librarySource: NonNullable<DesignComponent["librarySource"]>;
} {
  return Boolean(component.librarySource);
}

function hasAvailableUpdate(
  component: DesignComponent & {
    librarySource: NonNullable<DesignComponent["librarySource"]>;
  },
  pendingUpdates: Record<string, DesignComponent>,
) {
  return (
    Boolean(pendingUpdates[component.id]) ||
    component.librarySource.status === "update-available" ||
    Boolean(
      component.librarySource.availableVersion &&
        component.librarySource.availableVersion > component.librarySource.version,
    )
  );
}

function hasSubscriptionDrift(
  component: DesignComponent & {
    librarySource: NonNullable<DesignComponent["librarySource"]>;
  },
  subscriptions: Map<string, DesignLibraryMetadata>,
  latestLibraries: Map<string, LatestLibrary>,
) {
  if (component.librarySource.status === "detached") {
    return true;
  }

  return (
    getLatestKnownVersion(component, subscriptions, latestLibraries) >
    component.librarySource.version
  );
}

function hasAdoptedLatestRelease(
  component: DesignComponent & {
    librarySource: NonNullable<DesignComponent["librarySource"]>;
  },
  subscriptions: Map<string, DesignLibraryMetadata>,
  latestLibraries: Map<string, LatestLibrary>,
) {
  if (component.librarySource.status === "detached") {
    return false;
  }

  return (
    component.librarySource.version >=
    getLatestKnownVersion(component, subscriptions, latestLibraries)
  );
}

function getLatestKnownVersion(
  component: DesignComponent & {
    librarySource: NonNullable<DesignComponent["librarySource"]>;
  },
  subscriptions: Map<string, DesignLibraryMetadata>,
  latestLibraries: Map<string, LatestLibrary>,
) {
  return Math.max(
    component.librarySource.version,
    component.librarySource.availableVersion ?? 0,
    subscriptions.get(component.librarySource.libraryId)?.version ?? 0,
    latestLibraries.get(component.librarySource.libraryId)?.version ?? 0,
  );
}

function ensureRolloutLibrary(
  libraries: Map<string, AdminLibraryRolloutLibrary>,
  subscription: DesignLibraryMetadata | null,
  source: NonNullable<DesignComponent["librarySource"]> | null,
) {
  const libraryId = subscription?.id ?? source?.libraryId ?? "unknown-library";
  const existing = libraries.get(libraryId);

  if (existing) {
    existing.latestVersion = Math.max(
      existing.latestVersion,
      subscription?.version ?? 0,
      source?.availableVersion ?? 0,
      source?.version ?? 0,
    );
    return existing;
  }

  const library: AdminLibraryRolloutLibrary = {
    libraryId,
    libraryName: subscription?.name ?? source?.libraryName ?? "Unknown library",
    teamName: subscription?.teamName ?? source?.teamName ?? "Unknown team",
    latestVersion: Math.max(
      subscription?.version ?? 0,
      source?.availableVersion ?? 0,
      source?.version ?? 0,
    ),
    publishedFileName: null,
    subscribedFileCount: 0,
    subscribedComponentCount: 0,
    subscribedInstanceCount: 0,
    updateAvailableComponentCount: 0,
    pendingUpdateInstanceCount: 0,
    detachedComponentCount: 0,
    subscriptionDriftCount: 0,
    adoptedLatestComponentCount: 0,
    releaseAdoptionPercent: 0,
    latestActivityAt: subscription?.updatedAt ?? source?.updatedAt ?? null,
    status: "ready",
  };

  libraries.set(libraryId, library);
  return library;
}

function groupByLibrary(
  components: Array<
    DesignComponent & {
      librarySource: NonNullable<DesignComponent["librarySource"]>;
    }
  >,
) {
  const groups = new Map<string, typeof components>();

  for (const component of components) {
    const libraryId = component.librarySource.libraryId;
    groups.set(libraryId, [...(groups.get(libraryId) ?? []), component]);
  }

  return groups;
}

function getRolloutFileStatus({
  publishedLibraryCount,
  componentCount,
  subscribedComponentCount,
  updateAvailableComponentCount,
  detachedComponentCount,
  subscriptionDriftCount,
  orphanSubscriptionCount,
}: {
  publishedLibraryCount: number;
  componentCount: number;
  subscribedComponentCount: number;
  updateAvailableComponentCount: number;
  detachedComponentCount: number;
  subscriptionDriftCount: number;
  orphanSubscriptionCount: number;
}): AdminLibraryRolloutStatus {
  if (publishedLibraryCount > 0 && componentCount === 0) {
    return "blocked";
  }

  if (
    subscribedComponentCount === 0 &&
    publishedLibraryCount === 0 &&
    orphanSubscriptionCount > 0
  ) {
    return "review";
  }

  if (
    updateAvailableComponentCount > 0 ||
    detachedComponentCount > 0 ||
    subscriptionDriftCount > 0 ||
    orphanSubscriptionCount > 0
  ) {
    return "review";
  }

  return "ready";
}

function getRolloutLibraryStatus(
  library: AdminLibraryRolloutLibrary,
): AdminLibraryRolloutStatus {
  if (library.subscribedComponentCount === 0 && library.publishedFileName) {
    return "review";
  }

  if (
    library.updateAvailableComponentCount > 0 ||
    library.detachedComponentCount > 0 ||
    library.subscriptionDriftCount > 0 ||
    library.releaseAdoptionPercent < READY_ADOPTION_PERCENT
  ) {
    return "review";
  }

  return "ready";
}

function isNewerLibrary(library: PublishedLibrary, current: LatestLibrary) {
  if (library.version !== current.version) {
    return library.version > current.version;
  }

  return toTime(library.updatedAt) > toTime(current.updatedAt);
}

function sortRolloutLibraries(
  first: AdminLibraryRolloutLibrary,
  second: AdminLibraryRolloutLibrary,
) {
  const statusDifference =
    getStatusPriority(first.status) - getStatusPriority(second.status);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return second.subscribedComponentCount - first.subscribedComponentCount;
}

function getStatusPriority(status: AdminLibraryRolloutStatus) {
  if (status === "blocked") {
    return 0;
  }

  return status === "review" ? 1 : 2;
}

export function getLatestDate(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((first, second) => toTime(second) - toTime(first))[0] ?? null;
}

export function getPercent(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function toTime(value: string) {
  return new Date(value).getTime();
}

import type {
  ComponentUsageAnalytics,
} from "@/features/editor/component-analytics";
import {
  getComponentLibrarySignature,
  type LocalLibraryStatus,
} from "@/features/editor/component-library-manifest";
import type {
  DesignComponent,
  DesignDocument,
} from "@/features/editor/types";

export type DesignSystemLibraryPublicationDepthStatus =
  | "blocked"
  | "ready"
  | "review";

export type DesignSystemLibraryPublicationDepthRowCategory =
  | "adoption-diff"
  | "release-scope"
  | "rollback-rollout"
  | "subscriber-update-plan";

export type DesignSystemLibraryPublicationDepthRow = {
  id: string;
  status: DesignSystemLibraryPublicationDepthStatus;
  category: DesignSystemLibraryPublicationDepthRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  metric: number;
};

export type LibraryPublicationAdoptionDiff = {
  componentId: string;
  componentName: string;
  kind: "changed" | "new" | "unchanged";
  instanceCount: number;
  previousSignature: string | null;
};

export type LibraryPublicationSubscriberUpdatePlan = {
  id: string;
  libraryName: string;
  subscriberName: string;
  currentVersion: number;
  targetVersion: number;
  pendingComponentCount: number;
  status: DesignSystemLibraryPublicationDepthStatus;
  detail: string;
};

export type LibraryPublicationRollbackEvidence = {
  id: string;
  label: string;
  status: DesignSystemLibraryPublicationDepthStatus;
  detail: string;
};

export type LibraryPublicationDepthArchiveEvidence = {
  exportedAt: string;
  integrity: {
    algorithm: string;
    componentCount: number;
    payloadHash: string;
    payloadLength: number;
    reportRowCount: number;
  };
  library: {
    currentVersion: number;
    targetVersion: number;
  };
};

export type DesignSystemLibraryPublicationDepthReport = {
  generatedAt: string;
  status: DesignSystemLibraryPublicationDepthStatus;
  score: number;
  libraryName: string;
  teamName: string;
  targetVersion: number;
  componentReleaseScopeCount: number;
  propertyReleaseScopeCount: number;
  styleReleaseScopeCount: number;
  versionReleaseScopeCount: number;
  adoptionDiffCount: number;
  subscriberUpdatePlanCount: number;
  rollbackEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  adoptionDiffs: LibraryPublicationAdoptionDiff[];
  subscriberUpdatePlans: LibraryPublicationSubscriberUpdatePlan[];
  rollbackEvidence: LibraryPublicationRollbackEvidence[];
  rows: DesignSystemLibraryPublicationDepthRow[];
};

const statusRank: Record<DesignSystemLibraryPublicationDepthStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getDesignSystemLibraryPublicationDepthReport({
  analyticsByComponentId,
  components,
  document,
  generatedAt = new Date().toISOString(),
  libraryStatus,
  pendingUpdates,
  releaseArchive,
}: {
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>;
  components: DesignComponent[];
  document: DesignDocument;
  generatedAt?: string;
  libraryStatus: LocalLibraryStatus;
  pendingUpdates: Record<string, DesignComponent>;
  releaseArchive?: LibraryPublicationDepthArchiveEvidence;
}): DesignSystemLibraryPublicationDepthReport {
  const libraryName =
    document.libraryMetadata?.name?.trim() || "Essence Component Library";
  const teamName = document.libraryMetadata?.teamName?.trim() || "Personal";
  const targetVersion =
    releaseArchive?.library.targetVersion ??
    (document.libraryMetadata?.version ?? 0) + 1;
  const componentReleaseScopeCount = components.length;
  const propertyReleaseScopeCount = components.reduce(
    (total, component) =>
      total + Object.keys(component.propertyDefinitions ?? {}).length,
    0,
  );
  const styleReleaseScopeCount = getStyleReleaseScopeCount(document);
  const versionReleaseScopeCount = getVersionReleaseScopeCount(
    document,
    releaseArchive,
  );
  const adoptionDiffs = getAdoptionDiffs({
    analyticsByComponentId,
    components,
    document,
  });
  const subscriberUpdatePlans = getSubscriberUpdatePlans({
    document,
    pendingUpdates,
    targetVersion,
  });
  const rollbackEvidence = getRollbackEvidence({
    document,
    libraryStatus,
    releaseArchive,
    targetVersion,
  });
  const rows = getRows({
    adoptionDiffs,
    componentReleaseScopeCount,
    propertyReleaseScopeCount,
    rollbackEvidence,
    styleReleaseScopeCount,
    subscriberUpdatePlans,
    versionReleaseScopeCount,
  }).sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    libraryName,
    teamName,
    targetVersion,
    componentReleaseScopeCount,
    propertyReleaseScopeCount,
    styleReleaseScopeCount,
    versionReleaseScopeCount,
    adoptionDiffCount: adoptionDiffs.filter((diff) => diff.kind !== "unchanged")
      .length,
    subscriberUpdatePlanCount: subscriberUpdatePlans.length,
    rollbackEvidenceCount: rollbackEvidence.filter(
      (evidence) => evidence.status === "ready",
    ).length,
    readyCount,
    reviewCount,
    blockedCount,
    adoptionDiffs,
    subscriberUpdatePlans,
    rollbackEvidence,
    rows,
  };
}

export function getDesignSystemLibraryPublicationDepthJson(
  report: DesignSystemLibraryPublicationDepthReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getDesignSystemLibraryPublicationDepthCsv(
  report: DesignSystemLibraryPublicationDepthReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "metric",
      "evidence",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.label,
        row.metric,
        row.evidence,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getDesignSystemLibraryPublicationDepthMarkdown(
  report: DesignSystemLibraryPublicationDepthReport,
) {
  return [
    "# Design-System Library Publication Depth",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Library: ${report.libraryName} / ${report.teamName} / v${report.targetVersion}`,
    `Component release scopes: ${report.componentReleaseScopeCount}`,
    `Property release scopes: ${report.propertyReleaseScopeCount}`,
    `Style release scopes: ${report.styleReleaseScopeCount}`,
    `Version release scopes: ${report.versionReleaseScopeCount}`,
    `Adoption diffs: ${report.adoptionDiffCount}`,
    `Subscriber update plans: ${report.subscriberUpdatePlanCount}`,
    `Rollback evidence: ${report.rollbackEvidenceCount}`,
    "",
    "This handoff covers component/property/style/version release scopes, adoption diffs, subscriber update plans, and rollback-safe rollout evidence.",
    "",
    "## review rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Evidence: ${row.evidence}. ${row.recommendation}`,
    ),
    "",
    "## subscriber update plans",
    "",
    ...(report.subscriberUpdatePlans.length > 0
      ? report.subscriberUpdatePlans.map(
          (plan) =>
            `- [${plan.status}] ${plan.subscriberName}: ${plan.detail}`,
        )
      : ["- No subscriber update plans." ]),
  ].join("\n");
}

function getRows({
  adoptionDiffs,
  componentReleaseScopeCount,
  propertyReleaseScopeCount,
  rollbackEvidence,
  styleReleaseScopeCount,
  subscriberUpdatePlans,
  versionReleaseScopeCount,
}: {
  adoptionDiffs: LibraryPublicationAdoptionDiff[];
  componentReleaseScopeCount: number;
  propertyReleaseScopeCount: number;
  rollbackEvidence: LibraryPublicationRollbackEvidence[];
  styleReleaseScopeCount: number;
  subscriberUpdatePlans: LibraryPublicationSubscriberUpdatePlan[];
  versionReleaseScopeCount: number;
}): DesignSystemLibraryPublicationDepthRow[] {
  const changedDiffCount = adoptionDiffs.filter(
    (diff) => diff.kind !== "unchanged",
  ).length;
  const readyRollbackCount = rollbackEvidence.filter(
    (evidence) => evidence.status === "ready",
  ).length;

  return [
    {
      id: "release-scope:component",
      status: componentReleaseScopeCount > 0 ? "ready" : "blocked",
      category: "release-scope",
      label: "Component release scopes",
      detail: `${componentReleaseScopeCount} component${componentReleaseScopeCount === 1 ? "" : "s"} included in the publication scope.`,
      evidence: "Component scope is derived from the document component registry.",
      recommendation:
        "Keep each published component represented in release notes and archive evidence.",
      metric: componentReleaseScopeCount,
    },
    {
      id: "release-scope:property-style-version",
      status:
        propertyReleaseScopeCount > 0 &&
        styleReleaseScopeCount > 0 &&
        versionReleaseScopeCount > 0
          ? "ready"
          : "review",
      category: "release-scope",
      label: "Property, style, and version scopes",
      detail: `${propertyReleaseScopeCount} component properties, ${styleReleaseScopeCount} saved styles, and ${versionReleaseScopeCount} version evidence item${versionReleaseScopeCount === 1 ? "" : "s"} are in scope.`,
      evidence:
        "Property definitions, saved styles, library metadata, and archive target versions are reviewed together.",
      recommendation:
        "Publish component properties, styles, and version metadata as one release packet.",
      metric:
        propertyReleaseScopeCount +
        styleReleaseScopeCount +
        versionReleaseScopeCount,
    },
    {
      id: "adoption-diff:coverage",
      status: changedDiffCount > 0 ? "ready" : "review",
      category: "adoption-diff",
      label: "Adoption diffs",
      detail: `${changedDiffCount} changed or new component adoption diff${changedDiffCount === 1 ? "" : "s"} detected across ${adoptionDiffs.length} component${adoptionDiffs.length === 1 ? "" : "s"}.`,
      evidence:
        adoptionDiffs
          .filter((diff) => diff.kind !== "unchanged")
          .slice(0, 4)
          .map(
            (diff) =>
              `${diff.componentName}:${diff.kind}:${diff.instanceCount} uses`,
          )
          .join(" | ") || "No changed adoption diffs",
      recommendation:
        "Review changed components with adoption counts before publishing the library.",
      metric: changedDiffCount,
    },
    {
      id: "subscriber-update-plan:coverage",
      status: subscriberUpdatePlans.length > 0 ? "ready" : "review",
      category: "subscriber-update-plan",
      label: "Subscriber update plans",
      detail: `${subscriberUpdatePlans.length} subscriber update plan${subscriberUpdatePlans.length === 1 ? "" : "s"} link pending component updates to target library versions.`,
      evidence:
        subscriberUpdatePlans
          .slice(0, 4)
          .map(
            (plan) =>
              `${plan.subscriberName}:v${plan.currentVersion}->v${plan.targetVersion}`,
          )
          .join(" | ") || "No subscriber plans",
      recommendation:
        "Attach subscriber rollout plans so downstream files can accept updates safely.",
      metric: subscriberUpdatePlans.length,
    },
    {
      id: "rollback-rollout:evidence",
      status: readyRollbackCount > 0 ? "ready" : "blocked",
      category: "rollback-rollout",
      label: "Rollback-safe rollout evidence",
      detail: `${readyRollbackCount} rollback evidence item${readyRollbackCount === 1 ? "" : "s"} are ready out of ${rollbackEvidence.length}.`,
      evidence:
        rollbackEvidence
          .map((item) => `${item.label}:${item.status}`)
          .join(" | ") || "No rollback evidence",
      recommendation:
        "Keep archive integrity, version deltas, and changed-scope counts available for rollback.",
      metric: readyRollbackCount,
    },
  ];
}

function getAdoptionDiffs({
  analyticsByComponentId,
  components,
  document,
}: {
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>;
  components: DesignComponent[];
  document: DesignDocument;
}): LibraryPublicationAdoptionDiff[] {
  const signatures = document.libraryMetadata?.componentSignatures ?? {};

  return components.map((component) => {
    const previousSignature = signatures[component.id] ?? null;
    const currentSignature = getComponentLibrarySignature(component);
    const kind =
      previousSignature === null
        ? "new"
        : previousSignature === currentSignature
          ? "unchanged"
          : "changed";

    return {
      componentId: component.id,
      componentName: component.name,
      kind,
      instanceCount: analyticsByComponentId[component.id]?.instanceCount ?? 0,
      previousSignature,
    };
  });
}

function getSubscriberUpdatePlans({
  document,
  pendingUpdates,
  targetVersion,
}: {
  document: DesignDocument;
  pendingUpdates: Record<string, DesignComponent>;
  targetVersion: number;
}): LibraryPublicationSubscriberUpdatePlan[] {
  const subscriptions = Object.values(document.librarySubscriptions ?? {});
  const pendingUpdateCount = Object.keys(pendingUpdates).length;
  const fallbackSubscription = {
    id: document.libraryMetadata?.id ?? "local-library",
    name: document.libraryMetadata?.name ?? "Local library",
    teamName: document.libraryMetadata?.teamName ?? "Personal",
    version: document.libraryMetadata?.version ?? Math.max(0, targetVersion - 1),
    componentCount: document.libraryMetadata?.componentCount ?? 0,
    updatedAt: document.updatedAt,
  };

  return (subscriptions.length > 0 ? subscriptions : [fallbackSubscription]).map(
    (subscription) => ({
      id: subscription.id,
      libraryName: document.libraryMetadata?.name ?? subscription.name,
      subscriberName: subscription.name,
      currentVersion: subscription.version,
      targetVersion,
      pendingComponentCount: pendingUpdateCount,
      status:
        pendingUpdateCount > 0 || targetVersion > subscription.version
          ? "ready"
          : "review",
      detail: `${pendingUpdateCount} pending component update${pendingUpdateCount === 1 ? "" : "s"} prepared for ${subscription.name} from v${subscription.version} to v${targetVersion}.`,
    }),
  );
}

function getRollbackEvidence({
  document,
  libraryStatus,
  releaseArchive,
  targetVersion,
}: {
  document: DesignDocument;
  libraryStatus: LocalLibraryStatus;
  releaseArchive?: LibraryPublicationDepthArchiveEvidence;
  targetVersion: number;
}): LibraryPublicationRollbackEvidence[] {
  return [
    {
      id: "archive-integrity",
      label: "Archive integrity",
      status: releaseArchive?.integrity.payloadHash ? "ready" : "blocked",
      detail: releaseArchive?.integrity.payloadHash
        ? `${releaseArchive.integrity.payloadHash} / ${releaseArchive.integrity.payloadLength} bytes / ${releaseArchive.integrity.reportRowCount} report rows`
        : "No release archive integrity hash is available.",
    },
    {
      id: "version-delta",
      label: "Version delta",
      status:
        targetVersion > (document.libraryMetadata?.version ?? 0)
          ? "ready"
          : "review",
      detail: `Library version moves from v${document.libraryMetadata?.version ?? 0} to v${targetVersion}.`,
    },
    {
      id: "changed-scope",
      label: "Changed scope",
      status: libraryStatus.changedCount > 0 ? "ready" : "review",
      detail: `${libraryStatus.changedCount} changed component${libraryStatus.changedCount === 1 ? "" : "s"} are available for rollback comparison.`,
    },
  ];
}

function getStyleReleaseScopeCount(document: DesignDocument) {
  return (
    Object.keys(document.paintStyles ?? {}).length +
    Object.keys(document.textStyles ?? {}).length +
    Object.keys(document.effectStyles ?? {}).length +
    Object.keys(document.layoutGridStyles ?? {}).length +
    Object.keys(document.layoutPresetStyles ?? {}).length
  );
}

function getVersionReleaseScopeCount(
  document: DesignDocument,
  releaseArchive?: LibraryPublicationDepthArchiveEvidence,
) {
  return [
    document.libraryMetadata?.version,
    document.libraryMetadata?.publishedAt,
    releaseArchive?.library.targetVersion,
    releaseArchive?.exportedAt,
  ].filter(Boolean).length;
}

function sortRows(
  first: DesignSystemLibraryPublicationDepthRow,
  second: DesignSystemLibraryPublicationDepthRow,
) {
  if (first.status !== second.status) {
    return statusRank[first.status] - statusRank[second.status];
  }

  if (first.category !== second.category) {
    return first.category.localeCompare(second.category);
  }

  return first.label.localeCompare(second.label);
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

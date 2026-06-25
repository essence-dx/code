import type { ComponentUsageAnalytics } from "@/features/editor/component-analytics";
import {
  getComponentDocumentationReadiness,
} from "@/features/editor/component-documentation-readiness";
import type {
  ComponentDependencyReviewReport,
  ComponentDependencyReviewRow,
} from "@/features/editor/component-dependency-review";
import type { LocalLibraryStatus } from "@/features/editor/component-library-manifest";
import type {
  DesignActivityEvent,
  DesignComponent,
  DesignLibraryMetadata,
  DesignPage,
} from "@/features/editor/types";

export type ComponentMarketplaceStatus = "ready" | "review" | "blocked";

export type ComponentMarketplaceCategory =
  | "adoption"
  | "campaign"
  | "dependency"
  | "listing"
  | "preview"
  | "ready";

export type ComponentMarketplaceRow = {
  id: string;
  status: ComponentMarketplaceStatus;
  category: ComponentMarketplaceCategory;
  componentId?: string;
  componentName: string;
  label: string;
  detail: string;
  recommendation: string;
  layerIds: string[];
  pageNames: string[];
  metric: number;
  action?: "accept-update" | "queue-layers";
};

export type ComponentMarketplaceListing = {
  componentId: string;
  name: string;
  version: number;
  status: ComponentMarketplaceStatus;
  score: number;
  dimensions: string;
  instanceCount: number;
  variantCount: number;
  propertyCount: number;
  dependencyIssueCount: number;
  previewEvidence: string;
  campaign: "none" | "accept-update" | "relink-detached";
};

export type ComponentMarketplaceReadinessReport = {
  status: ComponentMarketplaceStatus;
  score: number;
  libraryName: string;
  teamName: string;
  componentCount: number;
  publishableListingCount: number;
  previewReadyCount: number;
  adoptedComponentCount: number;
  dependencyIssueCount: number;
  updateCampaignCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: ComponentMarketplaceRow[];
  listings: ComponentMarketplaceListing[];
};

type ComponentMarketplaceInput = {
  activityEvents?: DesignActivityEvent[];
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>;
  components: DesignComponent[];
  dependencyReview: ComponentDependencyReviewReport;
  libraryMetadata?: DesignLibraryMetadata;
  libraryStatus: LocalLibraryStatus;
  pages: DesignPage[];
  pendingUpdates: Record<string, DesignComponent>;
};

export function getComponentMarketplaceReadiness({
  activityEvents = [],
  analyticsByComponentId,
  components,
  dependencyReview,
  libraryMetadata,
  libraryStatus,
  pages,
  pendingUpdates,
}: ComponentMarketplaceInput): ComponentMarketplaceReadinessReport {
  const rows = [
    ...getLibraryRows(components, libraryMetadata, libraryStatus),
    ...components.flatMap((component) =>
      getComponentRows({
        analytics: analyticsByComponentId[component.id],
        component,
        dependencyRows: dependencyReview.byComponentId[component.id] ?? [],
        pages,
        pendingUpdates,
      }),
    ),
    ...getCampaignRows(components, pages, pendingUpdates),
    ...getAdoptionTrendRows(components, activityEvents),
  ].sort(sortRows);
  const finalRows =
    rows.length > 0 ? rows : [getReadyRow(components.length)];
  const blockedCount = countStatus(finalRows, "blocked");
  const reviewCount = countStatus(finalRows, "review");
  const readyCount = countStatus(finalRows, "ready");
  const listings = components.map((component) =>
    getListing({
      analytics: analyticsByComponentId[component.id],
      component,
      dependencyRows: dependencyReview.byComponentId[component.id] ?? [],
      pendingUpdates,
    }),
  );

  return {
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 5),
    libraryName:
      libraryMetadata?.name?.trim() || "Essence Component Marketplace",
    teamName: libraryMetadata?.teamName?.trim() || "Personal",
    componentCount: components.length,
    publishableListingCount: listings.filter((listing) => listing.status === "ready")
      .length,
    previewReadyCount: listings.filter((listing) => listing.instanceCount > 0)
      .length,
    adoptedComponentCount: listings.filter((listing) => listing.instanceCount > 0)
      .length,
    dependencyIssueCount: dependencyReview.issueCount,
    updateCampaignCount: Object.keys(pendingUpdates).length,
    readyCount,
    reviewCount,
    blockedCount,
    rows: finalRows,
    listings,
  };
}

export function getComponentMarketplaceReadinessCsv(
  report: ComponentMarketplaceReadinessReport,
  rows = report.rows,
) {
  return [
    ["score", report.score].map(escapeCsvCell).join(","),
    ["status", report.status].map(escapeCsvCell).join(","),
    ["library", report.libraryName].map(escapeCsvCell).join(","),
    "",
    ["status", "category", "component", "label", "detail", "metric", "recommendation"].join(","),
    ...rows.map((row) =>
      [
        row.status,
        row.category,
        row.componentName,
        row.label,
        row.detail,
        row.metric,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getComponentMarketplaceReadinessMarkdown(
  report: ComponentMarketplaceReadinessReport,
  rows = report.rows,
) {
  return [
    "# Component Marketplace Readiness",
    "",
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Library: ${report.libraryName}`,
    `Team: ${report.teamName}`,
    `Components: ${report.componentCount}`,
    `Publishable listings: ${report.publishableListingCount}`,
    `Preview-ready listings: ${report.previewReadyCount}`,
    `Dependency issues: ${report.dependencyIssueCount}`,
    `Update campaigns: ${report.updateCampaignCount}`,
    "",
    "## Listings",
    ...report.listings.map(
      (listing) =>
        `- [${listing.status}] ${listing.name}: score ${listing.score}, ${listing.instanceCount} instances, ${listing.previewEvidence}`,
    ),
    "",
    "## Review Rows",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.componentName} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

export function getComponentMarketplaceReadinessBundleJson(
  report: ComponentMarketplaceReadinessReport,
  rows = report.rows,
) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: {
        status: report.status,
        score: report.score,
        libraryName: report.libraryName,
        teamName: report.teamName,
        componentCount: report.componentCount,
        publishableListingCount: report.publishableListingCount,
        previewReadyCount: report.previewReadyCount,
        dependencyIssueCount: report.dependencyIssueCount,
        updateCampaignCount: report.updateCampaignCount,
      },
      listings: report.listings,
      rows,
    },
    null,
    2,
  );
}

function getLibraryRows(
  components: DesignComponent[],
  libraryMetadata: DesignLibraryMetadata | undefined,
  libraryStatus: LocalLibraryStatus,
) {
  const rows: ComponentMarketplaceRow[] = [];

  if (components.length === 0) {
    rows.push(
      createRow({
        status: "blocked",
        category: "listing",
        componentName: "Marketplace",
        label: "No listings",
        detail: "Create components before preparing marketplace listings.",
        recommendation:
          "Publish at least one documented component with preview evidence.",
        metric: 0,
      }),
    );
  }

  if (!libraryMetadata?.name?.trim() || !libraryMetadata.teamName?.trim()) {
    rows.push(
      createRow({
        status: "review",
        category: "listing",
        componentName: "Marketplace",
        label: "Listing publisher metadata",
        detail: "Marketplace bundles need explicit library and team metadata.",
        recommendation:
          "Set library name and team before exporting marketplace listings.",
        metric: 1,
      }),
    );
  }

  if (libraryStatus.changedCount > 0) {
    rows.push(
      createRow({
        status: "review",
        category: "campaign",
        componentName: "Marketplace",
        label: "Unpublished listing changes",
        detail: `${libraryStatus.changedCount} component change${libraryStatus.changedCount === 1 ? "" : "s"} are not published yet.`,
        recommendation:
          "Publish or export a release archive before launching marketplace campaigns.",
        metric: libraryStatus.changedCount,
      }),
    );
  }

  return rows;
}

function getComponentRows({
  analytics,
  component,
  dependencyRows,
  pages,
  pendingUpdates,
}: {
  analytics: ComponentUsageAnalytics | undefined;
  component: DesignComponent;
  dependencyRows: ComponentDependencyReviewRow[];
  pages: DesignPage[];
  pendingUpdates: Record<string, DesignComponent>;
}) {
  const rows: ComponentMarketplaceRow[] = [];
  const documentation = getComponentDocumentationReadiness(component, analytics);
  const instances = getComponentInstanceLayers(pages, component.id);
  const dependencyIssues = dependencyRows.filter((row) => row.status !== "ready");

  if (documentation.missingCount > 0) {
    rows.push(
      createRow({
        status: "blocked",
        category: "listing",
        componentId: component.id,
        componentName: component.name,
        label: "Listing metadata incomplete",
        detail: `${documentation.missingCount} required documentation item${documentation.missingCount === 1 ? "" : "s"} are missing.`,
        recommendation:
          "Complete slot metadata and handoff fields before marketplace publishing.",
        metric: documentation.missingCount,
      }),
    );
  } else if (documentation.reviewCount > 2) {
    rows.push(
      createRow({
        status: "review",
        category: "listing",
        componentId: component.id,
        componentName: component.name,
        label: "Listing needs richer detail",
        detail: `${documentation.reviewCount} documentation item${documentation.reviewCount === 1 ? "" : "s"} need review.`,
        recommendation:
          "Add examples, variants, properties, Code Connect, or dev links for stronger marketplace listings.",
        metric: documentation.reviewCount,
      }),
    );
  }

  if (instances.length === 0) {
    rows.push(
      createRow({
        status: "review",
        category: "preview",
        componentId: component.id,
        componentName: component.name,
        label: "Preview evidence missing",
        detail: "No placed instances exist to prove this component in real files.",
        recommendation:
          "Insert example instances before treating the listing preview as production-ready.",
        metric: 0,
      }),
    );
  }

  if (dependencyIssues.length > 0) {
    rows.push(
      createRow({
        status: dependencyIssues.some(isBlockingDependency) ? "blocked" : "review",
        category: "dependency",
        componentId: component.id,
        componentName: component.name,
        label: "Dependency health",
        detail: `${dependencyIssues.length} nested dependency issue${dependencyIssues.length === 1 ? "" : "s"} found.`,
        recommendation:
          "Fix dependency cycles, missing components, and slot metadata before marketplace export.",
        metric: dependencyIssues.length,
      }),
    );
  }

  if (pendingUpdates[component.id]) {
    rows.push(
      createRow({
        status: "review",
        category: "campaign",
        componentId: component.id,
        componentName: component.name,
        label: "Library update campaign",
        detail: "A newer source component is ready to campaign into this file.",
        recommendation:
          "Accept the update or capture deferral notes before marketplace release.",
        metric: 1,
        action: "accept-update",
      }),
    );
  }

  return rows;
}

function getCampaignRows(
  components: DesignComponent[],
  pages: DesignPage[],
  pendingUpdates: Record<string, DesignComponent>,
) {
  return components.flatMap((component) => {
    if (component.librarySource?.status !== "detached") {
      return [];
    }

    const layers = getComponentInstanceLayers(pages, component.id);

    return [
      createRow({
        status: "blocked",
        category: "campaign",
        componentId: component.id,
        componentName: component.name,
        label: "Detached source campaign",
        detail: "Marketplace campaign cannot prove this component is synced to its source library.",
        recommendation:
          pendingUpdates[component.id]
            ? "Accept the pending update or relink the component before release."
            : "Relink or intentionally own this detached component with release notes.",
        layerIds: layers.map((layer) => layer.id),
        pageNames: getPageNamesForLayers(pages, layers),
        metric: layers.length,
        action: layers.length > 0 ? "queue-layers" : undefined,
      }),
    ];
  });
}

function getAdoptionTrendRows(
  components: DesignComponent[],
  activityEvents: DesignActivityEvent[],
) {
  const trendEvents = activityEvents.filter(
    (event) =>
      event.kind === "component" ||
      /component|variant|library update|marketplace/i.test(event.label),
  );

  if (components.length === 0 || trendEvents.length > 0) {
    return [];
  }

  return [
    createRow({
      status: "review",
      category: "adoption",
      componentName: "Marketplace",
      label: "Adoption analytics baseline",
      detail:
        "No component activity exists yet to support marketplace adoption trend evidence.",
      recommendation:
        "Capture component insert/update/detach events before relying on adoption campaign analytics.",
      metric: 0,
    }),
  ];
}

function getListing({
  analytics,
  component,
  dependencyRows,
  pendingUpdates,
}: {
  analytics: ComponentUsageAnalytics | undefined;
  component: DesignComponent;
  dependencyRows: ComponentDependencyReviewRow[];
  pendingUpdates: Record<string, DesignComponent>;
}): ComponentMarketplaceListing {
  const documentation = getComponentDocumentationReadiness(component, analytics);
  const dependencyIssueCount = dependencyRows.filter(
    (row) => row.status !== "ready",
  ).length;
  const instanceCount = analytics?.instanceCount ?? 0;
  const blocked =
    documentation.missingCount > 0 ||
    dependencyRows.some(isBlockingDependency) ||
    component.librarySource?.status === "detached";
  const review =
    documentation.reviewCount > 0 ||
    instanceCount === 0 ||
    dependencyIssueCount > 0 ||
    Boolean(pendingUpdates[component.id]);
  const score = Math.max(
    0,
    100 -
      documentation.missingCount * 18 -
      documentation.reviewCount * 6 -
      dependencyIssueCount * 12 -
      (instanceCount === 0 ? 10 : 0),
  );

  return {
    componentId: component.id,
    name: component.name,
    version: component.librarySource?.version ?? 0,
    status: blocked ? "blocked" : review ? "review" : "ready",
    score,
    dimensions: `${Math.round(component.width)}x${Math.round(component.height)}`,
    instanceCount,
    variantCount: component.variants?.length ?? 0,
    propertyCount: Object.keys(component.propertyDefinitions ?? {}).length,
    dependencyIssueCount,
    previewEvidence:
      instanceCount > 0
        ? `${instanceCount} placed preview${instanceCount === 1 ? "" : "s"}`
        : "No placed previews",
    campaign: pendingUpdates[component.id]
      ? "accept-update"
      : component.librarySource?.status === "detached"
        ? "relink-detached"
        : "none",
  };
}

function getComponentInstanceLayers(pages: DesignPage[], componentId: string) {
  return pages
    .flatMap((page) => page.layers)
    .filter((layer) => layer.componentId === componentId);
}

function getPageNamesForLayers(
  pages: DesignPage[],
  layers: Array<{ id: string }>,
) {
  const layerIds = new Set(layers.map((layer) => layer.id));

  return pages
    .filter((page) => page.layers.some((layer) => layerIds.has(layer.id)))
    .map((page) => page.name);
}

function isBlockingDependency(row: ComponentDependencyReviewRow) {
  return (
    row.status === "cycle" ||
    row.status === "self-reference" ||
    row.status === "unknown-component"
  );
}

function createRow(
  input: Omit<ComponentMarketplaceRow, "id" | "layerIds" | "pageNames"> &
    Partial<Pick<ComponentMarketplaceRow, "layerIds" | "pageNames">>,
): ComponentMarketplaceRow {
  return {
    id: `${input.category}:${input.componentId ?? "marketplace"}:${input.label}`,
    layerIds: input.layerIds ?? [],
    pageNames: input.pageNames ?? [],
    ...input,
  };
}

function getReadyRow(componentCount: number): ComponentMarketplaceRow {
  return {
    id: "component-marketplace-ready",
    status: "ready",
    category: "ready",
    componentName: "Marketplace",
    label: "Marketplace listings ready",
    detail: `${componentCount} component listing${componentCount === 1 ? "" : "s"} have publishable evidence.`,
    recommendation:
      "Export marketplace readiness evidence with the next library release.",
    layerIds: [],
    pageNames: [],
    metric: componentCount,
  };
}

function countStatus(
  rows: ComponentMarketplaceRow[],
  status: ComponentMarketplaceStatus,
) {
  return rows.filter((row) => row.status === status).length;
}

function sortRows(
  first: ComponentMarketplaceRow,
  second: ComponentMarketplaceRow,
) {
  const statusOrder = { blocked: 0, review: 1, ready: 2 };

  if (first.status !== second.status) {
    return statusOrder[first.status] - statusOrder[second.status];
  }

  return `${first.category}:${first.componentName}`.localeCompare(
    `${second.category}:${second.componentName}`,
  );
}

function escapeCsvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join(" / ") : String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

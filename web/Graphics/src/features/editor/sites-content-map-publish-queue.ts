import type {
  ProductionDeploySmokeKind,
  ProductionDeploySmokeReport,
  ProductionDeploySmokeRow,
  ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";
import type { SitesResponsivePublishingPreflightReport } from "@/features/editor/sites-responsive-publishing-preflight";
import type {
  DesignActivityEvent,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type SitesContentMapPublishQueueStatus = ProductionDeploySmokeStatus;

export type SitesContentMapPublishQueueRowCategory =
  | "route-sitemap"
  | "seo-meta"
  | "asset-budget"
  | "publish-queue"
  | "rollback-channel"
  | "public-route-evidence";

export type SitesRouteSitemapItem = {
  id: string;
  status: SitesContentMapPublishQueueStatus;
  pageId: string;
  pageName: string;
  route: string;
  title: string;
  description: string;
  frameIds: string[];
  layerIds: string[];
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SitesSeoMetaCheck = {
  id: string;
  status: SitesContentMapPublishQueueStatus;
  pageId: string;
  pageName: string;
  route: string;
  title: string;
  description: string;
  titleLength: number;
  descriptionLength: number;
  layerIds: string[];
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SitesAssetBudget = {
  id: string;
  status: SitesContentMapPublishQueueStatus;
  pageId: string;
  pageName: string;
  route: string;
  assetCount: number;
  totalPixelArea: number;
  budgetPixelArea: number;
  largestAssetLabel: string;
  layerIds: string[];
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SitesPublishQueueItem = {
  id: string;
  status: SitesContentMapPublishQueueStatus;
  pageId: string;
  pageName: string;
  route: string;
  channel: "production";
  sourceActivityId?: string;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SitesRollbackChannel = {
  id: string;
  status: SitesContentMapPublishQueueStatus;
  label: string;
  sourceActivityId?: string;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SitesPublicRouteEvidence = {
  id: string;
  status: SitesContentMapPublishQueueStatus;
  kind: ProductionDeploySmokeKind;
  label: string;
  route: string;
  method: ProductionDeploySmokeRow["method"];
  command: string;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SitesContentMapPublishQueueRow = {
  id: string;
  status: SitesContentMapPublishQueueStatus;
  category: SitesContentMapPublishQueueRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  layerIds: string[];
  metric: number;
};

export type SitesContentMapPublishQueueReport = {
  generatedAt: string;
  status: SitesContentMapPublishQueueStatus;
  score: number;
  activePageId: string;
  activePageName: string;
  routeSitemapCount: number;
  seoMetaCheckCount: number;
  assetBudgetCount: number;
  publishQueueCount: number;
  rollbackChannelCount: number;
  publicRouteEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  routeSitemap: SitesRouteSitemapItem[];
  seoMetaChecks: SitesSeoMetaCheck[];
  assetBudgets: SitesAssetBudget[];
  publishQueue: SitesPublishQueueItem[];
  rollbackChannels: SitesRollbackChannel[];
  publicRouteEvidence: SitesPublicRouteEvidence[];
  rows: SitesContentMapPublishQueueRow[];
};

type SiteRouteContext = {
  page: DesignPage;
  route: string;
  frameIds: string[];
};

const assetBudgetPixelArea = 2_500_000;

const publicRouteKinds = new Set<ProductionDeploySmokeKind>([
  "share",
  "prototype",
  "embed",
  "release-handoff",
]);

const statusRank: Record<SitesContentMapPublishQueueStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getSitesContentMapPublishQueueReport({
  activePage,
  document,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  shareToken = productionDeploySmoke.shareToken,
  sitesPreflight,
}: {
  activePage: DesignPage;
  document: DesignDocument;
  generatedAt?: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  shareToken?: string;
  sitesPreflight: SitesResponsivePublishingPreflightReport;
}): SitesContentMapPublishQueueReport {
  const routes = getSiteRouteContexts({ activePage, document });
  const routeSitemap = routes.map(getRouteSitemapItem);
  const seoMetaChecks = routes.map(getSeoMetaCheck);
  const assetBudgets = routes.map(getAssetBudget);
  const publishQueue = getPublishQueue({
    assetBudgets,
    document,
    routeSitemap,
    seoMetaChecks,
    shareToken,
  });
  const rollbackChannels = getRollbackChannels({ document, sitesPreflight });
  const publicRouteEvidence = getPublicRouteEvidence({
    productionDeploySmoke,
    sitesPreflight,
  });
  const rows = getRows({
    assetBudgets,
    publicRouteEvidence,
    publishQueue,
    rollbackChannels,
    routeSitemap,
    seoMetaChecks,
  }).sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    activePageId: activePage.id,
    activePageName: activePage.name,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    routeSitemapCount: routeSitemap.length,
    seoMetaCheckCount: seoMetaChecks.length,
    assetBudgetCount: assetBudgets.length,
    publishQueueCount: publishQueue.length,
    rollbackChannelCount: rollbackChannels.length,
    publicRouteEvidenceCount: publicRouteEvidence.length,
    readyCount,
    reviewCount,
    blockedCount,
    routeSitemap,
    seoMetaChecks,
    assetBudgets,
    publishQueue,
    rollbackChannels,
    publicRouteEvidence,
    rows,
  };
}

export function getSitesContentMapPublishQueueJson(
  report: SitesContentMapPublishQueueReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getSitesContentMapPublishQueueCsv(
  report: SitesContentMapPublishQueueReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "metric",
      "layer_ids",
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
        row.layerIds.join(" "),
        row.evidence,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getSitesContentMapPublishQueueMarkdown(
  report: SitesContentMapPublishQueueReport,
) {
  return [
    "# Sites Content Map And Publish Queue",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active page: ${report.activePageName}`,
    `Routes: ${report.routeSitemapCount}`,
    `SEO/meta checks: ${report.seoMetaCheckCount}`,
    `Asset budgets: ${report.assetBudgetCount}`,
    `Publish queue: ${report.publishQueueCount}`,
    `Rollback channels: ${report.rollbackChannelCount}`,
    `Public route evidence: ${report.publicRouteEvidenceCount}`,
    "",
    "This packet combines route sitemap ownership, SEO/meta checks, asset budgets, publish queue, rollback channel readiness, and public route evidence for Sites launches.",
    "",
    "## route sitemap",
    "",
    ...report.routeSitemap.map(
      (route) =>
        `- [${route.status}] ${route.route} - ${route.detail} Evidence: ${route.evidence}. ${route.recommendation}`,
    ),
    "",
    "## SEO/meta checks",
    "",
    ...report.seoMetaChecks.map(
      (check) =>
        `- [${check.status}] ${check.route} - title ${check.titleLength}, description ${check.descriptionLength}. Evidence: ${check.evidence}. ${check.recommendation}`,
    ),
    "",
    "## asset budgets",
    "",
    ...report.assetBudgets.map(
      (budget) =>
        `- [${budget.status}] ${budget.route} - ${budget.assetCount} asset${budget.assetCount === 1 ? "" : "s"}, ${budget.totalPixelArea}/${budget.budgetPixelArea} px area. Evidence: ${budget.evidence}. ${budget.recommendation}`,
    ),
    "",
    "## publish queue",
    "",
    ...report.publishQueue.map(
      (item) =>
        `- [${item.status}] ${item.route} (${item.channel}) - ${item.detail} Evidence: ${item.evidence}. ${item.recommendation}`,
    ),
    "",
    "## rollback channel",
    "",
    ...report.rollbackChannels.map(
      (channel) =>
        `- [${channel.status}] ${channel.label} - ${channel.detail} Evidence: ${channel.evidence}. ${channel.recommendation}`,
    ),
    "",
    "## public route evidence",
    "",
    ...report.publicRouteEvidence.map(
      (item) =>
        `- [${item.status}] ${item.label} (${item.method} ${item.route}) - ${item.detail} Evidence: ${item.evidence}. ${item.recommendation}`,
    ),
  ].join("\n");
}

function getSiteRouteContexts({
  activePage,
  document,
}: {
  activePage: DesignPage;
  document: DesignDocument;
}): SiteRouteContext[] {
  const sitePages = document.pages.filter(
    (page) => page.id === activePage.id || isSitePage(page),
  );
  const pages = sitePages.length > 0 ? sitePages : [activePage];
  const seenRoutes = new Set<string>();

  return pages.map((page) => {
    const route = getUniqueRoute(getPageRoute(page), seenRoutes);
    const frameIds = page.layers
      .filter((layer) => layer.type === "frame" && layer.visible)
      .map((layer) => layer.id);

    return { page, route, frameIds };
  });
}

function getRouteSitemapItem(route: SiteRouteContext): SitesRouteSitemapItem {
  const seo = getSeoSignals(route.page);
  const contentLayerIds = Array.from(
    new Set([...route.frameIds, ...seo.layerIds]),
  );
  const status = route.frameIds.length > 0 ? "ready" : "review";

  return {
    id: `route-sitemap-${route.page.id}`,
    status,
    pageId: route.page.id,
    pageName: route.page.name,
    route: route.route,
    title: seo.title,
    description: seo.description,
    frameIds: route.frameIds,
    layerIds: contentLayerIds,
    detail:
      route.frameIds.length > 0
        ? `${route.page.name} maps to ${route.route} with ${route.frameIds.length} source frame${route.frameIds.length === 1 ? "" : "s"}.`
        : `${route.page.name} maps to ${route.route} but has no visible source frame.`,
    evidence: route.frameIds.length > 0 ? route.frameIds.join(", ") : "No visible route frame.",
    recommendation:
      status === "ready"
        ? "Keep this route attached to publish approval and post-launch route smoke."
        : "Add a visible source frame before publishing this route.",
  };
}

function getSeoMetaCheck(route: SiteRouteContext): SitesSeoMetaCheck {
  const seo = getSeoSignals(route.page);
  const titleLength = seo.title.length;
  const descriptionLength = seo.description.length;
  const hasTitle = titleLength > 0;
  const hasDescription = descriptionLength > 0;
  const titleReady = titleLength >= 18 && titleLength <= 70;
  const descriptionReady =
    descriptionLength >= 50 && descriptionLength <= 160;
  const status: SitesContentMapPublishQueueStatus =
    titleReady && descriptionReady
      ? "ready"
      : hasTitle || hasDescription
        ? "review"
        : "blocked";

  return {
    id: `seo-meta-${route.page.id}`,
    status,
    pageId: route.page.id,
    pageName: route.page.name,
    route: route.route,
    title: seo.title,
    description: seo.description,
    titleLength,
    descriptionLength,
    layerIds: seo.layerIds,
    detail: `${route.route} has title length ${titleLength} and meta description length ${descriptionLength}.`,
    evidence:
      seo.layerNames.length > 0
        ? seo.layerNames.join(", ")
        : "No SEO title or meta description layer found.",
    recommendation: getSeoRecommendation({
      descriptionReady,
      hasDescription,
      hasTitle,
      status,
      titleReady,
    }),
  };
}

function getAssetBudget(route: SiteRouteContext): SitesAssetBudget {
  const assetLayers = getAssetLayers(route.page);
  const totalPixelArea = assetLayers.reduce(
    (sum, layer) => sum + Math.round(layer.width * layer.height),
    0,
  );
  const largestAsset = [...assetLayers].sort(
    (left, right) => right.width * right.height - left.width * left.height,
  )[0];
  const status: SitesContentMapPublishQueueStatus =
    assetLayers.length === 0
      ? "blocked"
      : totalPixelArea > assetBudgetPixelArea
        ? "review"
        : "ready";

  return {
    id: `asset-budget-${route.page.id}`,
    status,
    pageId: route.page.id,
    pageName: route.page.name,
    route: route.route,
    assetCount: assetLayers.length,
    totalPixelArea,
    budgetPixelArea: assetBudgetPixelArea,
    largestAssetLabel: largestAsset?.name ?? "No media asset",
    layerIds: assetLayers.map((layer) => layer.id),
    detail:
      assetLayers.length > 0
        ? `${route.route} uses ${assetLayers.length} media asset${assetLayers.length === 1 ? "" : "s"} at ${totalPixelArea} total pixel area.`
        : `${route.route} has no media asset evidence attached to the content map.`,
    evidence:
      assetLayers.length > 0
        ? assetLayers.map((layer) => `${layer.name} ${Math.round(layer.width)}x${Math.round(layer.height)}`).join(" | ")
        : "No image, asset, media, photo, or illustration layer found.",
    recommendation:
      status === "ready"
        ? "Keep asset sizes inside the route budget and attach optimized media to handoff."
        : status === "review"
          ? "Compress, crop, or split oversized assets before approving publish."
          : "Attach at least one visible media asset or mark the route as intentionally text-only in approval notes.",
  };
}

function getPublishQueue({
  assetBudgets,
  document,
  routeSitemap,
  seoMetaChecks,
  shareToken,
}: {
  assetBudgets: SitesAssetBudget[];
  document: DesignDocument;
  routeSitemap: SitesRouteSitemapItem[];
  seoMetaChecks: SitesSeoMetaCheck[];
  shareToken: string;
}) {
  const publishActivity = getLatestMatchingActivity(
    document.activityEvents ?? [],
    /publish|queue|launch|release/i,
  );

  return routeSitemap.map((route) => {
    const seo = seoMetaChecks.find((check) => check.pageId === route.pageId);
    const budget = assetBudgets.find((item) => item.pageId === route.pageId);
    const sourceStatuses = [
      route.status,
      seo?.status ?? "blocked",
      budget?.status ?? "blocked",
      publishActivity ? "ready" : "review",
    ] satisfies SitesContentMapPublishQueueStatus[];
    const status = getAggregateStatus(sourceStatuses);

    return {
      id: `publish-queue-${route.pageId}`,
      status,
      pageId: route.pageId,
      pageName: route.pageName,
      route: route.route,
      channel: "production",
      sourceActivityId: publishActivity?.id,
      detail: publishActivity
        ? `${route.route} is queued for production publish with share token ${shareToken}.`
        : `${route.route} has content evidence but no publish queue activity.`,
      evidence:
        publishActivity?.detail ??
        "Activity timeline needs a queued publish or launch entry.",
      recommendation:
        status === "ready"
          ? "Keep this route in approval order and include it in production route smoke."
          : "Queue this route from the Sites publishing panel after route, SEO, and asset evidence are ready.",
    } satisfies SitesPublishQueueItem;
  });
}

function getRollbackChannels({
  document,
  sitesPreflight,
}: {
  document: DesignDocument;
  sitesPreflight: SitesResponsivePublishingPreflightReport;
}): SitesRollbackChannel[] {
  const rollbackActivity = getLatestMatchingActivity(
    document.activityEvents ?? [],
    /rollback|restore|previous|snapshot/i,
  );
  const preflightStatus =
    sitesPreflight.rollbackNotes.length > 0
      ? getAggregateStatus(
          sitesPreflight.rollbackNotes.map((note) => note.status),
        )
      : "blocked";
  const channels: SitesRollbackChannel[] = [
    {
      id: "sites-preflight-rollback-channel",
      status: preflightStatus,
      label: "Responsive publish rollback channel",
      detail: `${sitesPreflight.rollbackNotes.length} rollback note${sitesPreflight.rollbackNotes.length === 1 ? "" : "s"} are attached from Sites publishing preflight.`,
      evidence:
        sitesPreflight.rollbackNotes
          .map((note) => `${note.label}: ${note.status}`)
          .join(" | ") || "No Sites preflight rollback notes.",
      recommendation:
        preflightStatus === "ready"
          ? "Attach these rollback notes to publish approval before replacing the public route bundle."
          : "Complete responsive rollback notes before launch approval.",
    },
  ];

  if (rollbackActivity) {
    channels.push({
      id: `rollback-activity-${rollbackActivity.id}`,
      status: "ready",
      label: rollbackActivity.label,
      sourceActivityId: rollbackActivity.id,
      detail:
        rollbackActivity.detail ??
        "Rollback activity is present in the document timeline.",
      evidence: `${rollbackActivity.actorName} recorded rollback readiness at ${rollbackActivity.createdAt}.`,
      recommendation:
        "Keep the previous public route bundle and content snapshot linked from release notes.",
    });
  }

  return channels;
}

function getPublicRouteEvidence({
  productionDeploySmoke,
  sitesPreflight,
}: {
  productionDeploySmoke: ProductionDeploySmokeReport;
  sitesPreflight: SitesResponsivePublishingPreflightReport;
}): SitesPublicRouteEvidence[] {
  const preflightRows = sitesPreflight.publicRouteSmokePackets.map((packet) => ({
    id: packet.id,
    status: packet.status,
    kind: packet.kind,
    label: packet.label,
    route: packet.route,
    method: packet.method,
    command: packet.command,
    detail: `${packet.label} waits for ${packet.waitFor}.`,
    evidence: packet.evidence,
    recommendation: packet.recommendation,
  }));
  const fallbackRows = productionDeploySmoke.rows
    .filter((row) => publicRouteKinds.has(row.kind))
    .map((row) => ({
      id: row.id,
      status: row.status,
      kind: row.kind,
      label: row.label,
      route: row.route,
      method: row.method,
      command: row.command,
      detail: row.detail,
      evidence: row.evidence,
      recommendation: row.recommendation,
    }));

  return (preflightRows.length > 0 ? preflightRows : fallbackRows).map(
    (row) => ({
      ...row,
      id: `public-route-evidence-${row.id}`,
    }),
  );
}

function getRows({
  assetBudgets,
  publicRouteEvidence,
  publishQueue,
  rollbackChannels,
  routeSitemap,
  seoMetaChecks,
}: {
  assetBudgets: SitesAssetBudget[];
  publicRouteEvidence: SitesPublicRouteEvidence[];
  publishQueue: SitesPublishQueueItem[];
  rollbackChannels: SitesRollbackChannel[];
  routeSitemap: SitesRouteSitemapItem[];
  seoMetaChecks: SitesSeoMetaCheck[];
}): SitesContentMapPublishQueueRow[] {
  return [
    {
      id: "route-sitemap",
      status: getAggregateStatus(
        routeSitemap.map((route) => route.status),
        "blocked",
      ),
      category: "route-sitemap",
      label: "Route sitemap",
      detail: `${routeSitemap.length} route sitemap entr${routeSitemap.length === 1 ? "y" : "ies"} are mapped for Sites publishing.`,
      evidence:
        routeSitemap.map((route) => `${route.route} -> ${route.pageName}`).join(" | ") ||
        "No route sitemap entries.",
      recommendation:
        "Keep each public route mapped to a source page and frame before approval.",
      layerIds: routeSitemap.flatMap((route) => route.frameIds),
      metric: routeSitemap.length,
    },
    {
      id: "seo-meta",
      status: getAggregateStatus(
        seoMetaChecks.map((check) => check.status),
        "blocked",
      ),
      category: "seo-meta",
      label: "SEO/meta checks",
      detail: `${seoMetaChecks.length} SEO/meta check${seoMetaChecks.length === 1 ? "" : "s"} cover route titles and descriptions.`,
      evidence:
        seoMetaChecks.map((check) => `${check.route}: ${check.status}`).join(" | ") ||
        "No SEO/meta checks.",
      recommendation:
        "Keep title and description lengths inside production publishing limits.",
      layerIds: seoMetaChecks.flatMap((check) => check.layerIds),
      metric: seoMetaChecks.length,
    },
    {
      id: "asset-budget",
      status: getAggregateStatus(
        assetBudgets.map((budget) => budget.status),
        "blocked",
      ),
      category: "asset-budget",
      label: "Asset budgets",
      detail: `${assetBudgets.length} route asset budget${assetBudgets.length === 1 ? "" : "s"} are measured against ${assetBudgetPixelArea} px area.`,
      evidence:
        assetBudgets.map((budget) => `${budget.route}: ${budget.totalPixelArea}`).join(" | ") ||
        "No route asset budgets.",
      recommendation:
        "Optimize route media before publish when a budget falls into review.",
      layerIds: assetBudgets.flatMap((budget) => budget.layerIds),
      metric: assetBudgets.reduce((sum, budget) => sum + budget.assetCount, 0),
    },
    {
      id: "publish-queue",
      status: getAggregateStatus(
        publishQueue.map((item) => item.status),
        "blocked",
      ),
      category: "publish-queue",
      label: "Publish queue",
      detail: `${publishQueue.length} route${publishQueue.length === 1 ? "" : "s"} are queued or ready to queue for production.`,
      evidence:
        publishQueue.map((item) => `${item.route}: ${item.status}`).join(" | ") ||
        "No publish queue items.",
      recommendation:
        "Approve routes in queue order and keep route smoke attached to release notes.",
      layerIds: [],
      metric: publishQueue.length,
    },
    {
      id: "rollback-channel",
      status: getAggregateStatus(
        rollbackChannels.map((channel) => channel.status),
        "blocked",
      ),
      category: "rollback-channel",
      label: "Rollback channel",
      detail: `${rollbackChannels.length} rollback channel item${rollbackChannels.length === 1 ? "" : "s"} are attached to the launch packet.`,
      evidence:
        rollbackChannels.map((channel) => `${channel.label}: ${channel.status}`).join(" | ") ||
        "No rollback channel evidence.",
      recommendation:
        "Keep the previous public route bundle available until post-launch smoke passes.",
      layerIds: [],
      metric: rollbackChannels.length,
    },
    {
      id: "public-route-evidence",
      status: getAggregateStatus(
        publicRouteEvidence.map((item) => item.status),
        "blocked",
      ),
      category: "public-route-evidence",
      label: "Public route evidence",
      detail: `${publicRouteEvidence.length} public route evidence item${publicRouteEvidence.length === 1 ? "" : "s"} cover share, prototype, embed, or handoff surfaces.`,
      evidence:
        publicRouteEvidence.map((item) => `${item.kind}: ${item.route}`).join(" | ") ||
        "No public route evidence.",
      recommendation:
        "Run route smoke against the deployed URL before final launch approval.",
      layerIds: [],
      metric: publicRouteEvidence.length,
    },
  ];
}

function getSeoSignals(page: DesignPage) {
  const textLayers = page.layers.filter(
    (layer) => layer.visible && layer.type === "text",
  );
  const titleLayer =
    textLayers.find((layer) => hasSeoTitleSignal(layer)) ??
    textLayers.find((layer) => /\btitle\b/i.test(layer.name));
  const descriptionLayer =
    textLayers.find((layer) => hasSeoDescriptionSignal(layer)) ??
    textLayers.find((layer) => /\bdescription\b/i.test(layer.name));
  const layerIds = [titleLayer?.id, descriptionLayer?.id].filter(
    (id): id is string => Boolean(id),
  );
  const layerNames = [titleLayer?.name, descriptionLayer?.name].filter(
    (name): name is string => Boolean(name),
  );

  return {
    title: getTextValue(titleLayer),
    description: getTextValue(descriptionLayer),
    layerIds,
    layerNames,
  };
}

function getAssetLayers(page: DesignPage) {
  return page.layers.filter((layer) => {
    if (!layer.visible) {
      return false;
    }

    if (layer.type === "image") {
      return true;
    }

    return (
      layer.type !== "text" &&
      /\b(asset|media|image|photo|illustration)\b/i.test(layer.name)
    );
  });
}

function getSeoRecommendation({
  descriptionReady,
  hasDescription,
  hasTitle,
  status,
  titleReady,
}: {
  descriptionReady: boolean;
  hasDescription: boolean;
  hasTitle: boolean;
  status: SitesContentMapPublishQueueStatus;
  titleReady: boolean;
}) {
  if (status === "ready") {
    return "Attach these meta values to the publish approval packet.";
  }

  if (!hasTitle && !hasDescription) {
    return "Add SEO title and meta description layers before publishing this route.";
  }

  if (!hasTitle || !titleReady) {
    return "Set a route title between 18 and 70 characters before approval.";
  }

  if (!hasDescription || !descriptionReady) {
    return "Set a meta description between 50 and 160 characters before approval.";
  }

  return "Review route meta values before approval.";
}

function getSitePageNameSignal(page: DesignPage) {
  return /\b(site|sites|website|web|landing|home|pricing|about|contact|blog|docs)\b/i.test(
    page.name,
  );
}

function isSitePage(page: DesignPage) {
  return (
    getSitePageNameSignal(page) ||
    page.layers.some(
      (layer) =>
        layer.visible &&
        (/\b(site|landing|route|seo|meta)\b/i.test(layer.name) ||
          hasSeoTitleSignal(layer) ||
          hasSeoDescriptionSignal(layer)),
    )
  );
}

function hasSeoTitleSignal(layer: DesignLayer) {
  return /\b(seo\s*title|meta\s*title)\b/i.test(
    `${layer.name} ${layer.text ?? ""}`,
  );
}

function hasSeoDescriptionSignal(layer: DesignLayer) {
  return /\b(meta\s*description|seo\s*description)\b/i.test(
    `${layer.name} ${layer.text ?? ""}`,
  );
}

function getTextValue(layer: DesignLayer | undefined) {
  return (layer?.text ?? "").trim();
}

function getPageRoute(page: DesignPage) {
  const lastSegment = page.name
    .split(/[/>]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .at(-1);
  const slug = slugify(lastSegment ?? page.name);

  return `/sites/${slug || page.id}`;
}

function getUniqueRoute(route: string, seenRoutes: Set<string>) {
  if (!seenRoutes.has(route)) {
    seenRoutes.add(route);
    return route;
  }

  let suffix = 2;
  let candidate = `${route}-${suffix}`;

  while (seenRoutes.has(candidate)) {
    suffix += 1;
    candidate = `${route}-${suffix}`;
  }

  seenRoutes.add(candidate);
  return candidate;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b(sites?|website|web|page|route)\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLatestMatchingActivity(
  activityEvents: DesignActivityEvent[],
  pattern: RegExp,
) {
  return [...activityEvents]
    .filter((event) => pattern.test(`${event.label} ${event.detail ?? ""}`))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0];
}

function getAggregateStatus(
  statuses: SitesContentMapPublishQueueStatus[],
  emptyStatus: SitesContentMapPublishQueueStatus = "blocked",
) {
  if (statuses.length === 0) {
    return emptyStatus;
  }

  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

function sortRows(
  left: SitesContentMapPublishQueueRow,
  right: SitesContentMapPublishQueueRow,
) {
  if (left.status !== right.status) {
    return statusRank[left.status] - statusRank[right.status];
  }

  if (left.category !== right.category) {
    return left.category.localeCompare(right.category);
  }

  return left.label.localeCompare(right.label);
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

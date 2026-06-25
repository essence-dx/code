import type {
  AdminEmbedSecurityReport,
  AdminEmbedSecurityStatus,
  AdminEmbedSecurityTarget,
} from "@/features/admin/admin-embed-security";
import type {
  AdminPublicLinkObservabilityReport,
  AdminPublicLinkStatus,
  AdminPublicLinkSurface,
} from "@/features/admin/admin-public-link-observability";
import type {
  AdminPublicRouteAnalyticsReport,
  AdminPublicRouteAnalyticsRoute,
  AdminPublicRouteAnalyticsStatus,
} from "@/features/admin/admin-public-route-analytics";
import type { PublicRouteKind } from "@/features/public-route-analytics/types";

export type AdminEmbedRouteAnalyticsJoinStatus =
  | AdminEmbedSecurityStatus
  | AdminPublicLinkStatus
  | AdminPublicRouteAnalyticsStatus;

export type AdminEmbedRouteAnalyticsJoinRowCategory =
  | "admin-export"
  | "exposure-review"
  | "referrer-health"
  | "route-funnel";

export type AdminEmbedRouteFunnel = {
  id: string;
  shareId: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  status: AdminEmbedRouteAnalyticsJoinStatus;
  shareEvents: number;
  prototypeEvents: number;
  embedEvents: number;
  totalEvents: number;
  shareToPrototypePercent: number;
  prototypeToEmbedPercent: number;
  missingRouteKinds: PublicRouteKind[];
  latestAt: string | null;
  detail: string;
  recommendation: string;
};

export type AdminEmbedRouteReferrerHealth = {
  id: string;
  shareId: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  status: AdminEmbedRouteAnalyticsJoinStatus;
  referrerKinds: string[];
  referrerOrigins: string[];
  hostnames: string[];
  externalReferrerOriginCount: number;
  unknownReferrerSignalCount: number;
  allowedObservedOriginCount: number;
  blockedObservedOriginCount: number;
  latestAt: string | null;
  detail: string;
  recommendation: string;
};

export type AdminEmbedRouteExposureReview = {
  id: string;
  shareId: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  status: AdminEmbedRouteAnalyticsJoinStatus;
  activeSurfaceCount: number;
  releaseSafeSurfaceCount: number;
  downloadExposureCount: number;
  commentExposureCount: number;
  missingReferrerNoteCount: number;
  noExpiryCount: number;
  blockedObservedOriginCount: number;
  latestAt: string | null;
  detail: string;
  recommendation: string;
};

export type AdminEmbedRouteAnalyticsExport = {
  id: string;
  status: AdminEmbedRouteAnalyticsJoinStatus;
  source: string;
  filename: string;
  formats: string[];
  rowCount: number;
  detail: string;
  recommendation: string;
};

export type AdminEmbedRouteAnalyticsJoinRow = {
  id: string;
  category: AdminEmbedRouteAnalyticsJoinRowCategory;
  status: AdminEmbedRouteAnalyticsJoinStatus;
  label: string;
  detail: string;
  recommendation: string;
  count: number;
  latestAt: string | null;
};

export type AdminEmbedRouteAnalyticsJoinReport = {
  generatedAt: string;
  status: AdminEmbedRouteAnalyticsJoinStatus;
  score: number;
  routeFunnelCount: number;
  referrerHealthCount: number;
  exposureReviewCount: number;
  adminExportCount: number;
  totalRouteEventCount: number;
  externalReferrerOriginCount: number;
  blockedObservedOriginCount: number;
  downloadExposureCount: number;
  missingCoverageCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  routeFunnels: AdminEmbedRouteFunnel[];
  referrerHealth: AdminEmbedRouteReferrerHealth[];
  exposureReviews: AdminEmbedRouteExposureReview[];
  adminExports: AdminEmbedRouteAnalyticsExport[];
  rows: AdminEmbedRouteAnalyticsJoinRow[];
  commands: string[];
};

export type AdminEmbedRouteAnalyticsJoinInput = {
  embedSecurity: AdminEmbedSecurityReport;
  generatedAt?: string;
  publicLinkObservability: AdminPublicLinkObservabilityReport;
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport;
};

const routeKinds: PublicRouteKind[] = ["share", "prototype", "embed"];

const statusRank: Record<AdminEmbedRouteAnalyticsJoinStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getAdminEmbedRouteAnalyticsJoinReport({
  embedSecurity,
  generatedAt = new Date().toISOString(),
  publicLinkObservability,
  publicRouteAnalytics,
}: AdminEmbedRouteAnalyticsJoinInput): AdminEmbedRouteAnalyticsJoinReport {
  const shareIds = getJoinedShareIds({
    embedSecurity,
    publicLinkObservability,
    publicRouteAnalytics,
  });
  const routeFunnels = shareIds.map((shareId) =>
    getRouteFunnel({ publicRouteAnalytics, shareId }),
  );
  const referrerHealth = shareIds.map((shareId) =>
    getReferrerHealth({ embedSecurity, publicRouteAnalytics, shareId }),
  );
  const exposureReviews = shareIds.map((shareId) =>
    getExposureReview({
      embedSecurity,
      publicLinkObservability,
      publicRouteAnalytics,
      shareId,
    }),
  );
  const adminExports = getAdminExports({
    embedSecurity,
    publicLinkObservability,
    publicRouteAnalytics,
  });
  const rows = [
    ...routeFunnels.map(getRouteFunnelRow),
    ...referrerHealth.map(getReferrerHealthRow),
    ...exposureReviews.map(getExposureReviewRow),
    ...adminExports.map(getAdminExportRow),
  ].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    routeFunnelCount: routeFunnels.length,
    referrerHealthCount: referrerHealth.length,
    exposureReviewCount: exposureReviews.length,
    adminExportCount: adminExports.length,
    totalRouteEventCount: publicRouteAnalytics.eventCount,
    externalReferrerOriginCount: referrerHealth.reduce(
      (sum, item) => sum + item.externalReferrerOriginCount,
      0,
    ),
    blockedObservedOriginCount: referrerHealth.reduce(
      (sum, item) => sum + item.blockedObservedOriginCount,
      0,
    ),
    downloadExposureCount: exposureReviews.reduce(
      (sum, item) => sum + item.downloadExposureCount,
      0,
    ),
    missingCoverageCount: routeFunnels.filter(
      (funnel) => funnel.missingRouteKinds.length > 0,
    ).length,
    readyCount,
    reviewCount,
    blockedCount,
    routeFunnels,
    referrerHealth,
    exposureReviews,
    adminExports,
    rows,
    commands: getCommands(publicRouteAnalytics.retentionDays),
  };
}

export function getAdminEmbedRouteAnalyticsJoinJson(
  report: AdminEmbedRouteAnalyticsJoinReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminEmbedRouteAnalyticsJoinCsv(
  report: AdminEmbedRouteAnalyticsJoinReport,
) {
  return [
    [
      "id",
      "category",
      "status",
      "label",
      "count",
      "latest_at",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.category,
        row.status,
        row.label,
        row.count,
        row.latestAt ?? "",
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminEmbedRouteAnalyticsJoinMarkdown(
  report: AdminEmbedRouteAnalyticsJoinReport,
) {
  return [
    "# Embed And Route Analytics Join",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Route funnels: ${report.routeFunnelCount}`,
    `Referrer health: ${report.referrerHealthCount}`,
    `Exposure reviews: ${report.exposureReviewCount}`,
    `Admin exports: ${report.adminExportCount}`,
    "",
    "This packet joins route funnels, referrer health, exposure review, and admin exports for public presentations and Sites-style embeds.",
    "",
    "## route funnels",
    "",
    ...report.routeFunnels.map(
      (funnel) =>
        `- [${funnel.status}] ${funnel.fileName}: ${funnel.detail} ${funnel.recommendation}`,
    ),
    "",
    "## referrer health",
    "",
    ...report.referrerHealth.map(
      (health) =>
        `- [${health.status}] ${health.fileName}: ${health.detail} ${health.recommendation}`,
    ),
    "",
    "## exposure review",
    "",
    ...report.exposureReviews.map(
      (review) =>
        `- [${review.status}] ${review.fileName}: ${review.detail} ${review.recommendation}`,
    ),
    "",
    "## admin exports",
    "",
    ...report.adminExports.map(
      (item) =>
        `- [${item.status}] ${item.source}: ${item.filename} (${item.formats.join(", ")}). ${item.recommendation}`,
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function getJoinedShareIds({
  embedSecurity,
  publicLinkObservability,
  publicRouteAnalytics,
}: {
  embedSecurity: AdminEmbedSecurityReport;
  publicLinkObservability: AdminPublicLinkObservabilityReport;
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport;
}) {
  return uniqueValues([
    ...publicRouteAnalytics.routes.map((route) => route.shareId),
    ...embedSecurity.targets.map((target) => target.shareId),
    ...publicLinkObservability.surfaces.map((surface) => surface.shareId),
  ]);
}

function getRouteFunnel({
  publicRouteAnalytics,
  shareId,
}: {
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport;
  shareId: string;
}): AdminEmbedRouteFunnel {
  const routes = getRoutesForShare(publicRouteAnalytics, shareId);
  const routeByKind = new Map(routes.map((route) => [route.routeKind, route]));
  const profile = getShareProfile({ routes, shareId });
  const shareEvents = routeByKind.get("share")?.eventCount ?? 0;
  const prototypeEvents = routeByKind.get("prototype")?.eventCount ?? 0;
  const embedEvents = routeByKind.get("embed")?.eventCount ?? 0;
  const missingRouteKinds = routeKinds.filter(
    (routeKind) => (routeByKind.get(routeKind)?.eventCount ?? 0) === 0,
  );
  const routeStatuses = routeKinds.map(
    (routeKind) => routeByKind.get(routeKind)?.status ?? "review",
  );
  const status = !publicRouteAnalytics.storageAvailable
    ? "blocked"
    : missingRouteKinds.length > 0
      ? "review"
      : getAggregateStatus(routeStatuses);

  return {
    id: `route-funnel-${shareId}`,
    shareId,
    fileId: profile.fileId,
    fileName: profile.fileName,
    ownerEmail: profile.ownerEmail,
    status,
    shareEvents,
    prototypeEvents,
    embedEvents,
    totalEvents: shareEvents + prototypeEvents + embedEvents,
    shareToPrototypePercent: getPercent(prototypeEvents, shareEvents),
    prototypeToEmbedPercent: getPercent(embedEvents, prototypeEvents),
    missingRouteKinds,
    latestAt: getLatestIso(routes.map((route) => route.latestAt)),
    detail: `${shareEvents} share, ${prototypeEvents} prototype, and ${embedEvents} embed event${shareEvents + prototypeEvents + embedEvents === 1 ? "" : "s"} are joined for the public funnel.`,
    recommendation:
      status === "ready"
        ? "Keep this funnel attached to presentation/site release evidence."
        : "Open each missing public route after deploy so share, prototype, and embed analytics line up.",
  };
}

function getReferrerHealth({
  embedSecurity,
  publicRouteAnalytics,
  shareId,
}: {
  embedSecurity: AdminEmbedSecurityReport;
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport;
  shareId: string;
}): AdminEmbedRouteReferrerHealth {
  const routes = getRoutesForShare(publicRouteAnalytics, shareId);
  const target = embedSecurity.targets.find((item) => item.shareId === shareId);
  const profile = getShareProfile({ routes, shareId, target });
  const referrerKinds = uniqueValues(routes.flatMap((route) => route.referrerKinds));
  const referrerOrigins = uniqueValues(
    routes.flatMap((route) => route.referrerOrigins),
  );
  const hostnames = uniqueValues([
    ...routes.flatMap((route) => route.hostnames),
    ...(target?.hostnames ?? []),
  ]);
  const externalReferrerOriginCount = routes.reduce(
    (sum, route) =>
      sum +
      (route.referrerKinds.includes("external")
        ? route.referrerOrigins.length
        : 0),
    0,
  );
  const unknownReferrerSignalCount = routes.filter((route) =>
    route.referrerKinds.includes("unknown"),
  ).length;
  const blockedObservedOriginCount =
    target?.blockedObservedOrigins.length ?? 0;
  const allowedObservedOriginCount =
    target?.allowedObservedOrigins.length ?? 0;
  const status =
    blockedObservedOriginCount > 0 || target?.status === "blocked"
      ? "blocked"
      : unknownReferrerSignalCount > 0 || target?.status === "review"
        ? "review"
        : "ready";

  return {
    id: `referrer-health-${shareId}`,
    shareId,
    fileId: profile.fileId,
    fileName: profile.fileName,
    ownerEmail: profile.ownerEmail,
    status,
    referrerKinds,
    referrerOrigins,
    hostnames,
    externalReferrerOriginCount,
    unknownReferrerSignalCount,
    allowedObservedOriginCount,
    blockedObservedOriginCount,
    latestAt: getLatestIso([
      ...routes.map((route) => route.latestAt),
      target?.latestAt ?? null,
    ]),
    detail: `${referrerKinds.join(", ") || "no"} referrer kind${referrerKinds.length === 1 ? "" : "s"} with ${allowedObservedOriginCount} allowed and ${blockedObservedOriginCount} blocked observed embed origin${blockedObservedOriginCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Referrer health is release-ready for this public presentation/site surface."
        : "Review unknown referrers or blocked embed origins before keeping this route public.",
  };
}

function getExposureReview({
  embedSecurity,
  publicLinkObservability,
  publicRouteAnalytics,
  shareId,
}: {
  embedSecurity: AdminEmbedSecurityReport;
  publicLinkObservability: AdminPublicLinkObservabilityReport;
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport;
  shareId: string;
}): AdminEmbedRouteExposureReview {
  const routes = getRoutesForShare(publicRouteAnalytics, shareId);
  const target = embedSecurity.targets.find((item) => item.shareId === shareId);
  const surfaces = publicLinkObservability.surfaces.filter(
    (surface) => surface.shareId === shareId,
  );
  const profile = getShareProfile({ routes, shareId, surfaces, target });
  const downloadExposureCount = surfaces.filter(
    (surface) => surface.allowDownload,
  ).length;
  const commentExposureCount = surfaces.filter(
    (surface) => surface.allowComments,
  ).length;
  const missingReferrerNoteCount = surfaces.filter(
    (surface) => !surface.referrerNote,
  ).length;
  const noExpiryCount = surfaces.filter(
    (surface) => surface.expiryState === "never",
  ).length;
  const blockedObservedOriginCount =
    target?.blockedObservedOrigins.length ?? 0;
  const surfaceStatuses = surfaces.map((surface) => surface.status);
  const status =
    blockedObservedOriginCount > 0 ||
    target?.status === "blocked" ||
    surfaceStatuses.includes("blocked")
      ? "blocked"
      : downloadExposureCount > 0 ||
          commentExposureCount > 0 ||
          missingReferrerNoteCount > 0 ||
          noExpiryCount > 0 ||
          target?.status === "review" ||
          surfaceStatuses.includes("review")
        ? "review"
        : "ready";

  return {
    id: `exposure-review-${shareId}`,
    shareId,
    fileId: profile.fileId,
    fileName: profile.fileName,
    ownerEmail: profile.ownerEmail,
    status,
    activeSurfaceCount: surfaces.length,
    releaseSafeSurfaceCount: surfaces.filter((surface) => surface.releaseSafe)
      .length,
    downloadExposureCount,
    commentExposureCount,
    missingReferrerNoteCount,
    noExpiryCount,
    blockedObservedOriginCount,
    latestAt: getLatestIso([
      ...surfaces.map((surface) => surface.latestAt),
      target?.latestAt ?? null,
    ]),
    detail: `${surfaces.length} public surface${surfaces.length === 1 ? "" : "s"} joined with ${downloadExposureCount} download, ${commentExposureCount} comment, ${missingReferrerNoteCount} missing-referrer-note, and ${noExpiryCount} no-expiry exposure signal${downloadExposureCount + commentExposureCount + missingReferrerNoteCount + noExpiryCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Exposure posture is safe to export with the admin release evidence bundle."
        : "Tighten public link exposure, expiry, referrer notes, or embed allowlists before release signoff.",
  };
}

function getAdminExports({
  embedSecurity,
  publicLinkObservability,
  publicRouteAnalytics,
}: {
  embedSecurity: AdminEmbedSecurityReport;
  publicLinkObservability: AdminPublicLinkObservabilityReport;
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport;
}): AdminEmbedRouteAnalyticsExport[] {
  return [
    {
      id: "public-route-analytics-export",
      status:
        publicRouteAnalytics.storageAvailable &&
        publicRouteAnalytics.eventCount > 0
          ? "ready"
          : publicRouteAnalytics.status,
      source: "Public route analytics",
      filename: "public-route-analytics",
      formats: ["json", "csv", "md"],
      rowCount: publicRouteAnalytics.routes.length,
      detail: `${publicRouteAnalytics.eventCount} retained route event${publicRouteAnalytics.eventCount === 1 ? "" : "s"} across ${publicRouteAnalytics.routeCount} route${publicRouteAnalytics.routeCount === 1 ? "" : "s"}.`,
      recommendation:
        "Export before and after publication so launch owners can compare route funnel coverage.",
    },
    {
      id: "embed-security-export",
      status: embedSecurity.status,
      source: "Embed security",
      filename: "embed-security",
      formats: ["json", "csv", "md"],
      rowCount: embedSecurity.targets.length,
      detail: `${embedSecurity.embedShareCount} embed-capable share${embedSecurity.embedShareCount === 1 ? "" : "s"} with ${embedSecurity.blockedObservedOriginCount} blocked observed origin${embedSecurity.blockedObservedOriginCount === 1 ? "" : "s"}.`,
      recommendation:
        "Export with route analytics so external iframe hosts are reviewed beside live referrer evidence.",
    },
    {
      id: "public-link-observability-export",
      status: publicLinkObservability.status,
      source: "Public link observability",
      filename: "public-link-observability",
      formats: ["json", "csv", "md"],
      rowCount: publicLinkObservability.surfaces.length,
      detail: `${publicLinkObservability.surfaceCount} public link surface${publicLinkObservability.surfaceCount === 1 ? "" : "s"} with ${publicLinkObservability.releaseSafeCount} release-safe surface${publicLinkObservability.releaseSafeCount === 1 ? "" : "s"}.`,
      recommendation:
        "Export to prove link expiry, route smoke, and exposure controls were reviewed.",
    },
    {
      id: "embed-route-analytics-join-export",
      status: getAggregateStatus([
        publicRouteAnalytics.status,
        embedSecurity.status,
        publicLinkObservability.status,
      ]),
      source: "Embed and route analytics join",
      filename: "embed-route-analytics-join",
      formats: ["json", "csv", "md"],
      rowCount:
        publicRouteAnalytics.routes.length +
        embedSecurity.targets.length +
        publicLinkObservability.surfaces.length,
      detail:
        "Joined export links route funnels, referrer health, exposure review, and release admin evidence.",
      recommendation:
        "Attach this joined export to public presentation and Sites publish approvals.",
    },
  ];
}

function getRouteFunnelRow(
  funnel: AdminEmbedRouteFunnel,
): AdminEmbedRouteAnalyticsJoinRow {
  return {
    id: funnel.id,
    category: "route-funnel",
    status: funnel.status,
    label: `${funnel.fileName} route funnel`,
    detail: funnel.detail,
    recommendation: funnel.recommendation,
    count: funnel.totalEvents,
    latestAt: funnel.latestAt,
  };
}

function getReferrerHealthRow(
  health: AdminEmbedRouteReferrerHealth,
): AdminEmbedRouteAnalyticsJoinRow {
  return {
    id: health.id,
    category: "referrer-health",
    status: health.status,
    label: `${health.fileName} referrer health`,
    detail: health.detail,
    recommendation: health.recommendation,
    count:
      health.externalReferrerOriginCount +
      health.unknownReferrerSignalCount +
      health.blockedObservedOriginCount,
    latestAt: health.latestAt,
  };
}

function getExposureReviewRow(
  review: AdminEmbedRouteExposureReview,
): AdminEmbedRouteAnalyticsJoinRow {
  return {
    id: review.id,
    category: "exposure-review",
    status: review.status,
    label: `${review.fileName} exposure review`,
    detail: review.detail,
    recommendation: review.recommendation,
    count:
      review.downloadExposureCount +
      review.commentExposureCount +
      review.missingReferrerNoteCount +
      review.noExpiryCount +
      review.blockedObservedOriginCount,
    latestAt: review.latestAt,
  };
}

function getAdminExportRow(
  item: AdminEmbedRouteAnalyticsExport,
): AdminEmbedRouteAnalyticsJoinRow {
  return {
    id: item.id,
    category: "admin-export",
    status: item.status,
    label: item.source,
    detail: item.detail,
    recommendation: item.recommendation,
    count: item.rowCount,
    latestAt: null,
  };
}

function getRoutesForShare(
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport,
  shareId: string,
) {
  return publicRouteAnalytics.routes.filter((route) => route.shareId === shareId);
}

function getShareProfile({
  routes,
  shareId,
  surfaces = [],
  target,
}: {
  routes: AdminPublicRouteAnalyticsRoute[];
  shareId: string;
  surfaces?: AdminPublicLinkSurface[];
  target?: AdminEmbedSecurityTarget;
}) {
  const route = routes[0];
  const surface = surfaces[0];

  return {
    fileId: route?.fileId ?? target?.fileId ?? surface?.fileId ?? shareId,
    fileName:
      route?.fileName ?? target?.fileName ?? surface?.fileName ?? "Public route",
    ownerEmail:
      route?.ownerEmail ??
      target?.ownerEmail ??
      surface?.ownerEmail ??
      "unknown",
  };
}

function getAggregateStatus(statuses: AdminEmbedRouteAnalyticsJoinStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

function getPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function getLatestIso(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function sortRows(
  left: AdminEmbedRouteAnalyticsJoinRow,
  right: AdminEmbedRouteAnalyticsJoinRow,
) {
  if (left.status !== right.status) {
    return statusRank[left.status] - statusRank[right.status];
  }

  if (left.category !== right.category) {
    return left.category.localeCompare(right.category);
  }

  return right.count - left.count || left.label.localeCompare(right.label);
}

function getCommands(retentionDays: number) {
  return [
    "Export admin exports for public route analytics, embed security, public link observability, and this joined launch packet before approval.",
    "Review route funnels for every public presentation and Sites route after deploy.",
    "Confirm external referrer health against embed allowlists before keeping iframe links live.",
    "Resolve exposure review findings around downloads, comments, missing referrer notes, no-expiry links, and blocked observed origins.",
    `Keep public route analytics retention at ${retentionDays} days or document the release exception.`,
  ];
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

import { readFileSync } from "node:fs";
import {
  getAdminEmbedRouteAnalyticsJoinCsv,
  getAdminEmbedRouteAnalyticsJoinJson,
  getAdminEmbedRouteAnalyticsJoinMarkdown,
  getAdminEmbedRouteAnalyticsJoinReport,
} from "../src/features/admin/admin-embed-route-analytics-join";
import { getAdminEmbedSecurityReport } from "../src/features/admin/admin-embed-security";
import { getAdminPublicRouteAnalyticsReport } from "../src/features/admin/admin-public-route-analytics";
import type { AdminPublicLinkObservabilityReport } from "../src/features/admin/admin-public-link-observability";
import type {
  AdminPublicRouteAnalyticsEvent,
  AdminPublicRouteAnalyticsShare,
} from "../src/features/admin/admin-public-route-analytics";
import type { PublicRouteKind } from "../src/features/public-route-analytics/types";

const now = Date.parse("2026-05-18T23:40:00.000Z");
const generatedAt = new Date(now).toISOString();

const shares: AdminPublicRouteAnalyticsShare[] = [
  {
    id: "share-slides",
    fileId: "file-slides",
    fileName: "Investor presentation",
    ownerEmail: "presenter@example.com",
    permissionPreset: "prototype",
    accessLevel: "view",
    allowComments: false,
    allowDownload: false,
    disabledAt: null,
  },
  {
    id: "share-site",
    fileId: "file-site",
    fileName: "Marketing site",
    ownerEmail: "sites@example.com",
    permissionPreset: "review",
    accessLevel: "view",
    allowComments: false,
    allowDownload: false,
    disabledAt: null,
  },
];

const events: AdminPublicRouteAnalyticsEvent[] = [
  event("slides-share-1", "share-slides", "file-slides", "share", "direct", null, "browser", null, 42),
  event("slides-share-2", "share-slides", "file-slides", "share", "internal", "https://figma.example.com", "browser", "figma.example.com", 18),
  event("slides-prototype-1", "share-slides", "file-slides", "prototype", "internal", "https://figma.example.com", "browser", "figma.example.com", 20),
  event("slides-prototype-2", "share-slides", "file-slides", "prototype", "direct", null, "browser", null, 17),
  event("slides-embed-1", "share-slides", "file-slides", "embed", "external", "https://slides.partner.example", "browser", "slides.partner.example", 12),
  event("slides-embed-2", "share-slides", "file-slides", "embed", "external", "https://slides.partner.example", "browser", "slides.partner.example", 8),
  event("site-share-1", "share-site", "file-site", "share", "direct", null, "browser", null, 32),
  event("site-prototype-1", "share-site", "file-site", "prototype", "internal", "https://figma.example.com", "browser", "figma.example.com", 24),
  event("site-embed-1", "share-site", "file-site", "embed", "external", "https://www.customer.example", "browser", "www.customer.example", 16),
  event("site-embed-2", "share-site", "file-site", "embed", "external", "https://www.customer.example", "browser", "www.customer.example", 10),
];

const publicRouteAnalytics = getAdminPublicRouteAnalyticsReport({
  events,
  generatedAt,
  now,
  retentionDays: 30,
  shares,
  storageAvailable: true,
});

const embedSecurity = getAdminEmbedSecurityReport({
  analyticsRoutes: publicRouteAnalytics.routes.map((route) => ({
    shareId: route.shareId,
    routeKind: route.routeKind,
    referrerOrigins: route.referrerOrigins,
    referrerKinds: route.referrerKinds,
    hostnames: route.hostnames,
    eventCount: route.eventCount,
    last7dCount: route.last7dCount,
    latestAt: route.latestAt,
  })),
  appOrigin: "https://figma.example.com",
  env: {
    ESSENCE_EMBED_HOST_ALLOWLISTS: JSON.stringify({
      "share:share-slides": {
        allowedOrigins: ["https://slides.partner.example"],
        framePolicy: "allowlist",
        sandboxPreset: "interactive",
      },
      "share:share-site": {
        allowedOrigins: ["https://www.customer.example"],
        framePolicy: "allowlist",
        sandboxPreset: "interactive",
      },
    }),
  },
  generatedAt,
  shares: shares.map((share) => ({
    id: share.id,
    fileId: share.fileId,
    fileName: share.fileName,
    ownerEmail: share.ownerEmail,
    token: `${share.id}-token`,
    disabledAt: null,
  })),
});

const publicLinkObservability: AdminPublicLinkObservabilityReport = {
  generatedAt,
  status: "ready",
  score: 100,
  activeShareCount: 2,
  surfaceCount: 4,
  readyCount: 4,
  reviewCount: 0,
  blockedCount: 0,
  embedSurfaceCount: 2,
  prototypeSurfaceCount: 2,
  staleLinkCount: 0,
  noExpiryCount: 0,
  downloadExposureCount: 0,
  commentExposureCount: 0,
  missingReferrerNoteCount: 0,
  releaseSafeCount: 4,
  routeSmokeBlockedCount: 0,
  surfaces: [
    surface("surface-slides-prototype", "share-slides", "prototype", "/share/share-slides-token/prototype"),
    surface("surface-slides-embed", "share-slides", "embed", "/embed/share-slides-token"),
    surface("surface-site-prototype", "share-site", "prototype", "/share/share-site-token/prototype"),
    surface("surface-site-embed", "share-site", "embed", "/embed/share-site-token"),
  ],
  rows: [],
  commands: ["Export public link observability."],
};

const report = getAdminEmbedRouteAnalyticsJoinReport({
  embedSecurity,
  generatedAt,
  publicLinkObservability,
  publicRouteAnalytics,
});

assert(report.status === "ready", "Complete analytics join fixture should be ready.");
assert(report.score >= 95, "Ready analytics join should keep a high score.");
assert(report.routeFunnelCount === 2, "Route funnels should join both public files.");
assert(report.referrerHealthCount === 2, "Referrer health should join both public files.");
assert(report.exposureReviewCount === 2, "Exposure review should join both public files.");
assert(report.adminExportCount >= 4, "Admin export bundle should include all joined reports.");
assert(report.externalReferrerOriginCount >= 2, "External referrer origins should be counted.");
assert(report.blockedObservedOriginCount === 0, "Allowed embed origins should not be blocked.");
assert(report.rows.some((row) => row.category === "route-funnel"), "Rows should include route funnels.");
assert(report.rows.some((row) => row.category === "referrer-health"), "Rows should include referrer health.");
assert(report.rows.some((row) => row.category === "exposure-review"), "Rows should include exposure review.");
assert(report.rows.some((row) => row.category === "admin-export"), "Rows should include admin exports.");
assert(
  report.routeFunnels.every((funnel) => funnel.shareEvents > 0 && funnel.prototypeEvents > 0 && funnel.embedEvents > 0),
  "Each route funnel should include share, prototype, and embed events.",
);
assert(
  report.adminExports.some((item) => item.id === "public-route-analytics-export"),
  "Admin exports should preserve the public route analytics export.",
);
assert(
  report.adminExports.some((item) => item.id === "embed-security-export"),
  "Admin exports should preserve the embed security export.",
);
assert(
  report.commands.some((command) => command.includes("admin exports")),
  "Commands should mention admin exports.",
);

const markdown = getAdminEmbedRouteAnalyticsJoinMarkdown(report);
const csv = getAdminEmbedRouteAnalyticsJoinCsv(report);
const json = JSON.parse(getAdminEmbedRouteAnalyticsJoinJson(report)) as {
  routeFunnels: unknown[];
  referrerHealth: unknown[];
  exposureReviews: unknown[];
  adminExports: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Embed And Route Analytics Join"), "Markdown should include a clear title.");
assert(markdown.includes("route funnels"), "Markdown should include route funnels.");
assert(markdown.includes("referrer health"), "Markdown should include referrer health.");
assert(markdown.includes("exposure review"), "Markdown should include exposure review.");
assert(markdown.includes("admin exports"), "Markdown should include admin exports.");
assert(csv.includes("route-funnel"), "CSV should include route funnel rows.");
assert(json.routeFunnels.length === report.routeFunnels.length, "JSON should preserve route funnels.");
assert(json.referrerHealth.length === report.referrerHealth.length, "JSON should preserve referrer health.");
assert(json.exposureReviews.length === report.exposureReviews.length, "JSON should preserve exposure reviews.");
assert(json.adminExports.length === report.adminExports.length, "JSON should preserve admin exports.");
assert(
  packageJson.scripts["admin:embed-route-analytics-join-smoke"]?.includes(
    "admin-embed-route-analytics-join-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Admin embed route analytics join smoke passed: ${report.routeFunnelCount} funnels, ${report.adminExportCount} exports, score ${report.score}.`,
);

function event(
  id: string,
  shareId: string,
  fileId: string,
  routeKind: PublicRouteKind,
  referrerKind: string,
  referrerOrigin: string | null,
  userAgentFamily: string,
  host: string | null,
  minutesAgo: number,
): AdminPublicRouteAnalyticsEvent {
  return {
    id,
    shareId,
    fileId,
    routeKind,
    tokenScope: "view:no-download:no-comments",
    referrerOrigin,
    referrerKind,
    userAgentFamily,
    host,
    viewportWidth: 1440,
    viewportHeight: 900,
    retentionExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now - minutesAgo * 60 * 1000).toISOString(),
  };
}

function surface(
  id: string,
  shareId: string,
  kind: "embed" | "prototype",
  routePath: string,
): AdminPublicLinkObservabilityReport["surfaces"][number] {
  const share = shares.find((item) => item.id === shareId);

  if (!share) {
    throw new Error(`Missing share ${shareId}`);
  }

  return {
    id,
    shareId,
    token: `${share.id}-token`,
    kind,
    status: "ready",
    label: `${share.fileName} ${kind}`,
    fileId: share.fileId,
    fileName: share.fileName,
    ownerEmail: share.ownerEmail,
    targetUrl: `https://figma.example.com${routePath}`,
    routePath,
    permissionPreset: share.permissionPreset,
    smokeStatus: "ready",
    smokeLabel: "Route smoke ready",
    expiryState: "scheduled",
    stale: false,
    allowComments: false,
    allowDownload: false,
    referrerNote: `${kind} launch host reviewed`,
    releaseSafe: true,
    latestAt: generatedAt,
    blockerCount: 0,
    reviewCount: 0,
    blockers: [],
    warnings: [],
    recommendation: "Keep analytics, referrer, and exposure evidence attached to release notes.",
  };
}

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}

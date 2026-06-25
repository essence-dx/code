import {
  getEarliestPublicRouteAnalyticsIso,
  getEventTime,
  getLatestPublicRouteAnalyticsIso,
  getWorstPublicRouteAnalyticsStatus,
  publicRouteAnalyticsStatusWeight,
  uniqueSortedPublicRouteValues,
} from "@/features/admin/admin-public-route-analytics-utils";
import type {
  AdminPublicRouteAnalyticsEvent,
  AdminPublicRouteAnalyticsInput,
  AdminPublicRouteAnalyticsReport,
  AdminPublicRouteAnalyticsRoute,
  AdminPublicRouteAnalyticsRow,
  AdminPublicRouteAnalyticsShare,
  AdminPublicRouteAnalyticsStatus,
} from "@/features/admin/admin-public-route-analytics-types";
import {
  publicRouteKinds,
  type PublicRouteKind,
} from "@/features/public-route-analytics/types";

export type {
  AdminPublicRouteAnalyticsEvent,
  AdminPublicRouteAnalyticsInput,
  AdminPublicRouteAnalyticsReport,
  AdminPublicRouteAnalyticsRoute,
  AdminPublicRouteAnalyticsRow,
  AdminPublicRouteAnalyticsRowCategory,
  AdminPublicRouteAnalyticsShare,
  AdminPublicRouteAnalyticsStatus,
} from "@/features/admin/admin-public-route-analytics-types";

const dayMs = 24 * 60 * 60 * 1000;

export function getAdminPublicRouteAnalyticsReport({
  events,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  retentionDays,
  shares,
  storageAvailable,
}: AdminPublicRouteAnalyticsInput): AdminPublicRouteAnalyticsReport {
  const retainedEvents = events.filter(
    (event) => new Date(event.retentionExpiresAt).getTime() >= now,
  );
  const expiredEvents = events.length - retainedEvents.length;
  const activeShares = shares.filter((share) => !share.disabledAt);
  const eventsByShareAndKind = groupEventsByShareAndKind(retainedEvents);
  const routes = activeShares
    .flatMap((share) =>
      publicRouteKinds.map((routeKind) =>
        toRoute({
          events:
            eventsByShareAndKind.get(getShareKindKey(share.id, routeKind)) ??
            [],
          now,
          routeKind,
          share,
          storageAvailable,
        }),
      ),
    )
    .sort(sortPublicRouteAnalyticsRoutes);
  const rows = getPublicRouteAnalyticsRows({
    expiredEvents,
    routes,
    storageAvailable,
  }).sort(sortPublicRouteAnalyticsRows);
  const blockedCount = routes.filter((route) => route.status === "blocked").length;
  const reviewCount = routes.filter((route) => route.status === "review").length;
  const readyCount = routes.filter((route) => route.status === "ready").length;
  const allRows =
    rows.length > 0
      ? rows
      : [
          {
            id: "public-route-analytics-ready",
            routeId: "all",
            category: "coverage",
            status: "ready",
            label: "Public route analytics ready",
            detail:
              "All active public share, prototype, and embed routes have recent privacy-safe route telemetry.",
            recommendation:
              "Export analytics evidence with public link observability before release approval.",
            count: retainedEvents.length,
            latestAt: getLatestEventAt(retainedEvents),
          } satisfies AdminPublicRouteAnalyticsRow,
        ];

  return {
    generatedAt,
    status: !storageAvailable
      ? "blocked"
      : getWorstPublicRouteAnalyticsStatus([
          blockedCount > 0 ? "blocked" : "ready",
          reviewCount > 0 || expiredEvents > 0 ? "review" : "ready",
        ]),
    score: Math.max(
      0,
      100 -
        (storageAvailable ? 0 : 35) -
        blockedCount * 14 -
        reviewCount * 5 -
        expiredEvents * 2,
    ),
    storageAvailable,
    retentionDays,
    activeShareCount: activeShares.length,
    routeCount: routes.length,
    eventCount: retainedEvents.length,
    last24hEventCount: retainedEvents.filter(
      (event) => now - getEventTime(event) <= dayMs,
    ).length,
    last7dEventCount: retainedEvents.filter(
      (event) => now - getEventTime(event) <= dayMs * 7,
    ).length,
    shareRouteEventCount: countByRouteKind(retainedEvents, "share"),
    prototypeRouteEventCount: countByRouteKind(retainedEvents, "prototype"),
    embedRouteEventCount: countByRouteKind(retainedEvents, "embed"),
    directReferrerCount: countByReferrerKind(retainedEvents, "direct"),
    internalReferrerCount: countByReferrerKind(retainedEvents, "internal"),
    externalReferrerCount: countByReferrerKind(retainedEvents, "external"),
    unknownReferrerCount: countByReferrerKind(retainedEvents, "unknown"),
    botEventCount: retainedEvents.filter(
      (event) => event.userAgentFamily === "bot",
    ).length,
    retentionExpiredCount: expiredEvents,
    missingCoverageCount: routes.filter((route) => route.eventCount === 0).length,
    readyCount,
    reviewCount,
    blockedCount,
    routes,
    rows: allRows,
    commands: getPublicRouteAnalyticsCommands(retentionDays),
  };
}

function toRoute({
  events,
  now,
  routeKind,
  share,
  storageAvailable,
}: {
  events: AdminPublicRouteAnalyticsEvent[];
  now: number;
  routeKind: PublicRouteKind;
  share: AdminPublicRouteAnalyticsShare;
  storageAvailable: boolean;
}): AdminPublicRouteAnalyticsRoute {
  const latestAt = getLatestEventAt(events);
  const last24hCount = events.filter(
    (event) => now - getEventTime(event) <= dayMs,
  ).length;
  const last7dCount = events.filter(
    (event) => now - getEventTime(event) <= dayMs * 7,
  ).length;
  const status = getRouteStatus({ events, last7dCount, storageAvailable });

  return {
    id: `${share.id}-${routeKind}`,
    shareId: share.id,
    fileId: share.fileId,
    fileName: share.fileName,
    ownerEmail: share.ownerEmail,
    routeKind,
    tokenScope: events[0]?.tokenScope ?? getShareTokenScope(share),
    status,
    eventCount: events.length,
    last24hCount,
    last7dCount,
    referrerOrigins: uniqueSortedPublicRouteValues(
      events.map((event) => event.referrerOrigin),
    ).slice(0, 5),
    referrerKinds: uniqueSortedPublicRouteValues(
      events.map((event) => event.referrerKind),
    ),
    userAgentFamilies: uniqueSortedPublicRouteValues(
      events.map((event) => event.userAgentFamily),
    ),
    hostnames: uniqueSortedPublicRouteValues(events.map((event) => event.host)),
    latestAt,
    earliestRetentionExpiresAt: events.reduce(
      (earliest, event) =>
        getEarliestPublicRouteAnalyticsIso(
          earliest,
          event.retentionExpiresAt,
        ),
      null as string | null,
    ),
    recommendation: getRouteRecommendation(status, events.length, routeKind),
  };
}

function getPublicRouteAnalyticsRows({
  expiredEvents,
  routes,
  storageAvailable,
}: {
  expiredEvents: number;
  routes: AdminPublicRouteAnalyticsRoute[];
  storageAvailable: boolean;
}) {
  const rows: AdminPublicRouteAnalyticsRow[] = [];

  if (!storageAvailable) {
    rows.push({
      id: "public-route-analytics-storage",
      routeId: "storage",
      category: "storage",
      status: "blocked",
      label: "Analytics storage unavailable",
      detail:
        "The public_route_event table is not readable yet, so admin aggregation is running without persisted route events.",
      recommendation:
        "Apply the Drizzle schema with the public_route_event table before release analytics signoff.",
      count: 0,
      latestAt: null,
    });
  }

  if (expiredEvents > 0) {
    rows.push({
      id: "public-route-analytics-retention",
      routeId: "retention",
      category: "retention",
      status: "review",
      label: "Retention cleanup due",
      detail: `${expiredEvents} public route analytics events are past their retention window.`,
      recommendation:
        "Purge expired route analytics rows before exporting the release evidence bundle.",
      count: expiredEvents,
      latestAt: null,
    });
  }

  for (const route of routes) {
    if (route.eventCount === 0) {
      rows.push({
        id: `${route.id}-coverage`,
        routeId: route.id,
        category: "coverage",
        status: route.status,
        label: `${route.fileName} ${route.routeKind} coverage`,
        detail: "No retained route analytics events exist for this surface.",
        recommendation:
          "Open the public surface once after publication so release owners have route evidence.",
        count: 0,
        latestAt: null,
      });
      continue;
    }

    if (route.last7dCount === 0) {
      rows.push({
        id: `${route.id}-stale`,
        routeId: route.id,
        category: "capture",
        status: "review",
        label: `${route.fileName} ${route.routeKind} stale analytics`,
        detail: `${route.eventCount} events exist, but none were captured in the last 7 days.`,
        recommendation:
          "Refresh this public route after the latest deploy or note why stale evidence is acceptable.",
        count: route.eventCount,
        latestAt: route.latestAt,
      });
    }

    if (route.referrerKinds.includes("external")) {
      rows.push({
        id: `${route.id}-external-referrer`,
        routeId: route.id,
        category: "referrer",
        status: "review",
        label: `${route.fileName} ${route.routeKind} external referrer`,
        detail: `External origins seen: ${route.referrerOrigins.join(", ") || "origin redacted"}.`,
        recommendation:
          "Confirm the external host is expected before keeping this public route enabled.",
        count: route.referrerOrigins.length,
        latestAt: route.latestAt,
      });
    }
  }

  return rows;
}

function getRouteStatus({
  events,
  last7dCount,
  storageAvailable,
}: {
  events: AdminPublicRouteAnalyticsEvent[];
  last7dCount: number;
  storageAvailable: boolean;
}): AdminPublicRouteAnalyticsStatus {
  if (!storageAvailable) {
    return "blocked";
  }

  if (events.length === 0 || last7dCount === 0) {
    return "review";
  }

  return "ready";
}

function getRouteRecommendation(
  status: AdminPublicRouteAnalyticsStatus,
  eventCount: number,
  routeKind: PublicRouteKind,
) {
  if (status === "blocked") {
    return "Repair analytics storage before using this route in release signoff.";
  }

  if (eventCount === 0) {
    return `Open the ${routeKind} route once to capture privacy-safe route evidence.`;
  }

  if (status === "review") {
    return "Refresh the route after deployment so the evidence is recent.";
  }

  return "Route telemetry is fresh enough for public release evidence.";
}

function groupEventsByShareAndKind(events: AdminPublicRouteAnalyticsEvent[]) {
  const grouped = new Map<string, AdminPublicRouteAnalyticsEvent[]>();

  for (const event of events) {
    const key = getShareKindKey(event.shareId, event.routeKind);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }

  for (const [key, value] of grouped) {
    grouped.set(
      key,
      value.sort((left, right) => getEventTime(right) - getEventTime(left)),
    );
  }

  return grouped;
}

function getShareKindKey(shareId: string, routeKind: PublicRouteKind) {
  return `${shareId}:${routeKind}`;
}

function getShareTokenScope(share: AdminPublicRouteAnalyticsShare) {
  return [
    share.permissionPreset,
    share.accessLevel,
    share.allowDownload ? "download" : "no-download",
    share.allowComments ? "comments" : "no-comments",
  ].join(":");
}

function countByRouteKind(
  events: AdminPublicRouteAnalyticsEvent[],
  routeKind: PublicRouteKind,
) {
  return events.filter((event) => event.routeKind === routeKind).length;
}

function countByReferrerKind(
  events: AdminPublicRouteAnalyticsEvent[],
  referrerKind: string,
) {
  return events.filter((event) => event.referrerKind === referrerKind).length;
}

function getLatestEventAt(events: AdminPublicRouteAnalyticsEvent[]) {
  return events.reduce(
    (latest, event) =>
      getLatestPublicRouteAnalyticsIso(latest, event.createdAt),
    null as string | null,
  );
}

function sortPublicRouteAnalyticsRoutes(
  left: AdminPublicRouteAnalyticsRoute,
  right: AdminPublicRouteAnalyticsRoute,
) {
  return (
    publicRouteAnalyticsStatusWeight[left.status] -
      publicRouteAnalyticsStatusWeight[right.status] ||
    right.eventCount - left.eventCount ||
    left.fileName.localeCompare(right.fileName) ||
    publicRouteKinds.indexOf(left.routeKind) -
      publicRouteKinds.indexOf(right.routeKind)
  );
}

function sortPublicRouteAnalyticsRows(
  left: AdminPublicRouteAnalyticsRow,
  right: AdminPublicRouteAnalyticsRow,
) {
  return (
    publicRouteAnalyticsStatusWeight[left.status] -
      publicRouteAnalyticsStatusWeight[right.status] ||
    right.count - left.count ||
    (right.latestAt ? new Date(right.latestAt).getTime() : 0) -
      (left.latestAt ? new Date(left.latestAt).getTime() : 0)
  );
}

function getPublicRouteAnalyticsCommands(retentionDays: number) {
  return [
    "Keep public route analytics privacy-safe: no IP addresses, raw tokens, full referrers, or raw user agents.",
    `Retain public route analytics for ${retentionDays} days and purge expired rows before release evidence export.`,
    "Open every active share, prototype, and embed surface after deploy so the admin panel has fresh route evidence.",
    "Review external referrer origins before approving public embeds or long-lived share links.",
    "Export the analytics bundle with public link observability, publish channels, and access budget evidence.",
  ];
}

import type {
  AdminPublicLinkObservabilityRow,
  AdminPublicLinkSurface,
} from "@/features/admin/admin-public-link-observability-types";
import { publicLinkStatusWeight } from "@/features/admin/admin-public-link-observability-utils";

export function toPublicLinkObservabilityRows(
  surface: AdminPublicLinkSurface,
): AdminPublicLinkObservabilityRow[] {
  return [
    getRouteSmokeRow(surface),
    getExpiryRow(surface),
    getExposureRow(surface),
    getReferrerRow(surface),
    getEmbedRow(surface),
    getReleaseSafeRow(surface),
  ]
    .filter((row): row is AdminPublicLinkObservabilityRow => Boolean(row))
    .sort(sortPublicLinkRows);
}

export function getEmptyPublicLinkObservabilityRow(): AdminPublicLinkObservabilityRow {
  return {
    id: "public-link-observability-empty",
    surfaceId: "none",
    category: "release-safe",
    status: "review",
    label: "No active public links",
    targetUrl: "/share/<token>",
    detail:
      "No active public share, prototype, or embed surfaces are available for release observability.",
    recommendation:
      "Create a reviewed share link before public route smoke or embed monitoring.",
    latestAt: null,
  };
}

export function sortPublicLinkRows(
  left: AdminPublicLinkObservabilityRow,
  right: AdminPublicLinkObservabilityRow,
) {
  return (
    publicLinkStatusWeight[left.status] - publicLinkStatusWeight[right.status] ||
    categoryWeight(left.category) - categoryWeight(right.category) ||
    left.label.localeCompare(right.label)
  );
}

function getRouteSmokeRow(
  surface: AdminPublicLinkSurface,
): AdminPublicLinkObservabilityRow {
  return {
    id: `${surface.id}-route-smoke`,
    surfaceId: surface.id,
    category: "route-smoke",
    status: surface.smokeStatus,
    label: `${surface.label} route smoke`,
    targetUrl: surface.targetUrl,
    detail: `${surface.smokeLabel} is ${surface.smokeStatus}.`,
    recommendation:
      surface.smokeStatus === "ready"
        ? "Keep this route in the public smoke set."
        : "Run public route smoke before attaching this link to a release.",
    latestAt: surface.latestAt,
  };
}

function getExpiryRow(
  surface: AdminPublicLinkSurface,
): AdminPublicLinkObservabilityRow | null {
  if (surface.expiryState === "scheduled") {
    return null;
  }

  return {
    id: `${surface.id}-expiry`,
    surfaceId: surface.id,
    category: "expiry",
    status: surface.expiryState === "expired" ? "blocked" : "review",
    label:
      surface.expiryState === "expired"
        ? "Expired public link is still observable"
        : surface.stale
          ? "Stale no-expiry public link"
        : "Public link has no expiry",
    targetUrl: surface.targetUrl,
    detail:
      surface.expiryState === "expired"
        ? `${surface.label} is past its expiry date.`
        : surface.stale
          ? `${surface.label} has been public without expiry for more than 30 days.`
        : `${surface.label} can remain public until it is manually disabled.`,
    recommendation:
      surface.expiryState === "expired"
        ? "Disable the link or create a fresh reviewed target."
        : surface.stale
          ? "Set an expiry date or disable this stale public target."
        : "Set an expiry date before sharing externally.",
    latestAt: surface.latestAt,
  };
}

function getExposureRow(
  surface: AdminPublicLinkSurface,
): AdminPublicLinkObservabilityRow | null {
  if (!surface.allowDownload && !surface.allowComments) {
    return null;
  }

  const exposures = [
    surface.allowDownload ? "downloads" : "",
    surface.allowComments ? "comments" : "",
  ].filter(Boolean);

  return {
    id: `${surface.id}-exposure`,
    surfaceId: surface.id,
    category: "exposure",
    status: surface.allowDownload ? "blocked" : "review",
    label: "Public exposure flags",
    targetUrl: surface.targetUrl,
    detail: `${surface.label} exposes ${exposures.join(" and ")}.`,
    recommendation: surface.allowDownload
      ? "Disable downloads unless the release explicitly needs source assets."
      : "Keep comment access tied to an active review owner.",
    latestAt: surface.latestAt,
  };
}

function getReferrerRow(
  surface: AdminPublicLinkSurface,
): AdminPublicLinkObservabilityRow | null {
  if (surface.referrerNote) {
    return null;
  }

  return {
    id: `${surface.id}-referrer`,
    surfaceId: surface.id,
    category: "referrer",
    status: "review",
    label: "Missing referrer note",
    targetUrl: surface.targetUrl,
    detail: `${surface.label} has no expected source, referrer, client, or embed host note.`,
    recommendation:
      "Attach a referrer note before using this link in external docs, embeds, or client portals.",
    latestAt: surface.latestAt,
  };
}

function getEmbedRow(
  surface: AdminPublicLinkSurface,
): AdminPublicLinkObservabilityRow | null {
  if (surface.kind !== "embed") {
    return null;
  }

  return {
    id: `${surface.id}-embed`,
    surfaceId: surface.id,
    category: "embed",
    status: surface.smokeStatus === "blocked" ? "blocked" : "review",
    label: "Embeddable surface",
    targetUrl: surface.targetUrl,
    detail: `${surface.label} is available as an iframe-friendly route.`,
    recommendation:
      "Pair embed usage with an expiry date and a referrer note for the host surface.",
    latestAt: surface.latestAt,
  };
}

function getReleaseSafeRow(
  surface: AdminPublicLinkSurface,
): AdminPublicLinkObservabilityRow | null {
  if (surface.releaseSafe) {
    return null;
  }

  return {
    id: `${surface.id}-release-safe`,
    surfaceId: surface.id,
    category: "release-safe",
    status: surface.blockerCount > 0 ? "blocked" : "review",
    label: "Release-safe publication queue",
    targetUrl: surface.targetUrl,
    detail:
      surface.blockers[0] ??
      surface.warnings[0] ??
      `${surface.label} needs publication review.`,
    recommendation: surface.recommendation,
    latestAt: surface.latestAt,
  };
}

function categoryWeight(category: AdminPublicLinkObservabilityRow["category"]) {
  const weights: Record<AdminPublicLinkObservabilityRow["category"], number> = {
    "route-smoke": 0,
    "release-safe": 1,
    expiry: 2,
    exposure: 3,
    referrer: 4,
    embed: 5,
  };

  return weights[category];
}

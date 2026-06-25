import {
  isEmbedOriginAllowed,
  resolveEmbedSecurityPolicy,
} from "@/features/embed-security/policy";
import type {
  AdminEmbedSecurityInput,
  AdminEmbedSecurityReport,
  AdminEmbedSecurityRow,
  AdminEmbedSecurityShare,
  AdminEmbedSecurityStatus,
  AdminEmbedSecurityTarget,
} from "@/features/admin/admin-embed-security-types";

export type {
  AdminEmbedSecurityAnalyticsRoute,
  AdminEmbedSecurityInput,
  AdminEmbedSecurityReport,
  AdminEmbedSecurityRow,
  AdminEmbedSecurityRowCategory,
  AdminEmbedSecurityShare,
  AdminEmbedSecurityStatus,
  AdminEmbedSecurityTarget,
} from "@/features/admin/admin-embed-security-types";

const statusWeight: Record<AdminEmbedSecurityStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getAdminEmbedSecurityReport({
  analyticsRoutes,
  appOrigin,
  env = process.env,
  generatedAt = new Date().toISOString(),
  shares,
}: AdminEmbedSecurityInput): AdminEmbedSecurityReport {
  const embedRoutesByShareId = new Map(
    analyticsRoutes
      .filter((route) => route.routeKind === "embed")
      .map((route) => [route.shareId, route]),
  );
  const activeShares = shares.filter((share) => !share.disabledAt);
  const targets = activeShares
    .map((share) =>
      toEmbedTarget({
        appOrigin,
        env,
        route: embedRoutesByShareId.get(share.id),
        share,
      }),
    )
    .sort(sortEmbedSecurityTargets);
  const rows = targets.flatMap(toEmbedSecurityRows).sort(sortEmbedSecurityRows);
  const blockedCount = targets.filter((target) => target.status === "blocked").length;
  const reviewCount = targets.filter((target) => target.status === "review").length;
  const readyCount = targets.filter((target) => target.status === "ready").length;

  return {
    generatedAt,
    status: getWorstStatus([
      blockedCount > 0 ? "blocked" : "ready",
      reviewCount > 0 ? "review" : "ready",
    ]),
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    embedShareCount: activeShares.length,
    configuredAllowlistCount: targets.filter((target) => target.configured).length,
    selfPolicyCount: targets.filter((target) => target.framePolicy === "self").length,
    allowlistPolicyCount: targets.filter(
      (target) => target.framePolicy === "allowlist",
    ).length,
    denyPolicyCount: targets.filter((target) => target.framePolicy === "deny").length,
    strictSandboxCount: targets.filter(
      (target) => target.sandboxPreset === "strict",
    ).length,
    trustedSandboxCount: targets.filter(
      (target) => target.sandboxPreset === "trusted",
    ).length,
    observedOriginCount: sum(targets.map((target) => target.observedOrigins.length)),
    allowedObservedOriginCount: sum(
      targets.map((target) => target.allowedObservedOrigins.length),
    ),
    blockedObservedOriginCount: sum(
      targets.map((target) => target.blockedObservedOrigins.length),
    ),
    missingHostEvidenceCount: targets.filter(
      (target) => target.eventCount === 0,
    ).length,
    readyCount,
    reviewCount,
    blockedCount,
    targets,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              id: "embed-security-ready",
              targetId: "all",
              category: "evidence",
              status: "ready",
              label: "Embed host security ready",
              detail:
                "All active embed links have frame policy, sandbox, and recent host evidence coverage.",
              recommendation:
                "Export this evidence with public link and route analytics reports.",
              count: targets.length,
              latestAt: getLatestTargetAt(targets),
            },
          ],
    commands: getEmbedSecurityCommands(),
  };
}

function toEmbedTarget({
  appOrigin,
  env,
  route,
  share,
}: {
  appOrigin?: string | null;
  env: Record<string, string | undefined>;
  route: AdminEmbedSecurityInput["analyticsRoutes"][number] | undefined;
  share: AdminEmbedSecurityShare;
}): AdminEmbedSecurityTarget {
  const policy = resolveEmbedSecurityPolicy({
    env,
    fileId: share.fileId,
    shareId: share.id,
    token: share.token,
  });
  const observedOrigins = uniqueValues(route?.referrerOrigins ?? []);
  const allowedObservedOrigins = observedOrigins.filter((origin) =>
    isEmbedOriginAllowed(origin, policy, appOrigin),
  );
  const blockedObservedOrigins = observedOrigins.filter(
    (origin) => !isEmbedOriginAllowed(origin, policy, appOrigin),
  );
  const status = getTargetStatus({
    blockedObservedOrigins,
    configured: policy.configSource === "env",
    eventCount: route?.eventCount ?? 0,
    framePolicy: policy.framePolicy,
    last7dCount: route?.last7dCount ?? 0,
    sandboxPreset: policy.sandboxPreset,
  });

  return {
    id: `embed-security-${share.id}`,
    shareId: share.id,
    fileId: share.fileId,
    fileName: share.fileName,
    ownerEmail: share.ownerEmail,
    status,
    framePolicy: policy.framePolicy,
    sandboxPreset: policy.sandboxPreset,
    sandboxAttributes: policy.sandboxAttributes,
    allowedOrigins: policy.allowedOrigins,
    configured: policy.configSource === "env",
    observedOrigins,
    allowedObservedOrigins,
    blockedObservedOrigins,
    hostnames: uniqueValues(route?.hostnames ?? []),
    eventCount: route?.eventCount ?? 0,
    last7dCount: route?.last7dCount ?? 0,
    latestAt: route?.latestAt ?? null,
    recommendation: getTargetRecommendation(status),
  };
}

function toEmbedSecurityRows(target: AdminEmbedSecurityTarget) {
  const rows: AdminEmbedSecurityRow[] = [];

  if (!target.configured || target.framePolicy === "self") {
    rows.push({
      id: `${target.id}-allowlist`,
      targetId: target.id,
      category: "allowlist",
      status: "review",
      label: `${target.fileName} embed allowlist`,
      detail:
        target.framePolicy === "self"
          ? "This embed is limited to same-origin framing and has no external host allowlist."
          : "No token, share, file, or workspace allowlist configuration is attached.",
      recommendation:
        "Set ESSENCE_EMBED_HOST_ALLOWLISTS for expected external hosts before publishing an iframe snippet.",
      count: target.allowedOrigins.length,
      latestAt: target.latestAt,
    });
  }

  if (target.blockedObservedOrigins.length > 0) {
    rows.push({
      id: `${target.id}-blocked-hosts`,
      targetId: target.id,
      category: "frame-policy",
      status: "blocked",
      label: `${target.fileName} blocked host evidence`,
      detail: `Observed origins outside policy: ${target.blockedObservedOrigins.join(", ")}.`,
      recommendation:
        "Add the host to the allowlist only if it is trusted, otherwise rotate or disable the public link.",
      count: target.blockedObservedOrigins.length,
      latestAt: target.latestAt,
    });
  }

  if (target.eventCount === 0 || target.last7dCount === 0) {
    rows.push({
      id: `${target.id}-evidence`,
      targetId: target.id,
      category: "evidence",
      status: "review",
      label: `${target.fileName} host evidence`,
      detail:
        target.eventCount === 0
          ? "No embed route analytics events exist for this link."
          : "Embed route analytics exists, but none was captured in the last 7 days.",
      recommendation:
        "Load the embed from the intended host after deployment so the release packet has fresh host evidence.",
      count: target.eventCount,
      latestAt: target.latestAt,
    });
  }

  if (target.sandboxPreset === "trusted") {
    rows.push({
      id: `${target.id}-sandbox`,
      targetId: target.id,
      category: "sandbox",
      status: "review",
      label: `${target.fileName} trusted sandbox`,
      detail:
        "The trusted sandbox preset allows downloads, forms, popups, scripts, and same-origin access.",
      recommendation:
        "Use trusted sandbox only for owned hosts; otherwise downgrade to preview or interactive.",
      count: 1,
      latestAt: target.latestAt,
    });
  }

  return rows;
}

function getTargetStatus({
  blockedObservedOrigins,
  configured,
  eventCount,
  framePolicy,
  last7dCount,
  sandboxPreset,
}: {
  blockedObservedOrigins: string[];
  configured: boolean;
  eventCount: number;
  framePolicy: string;
  last7dCount: number;
  sandboxPreset: string;
}) {
  return getWorstStatus([
    blockedObservedOrigins.length > 0 ? "blocked" : "ready",
    !configured || framePolicy === "self" ? "review" : "ready",
    eventCount === 0 || last7dCount === 0 ? "review" : "ready",
    sandboxPreset === "trusted" ? "review" : "ready",
  ]);
}

function getTargetRecommendation(status: AdminEmbedSecurityStatus) {
  if (status === "blocked") {
    return "Investigate observed external hosts before approving this embed.";
  }

  if (status === "review") {
    return "Confirm allowlist, sandbox preset, frame policy, and fresh host evidence before publication.";
  }

  return "Embed policy and host evidence are ready for release approval.";
}

function getWorstStatus(
  statuses: AdminEmbedSecurityStatus[],
  fallback: AdminEmbedSecurityStatus = "ready",
) {
  return (
    statuses.sort((left, right) => statusWeight[left] - statusWeight[right])[0] ??
    fallback
  );
}

function sortEmbedSecurityTargets(
  left: AdminEmbedSecurityTarget,
  right: AdminEmbedSecurityTarget,
) {
  return (
    statusWeight[left.status] - statusWeight[right.status] ||
    right.blockedObservedOrigins.length - left.blockedObservedOrigins.length ||
    left.fileName.localeCompare(right.fileName)
  );
}

function sortEmbedSecurityRows(
  left: AdminEmbedSecurityRow,
  right: AdminEmbedSecurityRow,
) {
  return (
    statusWeight[left.status] - statusWeight[right.status] ||
    right.count - left.count ||
    (right.latestAt ? new Date(right.latestAt).getTime() : 0) -
      (left.latestAt ? new Date(left.latestAt).getTime() : 0)
  );
}

function getLatestTargetAt(targets: AdminEmbedSecurityTarget[]) {
  return targets.reduce((latest, target) => {
    if (!latest) {
      return target.latestAt;
    }

    if (!target.latestAt) {
      return latest;
    }

    return new Date(target.latestAt).getTime() > new Date(latest).getTime()
      ? target.latestAt
      : latest;
  }, null as string | null);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getEmbedSecurityCommands() {
  return [
    "Configure ESSENCE_EMBED_HOST_ALLOWLISTS with token, share, file, or wildcard host rules for external iframe usage.",
    "Keep frame policy at self for private/internal embeds and use allowlist only for trusted external hosts.",
    "Prefer preview or interactive sandbox presets; reserve trusted for owned hosts with release approval.",
    "Open each embed from the intended host after deployment so route analytics captures host evidence.",
    "Export this report with public route analytics and public link observability before release signoff.",
  ];
}

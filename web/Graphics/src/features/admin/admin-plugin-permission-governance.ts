import {
  builtInPluginManifests,
  type EditorPluginManifest,
  type EditorPluginPermission,
} from "@/features/editor/editor-plugin-api";

export type AdminPluginPermissionGovernanceStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminPluginPermissionGovernanceKind =
  | "activity"
  | "capability"
  | "grant"
  | "manifest"
  | "stale";

export type AdminPluginPermissionGovernanceRow = {
  id: string;
  status: AdminPluginPermissionGovernanceStatus;
  kind: AdminPluginPermissionGovernanceKind;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  target: string | null;
  latestAt: string | null;
};

export type AdminPluginPermissionGovernanceActivity = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  actorName: string;
  actorEmail: string | null;
  label: string;
  detail: string | null;
  createdAt: string;
};

export type AdminPluginPermissionGovernanceReport = {
  generatedAt: string;
  status: AdminPluginPermissionGovernanceStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  manifestCount: number;
  permissionCount: number;
  writePermissionCount: number;
  grantActivityCount: number;
  runActivityCount: number;
  staleApprovalCount: number;
  riskyWriteActivityCount: number;
  unknownActivityCount: number;
  rows: AdminPluginPermissionGovernanceRow[];
  activities: AdminPluginPermissionGovernanceActivity[];
};

export type AdminPluginPermissionGovernanceInput = {
  manifests?: EditorPluginManifest[];
  activities: AdminPluginPermissionGovernanceActivity[];
  generatedAt?: string;
  now?: number;
};

const STALE_APPROVAL_DAYS = 30;
const RISKY_WRITE_REVIEW_DAYS = 7;

export function getAdminPluginPermissionGovernanceReport({
  manifests = builtInPluginManifests,
  activities,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
}: AdminPluginPermissionGovernanceInput): AdminPluginPermissionGovernanceReport {
  const sortedActivities = [...activities].sort(sortActivitiesByCreatedAt);
  const grantActivities = sortedActivities.filter(isGrantActivity);
  const runActivities = sortedActivities.filter(isRunActivity);
  const staleApprovals = grantActivities.filter(
    (activity) => toTime(activity.createdAt) < now - daysToMilliseconds(STALE_APPROVAL_DAYS),
  );
  const riskyWriteActivities = sortedActivities.filter((activity) =>
    isRiskyWriteActivity(activity, manifests, now),
  );
  const unknownActivities = sortedActivities.filter(
    (activity) => !isKnownPluginActivity(activity, manifests),
  );
  const rows = [
    getManifestInventoryRow(manifests),
    getWriteCapabilityRow(manifests),
    getGrantAuditRow(grantActivities),
    getStaleApprovalRow(staleApprovals),
    getRiskyWriteRow(riskyWriteActivities),
    getUnknownActivityRow(unknownActivities),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminPluginPermissionGovernanceStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),
    readyCount,
    reviewCount,
    blockedCount,
    manifestCount: manifests.length,
    permissionCount: manifests.reduce(
      (total, manifest) => total + manifest.permissions.length,
      0,
    ),
    writePermissionCount: getWritePermissionCount(manifests),
    grantActivityCount: grantActivities.length,
    runActivityCount: runActivities.length,
    staleApprovalCount: staleApprovals.length,
    riskyWriteActivityCount: riskyWriteActivities.length,
    unknownActivityCount: unknownActivities.length,
    rows,
    activities: sortedActivities.slice(0, 20),
  };
}

function getManifestInventoryRow(
  manifests: EditorPluginManifest[],
): AdminPluginPermissionGovernanceRow {
  const permissionCount = manifests.reduce(
    (total, manifest) => total + manifest.permissions.length,
    0,
  );

  if (manifests.length === 0) {
    return {
      id: "plugin-manifest-inventory-missing",
      status: "blocked",
      kind: "manifest",
      label: "Installed extensions",
      value: "0",
      detail: "No installed editor extension manifests are available to audit.",
      recommendation:
        "Register extension manifests before granting plugin capabilities.",
      target: null,
      latestAt: null,
    };
  }

  return {
    id: "plugin-manifest-inventory",
    status: "ready",
    kind: "manifest",
    label: "Installed extensions",
    value: `${manifests.length}`,
    detail: `${manifests.length} extension manifest${manifests.length === 1 ? "" : "s"} expose ${permissionCount} permission request${permissionCount === 1 ? "" : "s"}.`,
    recommendation:
      "Keep manifest permission declarations small and review new permissions before release.",
    target: manifests.map((manifest) => manifest.name).join(", "),
    latestAt: null,
  };
}

function getWriteCapabilityRow(
  manifests: EditorPluginManifest[],
): AdminPluginPermissionGovernanceRow {
  const writeManifests = manifests.filter((manifest) =>
    manifest.permissions.includes("write-layer-state"),
  );

  return {
    id: "write-capabilities",
    status: writeManifests.length > 0 ? "review" : "ready",
    kind: "capability",
    label: "Write-capable permissions",
    value: `${writeManifests.length}`,
    detail:
      writeManifests.length > 0
        ? `${writeManifests.map((manifest) => manifest.name).join(", ")} can request layer write capabilities.`
        : "No installed extensions request layer write capabilities.",
    recommendation:
      writeManifests.length > 0
        ? "Review write-capable extension grants periodically and verify run activity before release."
        : "Keep write-capable plugin permissions disabled unless the workflow needs them.",
    target: writeManifests[0]?.name ?? null,
    latestAt: null,
  };
}

function getGrantAuditRow(
  grants: AdminPluginPermissionGovernanceActivity[],
): AdminPluginPermissionGovernanceRow {
  const latest = grants[0];

  return {
    id: "grant-audit-coverage",
    status: grants.length > 0 ? "ready" : "review",
    kind: "grant",
    label: "Grant audit coverage",
    value: `${grants.length}`,
    detail:
      grants.length > 0
        ? `${grants.length} plugin permission grant event${grants.length === 1 ? "" : "s"} were captured in design activity.`
        : "No plugin permission grant events are visible in the loaded design activity window.",
    recommendation:
      grants.length > 0
        ? "Use grant activity alongside browser-local grants when reviewing extension access."
        : "Grant plugin permissions once through the Extensions panel so future admin reviews have an activity anchor.",
    target: latest ? `${latest.fileName} / ${latest.label}` : null,
    latestAt: latest?.createdAt ?? null,
  };
}

function getStaleApprovalRow(
  staleApprovals: AdminPluginPermissionGovernanceActivity[],
): AdminPluginPermissionGovernanceRow {
  const latest = staleApprovals[0];

  return {
    id: "stale-plugin-approvals",
    status: staleApprovals.length > 0 ? "review" : "ready",
    kind: "stale",
    label: "Stale approvals",
    value: `${staleApprovals.length}`,
    detail:
      staleApprovals.length > 0
        ? `${staleApprovals.length} plugin grant approval${staleApprovals.length === 1 ? "" : "s"} are older than ${STALE_APPROVAL_DAYS} days.`
        : `No plugin grant approvals older than ${STALE_APPROVAL_DAYS} days were found.`,
    recommendation:
      staleApprovals.length > 0
        ? "Revoke and re-grant stale plugin approvals during release hardening."
        : "Keep stale approval review in the release checklist.",
    target: latest ? `${latest.fileName} / ${latest.label}` : null,
    latestAt: latest?.createdAt ?? null,
  };
}

function getRiskyWriteRow(
  writeActivities: AdminPluginPermissionGovernanceActivity[],
): AdminPluginPermissionGovernanceRow {
  const latest = writeActivities[0];

  return {
    id: "risky-write-activity",
    status: writeActivities.length > 0 ? "review" : "ready",
    kind: "activity",
    label: "Risky write activity",
    value: `${writeActivities.length}`,
    detail:
      writeActivities.length > 0
        ? `${writeActivities.length} write-capable plugin run${writeActivities.length === 1 ? "" : "s"} happened in the last ${RISKY_WRITE_REVIEW_DAYS} days.`
        : `No write-capable plugin runs were captured in the last ${RISKY_WRITE_REVIEW_DAYS} days.`,
    recommendation:
      writeActivities.length > 0
        ? "Review recent write-capable plugin runs before approving production release evidence."
        : "Keep write-capable plugin activity visible in document history.",
    target: latest ? `${latest.fileName} / ${latest.label}` : null,
    latestAt: latest?.createdAt ?? null,
  };
}

function getUnknownActivityRow(
  unknownActivities: AdminPluginPermissionGovernanceActivity[],
): AdminPluginPermissionGovernanceRow {
  const latest = unknownActivities[0];

  return {
    id: "unknown-plugin-activity",
    status: unknownActivities.length > 0 ? "blocked" : "ready",
    kind: "activity",
    label: "Unknown plugin activity",
    value: `${unknownActivities.length}`,
    detail:
      unknownActivities.length > 0
        ? `${unknownActivities.length} extension activity event${unknownActivities.length === 1 ? "" : "s"} do not map to known plugin manifests or governance operations.`
        : "All loaded extension activity maps to known plugin or governance operations.",
    recommendation:
      unknownActivities.length > 0
        ? "Investigate unknown extension activity before release approval."
        : "Keep unknown extension activity blocked in admin release review.",
    target: latest ? `${latest.fileName} / ${latest.label}` : null,
    latestAt: latest?.createdAt ?? null,
  };
}

function isGrantActivity(activity: AdminPluginPermissionGovernanceActivity) {
  return normalizedLabel(activity).startsWith("granted ");
}

function isRunActivity(activity: AdminPluginPermissionGovernanceActivity) {
  return normalizedLabel(activity).startsWith("ran ");
}

function isRiskyWriteActivity(
  activity: AdminPluginPermissionGovernanceActivity,
  manifests: EditorPluginManifest[],
  now: number,
) {
  if (!isRunActivity(activity)) {
    return false;
  }

  if (toTime(activity.createdAt) < now - daysToMilliseconds(RISKY_WRITE_REVIEW_DAYS)) {
    return false;
  }

  return getWritePluginNames(manifests).some((pluginName) =>
    normalizedLabel(activity).includes(pluginName.toLowerCase()),
  );
}

function isKnownPluginActivity(
  activity: AdminPluginPermissionGovernanceActivity,
  manifests: EditorPluginManifest[],
) {
  const label = normalizedLabel(activity);
  const knownPluginNames = manifests.map((manifest) => manifest.name.toLowerCase());
  const isKnownPlugin = knownPluginNames.some((name) => label.includes(name));

  return (
    isKnownPlugin ||
    label.includes("plugin governance") ||
    label.includes("stale plugin") ||
    label.includes("plugin grant")
  );
}

function getWritePermissionCount(manifests: EditorPluginManifest[]) {
  return manifests.reduce(
    (count, manifest) =>
      count + manifest.permissions.filter(isWritePermission).length,
    0,
  );
}

function getWritePluginNames(manifests: EditorPluginManifest[]) {
  return manifests
    .filter((manifest) => manifest.permissions.some(isWritePermission))
    .map((manifest) => manifest.name);
}

function isWritePermission(permission: EditorPluginPermission) {
  return permission === "write-layer-state";
}

function normalizedLabel(activity: AdminPluginPermissionGovernanceActivity) {
  return `${activity.label} ${activity.detail ?? ""}`.toLowerCase();
}

function sortActivitiesByCreatedAt(
  first: AdminPluginPermissionGovernanceActivity,
  second: AdminPluginPermissionGovernanceActivity,
) {
  return toTime(second.createdAt) - toTime(first.createdAt);
}

function toTime(value: string) {
  return new Date(value).getTime();
}

function daysToMilliseconds(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

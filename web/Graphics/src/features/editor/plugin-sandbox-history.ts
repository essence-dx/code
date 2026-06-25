import {
  createPluginRunHistoryEntry,
  getPluginGrantsForApproval,
  isPluginApprovalCurrent,
  type EditorPluginApprovalRecord,
  type EditorPluginManifest,
  type EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";

export type PluginSandboxStatus = "ready" | "review" | "blocked";

export type PluginSandboxRow = {
  id: string;
  status: PluginSandboxStatus;
  pluginId: string;
  pluginName: string;
  label: string;
  detail: string;
  recommendation: string;
};

export type PluginSandboxHistoryReview = {
  score: number;
  manifestCount: number;
  approvalCount: number;
  currentApprovalCount: number;
  versionMismatchCount: number;
  unpinnedGrantCount: number;
  runCount: number;
  blockedRunCount: number;
  rows: PluginSandboxRow[];
  latestRuns: EditorPluginRunHistoryEntry[];
};

export type PluginApprovalReplayResult = {
  grants: Record<string, boolean>;
  runHistoryEntries: EditorPluginRunHistoryEntry[];
  replayedCount: number;
  blockedCount: number;
};

const runHistoryLimit = 80;

export function getPluginSandboxHistoryReview({
  approvals,
  grants,
  manifests,
  runHistory,
}: {
  approvals: Record<string, EditorPluginApprovalRecord>;
  grants: Record<string, boolean>;
  manifests: EditorPluginManifest[];
  runHistory: EditorPluginRunHistoryEntry[];
}): PluginSandboxHistoryReview {
  const installedPluginIds = new Set(manifests.map((manifest) => manifest.id));
  const rows = [
    ...manifests.map((manifest) =>
      getManifestApprovalRow({
        approval: approvals[manifest.id],
        grants,
        manifest,
      }),
    ),
    ...Object.values(approvals)
      .filter((approval) => !installedPluginIds.has(approval.pluginId))
      .map(getStaleApprovalRow),
  ].sort((left, right) => {
    if (left.status !== right.status) {
      return getStatusRank(left.status) - getStatusRank(right.status);
    }

    return left.pluginName.localeCompare(right.pluginName);
  });
  const currentApprovalCount = manifests.filter((manifest) =>
    isPluginApprovalCurrent(manifest, approvals[manifest.id]),
  ).length;
  const versionMismatchCount = manifests.filter((manifest) => {
    const approval = approvals[manifest.id];
    return Boolean(approval && approval.manifestVersion !== manifest.version);
  }).length;
  const unpinnedGrantCount = rows.filter((row) =>
    row.id.endsWith(":unpinned-grants"),
  ).length;
  const blockedRunCount = runHistory.filter(
    (entry) => entry.status !== "completed",
  ).length;
  const latestRuns = [...runHistory].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return {
    score: Math.max(
      0,
      100 -
        versionMismatchCount * 24 -
        unpinnedGrantCount * 16 -
        blockedRunCount * 8 -
        rows.filter((row) => row.status === "review").length * 4,
    ),
    manifestCount: manifests.length,
    approvalCount: Object.keys(approvals).length,
    currentApprovalCount,
    versionMismatchCount,
    unpinnedGrantCount,
    runCount: runHistory.length,
    blockedRunCount,
    rows,
    latestRuns,
  };
}

export function replayPluginApprovals({
  actorEmail,
  approvals,
  manifests,
}: {
  actorEmail: string;
  approvals: Record<string, EditorPluginApprovalRecord>;
  manifests: EditorPluginManifest[];
}): PluginApprovalReplayResult {
  const grants: Record<string, boolean> = {};
  const runHistoryEntries: EditorPluginRunHistoryEntry[] = [];

  for (const manifest of manifests) {
    const approval = approvals[manifest.id];

    if (!approval) {
      continue;
    }

    const current = isPluginApprovalCurrent(manifest, approval);

    if (current) {
      Object.assign(grants, getPluginGrantsForApproval(approval));
    }

    runHistoryEntries.push(
      createPluginRunHistoryEntry({
        action: "replay",
        actorEmail,
        detail: current
          ? `Replayed pinned approval for ${manifest.name} ${manifest.version}.`
          : `Blocked replay because pinned ${approval.manifestVersion} does not match installed ${manifest.version}.`,
        manifest,
        pinnedManifestVersion: approval.manifestVersion,
        status: current ? "completed" : "version-mismatch",
      }),
    );
  }

  return {
    grants,
    runHistoryEntries,
    replayedCount: runHistoryEntries.filter(
      (entry) => entry.status === "completed",
    ).length,
    blockedCount: runHistoryEntries.filter(
      (entry) => entry.status !== "completed",
    ).length,
  };
}

export function appendPluginRunHistory(
  current: EditorPluginRunHistoryEntry[],
  entries: EditorPluginRunHistoryEntry | EditorPluginRunHistoryEntry[],
) {
  const next = [...(Array.isArray(entries) ? entries : [entries]), ...current];

  return next
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, runHistoryLimit);
}

export function normalizePluginApprovals(
  input: unknown,
): Record<string, EditorPluginApprovalRecord> {
  if (!isRecord(input)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).filter(
      (entry): entry is [string, EditorPluginApprovalRecord] =>
        typeof entry[0] === "string" && isPluginApprovalRecord(entry[1]),
    ),
  );
}

export function normalizePluginRunHistory(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter(isPluginRunHistoryEntry).slice(0, runHistoryLimit);
}

export function getPluginSandboxHistoryCsv(
  review: PluginSandboxHistoryReview,
) {
  return [
    ["status", "pluginId", "pluginName", "label", "detail", "recommendation"],
    ...review.rows.map((row) => [
      row.status,
      row.pluginId,
      row.pluginName,
      row.label,
      row.detail,
      row.recommendation,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getPluginSandboxHistoryMarkdown(
  review: PluginSandboxHistoryReview,
) {
  return [
    "# Plugin Sandbox History",
    "",
    `Score: ${review.score}`,
    `Installed plugins: ${review.manifestCount}`,
    `Pinned approvals: ${review.approvalCount}`,
    `Current approvals: ${review.currentApprovalCount}`,
    `Version mismatches: ${review.versionMismatchCount}`,
    `Unpinned grants: ${review.unpinnedGrantCount}`,
    `Recorded runs: ${review.runCount}`,
    `Blocked runs: ${review.blockedRunCount}`,
    "",
    "## Approval Rows",
    "",
    ...review.rows.map(
      (row) =>
        `- ${row.status.toUpperCase()} - ${row.pluginName}: ${row.label}. ${row.recommendation}`,
    ),
    "",
    "## Latest Runs",
    "",
    ...(review.latestRuns.length > 0
      ? review.latestRuns.slice(0, 12).map(
          (entry) =>
            `- ${entry.createdAt} - ${entry.status.toUpperCase()} - ${entry.pluginName} ${entry.manifestVersion}: ${entry.detail}`,
        )
      : ["- No plugin sandbox runs recorded."]),
  ].join("\n");
}

function getManifestApprovalRow({
  approval,
  grants,
  manifest,
}: {
  approval: EditorPluginApprovalRecord | undefined;
  grants: Record<string, boolean>;
  manifest: EditorPluginManifest;
}): PluginSandboxRow {
  const hasBooleanGrants = manifest.permissions.some(
    (permission) => grants[`${manifest.id}:${permission}`],
  );

  if (!approval) {
    return {
      id: hasBooleanGrants
        ? `${manifest.id}:unpinned-grants`
        : `${manifest.id}:missing-approval`,
      status: hasBooleanGrants ? "blocked" : "review",
      pluginId: manifest.id,
      pluginName: manifest.name,
      label: hasBooleanGrants ? "Unpinned permission grants" : "Approval missing",
      detail: hasBooleanGrants
        ? "Boolean grants exist without a version-pinned approval record."
        : "This plugin has not been approved for the current workspace.",
      recommendation: hasBooleanGrants
        ? "Replay or re-grant plugin approvals so permissions are tied to a manifest version."
        : "Grant permissions before running this plugin.",
    };
  }

  if (!isPluginApprovalCurrent(manifest, approval)) {
    return {
      id: `${manifest.id}:version-mismatch`,
      status: "blocked",
      pluginId: manifest.id,
      pluginName: manifest.name,
      label: "Pinned version mismatch",
      detail: `Approved ${approval.manifestVersion}, installed ${manifest.version}.`,
      recommendation:
        "Review the updated manifest and grant permissions again before running.",
    };
  }

  const missingReplayedGrant = approval.grantKeys.some((key) => !grants[key]);

  if (missingReplayedGrant) {
    return {
      id: `${manifest.id}:approval-not-replayed`,
      status: "review",
      pluginId: manifest.id,
      pluginName: manifest.name,
      label: "Approval pending replay",
      detail: `${manifest.name} is pinned to ${manifest.version}, but one or more grant keys are not active.`,
      recommendation:
        "Replay pinned approvals to restore active grants from the approval log.",
    };
  }

  return {
    id: `${manifest.id}:current-approval`,
    status: "ready",
    pluginId: manifest.id,
    pluginName: manifest.name,
    label: "Pinned approval current",
    detail: `${manifest.name} is approved for manifest ${manifest.version}.`,
    recommendation: "Plugin can run with replayable permission evidence.",
  };
}

function getStaleApprovalRow(
  approval: EditorPluginApprovalRecord,
): PluginSandboxRow {
  return {
    id: `${approval.pluginId}:stale-approval`,
    status: "blocked",
    pluginId: approval.pluginId,
    pluginName: approval.pluginName,
    label: "Stale approval",
    detail: "Approval record no longer maps to an installed plugin manifest.",
    recommendation: "Remove or archive this approval before release.",
  };
}

function isPluginApprovalRecord(
  value: unknown,
): value is EditorPluginApprovalRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.pluginId === "string" &&
    typeof value.pluginName === "string" &&
    typeof value.manifestVersion === "string" &&
    Array.isArray(value.permissions) &&
    value.permissions.every(isPluginPermission) &&
    Array.isArray(value.grantKeys) &&
    value.grantKeys.every((item) => typeof item === "string") &&
    typeof value.approvedAt === "string" &&
    typeof value.approvedBy === "string"
  );
}

function isPluginRunHistoryEntry(
  value: unknown,
): value is EditorPluginRunHistoryEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.pluginId === "string" &&
    typeof value.pluginName === "string" &&
    typeof value.manifestVersion === "string" &&
    (typeof value.pinnedManifestVersion === "string" ||
      value.pinnedManifestVersion === null) &&
    (value.action === "approve" ||
      value.action === "replay" ||
      value.action === "run") &&
    (value.status === "completed" ||
      value.status === "blocked" ||
      value.status === "version-mismatch") &&
    typeof value.detail === "string" &&
    typeof value.actorEmail === "string" &&
    typeof value.createdAt === "string"
  );
}

function isPluginPermission(value: unknown) {
  return (
    value === "inspect-document" ||
    value === "select-layers" ||
    value === "write-layer-state"
  );
}

function getStatusRank(status: PluginSandboxStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

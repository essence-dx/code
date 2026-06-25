import {
  getPluginPermissionGrantKey,
  isPluginApprovalCurrent,
  type EditorPluginApprovalRecord,
  type EditorPluginCatalogSurface,
  type EditorPluginManifest,
  type EditorPluginRunHistoryEntry,
  type EditorPluginRuntimeKind,
} from "@/features/editor/editor-plugin-api";

export type PluginWidgetRuntimeStatus = "ready" | "review" | "blocked";

export type PluginWidgetRuntimeRowCategory =
  | "catalog-publishing"
  | "execution-logs"
  | "permission-review"
  | "sandbox-health"
  | "widget-runtime";

export type PluginWidgetRuntimeSandboxHealth = {
  id: string;
  status: PluginWidgetRuntimeStatus;
  pluginId: string;
  pluginName: string;
  runtimeKind: EditorPluginRuntimeKind;
  isolated: boolean;
  networkAccess: string;
  timeoutMs: number;
  memoryLimitMb: number;
  detail: string;
  recommendation: string;
};

export type PluginWidgetRuntimeExecutionLog = {
  id: string;
  status: PluginWidgetRuntimeStatus;
  pluginId: string;
  pluginName: string;
  action: EditorPluginRunHistoryEntry["action"];
  runStatus: EditorPluginRunHistoryEntry["status"];
  manifestVersion: string;
  pinnedManifestVersion: string | null;
  createdAt: string;
  detail: string;
};

export type PluginWidgetRuntimePermissionReview = {
  id: string;
  status: PluginWidgetRuntimeStatus;
  pluginId: string;
  pluginName: string;
  permissionCount: number;
  grantedPermissionCount: number;
  writePermission: boolean;
  approvalPinned: boolean;
  detail: string;
  recommendation: string;
};

export type PluginWidgetRuntimeCatalogEntry = {
  id: string;
  status: PluginWidgetRuntimeStatus;
  pluginId: string;
  pluginName: string;
  runtimeKind: EditorPluginRuntimeKind;
  category: string;
  surface: EditorPluginCatalogSurface;
  commandIds: string[];
  widgetEntry: string | null;
  publishable: boolean;
  detail: string;
  recommendation: string;
};

export type PluginWidgetRuntimeCatalogHandoff = {
  status: PluginWidgetRuntimeStatus;
  publishableCount: number;
  blockedCount: number;
  entries: PluginWidgetRuntimeCatalogEntry[];
};

export type PluginWidgetRuntimeOperationsRow = {
  id: string;
  status: PluginWidgetRuntimeStatus;
  category: PluginWidgetRuntimeRowCategory;
  pluginId: string;
  pluginName: string;
  label: string;
  detail: string;
  recommendation: string;
  metric: number;
};

export type PluginWidgetRuntimeOperationsReport = {
  generatedAt: string;
  status: PluginWidgetRuntimeStatus;
  score: number;
  manifestCount: number;
  widgetRuntimeCount: number;
  sandboxHealthyCount: number;
  executionLogCount: number;
  blockedExecutionCount: number;
  permissionReviewCount: number;
  catalogPublishableCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  sandboxHealth: PluginWidgetRuntimeSandboxHealth[];
  executionLogs: PluginWidgetRuntimeExecutionLog[];
  permissionReviews: PluginWidgetRuntimePermissionReview[];
  catalogPublishingHandoff: PluginWidgetRuntimeCatalogHandoff;
  rows: PluginWidgetRuntimeOperationsRow[];
};

const statusRank: Record<PluginWidgetRuntimeStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getPluginWidgetRuntimeOperationsReport({
  approvals,
  generatedAt = new Date().toISOString(),
  grants,
  manifests,
  runHistory,
}: {
  approvals: Record<string, EditorPluginApprovalRecord>;
  generatedAt?: string;
  grants: Record<string, boolean>;
  manifests: EditorPluginManifest[];
  runHistory: EditorPluginRunHistoryEntry[];
}): PluginWidgetRuntimeOperationsReport {
  const sandboxHealth = manifests.map(getSandboxHealth);
  const executionLogs = getExecutionLogs(runHistory);
  const permissionReviews = manifests.map((manifest) =>
    getPermissionReview({ approval: approvals[manifest.id], grants, manifest }),
  );
  const catalogEntries = manifests.map((manifest) =>
    getCatalogEntry({
      manifest,
      permissionReview: permissionReviews.find(
        (review) => review.pluginId === manifest.id,
      ),
      sandboxHealth: sandboxHealth.find(
        (health) => health.pluginId === manifest.id,
      ),
    }),
  );
  const catalogPublishingHandoff = getCatalogPublishingHandoff(catalogEntries);
  const rows = [
    ...sandboxHealth.map(getSandboxHealthRow),
    ...executionLogs.map(getExecutionLogRow),
    ...permissionReviews.map(getPermissionReviewRow),
    ...catalogEntries.map(getCatalogRow),
    ...getWidgetRuntimeRows(manifests, catalogEntries),
  ].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 5),
    manifestCount: manifests.length,
    widgetRuntimeCount: manifests.filter(isWidgetRuntime).length,
    sandboxHealthyCount: sandboxHealth.filter(
      (health) => health.status === "ready",
    ).length,
    executionLogCount: executionLogs.length,
    blockedExecutionCount: executionLogs.filter(
      (log) => log.status === "blocked",
    ).length,
    permissionReviewCount: permissionReviews.length,
    catalogPublishableCount: catalogEntries.filter(
      (entry) => entry.status === "ready" && entry.publishable,
    ).length,
    readyCount,
    reviewCount,
    blockedCount,
    sandboxHealth,
    executionLogs,
    permissionReviews,
    catalogPublishingHandoff,
    rows,
  };
}

export function getPluginWidgetRuntimeOperationsJson(
  report: PluginWidgetRuntimeOperationsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getPluginWidgetRuntimeOperationsCsv(
  report: PluginWidgetRuntimeOperationsReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "pluginId",
      "pluginName",
      "label",
      "detail",
      "recommendation",
      "metric",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.pluginId,
        row.pluginName,
        row.label,
        row.detail,
        row.recommendation,
        row.metric,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getPluginWidgetRuntimeOperationsMarkdown(
  report: PluginWidgetRuntimeOperationsReport,
) {
  return [
    "# Plugin Widget Runtime Operations",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Manifests: ${report.manifestCount}`,
    `Widget runtimes: ${report.widgetRuntimeCount}`,
    `Sandbox healthy: ${report.sandboxHealthyCount}`,
    `Execution logs: ${report.executionLogCount}`,
    `Permission reviews: ${report.permissionReviewCount}`,
    `Catalog publishable: ${report.catalogPublishableCount}`,
    "",
    "This handoff combines sandbox health, execution logs, permission reviews, and catalog publishing handoff evidence for plugin and widget runtimes.",
    "",
    "## sandbox health",
    "",
    ...report.sandboxHealth.map(
      (health) =>
        `- [${health.status}] ${health.pluginName}: ${health.detail} ${health.recommendation}`,
    ),
    "",
    "## execution logs",
    "",
    ...(report.executionLogs.length > 0
      ? report.executionLogs.slice(0, 12).map(
          (log) =>
            `- [${log.status}] ${log.createdAt} ${log.pluginName} ${log.action}/${log.runStatus}: ${log.detail}`,
        )
      : ["- [review] No execution logs are available yet."]),
    "",
    "## permission reviews",
    "",
    ...report.permissionReviews.map(
      (review) =>
        `- [${review.status}] ${review.pluginName}: ${review.detail} ${review.recommendation}`,
    ),
    "",
    "## catalog publishing handoff",
    "",
    ...report.catalogPublishingHandoff.entries.map(
      (entry) =>
        `- [${entry.status}] ${entry.pluginName} (${entry.surface}) - ${entry.detail} ${entry.recommendation}`,
    ),
  ].join("\n");
}

function getSandboxHealth(
  manifest: EditorPluginManifest,
): PluginWidgetRuntimeSandboxHealth {
  const sandbox = manifest.sandbox;
  const runtimeKind = getRuntimeKind(manifest);

  if (!sandbox) {
    return {
      id: `sandbox:${manifest.id}`,
      status: "blocked",
      pluginId: manifest.id,
      pluginName: manifest.name,
      runtimeKind,
      isolated: false,
      networkAccess: "unknown",
      timeoutMs: 0,
      memoryLimitMb: 0,
      detail: "No sandbox policy is attached to this manifest.",
      recommendation:
        "Define isolation, network, timeout, and memory limits before publishing.",
    };
  }

  const blocked =
    !sandbox.isolated ||
    sandbox.networkAccess !== "none" ||
    sandbox.timeoutMs <= 0 ||
    sandbox.memoryLimitMb <= 0;
  const review = sandbox.timeoutMs > 5000 || sandbox.memoryLimitMb > 256;

  return {
    id: `sandbox:${manifest.id}`,
    status: blocked ? "blocked" : review ? "review" : "ready",
    pluginId: manifest.id,
    pluginName: manifest.name,
    runtimeKind,
    isolated: sandbox.isolated,
    networkAccess: sandbox.networkAccess,
    timeoutMs: sandbox.timeoutMs,
    memoryLimitMb: sandbox.memoryLimitMb,
    detail: `Runs as ${runtimeKind} with ${sandbox.timeoutMs}ms timeout, ${sandbox.memoryLimitMb}MB memory, and ${sandbox.networkAccess} network access.`,
    recommendation: blocked
      ? "Tighten sandbox limits before enabling runtime execution."
      : review
        ? "Review high runtime budgets before catalog publishing."
        : "Keep this sandbox policy attached to catalog evidence.",
  };
}

function getExecutionLogs(
  runHistory: EditorPluginRunHistoryEntry[],
): PluginWidgetRuntimeExecutionLog[] {
  return [...runHistory]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .map((entry) => ({
      id: `execution:${entry.id}`,
      status:
        entry.status === "completed"
          ? "ready"
          : entry.status === "version-mismatch"
            ? "blocked"
            : "review",
      pluginId: entry.pluginId,
      pluginName: entry.pluginName,
      action: entry.action,
      runStatus: entry.status,
      manifestVersion: entry.manifestVersion,
      pinnedManifestVersion: entry.pinnedManifestVersion,
      createdAt: entry.createdAt,
      detail: entry.detail,
    }));
}

function getPermissionReview({
  approval,
  grants,
  manifest,
}: {
  approval: EditorPluginApprovalRecord | undefined;
  grants: Record<string, boolean>;
  manifest: EditorPluginManifest;
}): PluginWidgetRuntimePermissionReview {
  const grantedPermissionCount = manifest.permissions.filter(
    (permission) => grants[getPluginPermissionGrantKey(manifest.id, permission)],
  ).length;
  const approvalPinned = isPluginApprovalCurrent(manifest, approval);
  const writePermission = manifest.permissions.includes("write-layer-state");
  const allGranted = grantedPermissionCount === manifest.permissions.length;
  const status = !approvalPinned
    ? "blocked"
    : allGranted
      ? "ready"
      : "review";

  return {
    id: `permission:${manifest.id}`,
    status,
    pluginId: manifest.id,
    pluginName: manifest.name,
    permissionCount: manifest.permissions.length,
    grantedPermissionCount,
    writePermission,
    approvalPinned,
    detail: `${grantedPermissionCount}/${manifest.permissions.length} permissions are active and approval pinning is ${approvalPinned ? "current" : "missing"}.`,
    recommendation: !approvalPinned
      ? "Approve the current manifest before exposing runtime commands."
      : allGranted
        ? writePermission
          ? "Keep write access scoped to selected layers and review before release."
          : "Permission grant is ready for runtime execution."
        : "Replay approval grants or request the missing permissions before running.",
  };
}

function getCatalogEntry({
  manifest,
  permissionReview,
  sandboxHealth,
}: {
  manifest: EditorPluginManifest;
  permissionReview: PluginWidgetRuntimePermissionReview | undefined;
  sandboxHealth: PluginWidgetRuntimeSandboxHealth | undefined;
}): PluginWidgetRuntimeCatalogEntry {
  const catalog = manifest.catalog;
  const runtimeKind = getRuntimeKind(manifest);

  if (!catalog) {
    return {
      id: `catalog:${manifest.id}`,
      status: "blocked",
      pluginId: manifest.id,
      pluginName: manifest.name,
      runtimeKind,
      category: "Uncategorized",
      surface: "command",
      commandIds: [],
      widgetEntry: null,
      publishable: false,
      detail: "Catalog metadata is missing.",
      recommendation:
        "Attach category, surface, command ids, and publishable state before handoff.",
    };
  }

  const missingWidgetEntry =
    catalog.surface !== "command" && !catalog.widgetEntry;
  const missingCommands =
    catalog.surface !== "widget" && catalog.commandIds.length === 0;
  const blocked =
    !catalog.publishable ||
    missingWidgetEntry ||
    missingCommands ||
    permissionReview?.status === "blocked" ||
    sandboxHealth?.status === "blocked";
  const review =
    permissionReview?.status === "review" || sandboxHealth?.status === "review";

  return {
    id: `catalog:${manifest.id}`,
    status: blocked ? "blocked" : review ? "review" : "ready",
    pluginId: manifest.id,
    pluginName: manifest.name,
    runtimeKind,
    category: catalog.category,
    surface: catalog.surface,
    commandIds: catalog.commandIds,
    widgetEntry: catalog.widgetEntry ?? null,
    publishable: catalog.publishable,
    detail: `${catalog.category} catalog entry exposes ${catalog.surface} with ${catalog.commandIds.length} command id${catalog.commandIds.length === 1 ? "" : "s"}.`,
    recommendation: blocked
      ? "Resolve metadata, permissions, and sandbox blockers before publishing."
      : review
        ? "Attach reviewer notes before moving this runtime to the catalog."
        : "Ready to include in the catalog publishing handoff.",
  };
}

function getCatalogPublishingHandoff(
  entries: PluginWidgetRuntimeCatalogEntry[],
): PluginWidgetRuntimeCatalogHandoff {
  const blockedCount = entries.filter((entry) => entry.status === "blocked")
    .length;
  const reviewCount = entries.filter((entry) => entry.status === "review")
    .length;

  return {
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    publishableCount: entries.filter(
      (entry) => entry.status === "ready" && entry.publishable,
    ).length,
    blockedCount,
    entries,
  };
}

function getSandboxHealthRow(
  health: PluginWidgetRuntimeSandboxHealth,
): PluginWidgetRuntimeOperationsRow {
  return {
    id: health.id,
    status: health.status,
    category: "sandbox-health",
    pluginId: health.pluginId,
    pluginName: health.pluginName,
    label: "Sandbox health",
    detail: health.detail,
    recommendation: health.recommendation,
    metric: health.status === "ready" ? 1 : 0,
  };
}

function getExecutionLogRow(
  log: PluginWidgetRuntimeExecutionLog,
): PluginWidgetRuntimeOperationsRow {
  return {
    id: log.id,
    status: log.status,
    category: "execution-logs",
    pluginId: log.pluginId,
    pluginName: log.pluginName,
    label: `${log.action} execution log`,
    detail: log.detail,
    recommendation:
      log.status === "ready"
        ? "Keep this execution log in runtime evidence."
        : "Resolve this runtime execution before catalog publishing.",
    metric: log.status === "ready" ? 1 : 0,
  };
}

function getPermissionReviewRow(
  review: PluginWidgetRuntimePermissionReview,
): PluginWidgetRuntimeOperationsRow {
  return {
    id: review.id,
    status: review.status,
    category: "permission-review",
    pluginId: review.pluginId,
    pluginName: review.pluginName,
    label: "Permission review",
    detail: review.detail,
    recommendation: review.recommendation,
    metric: review.grantedPermissionCount,
  };
}

function getCatalogRow(
  entry: PluginWidgetRuntimeCatalogEntry,
): PluginWidgetRuntimeOperationsRow {
  return {
    id: entry.id,
    status: entry.status,
    category: "catalog-publishing",
    pluginId: entry.pluginId,
    pluginName: entry.pluginName,
    label: "Catalog publishing handoff",
    detail: entry.detail,
    recommendation: entry.recommendation,
    metric: entry.publishable ? 1 : 0,
  };
}

function getWidgetRuntimeRows(
  manifests: EditorPluginManifest[],
  catalogEntries: PluginWidgetRuntimeCatalogEntry[],
): PluginWidgetRuntimeOperationsRow[] {
  return manifests
    .filter(isWidgetRuntime)
    .map((manifest) => {
      const catalogEntry = catalogEntries.find(
        (entry) => entry.pluginId === manifest.id,
      );
      const status = catalogEntry?.widgetEntry ? catalogEntry.status : "blocked";

      return {
        id: `widget-runtime:${manifest.id}`,
        status,
        category: "widget-runtime",
        pluginId: manifest.id,
        pluginName: manifest.name,
        label: "Widget runtime entry",
        detail: catalogEntry?.widgetEntry
          ? `${catalogEntry.widgetEntry} is attached for widget runtime publishing.`
          : "Widget runtime metadata is missing an entry module.",
        recommendation:
          status === "ready"
            ? "Keep widget entry metadata aligned with the catalog packet."
            : "Attach a widget entry before publishing a widget-capable runtime.",
        metric: catalogEntry?.widgetEntry ? 1 : 0,
      };
    });
}

function getRuntimeKind(manifest: EditorPluginManifest): EditorPluginRuntimeKind {
  return manifest.runtimeKind ?? "plugin";
}

function isWidgetRuntime(manifest: EditorPluginManifest) {
  return (
    manifest.runtimeKind === "widget" ||
    manifest.runtimeKind === "hybrid" ||
    manifest.catalog?.surface === "widget" ||
    manifest.catalog?.surface === "command-widget"
  );
}

function sortRows(
  first: PluginWidgetRuntimeOperationsRow,
  second: PluginWidgetRuntimeOperationsRow,
) {
  if (first.status !== second.status) {
    return statusRank[first.status] - statusRank[second.status];
  }

  if (first.category !== second.category) {
    return first.category.localeCompare(second.category);
  }

  return first.pluginName.localeCompare(second.pluginName);
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

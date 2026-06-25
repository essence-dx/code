import type {
  PluginWidgetAdminEscalationQueueItem,
  PluginWidgetTelemetryDigestInput,
  PluginWidgetTelemetryDigestReport,
  PluginWidgetTelemetryDigestRow,
  PluginWidgetTelemetryDigestStatus,
} from "@/features/editor/plugin-widget-runtime-telemetry-digest-types";

export {
  getPluginWidgetRuntimeTelemetryDigestCsv,
  getPluginWidgetRuntimeTelemetryDigestJson,
  getPluginWidgetRuntimeTelemetryDigestMarkdown,
} from "@/features/editor/plugin-widget-runtime-telemetry-digest-export";
export type {
  PluginWidgetAdminEscalationQueueItem,
  PluginWidgetTelemetryDigestCategory,
  PluginWidgetTelemetryDigestInput,
  PluginWidgetTelemetryDigestReport,
  PluginWidgetTelemetryDigestRow,
  PluginWidgetTelemetryDigestStatus,
} from "@/features/editor/plugin-widget-runtime-telemetry-digest-types";

export function getPluginWidgetRuntimeTelemetryDigestReport({
  generatedAt = new Date().toISOString(),
  nativePluginSandbox,
  pluginWidgetRuntimeOperations,
}: PluginWidgetTelemetryDigestInput): PluginWidgetTelemetryDigestReport {
  const adminEscalationQueue = getAdminEscalationQueue({
    nativePluginSandbox,
    pluginWidgetRuntimeOperations,
  });
  const permissionPromptBlockedCount =
    pluginWidgetRuntimeOperations.permissionReviews.filter(
      (review) => review.status === "blocked",
    ).length + nativePluginSandbox.permissionPromptBlockedCount;
  const blockedRunCount =
    pluginWidgetRuntimeOperations.blockedExecutionCount +
    nativePluginSandbox.blockedRunCount;
  const replayMismatchCount =
    pluginWidgetRuntimeOperations.executionLogs.filter(
      (log) => log.runStatus === "version-mismatch",
    ).length + nativePluginSandbox.replayEvidenceBlockedCount;
  const crashIsolationBlockedCount =
    nativePluginSandbox.crashIsolationBlockedCount;
  const crashLikeRunCount = nativePluginSandbox.crashLikeRunCount;
  const rows = [
    getPermissionPromptRow({
      permissionPromptBlockedCount,
      pluginWidgetRuntimeOperations,
      nativePluginSandbox,
      adminEscalationQueue,
    }),
    getBlockedRunsRow({
      blockedRunCount,
      pluginWidgetRuntimeOperations,
      nativePluginSandbox,
      adminEscalationQueue,
    }),
    getReplayMismatchRow({
      replayMismatchCount,
      pluginWidgetRuntimeOperations,
      nativePluginSandbox,
      adminEscalationQueue,
    }),
    getCrashIsolationRow({
      crashIsolationBlockedCount,
      crashLikeRunCount,
      nativePluginSandbox,
      adminEscalationQueue,
    }),
    getAdminEscalationRow(adminEscalationQueue),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(
    0,
    Math.min(pluginWidgetRuntimeOperations.score, nativePluginSandbox.score) -
      blockedCount * 12 -
      reviewCount * 4 -
      Math.min(10, blockedRunCount * 2) -
      Math.min(10, replayMismatchCount * 2) -
      Math.min(12, crashLikeRunCount * 3),
  );

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    permissionPromptCount:
      pluginWidgetRuntimeOperations.permissionReviewCount +
      nativePluginSandbox.permissionPromptCount,
    permissionPromptBlockedCount,
    blockedRunCount,
    replayMismatchCount,
    crashIsolationBlockedCount,
    crashLikeRunCount,
    adminEscalationQueueCount: adminEscalationQueue.length,
    widgetRuntimeCount: pluginWidgetRuntimeOperations.widgetRuntimeCount,
    manifestCount: pluginWidgetRuntimeOperations.manifestCount,
    readyCount,
    reviewCount,
    blockedCount,
    rows: rows.sort(sortRows),
    adminEscalationQueue,
    pluginWidgetRuntimeOperations,
    nativePluginSandbox,
  };
}

function getPermissionPromptRow({
  adminEscalationQueue,
  nativePluginSandbox,
  permissionPromptBlockedCount,
  pluginWidgetRuntimeOperations,
}: {
  adminEscalationQueue: PluginWidgetAdminEscalationQueueItem[];
  nativePluginSandbox: PluginWidgetTelemetryDigestInput["nativePluginSandbox"];
  permissionPromptBlockedCount: number;
  pluginWidgetRuntimeOperations: PluginWidgetTelemetryDigestInput["pluginWidgetRuntimeOperations"];
}): PluginWidgetTelemetryDigestRow {
  const status: PluginWidgetTelemetryDigestStatus =
    permissionPromptBlockedCount > 0
      ? "blocked"
      : pluginWidgetRuntimeOperations.permissionReviews.some(
            (review) => review.status === "review",
          ) || nativePluginSandbox.permissionPromptCount === 0
        ? "review"
        : "ready";

  return {
    id: "plugin-widget-telemetry-permission-prompts",
    status,
    category: "permission-prompts",
    label: "Permission prompt coverage",
    detail: `${pluginWidgetRuntimeOperations.permissionReviewCount} plugin permission review${pluginWidgetRuntimeOperations.permissionReviewCount === 1 ? "" : "s"} and ${nativePluginSandbox.permissionPromptCount} native prompt signal${nativePluginSandbox.permissionPromptCount === 1 ? "" : "s"} are available; ${permissionPromptBlockedCount} are blocked.`,
    metric: permissionPromptBlockedCount,
    threshold: 0,
    pluginIds: pluginWidgetRuntimeOperations.permissionReviews.map(
      (review) => review.pluginId,
    ),
    escalationIds: getEscalationIds(adminEscalationQueue, "permission-prompts"),
    recommendation:
      status === "ready"
        ? "Permission prompt evidence is ready for admin digest export."
        : "Pin approvals and close missing grant prompts before allowing widget runtime promotion.",
  };
}

function getBlockedRunsRow({
  adminEscalationQueue,
  blockedRunCount,
  nativePluginSandbox,
  pluginWidgetRuntimeOperations,
}: {
  adminEscalationQueue: PluginWidgetAdminEscalationQueueItem[];
  blockedRunCount: number;
  nativePluginSandbox: PluginWidgetTelemetryDigestInput["nativePluginSandbox"];
  pluginWidgetRuntimeOperations: PluginWidgetTelemetryDigestInput["pluginWidgetRuntimeOperations"];
}): PluginWidgetTelemetryDigestRow {
  const status: PluginWidgetTelemetryDigestStatus =
    blockedRunCount > 0 ? "blocked" : "ready";

  return {
    id: "plugin-widget-telemetry-blocked-runs",
    status,
    category: "blocked-runs",
    label: "Blocked runs",
    detail: `${blockedRunCount} blocked run signal${blockedRunCount === 1 ? "" : "s"} across execution logs and native sandbox history.`,
    metric: blockedRunCount,
    threshold: 0,
    pluginIds: Array.from(
      new Set([
        ...pluginWidgetRuntimeOperations.executionLogs
          .filter((log) => log.status === "blocked")
          .map((log) => log.pluginId),
        ...nativePluginSandbox.crashIsolation.map((item) => item.pluginId),
      ]),
    ),
    escalationIds: getEscalationIds(adminEscalationQueue, "blocked-runs"),
    recommendation:
      status === "ready"
        ? "No blocked runs are waiting for admin escalation."
        : "Review blocked run details and require an operator note before replay.",
  };
}

function getReplayMismatchRow({
  adminEscalationQueue,
  nativePluginSandbox,
  pluginWidgetRuntimeOperations,
  replayMismatchCount,
}: {
  adminEscalationQueue: PluginWidgetAdminEscalationQueueItem[];
  nativePluginSandbox: PluginWidgetTelemetryDigestInput["nativePluginSandbox"];
  pluginWidgetRuntimeOperations: PluginWidgetTelemetryDigestInput["pluginWidgetRuntimeOperations"];
  replayMismatchCount: number;
}): PluginWidgetTelemetryDigestRow {
  const status: PluginWidgetTelemetryDigestStatus =
    replayMismatchCount > 2
      ? "blocked"
      : replayMismatchCount > 0
        ? "review"
        : "ready";

  return {
    id: "plugin-widget-telemetry-replay-mismatches",
    status,
    category: "replay-mismatches",
    label: "Replay mismatches",
    detail: `${replayMismatchCount} replay mismatch signal${replayMismatchCount === 1 ? "" : "s"} are present across run history and native replay evidence.`,
    metric: replayMismatchCount,
    threshold: 0,
    pluginIds: Array.from(
      new Set([
        ...pluginWidgetRuntimeOperations.executionLogs
          .filter((log) => log.runStatus === "version-mismatch")
          .map((log) => log.pluginId),
        ...nativePluginSandbox.replayEvidence
          .filter((item) => item.status !== "ready")
          .map((item) => item.pluginId),
      ]),
    ),
    escalationIds: getEscalationIds(adminEscalationQueue, "replay-mismatches"),
    recommendation:
      status === "ready"
        ? "Replay evidence matches pinned plugin versions."
        : "Re-approve pinned versions or block replay until mismatched runs are reconciled.",
  };
}

function getCrashIsolationRow({
  adminEscalationQueue,
  crashIsolationBlockedCount,
  crashLikeRunCount,
  nativePluginSandbox,
}: {
  adminEscalationQueue: PluginWidgetAdminEscalationQueueItem[];
  crashIsolationBlockedCount: number;
  crashLikeRunCount: number;
  nativePluginSandbox: PluginWidgetTelemetryDigestInput["nativePluginSandbox"];
}): PluginWidgetTelemetryDigestRow {
  const status: PluginWidgetTelemetryDigestStatus =
    crashIsolationBlockedCount > 0 || crashLikeRunCount > 0
      ? "blocked"
      : "ready";

  return {
    id: "plugin-widget-telemetry-crash-isolation",
    status,
    category: "crash-isolation",
    label: "Crash isolation",
    detail: `${crashIsolationBlockedCount} crash isolation blocker${crashIsolationBlockedCount === 1 ? "" : "s"} and ${crashLikeRunCount} crash-like run signal${crashLikeRunCount === 1 ? "" : "s"} are in scope.`,
    metric: crashIsolationBlockedCount + crashLikeRunCount,
    threshold: 0,
    pluginIds: nativePluginSandbox.crashIsolation.map((item) => item.pluginId),
    escalationIds: getEscalationIds(adminEscalationQueue, "crash-isolation"),
    recommendation:
      status === "ready"
        ? "Crash isolation is clean for plugin/widget runtime digest export."
        : "Escalate crash isolation blockers before enabling plugin replay or marketplace promotion.",
  };
}

function getAdminEscalationRow(
  queue: PluginWidgetAdminEscalationQueueItem[],
): PluginWidgetTelemetryDigestRow {
  const blockedCount = queue.filter((item) => item.status === "blocked").length;
  const status: PluginWidgetTelemetryDigestStatus =
    blockedCount > 0 ? "blocked" : queue.length > 0 ? "review" : "ready";

  return {
    id: "plugin-widget-telemetry-admin-escalation",
    status,
    category: "admin-escalation",
    label: "Admin escalation queue",
    detail: `${queue.length} admin escalation queue item${queue.length === 1 ? "" : "s"} include ${blockedCount} blocker${blockedCount === 1 ? "" : "s"}.`,
    metric: queue.length,
    threshold: 0,
    pluginIds: Array.from(new Set(queue.map((item) => item.pluginId))),
    escalationIds: queue.map((item) => item.id),
    recommendation:
      status === "ready"
        ? "No admin escalations are waiting for plugin runtime owners."
        : "Route escalation items to an admin owner before continuing plugin rollout.",
  };
}

function getAdminEscalationQueue({
  nativePluginSandbox,
  pluginWidgetRuntimeOperations,
}: {
  nativePluginSandbox: PluginWidgetTelemetryDigestInput["nativePluginSandbox"];
  pluginWidgetRuntimeOperations: PluginWidgetTelemetryDigestInput["pluginWidgetRuntimeOperations"];
}): PluginWidgetAdminEscalationQueueItem[] {
  return [
    ...pluginWidgetRuntimeOperations.permissionReviews
      .filter((review) => review.status !== "ready")
      .map((review) => ({
        id: `permission:${review.pluginId}`,
        status: review.status,
        category: "permission-prompts" as const,
        pluginId: review.pluginId,
        pluginName: review.pluginName,
        reason: "Permission prompt review",
        detail: review.detail,
        recommendation: review.recommendation,
      })),
    ...pluginWidgetRuntimeOperations.executionLogs
      .filter((log) => log.status !== "ready")
      .map((log) => ({
        id: `run:${log.id}`,
        status: log.status,
        category:
          log.runStatus === "version-mismatch"
            ? ("replay-mismatches" as const)
            : ("blocked-runs" as const),
        pluginId: log.pluginId,
        pluginName: log.pluginName,
        reason:
          log.runStatus === "version-mismatch"
            ? "Replay version mismatch"
            : "Blocked runtime execution",
        detail: log.detail,
        recommendation:
          log.runStatus === "version-mismatch"
            ? "Reconcile pinned manifest version before replay."
            : "Review blocked runtime details before retrying.",
      })),
    ...nativePluginSandbox.crashIsolation
      .filter((item) => item.status !== "ready")
      .map((item) => ({
        id: `crash:${item.pluginId}`,
        status: item.status,
        category: "crash-isolation" as const,
        pluginId: item.pluginId,
        pluginName: item.pluginName,
        reason: "Crash isolation review",
        detail: item.detail,
        recommendation: item.recommendation,
      })),
    ...nativePluginSandbox.replayEvidence
      .filter((item) => item.status !== "ready")
      .map((item) => ({
        id: `replay:${item.pluginId}`,
        status: item.status,
        category: "replay-mismatches" as const,
        pluginId: item.pluginId,
        pluginName: item.pluginName,
        reason: "Replay evidence review",
        detail: item.detail,
        recommendation: item.recommendation,
      })),
  ].sort(sortQueue);
}

function getEscalationIds(
  queue: PluginWidgetAdminEscalationQueueItem[],
  category: PluginWidgetAdminEscalationQueueItem["category"],
) {
  return queue
    .filter((item) => item.category === category)
    .map((item) => item.id);
}

function sortRows(
  left: PluginWidgetTelemetryDigestRow,
  right: PluginWidgetTelemetryDigestRow,
) {
  const rank: Record<PluginWidgetTelemetryDigestStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return rank[left.status] - rank[right.status] || left.id.localeCompare(right.id);
}

function sortQueue(
  left: PluginWidgetAdminEscalationQueueItem,
  right: PluginWidgetAdminEscalationQueueItem,
) {
  const rank: Record<PluginWidgetTelemetryDigestStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return rank[left.status] - rank[right.status] || left.id.localeCompare(right.id);
}

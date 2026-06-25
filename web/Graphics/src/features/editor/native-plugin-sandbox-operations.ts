import {
  getPluginPermissionGrantKey,
  isPluginApprovalCurrent,
  type EditorPluginApprovalRecord,
  type EditorPluginManifest,
  type EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";
import type {
  NativePluginCrashIsolationReview,
  NativePluginOfflineExecutionPolicy,
  NativePluginPermissionPromptReview,
  NativePluginReplayEvidenceReview,
  NativePluginSandboxCategory,
  NativePluginSandboxOperationsInput,
  NativePluginSandboxOperationsReport,
  NativePluginSandboxPacket,
  NativePluginSandboxRow,
  NativePluginSandboxStatus,
} from "@/features/editor/native-plugin-sandbox-operations-types";

export {
  getNativePluginSandboxOperationsCsv,
  getNativePluginSandboxOperationsJson,
  getNativePluginSandboxOperationsMarkdown,
} from "@/features/editor/native-plugin-sandbox-operations-export";
export type {
  NativePluginCrashIsolationReview,
  NativePluginOfflineExecutionPolicy,
  NativePluginPermissionPromptReview,
  NativePluginReplayEvidenceReview,
  NativePluginSandboxCategory,
  NativePluginSandboxOperationsInput,
  NativePluginSandboxOperationsReport,
  NativePluginSandboxPacket,
  NativePluginSandboxPacketKind,
  NativePluginSandboxRow,
  NativePluginSandboxStatus,
} from "@/features/editor/native-plugin-sandbox-operations-types";

const crashLikePattern = /crash|exception|timeout|panic|worker|isolation/i;

export function getNativePluginSandboxOperationsReport({
  approvals,
  generatedAt = new Date().toISOString(),
  grants,
  manifests,
  runHistory,
}: NativePluginSandboxOperationsInput): NativePluginSandboxOperationsReport {
  const permissionPrompts = manifests.map((manifest) =>
    getPermissionPromptReview({
      approval: approvals[manifest.id],
      grants,
      manifest,
    }),
  );
  const offlinePolicies = manifests.map(getOfflineExecutionPolicy);
  const crashIsolation = manifests.map((manifest) =>
    getCrashIsolationReview(manifest, getRunHistoryForPlugin(runHistory, manifest.id)),
  );
  const replayEvidence = manifests.map((manifest) =>
    getReplayEvidenceReview({
      approval: approvals[manifest.id],
      manifest,
      runs: getRunHistoryForPlugin(runHistory, manifest.id),
    }),
  );
  const operatorEvidence = getOperatorEvidence({
    crashIsolationReadyCount: getStatusCount(crashIsolation, "ready"),
    manifestCount: manifests.length,
    offlinePolicyReadyCount: getStatusCount(offlinePolicies, "ready"),
    permissionPromptCount: permissionPrompts.length,
    replayEvidenceReadyCount: getStatusCount(replayEvidence, "ready"),
    widgetManifestCount: manifests.filter(isWidgetManifest).length,
  });
  const rows = [
    ...permissionPrompts.map(getPermissionPromptRow),
    ...offlinePolicies.map(getOfflinePolicyRow),
    ...crashIsolation.map(getCrashIsolationRow),
    ...replayEvidence.map(getReplayEvidenceRow),
    getOperatorEvidenceRow(operatorEvidence),
  ].sort(sortRows);
  const operationPackets = getOperationPackets({
    crashIsolation,
    offlinePolicies,
    operatorEvidence,
    permissionPrompts,
    replayEvidence,
    rows,
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const crashLikeRunCount = crashIsolation.reduce(
    (total, item) => total + item.crashLikeRunCount,
    0,
  );
  const blockedRunCount = crashIsolation.reduce(
    (total, item) => total + item.blockedRunCount,
    0,
  );

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(
      0,
      100 -
        blockedCount * 15 -
        reviewCount * 4 -
        Math.min(15, crashLikeRunCount * 5) -
        Math.min(12, blockedRunCount * 4),
    ),
    manifestCount: manifests.length,
    widgetManifestCount: manifests.filter(isWidgetManifest).length,
    permissionPromptCount: permissionPrompts.length,
    permissionPromptBlockedCount: getStatusCount(permissionPrompts, "blocked"),
    offlinePolicyReadyCount: getStatusCount(offlinePolicies, "ready"),
    offlinePolicyBlockedCount: getStatusCount(offlinePolicies, "blocked"),
    crashIsolationReadyCount: getStatusCount(crashIsolation, "ready"),
    crashIsolationBlockedCount: getStatusCount(crashIsolation, "blocked"),
    replayEvidenceReadyCount: getStatusCount(replayEvidence, "ready"),
    replayEvidenceBlockedCount: getStatusCount(replayEvidence, "blocked"),
    crashLikeRunCount,
    blockedRunCount,
    operatorEvidenceCount: operatorEvidence.length,
    readyCount,
    reviewCount,
    blockedCount,
    permissionPrompts,
    offlinePolicies,
    crashIsolation,
    replayEvidence,
    rows,
    operationPackets,
    operatorEvidence,
  };
}

function getPermissionPromptReview({
  approval,
  grants,
  manifest,
}: {
  approval: EditorPluginApprovalRecord | undefined;
  grants: Record<string, boolean>;
  manifest: EditorPluginManifest;
}): NativePluginPermissionPromptReview {
  const approvalPinned = isPluginApprovalCurrent(manifest, approval);
  const grantedPermissionCount = manifest.permissions.filter(
    (permission) => grants[getPluginPermissionGrantKey(manifest.id, permission)],
  ).length;
  const allGrantsActive = grantedPermissionCount === manifest.permissions.length;
  const hasUnpinnedGrants = !approvalPinned && grantedPermissionCount > 0;
  const status: NativePluginSandboxStatus = hasUnpinnedGrants
    ? "blocked"
    : approvalPinned && allGrantsActive
      ? "ready"
      : "review";

  return {
    id: `permission-prompt:${manifest.id}`,
    status,
    pluginId: manifest.id,
    pluginName: manifest.name,
    permissionCount: manifest.permissions.length,
    grantedPermissionCount,
    approvalPinned,
    writePermission: manifest.permissions.includes("write-layer-state"),
    detail: `${grantedPermissionCount}/${manifest.permissions.length} permission prompt grant${manifest.permissions.length === 1 ? "" : "s"} active; version-pinned approval is ${approvalPinned ? "current" : "missing or stale"}.`,
    recommendation:
      status === "ready"
        ? "Keep this version-pinned permission prompt evidence with native sandbox signoff."
        : hasUnpinnedGrants
          ? "Clear or replay unpinned grants before native plugin execution."
          : "Prompt for the current manifest and replay grants before running this plugin.",
  };
}

function getOfflineExecutionPolicy(
  manifest: EditorPluginManifest,
): NativePluginOfflineExecutionPolicy {
  const sandbox = manifest.sandbox;
  const localEntryPoint = isLocalEntryPoint(manifest.entryPoint);
  const isolated = sandbox?.isolated ?? false;
  const networkAccess = sandbox?.networkAccess ?? "unknown";
  const offlineExecutable =
    Boolean(sandbox) && isolated && networkAccess === "none" && localEntryPoint;
  const status: NativePluginSandboxStatus = offlineExecutable
    ? "ready"
    : networkAccess === "limited" && isolated && localEntryPoint
      ? "review"
      : "blocked";

  return {
    id: `offline-policy:${manifest.id}`,
    status,
    pluginId: manifest.id,
    pluginName: manifest.name,
    networkAccess,
    localEntryPoint,
    isolated,
    offlineExecutable,
    detail: `${manifest.name} uses ${localEntryPoint ? "local" : "remote or missing"} entry point and ${networkAccess} network policy.`,
    recommendation:
      status === "ready"
        ? "Ready for offline desktop execution."
        : "Require isolated local entry points and no network access for offline desktop execution.",
  };
}

function getCrashIsolationReview(
  manifest: EditorPluginManifest,
  runs: EditorPluginRunHistoryEntry[],
): NativePluginCrashIsolationReview {
  const sandbox = manifest.sandbox;
  const blockedRunCount = runs.filter((run) => run.status !== "completed").length;
  const crashLikeRunCount = runs.filter((run) =>
    crashLikePattern.test(run.detail),
  ).length;
  const timeoutMs = sandbox?.timeoutMs ?? 0;
  const memoryLimitMb = sandbox?.memoryLimitMb ?? 0;
  const isolated = sandbox?.isolated ?? false;
  const safeBudgets =
    timeoutMs > 0 && timeoutMs <= 5000 && memoryLimitMb > 0 && memoryLimitMb <= 256;
  const status: NativePluginSandboxStatus =
    !isolated || !safeBudgets || crashLikeRunCount > 0
      ? "blocked"
      : blockedRunCount > 0
        ? "review"
        : "ready";

  return {
    id: `crash-isolation:${manifest.id}`,
    status,
    pluginId: manifest.id,
    pluginName: manifest.name,
    timeoutMs,
    memoryLimitMb,
    crashLikeRunCount,
    blockedRunCount,
    isolated,
    detail: `${manifest.name} has ${timeoutMs}ms timeout, ${memoryLimitMb}MB memory, ${blockedRunCount} blocked run${blockedRunCount === 1 ? "" : "s"}, and ${crashLikeRunCount} crash-like signal${crashLikeRunCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Crash isolation budgets are ready for native plugin/widget execution."
        : "Tighten isolation, timeout, memory, and crash handling before desktop release.",
  };
}

function getReplayEvidenceReview({
  approval,
  manifest,
  runs,
}: {
  approval: EditorPluginApprovalRecord | undefined;
  manifest: EditorPluginManifest;
  runs: EditorPluginRunHistoryEntry[];
}): NativePluginReplayEvidenceReview {
  const approvalPinned = isPluginApprovalCurrent(manifest, approval);
  const completedRunCount = runs.filter((run) => run.status === "completed").length;
  const replayRunCount = runs.filter(
    (run) => run.action === "replay" && run.status === "completed",
  ).length;
  const versionMismatchCount = runs.filter(
    (run) => run.status === "version-mismatch",
  ).length;
  const latestRunAt = getLatestDate(runs.map((run) => run.createdAt));
  const status: NativePluginSandboxStatus =
    !approvalPinned || versionMismatchCount > 0
      ? "blocked"
      : replayRunCount > 0 && completedRunCount > 0
        ? "ready"
        : "review";

  return {
    id: `replay-evidence:${manifest.id}`,
    status,
    pluginId: manifest.id,
    pluginName: manifest.name,
    completedRunCount,
    replayRunCount,
    versionMismatchCount,
    latestRunAt,
    detail: `${manifest.name} has ${completedRunCount} completed run${completedRunCount === 1 ? "" : "s"}, ${replayRunCount} replay run${replayRunCount === 1 ? "" : "s"}, and ${versionMismatchCount} version mismatch${versionMismatchCount === 1 ? "" : "es"}.`,
    recommendation:
      status === "ready"
        ? "Replay evidence is ready for native sandbox operations."
        : "Replay current approvals and clear version mismatches before release.",
  };
}

function getPermissionPromptRow(
  prompt: NativePluginPermissionPromptReview,
): NativePluginSandboxRow {
  return {
    id: prompt.id,
    status: prompt.status,
    category: "permission-prompts",
    pluginId: prompt.pluginId,
    pluginName: prompt.pluginName,
    label: "Permission prompts",
    detail: prompt.detail,
    metric: prompt.grantedPermissionCount,
    threshold: prompt.permissionCount,
    packetIds: ["permission-prompt-review-packet"],
    recommendation: prompt.recommendation,
  };
}

function getOfflinePolicyRow(
  policy: NativePluginOfflineExecutionPolicy,
): NativePluginSandboxRow {
  return {
    id: policy.id,
    status: policy.status,
    category: "offline-execution",
    pluginId: policy.pluginId,
    pluginName: policy.pluginName,
    label: "Offline execution policy",
    detail: policy.detail,
    metric: policy.offlineExecutable ? 1 : 0,
    threshold: 1,
    packetIds: ["offline-execution-policy-packet"],
    recommendation: policy.recommendation,
  };
}

function getCrashIsolationRow(
  item: NativePluginCrashIsolationReview,
): NativePluginSandboxRow {
  return {
    id: item.id,
    status: item.status,
    category: "crash-isolation",
    pluginId: item.pluginId,
    pluginName: item.pluginName,
    label: "Crash isolation",
    detail: item.detail,
    metric: item.crashLikeRunCount + item.blockedRunCount,
    threshold: 0,
    packetIds: ["crash-isolation-rehearsal-packet"],
    recommendation: item.recommendation,
  };
}

function getReplayEvidenceRow(
  item: NativePluginReplayEvidenceReview,
): NativePluginSandboxRow {
  return {
    id: item.id,
    status: item.status,
    category: "replay-evidence",
    pluginId: item.pluginId,
    pluginName: item.pluginName,
    label: "Replay evidence",
    detail: item.detail,
    metric: item.replayRunCount,
    threshold: 1,
    packetIds: ["replay-evidence-audit-packet"],
    recommendation: item.recommendation,
  };
}

function getOperatorEvidenceRow(evidence: string[]): NativePluginSandboxRow {
  return {
    id: "operator-evidence:native-plugin-sandbox",
    status: evidence.length >= 5 ? "ready" : "review",
    category: "operator-evidence",
    pluginId: "native-plugin-sandbox",
    pluginName: "Native plugin sandbox",
    label: "Operator export evidence",
    detail: `${evidence.length} operator evidence item${evidence.length === 1 ? "" : "s"} are ready for native sandbox handoff.`,
    metric: evidence.length,
    threshold: 5,
    packetIds: ["native-plugin-operator-export-packet"],
    recommendation:
      "Export JSON, CSV, and Markdown packets for desktop release operators.",
  };
}

function getOperationPackets({
  crashIsolation,
  offlinePolicies,
  operatorEvidence,
  permissionPrompts,
  replayEvidence,
  rows,
}: {
  crashIsolation: NativePluginCrashIsolationReview[];
  offlinePolicies: NativePluginOfflineExecutionPolicy[];
  operatorEvidence: string[];
  permissionPrompts: NativePluginPermissionPromptReview[];
  replayEvidence: NativePluginReplayEvidenceReview[];
  rows: NativePluginSandboxRow[];
}): NativePluginSandboxPacket[] {
  const rowByCategory = new Map(rows.map((row) => [row.category, row]));

  return [
    {
      id: "permission-prompt-review-packet",
      kind: "permission-prompt-review",
      status: getCategoryStatus(rowByCategory, "permission-prompts"),
      label: "Permission prompt review",
      detail: `${permissionPrompts.length} plugin permission prompt review${permissionPrompts.length === 1 ? "" : "s"} recorded.`,
      pluginIds: permissionPrompts.map((prompt) => prompt.pluginId),
      steps: [
        "Prompt users against the current manifest version.",
        "Bind grants to a replayable approval record.",
        "Block native execution for stale or unpinned grants.",
      ],
      evidenceCount: Math.max(1, permissionPrompts.length),
    },
    {
      id: "offline-execution-policy-packet",
      kind: "offline-policy-review",
      status: getCategoryStatus(rowByCategory, "offline-execution"),
      label: "Offline execution policy",
      detail: `${offlinePolicies.length} plugin offline execution polic${offlinePolicies.length === 1 ? "y" : "ies"} reviewed.`,
      pluginIds: offlinePolicies.map((policy) => policy.pluginId),
      steps: [
        "Require local entry points for desktop offline execution.",
        "Require isolated sandboxes with no network access.",
        "Attach policy evidence before plugin/widget catalog release.",
      ],
      evidenceCount: Math.max(1, offlinePolicies.length),
    },
    {
      id: "crash-isolation-rehearsal-packet",
      kind: "crash-isolation-rehearsal",
      status: getCategoryStatus(rowByCategory, "crash-isolation"),
      label: "Crash isolation rehearsal",
      detail: `${crashIsolation.length} crash isolation review${crashIsolation.length === 1 ? "" : "s"} include timeout, memory, and run-history evidence.`,
      pluginIds: crashIsolation.map((item) => item.pluginId),
      steps: [
        "Confirm each runtime has isolation enabled.",
        "Confirm timeout and memory budgets are bounded.",
        "Review blocked and crash-like run history before release.",
      ],
      evidenceCount: Math.max(1, crashIsolation.length),
    },
    {
      id: "replay-evidence-audit-packet",
      kind: "replay-evidence-audit",
      status: getCategoryStatus(rowByCategory, "replay-evidence"),
      label: "Replay evidence audit",
      detail: `${replayEvidence.length} replay evidence row${replayEvidence.length === 1 ? "" : "s"} cover approvals, replays, and mismatches.`,
      pluginIds: replayEvidence.map((item) => item.pluginId),
      steps: [
        "Replay approval grants after manifest changes.",
        "Require at least one completed replay before desktop release.",
        "Block version mismatches and stale approval pins.",
      ],
      evidenceCount: Math.max(1, replayEvidence.length),
    },
    {
      id: "native-plugin-operator-export-packet",
      kind: "operator-export",
      status: getCategoryStatus(rowByCategory, "operator-evidence"),
      label: "Operator export packet",
      detail: `${operatorEvidence.length} native sandbox operator evidence item${operatorEvidence.length === 1 ? "" : "s"} prepared.`,
      pluginIds: [],
      steps: [
        "Export native plugin sandbox JSON.",
        "Export CSV rows for audit review.",
        "Export Markdown handoff for release notes.",
      ],
      evidenceCount: operatorEvidence.length,
    },
  ];
}

function getOperatorEvidence({
  crashIsolationReadyCount,
  manifestCount,
  offlinePolicyReadyCount,
  permissionPromptCount,
  replayEvidenceReadyCount,
  widgetManifestCount,
}: {
  crashIsolationReadyCount: number;
  manifestCount: number;
  offlinePolicyReadyCount: number;
  permissionPromptCount: number;
  replayEvidenceReadyCount: number;
  widgetManifestCount: number;
}) {
  return [
    "Export native plugin sandbox operations JSON.",
    "Export native plugin sandbox operations CSV.",
    "Export native plugin sandbox operations Markdown.",
    `${manifestCount} native plugin manifest${manifestCount === 1 ? "" : "s"} reviewed.`,
    `${widgetManifestCount} widget-capable runtime${widgetManifestCount === 1 ? "" : "s"} included.`,
    `${permissionPromptCount} permission prompt review${permissionPromptCount === 1 ? "" : "s"} recorded.`,
    `${offlinePolicyReadyCount} offline execution polic${offlinePolicyReadyCount === 1 ? "y" : "ies"} ready.`,
    `${crashIsolationReadyCount} crash isolation review${crashIsolationReadyCount === 1 ? "" : "s"} ready.`,
    `${replayEvidenceReadyCount} replay evidence row${replayEvidenceReadyCount === 1 ? "" : "s"} ready.`,
  ];
}

function getRunHistoryForPlugin(
  runHistory: EditorPluginRunHistoryEntry[],
  pluginId: string,
) {
  return runHistory.filter((run) => run.pluginId === pluginId);
}

function getStatusCount(
  items: Array<{ status: NativePluginSandboxStatus }>,
  status: NativePluginSandboxStatus,
) {
  return items.filter((item) => item.status === status).length;
}

function getCategoryStatus(
  rowByCategory: Map<NativePluginSandboxCategory, NativePluginSandboxRow>,
  category: NativePluginSandboxCategory,
) {
  return rowByCategory.get(category)?.status ?? "review";
}

function isLocalEntryPoint(entryPoint: string | undefined) {
  if (!entryPoint) {
    return false;
  }

  return !/^https?:\/\//i.test(entryPoint);
}

function isWidgetManifest(manifest: EditorPluginManifest) {
  return (
    manifest.runtimeKind === "hybrid" ||
    manifest.runtimeKind === "widget" ||
    manifest.catalog?.surface === "widget" ||
    manifest.catalog?.surface === "command-widget"
  );
}

function getLatestDate(values: string[]) {
  const latest = values
    .map((value) => ({ time: new Date(value).getTime(), value }))
    .filter((item) => Number.isFinite(item.time))
    .sort((left, right) => right.time - left.time)[0];

  return latest?.value ?? null;
}

function sortRows(
  first: NativePluginSandboxRow,
  second: NativePluginSandboxRow,
) {
  const statusRank: Record<NativePluginSandboxStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return (
    statusRank[first.status] - statusRank[second.status] ||
    first.category.localeCompare(second.category) ||
    first.pluginName.localeCompare(second.pluginName)
  );
}

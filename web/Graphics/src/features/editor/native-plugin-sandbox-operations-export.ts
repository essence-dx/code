import type {
  NativePluginSandboxOperationsReport,
  NativePluginSandboxPacket,
  NativePluginSandboxRow,
} from "@/features/editor/native-plugin-sandbox-operations-types";

export function getNativePluginSandboxOperationsCsv(
  report: NativePluginSandboxOperationsReport,
  rows: NativePluginSandboxRow[] = report.rows,
) {
  const rowHeader: Array<keyof NativePluginSandboxRow> = [
    "id",
    "status",
    "category",
    "pluginId",
    "pluginName",
    "label",
    "detail",
    "metric",
    "threshold",
    "packetIds",
    "recommendation",
  ];
  const packetHeader: Array<keyof NativePluginSandboxPacket> = [
    "id",
    "kind",
    "status",
    "label",
    "detail",
    "pluginIds",
    "evidenceCount",
  ];

  return [
    [
      "score",
      "status",
      "manifests",
      "widgets",
      "permission_prompts",
      "prompt_blockers",
      "offline_ready",
      "offline_blockers",
      "crash_ready",
      "crash_blockers",
      "replay_ready",
      "replay_blockers",
      "operator_evidence",
    ].join(","),
    [
      report.score,
      report.status,
      report.manifestCount,
      report.widgetManifestCount,
      report.permissionPromptCount,
      report.permissionPromptBlockedCount,
      report.offlinePolicyReadyCount,
      report.offlinePolicyBlockedCount,
      report.crashIsolationReadyCount,
      report.crashIsolationBlockedCount,
      report.replayEvidenceReadyCount,
      report.replayEvidenceBlockedCount,
      report.operatorEvidenceCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    rowHeader.join(","),
    ...rows.map((row) =>
      rowHeader
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
    "",
    packetHeader.join(","),
    ...report.operationPackets.map((packet) =>
      packetHeader
        .map((key) =>
          escapeCsvCell(
            Array.isArray(packet[key])
              ? packet[key].join("; ")
              : packet[key],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

export function getNativePluginSandboxOperationsMarkdown(
  report: NativePluginSandboxOperationsReport,
  rows: NativePluginSandboxRow[] = report.rows,
) {
  return [
    "# Native Plugin Sandbox Operations",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Manifests: ${report.manifestCount}`,
    `Widget-capable manifests: ${report.widgetManifestCount}`,
    `Permission prompts: ${report.permissionPromptCount}`,
    `Permission prompt blockers: ${report.permissionPromptBlockedCount}`,
    `Offline execution ready: ${report.offlinePolicyReadyCount}`,
    `Offline execution blockers: ${report.offlinePolicyBlockedCount}`,
    `Crash isolation ready: ${report.crashIsolationReadyCount}`,
    `Crash isolation blockers: ${report.crashIsolationBlockedCount}`,
    `Replay evidence ready: ${report.replayEvidenceReadyCount}`,
    `Replay evidence blockers: ${report.replayEvidenceBlockedCount}`,
    `Operator evidence: ${report.operatorEvidenceCount}`,
    "",
    "This packet covers permission prompts, offline execution policy, crash isolation, replay evidence, and operator exports for native plugin/widget sandbox operations.",
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.pluginName}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Operation Packets",
    ...report.operationPackets.flatMap((packet) => [
      `- [${packet.status}] ${packet.kind} / ${packet.label}: ${packet.detail}`,
      ...packet.steps.map((step) => `  - ${step}`),
    ]),
    "",
    "## Permission Prompts",
    ...report.permissionPrompts.map(
      (prompt) =>
        `- [${prompt.status}] ${prompt.pluginName}: ${prompt.detail} ${prompt.recommendation}`,
    ),
    "",
    "## Offline Execution",
    ...report.offlinePolicies.map(
      (policy) =>
        `- [${policy.status}] ${policy.pluginName}: ${policy.detail} ${policy.recommendation}`,
    ),
    "",
    "## Crash Isolation",
    ...report.crashIsolation.map(
      (item) =>
        `- [${item.status}] ${item.pluginName}: ${item.detail} ${item.recommendation}`,
    ),
    "",
    "## Replay Evidence",
    ...report.replayEvidence.map(
      (item) =>
        `- [${item.status}] ${item.pluginName}: ${item.detail} ${item.recommendation}`,
    ),
    "",
    "## Operator Evidence",
    ...report.operatorEvidence.map((item) => `- ${item}`),
  ].join("\n");
}

export function getNativePluginSandboxOperationsJson(
  report: NativePluginSandboxOperationsReport,
  rows: NativePluginSandboxRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.native-plugin-sandbox-operations",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        manifestCount: report.manifestCount,
        widgetManifestCount: report.widgetManifestCount,
        permissionPromptCount: report.permissionPromptCount,
        permissionPromptBlockedCount: report.permissionPromptBlockedCount,
        offlinePolicyReadyCount: report.offlinePolicyReadyCount,
        offlinePolicyBlockedCount: report.offlinePolicyBlockedCount,
        crashIsolationReadyCount: report.crashIsolationReadyCount,
        crashIsolationBlockedCount: report.crashIsolationBlockedCount,
        replayEvidenceReadyCount: report.replayEvidenceReadyCount,
        replayEvidenceBlockedCount: report.replayEvidenceBlockedCount,
        crashLikeRunCount: report.crashLikeRunCount,
        blockedRunCount: report.blockedRunCount,
        operatorEvidenceCount: report.operatorEvidenceCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
      },
      rows,
      operationPackets: report.operationPackets,
      permissionPrompts: report.permissionPrompts,
      offlinePolicies: report.offlinePolicies,
      crashIsolation: report.crashIsolation,
      replayEvidence: report.replayEvidence,
      operatorEvidence: report.operatorEvidence,
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

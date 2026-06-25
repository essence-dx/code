import {
  getPluginPermissionGrantKey,
  isPluginApprovalCurrent,
  type EditorPluginApprovalRecord,
  type EditorPluginManifest,
  type EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";

export type PluginDeveloperOpsStatus = "ready" | "review" | "blocked";

export type PluginDeveloperOpsCategory =
  | "manifest"
  | "permissions"
  | "replay"
  | "artifacts"
  | "sandbox"
  | "ready";

export type PluginDeveloperOpsRow = {
  id: string;
  status: PluginDeveloperOpsStatus;
  category: PluginDeveloperOpsCategory;
  pluginId: string;
  pluginName: string;
  label: string;
  detail: string;
  recommendation: string;
  metric: number;
};

export type PluginDeveloperOpsReport = {
  score: number;
  status: PluginDeveloperOpsStatus;
  manifestCount: number;
  invalidManifestCount: number;
  writeCommandCount: number;
  replayableApprovalCount: number;
  blockedReplayCount: number;
  runCount: number;
  resultArtifactCount: number;
  blockedRunCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: PluginDeveloperOpsRow[];
};

export function getPluginDeveloperOpsReport({
  approvals,
  grants,
  manifests,
  runHistory,
}: {
  approvals: Record<string, EditorPluginApprovalRecord>;
  grants: Record<string, boolean>;
  manifests: EditorPluginManifest[];
  runHistory: EditorPluginRunHistoryEntry[];
}): PluginDeveloperOpsReport {
  const rows = [
    ...getManifestRows(manifests),
    ...getPermissionRows(manifests, grants),
    ...getReplayRows(manifests, approvals),
    ...getArtifactRows(manifests, runHistory),
    ...getSandboxRows(runHistory),
  ].sort(sortRows);
  const finalRows = rows.length > 0 ? rows : [getReadyRow()];
  const blockedCount = finalRows.filter((row) => row.status === "blocked").length;
  const reviewCount = finalRows.filter((row) => row.status === "review").length;
  const readyCount = finalRows.filter((row) => row.status === "ready").length;
  const replayableApprovalCount = manifests.filter((manifest) =>
    isPluginApprovalCurrent(manifest, approvals[manifest.id]),
  ).length;

  return {
    score: Math.max(0, 100 - blockedCount * 22 - reviewCount * 6),
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    manifestCount: manifests.length,
    invalidManifestCount: finalRows.filter((row) => row.category === "manifest")
      .length,
    writeCommandCount: manifests.filter((manifest) =>
      manifest.permissions.includes("write-layer-state"),
    ).length,
    replayableApprovalCount,
    blockedReplayCount: manifests.length - replayableApprovalCount,
    runCount: runHistory.length,
    resultArtifactCount: runHistory.filter((entry) => entry.status === "completed")
      .length,
    blockedRunCount: runHistory.filter((entry) => entry.status !== "completed")
      .length,
    readyCount,
    reviewCount,
    blockedCount,
    rows: finalRows,
  };
}

export function getPluginDeveloperOpsCsv(report: PluginDeveloperOpsReport) {
  return [
    ["status", "category", "pluginId", "pluginName", "label", "detail", "recommendation", "metric"],
    ...report.rows.map((row) => [
      row.status,
      row.category,
      row.pluginId,
      row.pluginName,
      row.label,
      row.detail,
      row.recommendation,
      row.metric,
    ]),
  ]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getPluginDeveloperOpsMarkdown(report: PluginDeveloperOpsReport) {
  return [
    "# Plugin Developer Operations",
    "",
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Manifests: ${report.manifestCount}`,
    `Invalid manifests: ${report.invalidManifestCount}`,
    `Write-capable commands: ${report.writeCommandCount}`,
    `Replayable approvals: ${report.replayableApprovalCount}`,
    `Blocked replay: ${report.blockedReplayCount}`,
    `Runs: ${report.runCount}`,
    `Result artifacts: ${report.resultArtifactCount}`,
    `Blocked runs: ${report.blockedRunCount}`,
    "",
    "## Rows",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.pluginName} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

export function getPluginDeveloperOpsBundleJson(
  report: PluginDeveloperOpsReport,
) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: {
        status: report.status,
        score: report.score,
        manifestCount: report.manifestCount,
        invalidManifestCount: report.invalidManifestCount,
        writeCommandCount: report.writeCommandCount,
        replayableApprovalCount: report.replayableApprovalCount,
        blockedReplayCount: report.blockedReplayCount,
        runCount: report.runCount,
        resultArtifactCount: report.resultArtifactCount,
        blockedRunCount: report.blockedRunCount,
      },
      rows: report.rows,
    },
    null,
    2,
  );
}

function getManifestRows(manifests: EditorPluginManifest[]) {
  const seenIds = new Set<string>();

  return manifests.flatMap((manifest) => {
    const rows: PluginDeveloperOpsRow[] = [];

    if (seenIds.has(manifest.id)) {
      rows.push(
        createRow({
          status: "blocked",
          category: "manifest",
          manifest,
          label: "Duplicate manifest id",
          detail: `${manifest.id} is registered more than once.`,
          recommendation:
            "Keep plugin ids unique so approvals, grants, and run history resolve deterministically.",
          metric: 1,
        }),
      );
    }

    seenIds.add(manifest.id);

    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      rows.push(
        createRow({
          status: "blocked",
          category: "manifest",
          manifest,
          label: "Manifest id format",
          detail: `${manifest.id} should be lowercase kebab-case.`,
          recommendation:
            "Use stable lowercase ids for grant keys and external command routing.",
          metric: 1,
        }),
      );
    }

    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      rows.push(
        createRow({
          status: "review",
          category: "manifest",
          manifest,
          label: "Manifest version format",
          detail: `${manifest.version} is not a simple semver version.`,
          recommendation:
            "Use semver versions so pinned approval replay is easier to audit.",
          metric: 1,
        }),
      );
    }

    if (new Set(manifest.permissions).size !== manifest.permissions.length) {
      rows.push(
        createRow({
          status: "blocked",
          category: "manifest",
          manifest,
          label: "Duplicate permissions",
          detail: "The manifest includes duplicate permission entries.",
          recommendation:
            "Deduplicate permissions before storing approval records.",
          metric: manifest.permissions.length,
        }),
      );
    }

    return rows;
  });
}

function getPermissionRows(
  manifests: EditorPluginManifest[],
  grants: Record<string, boolean>,
) {
  return manifests.flatMap((manifest) => {
    const hasWrite = manifest.permissions.includes("write-layer-state");
    const hasInspection = manifest.permissions.includes("inspect-document");
    const grantedPermissions = manifest.permissions.filter(
      (permission) => grants[getPluginPermissionGrantKey(manifest.id, permission)],
    );

    if (hasWrite && !hasInspection) {
      return [
        createRow({
          status: "review",
          category: "permissions",
          manifest,
          label: "Write command without inspection",
          detail:
            "This plugin can mutate layer state but cannot inspect document context.",
          recommendation:
            "Pair write commands with explicit inspection or keep writes scoped to selected layers.",
          metric: 1,
        }),
      ];
    }

    if (grantedPermissions.length === 0) {
      return [
        createRow({
          status: "review",
          category: "permissions",
          manifest,
          label: "No active grants",
          detail: "Plugin commands are installed but cannot run yet.",
          recommendation:
            "Grant permissions or hide unavailable commands from command surfaces.",
          metric: 0,
        }),
      ];
    }

    return [];
  });
}

function getReplayRows(
  manifests: EditorPluginManifest[],
  approvals: Record<string, EditorPluginApprovalRecord>,
) {
  return manifests.flatMap((manifest) => {
    const approval = approvals[manifest.id];

    if (!approval) {
      return [
        createRow({
          status: "review",
          category: "replay",
          manifest,
          label: "Replay approval missing",
          detail: "No version-pinned approval exists for this manifest.",
          recommendation:
            "Approve the manifest before depending on replayable command permissions.",
          metric: 0,
        }),
      ];
    }

    if (!isPluginApprovalCurrent(manifest, approval)) {
      return [
        createRow({
          status: "blocked",
          category: "replay",
          manifest,
          label: "Replay blocked by version drift",
          detail: `Pinned ${approval.manifestVersion}, installed ${manifest.version}.`,
          recommendation:
            "Review and reapprove the updated manifest before command replay.",
          metric: 1,
        }),
      ];
    }

    return [];
  });
}

function getArtifactRows(
  manifests: EditorPluginManifest[],
  runHistory: EditorPluginRunHistoryEntry[],
) {
  return manifests.flatMap((manifest) => {
    const runs = runHistory.filter((entry) => entry.pluginId === manifest.id);
    const completedRuns = runs.filter((entry) => entry.status === "completed");

    if (runs.length === 0) {
      return [
        createRow({
          status: "review",
          category: "artifacts",
          manifest,
          label: "No run artifacts",
          detail: "This plugin has no recorded run history for release review.",
          recommendation:
            "Run the command at least once and export sandbox history before release.",
          metric: 0,
        }),
      ];
    }

    if (completedRuns.length === 0) {
      return [
        createRow({
          status: "blocked",
          category: "artifacts",
          manifest,
          label: "No successful result artifact",
          detail: `${runs.length} recorded runs exist, but none completed.`,
          recommendation:
            "Fix blocked plugin runs before including this command in production workflows.",
          metric: runs.length,
        }),
      ];
    }

    return [];
  });
}

function getSandboxRows(runHistory: EditorPluginRunHistoryEntry[]) {
  const blockedRuns = runHistory.filter((entry) => entry.status !== "completed");

  if (blockedRuns.length === 0) {
    return [];
  }

  return [
    {
      id: "sandbox:blocked-runs",
      status: blockedRuns.length > 3 ? "blocked" : "review",
      category: "sandbox",
      pluginId: "sandbox",
      pluginName: "Sandbox",
      label: "Blocked sandbox runs",
      detail: `${blockedRuns.length} plugin runs ended blocked or version-mismatch.`,
      recommendation:
        "Replay approvals and rerun commands before treating plugin outputs as release-ready.",
      metric: blockedRuns.length,
    } satisfies PluginDeveloperOpsRow,
  ];
}

function createRow({
  manifest,
  ...input
}: Omit<PluginDeveloperOpsRow, "id" | "pluginId" | "pluginName"> & {
  manifest: EditorPluginManifest;
}): PluginDeveloperOpsRow {
  return {
    id: `${input.category}:${manifest.id}:${input.label}`,
    pluginId: manifest.id,
    pluginName: manifest.name,
    ...input,
  };
}

function getReadyRow(): PluginDeveloperOpsRow {
  return {
    id: "plugin-developer-ops-ready",
    status: "ready",
    category: "ready",
    pluginId: "workspace",
    pluginName: "Workspace",
    label: "Plugin operations ready",
    detail:
      "Plugin manifests, command permissions, replay approvals, result artifacts, and sandbox diagnostics are ready.",
    recommendation:
      "Attach plugin developer operations evidence to release handoffs.",
    metric: 100,
  };
}

function sortRows(
  first: PluginDeveloperOpsRow,
  second: PluginDeveloperOpsRow,
) {
  const statusOrder = { blocked: 0, review: 1, ready: 2 };

  if (first.status !== second.status) {
    return statusOrder[first.status] - statusOrder[second.status];
  }

  return first.category.localeCompare(second.category);
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

import type {
  EditorPluginManifest,
  EditorPluginPermission,
} from "@/features/editor/editor-plugin-api";
import { getPluginPermissionGrantKey } from "@/features/editor/editor-plugin-api";

export type PluginGovernanceStatus = "ready" | "review" | "blocked";

export type PluginGovernanceRow = {
  id: string;
  status: PluginGovernanceStatus;
  pluginId: string;
  pluginName: string;
  permission?: EditorPluginPermission;
  label: string;
  detail: string;
};

export type PluginGovernanceReview = {
  score: number;
  manifestCount: number;
  permissionCount: number;
  grantedPermissionCount: number;
  grantedPluginCount: number;
  writeGrantCount: number;
  staleGrantCount: number;
  missingGrantCount: number;
  rows: PluginGovernanceRow[];
};

export function getPluginGovernanceReview({
  manifests,
  grants,
}: {
  manifests: EditorPluginManifest[];
  grants: Record<string, boolean>;
}): PluginGovernanceReview {
  const manifestRows = manifests.flatMap((manifest) =>
    manifest.permissions.map((permission) =>
      getPermissionRow(manifest, permission, grants),
    ),
  );
  const knownGrantKeys = new Set(
    manifests.flatMap((manifest) =>
      manifest.permissions.map((permission) =>
        getPluginPermissionGrantKey(manifest.id, permission),
      ),
    ),
  );
  const staleRows = Object.entries(grants)
    .filter(([, granted]) => granted)
    .filter(([key]) => !knownGrantKeys.has(key))
    .map(([key]) => ({
      id: `stale:${key}`,
      status: "blocked" as const,
      pluginId: getGrantPluginId(key),
      pluginName: getGrantPluginId(key),
      label: "Stale permission grant",
      detail: `${key} no longer maps to an installed plugin permission.`,
    }));
  const rows = [...staleRows, ...manifestRows].sort((left, right) => {
    if (left.status !== right.status) {
      return getStatusRank(left.status) - getStatusRank(right.status);
    }

    return `${left.pluginName}:${left.label}`.localeCompare(
      `${right.pluginName}:${right.label}`,
    );
  });
  const permissionCount = manifests.reduce(
    (total, manifest) => total + manifest.permissions.length,
    0,
  );
  const grantedPermissionCount = manifestRows.filter((row) =>
    row.label.startsWith("Granted"),
  ).length;
  const writeGrantCount = manifestRows.filter(
    (row) => row.permission === "write-layer-state" && row.label.startsWith("Granted"),
  ).length;
  const staleGrantCount = staleRows.length;
  const missingGrantCount = manifestRows.filter((row) =>
    row.label.startsWith("Permission not granted"),
  ).length;

  return {
    score: Math.max(
      0,
      100 - staleGrantCount * 18 - writeGrantCount * 8 - missingGrantCount * 2,
    ),
    manifestCount: manifests.length,
    permissionCount,
    grantedPermissionCount,
    grantedPluginCount: manifests.filter((manifest) =>
      manifest.permissions.every(
        (permission) =>
          grants[getPluginPermissionGrantKey(manifest.id, permission)],
      ),
    ).length,
    writeGrantCount,
    staleGrantCount,
    missingGrantCount,
    rows,
  };
}

export function getPluginGovernanceCleanGrants({
  manifests,
  grants,
}: {
  manifests: EditorPluginManifest[];
  grants: Record<string, boolean>;
}) {
  const knownGrantKeys = new Set(
    manifests.flatMap((manifest) =>
      manifest.permissions.map((permission) =>
        getPluginPermissionGrantKey(manifest.id, permission),
      ),
    ),
  );

  return Object.fromEntries(
    Object.entries(grants).filter(([key, granted]) => granted && knownGrantKeys.has(key)),
  );
}

export function getPluginGovernanceCsv(review: PluginGovernanceReview) {
  return [
    ["status", "pluginId", "pluginName", "permission", "label", "detail"],
    ...review.rows.map((row) => [
      row.status,
      row.pluginId,
      row.pluginName,
      row.permission ?? "",
      row.label,
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getPluginGovernanceMarkdown(review: PluginGovernanceReview) {
  const lines = [
    "# Plugin Governance Review",
    "",
    `Score: ${review.score}`,
    `Plugins: ${review.manifestCount}`,
    `Permissions: ${review.permissionCount}`,
    `Granted permissions: ${review.grantedPermissionCount}`,
    `Granted plugins: ${review.grantedPluginCount}`,
    `Write grants: ${review.writeGrantCount}`,
    `Stale grants: ${review.staleGrantCount}`,
    `Missing grants: ${review.missingGrantCount}`,
    "",
    "## Rows",
    "",
  ];

  if (review.rows.length === 0) {
    lines.push("- No plugin governance rows found.");
  }

  for (const row of review.rows) {
    lines.push(
      `- ${row.status.toUpperCase()} - ${row.pluginName}: ${row.label}. ${row.detail}`,
    );
  }

  return lines.join("\n");
}

function getPermissionRow(
  manifest: EditorPluginManifest,
  permission: EditorPluginPermission,
  grants: Record<string, boolean>,
): PluginGovernanceRow {
  const granted = Boolean(
    grants[getPluginPermissionGrantKey(manifest.id, permission)],
  );
  const isWrite = permission === "write-layer-state";

  if (!granted) {
    return {
      id: `${manifest.id}:${permission}:missing`,
      status: "review",
      pluginId: manifest.id,
      pluginName: manifest.name,
      permission,
      label: "Permission not granted",
      detail: `${manifest.name} cannot use ${permission} until permission is granted.`,
    };
  }

  return {
    id: `${manifest.id}:${permission}:granted`,
    status: isWrite ? "review" : "ready",
    pluginId: manifest.id,
    pluginName: manifest.name,
    permission,
    label: isWrite ? "Granted write permission" : "Granted permission",
    detail: isWrite
      ? `${manifest.name} can modify selected layer state; review this grant periodically.`
      : `${manifest.name} can use ${permission}.`,
  };
}

function getGrantPluginId(key: string) {
  return key.split(":")[0] ?? key;
}

function getStatusRank(status: PluginGovernanceStatus) {
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

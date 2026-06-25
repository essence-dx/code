export type EditorPluginPermission =
  | "inspect-document"
  | "select-layers"
  | "write-layer-state";

export type EditorPluginRuntimeKind = "hybrid" | "plugin" | "widget";

export type EditorPluginNetworkAccess = "limited" | "none" | "workspace";

export type EditorPluginCatalogSurface = "command" | "command-widget" | "widget";

export type EditorPluginSandboxPolicy = {
  isolated: boolean;
  networkAccess: EditorPluginNetworkAccess;
  timeoutMs: number;
  memoryLimitMb: number;
};

export type EditorPluginCatalogMetadata = {
  category: string;
  surface: EditorPluginCatalogSurface;
  publishable: boolean;
  commandIds: string[];
  widgetEntry?: string;
  reviewNotes?: string[];
};

export type EditorPluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  permissions: EditorPluginPermission[];
  runtimeKind?: EditorPluginRuntimeKind;
  entryPoint?: string;
  sandbox?: EditorPluginSandboxPolicy;
  catalog?: EditorPluginCatalogMetadata;
};

export type EditorPluginApprovalRecord = {
  id: string;
  pluginId: string;
  pluginName: string;
  manifestVersion: string;
  permissions: EditorPluginPermission[];
  grantKeys: string[];
  approvedAt: string;
  approvedBy: string;
};

export type EditorPluginRunHistoryEntry = {
  id: string;
  pluginId: string;
  pluginName: string;
  manifestVersion: string;
  pinnedManifestVersion: string | null;
  action: "approve" | "replay" | "run";
  status: "completed" | "blocked" | "version-mismatch";
  detail: string;
  actorEmail: string;
  createdAt: string;
};

export const pluginPermissionLabels: Record<EditorPluginPermission, string> = {
  "inspect-document": "Inspect document",
  "select-layers": "Select layers",
  "write-layer-state": "Write layer state",
};

export const builtInPluginManifests: EditorPluginManifest[] = [
  {
    id: "accessibility-auditor",
    name: "Accessibility auditor",
    version: "1.0.0",
    description: "Reviews visible page layers and selects layers with issues.",
    permissions: ["inspect-document", "select-layers"],
    runtimeKind: "hybrid",
    entryPoint: "plugins/accessibility-auditor/command.ts",
    sandbox: {
      isolated: true,
      networkAccess: "none",
      timeoutMs: 1500,
      memoryLimitMb: 64,
    },
    catalog: {
      category: "Review",
      surface: "command-widget",
      publishable: true,
      commandIds: ["review.accessibility-audit"],
      widgetEntry: "widgets/accessibility-review-card.tsx",
      reviewNotes: [
        "Read-only inspection and layer selection are safe for review handoff.",
      ],
    },
  },
  {
    id: "ready-for-dev-marker",
    name: "Ready marker",
    version: "1.0.0",
    description: "Marks selected layers as ready for Dev Mode handoff.",
    permissions: ["write-layer-state"],
    runtimeKind: "plugin",
    entryPoint: "plugins/ready-for-dev-marker/command.ts",
    sandbox: {
      isolated: true,
      networkAccess: "none",
      timeoutMs: 1200,
      memoryLimitMb: 48,
    },
    catalog: {
      category: "Dev Mode",
      surface: "command",
      publishable: true,
      commandIds: ["dev-mode.ready-marker"],
      reviewNotes: ["Write access is scoped to selected layer state."],
    },
  },
];

export function getPluginPermissionGrantKey(
  pluginId: string,
  permission: EditorPluginPermission,
) {
  return `${pluginId}:${permission}`;
}

export function createPluginApprovalRecord({
  actorEmail,
  approvedAt = new Date().toISOString(),
  id = createPluginRecordId("approval"),
  manifest,
}: {
  actorEmail: string;
  approvedAt?: string;
  id?: string;
  manifest: EditorPluginManifest;
}): EditorPluginApprovalRecord {
  return {
    id,
    pluginId: manifest.id,
    pluginName: manifest.name,
    manifestVersion: manifest.version,
    permissions: [...manifest.permissions],
    grantKeys: manifest.permissions.map((permission) =>
      getPluginPermissionGrantKey(manifest.id, permission),
    ),
    approvedAt,
    approvedBy: actorEmail,
  };
}

export function createPluginRunHistoryEntry({
  action,
  actorEmail,
  createdAt = new Date().toISOString(),
  detail,
  id = createPluginRecordId(action),
  manifest,
  pinnedManifestVersion,
  status,
}: {
  action: EditorPluginRunHistoryEntry["action"];
  actorEmail: string;
  createdAt?: string;
  detail: string;
  id?: string;
  manifest: EditorPluginManifest;
  pinnedManifestVersion: string | null;
  status: EditorPluginRunHistoryEntry["status"];
}): EditorPluginRunHistoryEntry {
  return {
    id,
    pluginId: manifest.id,
    pluginName: manifest.name,
    manifestVersion: manifest.version,
    pinnedManifestVersion,
    action,
    status,
    detail,
    actorEmail,
    createdAt,
  };
}

export function getPluginGrantsForApproval(
  approval: EditorPluginApprovalRecord,
) {
  return Object.fromEntries(approval.grantKeys.map((key) => [key, true]));
}

export function isPluginApprovalCurrent(
  manifest: EditorPluginManifest,
  approval: EditorPluginApprovalRecord | undefined,
) {
  if (!approval) {
    return false;
  }

  const expectedGrantKeys = manifest.permissions.map((permission) =>
    getPluginPermissionGrantKey(manifest.id, permission),
  );

  return (
    approval.pluginId === manifest.id &&
    approval.manifestVersion === manifest.version &&
    approval.permissions.length === manifest.permissions.length &&
    expectedGrantKeys.every((key) => approval.grantKeys.includes(key))
  );
}

function createPluginRecordId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export type FirstPartyExtensionRuntimeStatus = "ready" | "review" | "blocked";

export const firstPartyExtensionPermissionScopes = [
  "project:read",
  "project:write",
  "asset:read",
  "asset:write",
  "template:read",
  "template:write",
  "export:run",
  "publish:write",
  "audit:write",
  "team:read",
] as const;

export type FirstPartyExtensionPermissionScope =
  (typeof firstPartyExtensionPermissionScopes)[number];

export type FirstPartyExtensionCommandCategory =
  | "assets"
  | "automation"
  | "export"
  | "governance"
  | "publishing"
  | "templates";

export type FirstPartyExtensionCommandRunMode =
  | "read-only"
  | "dry-run"
  | "mutating";

export type FirstPartyExtensionSurface =
  | "editor"
  | "studio-dashboard"
  | "templates-dashboard"
  | "team-dashboard";

export type FirstPartyExtensionCommandManifest = {
  id: string;
  title: string;
  category: FirstPartyExtensionCommandCategory;
  runMode: FirstPartyExtensionCommandRunMode;
  requiredPermissions: string[];
  surface: FirstPartyExtensionSurface;
};

export type FirstPartyExtensionManifest = {
  id: string;
  name: string;
  version: string;
  publisher: string;
  description: string;
  entrypoint: string;
  permissions: string[];
  commands: FirstPartyExtensionCommandManifest[];
  integrity: string;
};

export type FirstPartyExtensionInstallState =
  | "available"
  | "installed"
  | "removed";

export type FirstPartyExtensionValidationIssue = {
  id: string;
  field: string;
  severity: "warning" | "error";
  message: string;
};

export type FirstPartyExtensionPermissionGrant = {
  id: string;
  extensionId: string;
  extensionName: string;
  scope: string;
  status: FirstPartyExtensionRuntimeStatus;
  detail: string;
};

export type FirstPartyExtensionManifestReport = {
  id: string;
  manifest: FirstPartyExtensionManifest;
  status: FirstPartyExtensionRuntimeStatus;
  score: number;
  installState: FirstPartyExtensionInstallState;
  issues: FirstPartyExtensionValidationIssue[];
  permissionGrants: FirstPartyExtensionPermissionGrant[];
  commandCount: number;
  permissionCount: number;
  nextAction: string;
};

export type FirstPartyExtensionRegisteredCommand = {
  id: string;
  extensionId: string;
  extensionName: string;
  title: string;
  category: FirstPartyExtensionCommandCategory;
  runMode: FirstPartyExtensionCommandRunMode;
  surface: FirstPartyExtensionSurface;
  requiredPermissions: string[];
  scopedPermissionSummary: string;
  auditAction: string;
};

export type FirstPartyExtensionAuditTrail = {
  id: string;
  extensionId: string;
  extensionName: string;
  action: "extension.installed" | "extension.removed";
  actorEmail: string | null;
  summary: string;
  createdAt: string;
};

export type FirstPartyExtensionRuntimePacket = {
  id: string;
  status: FirstPartyExtensionRuntimeStatus;
  generatedAt: string;
  fileName: string;
  dataUrl: string;
};

export type FirstPartyExtensionRuntimeCenter = {
  generatedAt: string;
  status: FirstPartyExtensionRuntimeStatus;
  score: number;
  manifests: FirstPartyExtensionManifestReport[];
  commandRegistry: FirstPartyExtensionRegisteredCommand[];
  permissionMatrix: FirstPartyExtensionPermissionGrant[];
  auditTrails: FirstPartyExtensionAuditTrail[];
  runtimePacket: FirstPartyExtensionRuntimePacket;
  nextActions: string[];
  totals: {
    manifests: number;
    installedExtensions: number;
    blockedManifests: number;
    registeredCommands: number;
    permissionGrants: number;
    auditTrailEvents: number;
    runtimePackets: number;
  };
};

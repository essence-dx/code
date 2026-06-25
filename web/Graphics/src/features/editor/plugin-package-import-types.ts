import {
  pluginPermissionLabels,
  type EditorPluginManifest,
  type EditorPluginPermission,
} from "@/features/editor/editor-plugin-api";

export type PluginPackageImportStatus = "ready" | "review" | "blocked";
export type PluginPackageImportCategory =
  | "catalog"
  | "command"
  | "dependency"
  | "permission"
  | "schema"
  | "widget"
  | "ready";

export type LocalPluginPackageKind = "plugin" | "widget";

export type LocalPluginPackageCommand = {
  id: string;
  title: string;
  entry: string;
  permission?: EditorPluginPermission;
  destructive?: boolean;
};

export type LocalPluginPackageDependency = {
  name: string;
  version?: string;
  source: "local" | "npm" | "url";
  optional?: boolean;
};

export type LocalPluginPackageWidget = {
  id: string;
  title: string;
  entry: string;
  surfaces: string[];
};

export type LocalPluginPackageManifest = {
  schemaVersion: 1;
  type: "essence.editor-extension-package";
  package: {
    id: string;
    name: string;
    version: string;
    description: string;
    kind: LocalPluginPackageKind;
    author?: string;
  };
  permissions: EditorPluginPermission[];
  commands: LocalPluginPackageCommand[];
  dependencies: LocalPluginPackageDependency[];
  widgets: LocalPluginPackageWidget[];
};

export type PluginPackageImportRow = {
  id: string;
  status: PluginPackageImportStatus;
  category: PluginPackageImportCategory;
  label: string;
  detail: string;
  recommendation: string;
  metric: number;
};

export type PluginPackageImportReport = {
  status: PluginPackageImportStatus;
  score: number;
  filename: string | null;
  importedAt: string | null;
  manifest: LocalPluginPackageManifest | null;
  installedManifestCount: number;
  commandCount: number;
  widgetCount: number;
  dependencyCount: number;
  declaredPermissionCount: number;
  unusedPermissionCount: number;
  missingPermissionCount: number;
  permissionDiffCount: number;
  catalogConflictCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: PluginPackageImportRow[];
  installedCatalog: EditorPluginManifest[];
};

export const pluginPackageType = "essence.editor-extension-package";
export const knownPluginPermissions = Object.keys(
  pluginPermissionLabels,
) as EditorPluginPermission[];

export function createPackageImportRow(
  input: PluginPackageImportRow,
): PluginPackageImportRow {
  return input;
}

export function createPackageImportSchemaRow(
  label: string,
  detail: string,
): PluginPackageImportRow {
  return createPackageImportRow({
    id: `plugin-package-import-schema:${label.toLowerCase().replaceAll(/\s+/g, "-")}`,
    status: "blocked",
    category: "schema",
    label,
    detail,
    recommendation:
      "Use the documented local plugin package shape before catalog import.",
    metric: 1,
  });
}

export function isEditorPluginPermission(
  value: unknown,
): value is EditorPluginPermission {
  return knownPluginPermissions.includes(value as EditorPluginPermission);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function escapePluginPackageCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

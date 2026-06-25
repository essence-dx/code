import type { EditorPluginManifest } from "@/features/editor/editor-plugin-api";
import { parsePluginPackageText } from "@/features/editor/plugin-package-import-parser";
import {
  getPluginPackageManifestRows,
  getPluginPackagePermissionDiffCount,
  toPluginPackageCatalogCandidate,
} from "@/features/editor/plugin-package-import-review";
import {
  createPackageImportRow,
  escapePluginPackageCsvCell,
  type LocalPluginPackageManifest,
  type PluginPackageImportReport,
  type PluginPackageImportRow,
  type PluginPackageImportStatus,
} from "@/features/editor/plugin-package-import-types";

export type {
  LocalPluginPackageCommand,
  LocalPluginPackageDependency,
  LocalPluginPackageKind,
  LocalPluginPackageManifest,
  LocalPluginPackageWidget,
  PluginPackageImportCategory,
  PluginPackageImportReport,
  PluginPackageImportRow,
  PluginPackageImportStatus,
} from "@/features/editor/plugin-package-import-types";

export function getPluginPackageImportReport({
  filename,
  importedAt,
  installedManifests,
  text,
}: {
  filename?: string;
  importedAt?: string;
  installedManifests: EditorPluginManifest[];
  text?: string;
}): PluginPackageImportReport {
  if (!text) {
    return createReport({
      filename: null,
      importedAt: null,
      installedManifests,
      manifest: null,
      rows: [
        createPackageImportRow({
          id: "plugin-package-import-ready",
          status: "ready",
          category: "ready",
          label: "Package importer ready",
          detail:
            "Local plugin and widget packages can be validated before catalog inclusion.",
          recommendation:
            "Import a JSON package to review schema, dependencies, permission diffs, and catalog output.",
          metric: installedManifests.length,
        }),
      ],
    });
  }

  const parsed = parsePluginPackageText(text);
  const manifestRows = parsed.manifest
    ? getPluginPackageManifestRows(parsed.manifest, installedManifests)
    : [];

  return createReport({
    filename: filename ?? "local-plugin-package.json",
    importedAt: importedAt ?? new Date().toISOString(),
    installedManifests,
    manifest: parsed.manifest,
    rows: [...parsed.rows, ...manifestRows],
  });
}

export function getPluginPackageImportCsv(
  report: PluginPackageImportReport,
) {
  return [
    ["status", "category", "label", "detail", "recommendation", "metric"],
    ...report.rows.map((item) => [
      item.status,
      item.category,
      item.label,
      item.detail,
      item.recommendation,
      item.metric,
    ]),
  ]
    .map((line) => line.map(escapePluginPackageCsvCell).join(","))
    .join("\n");
}

export function getPluginPackageImportMarkdown(
  report: PluginPackageImportReport,
) {
  return [
    "# Plugin Package Import",
    "",
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `File: ${report.filename ?? "none"}`,
    `Installed catalog entries: ${report.installedManifestCount}`,
    `Commands: ${report.commandCount}`,
    `Widgets: ${report.widgetCount}`,
    `Dependencies: ${report.dependencyCount}`,
    `Permissions: ${report.declaredPermissionCount}`,
    `Permission diffs: ${report.permissionDiffCount}`,
    "",
    "## Package",
    report.manifest
      ? `- ${report.manifest.package.name} ${report.manifest.package.version} (${report.manifest.package.kind})`
      : "- No package imported.",
    "",
    "## Review Rows",
    ...report.rows.map(
      (item) =>
        `- [${item.status}] ${item.category} / ${item.label}: ${item.detail} Recommendation: ${item.recommendation}`,
    ),
  ].join("\n");
}

export function getPluginPackageImportBundleJson(
  report: PluginPackageImportReport,
) {
  return JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      summary: {
        status: report.status,
        score: report.score,
        filename: report.filename,
        importedAt: report.importedAt,
        installedManifestCount: report.installedManifestCount,
        commandCount: report.commandCount,
        widgetCount: report.widgetCount,
        dependencyCount: report.dependencyCount,
        declaredPermissionCount: report.declaredPermissionCount,
        unusedPermissionCount: report.unusedPermissionCount,
        missingPermissionCount: report.missingPermissionCount,
        permissionDiffCount: report.permissionDiffCount,
        catalogConflictCount: report.catalogConflictCount,
      },
      importedPackage: report.manifest,
      catalogCandidate: report.manifest
        ? toPluginPackageCatalogCandidate(report.manifest)
        : null,
      installedCatalog: report.installedCatalog,
      rows: report.rows,
    },
    null,
    2,
  );
}

function createReport({
  filename,
  importedAt,
  installedManifests,
  manifest,
  rows,
}: {
  filename: string | null;
  importedAt: string | null;
  installedManifests: EditorPluginManifest[];
  manifest: LocalPluginPackageManifest | null;
  rows: PluginPackageImportRow[];
}): PluginPackageImportReport {
  const finalRows =
    rows.length > 0
      ? rows
      : [
          createPackageImportRow({
            id: "plugin-package-import-package-ready",
            status: "ready",
            category: "ready",
            label: "Package import ready",
            detail:
              "The imported package can be added to the local catalog candidate bundle.",
            recommendation:
              "Export the JSON catalog bundle before approving this package.",
            metric: 100,
          }),
        ];
  const blockedCount = countStatus(finalRows, "blocked");
  const reviewCount = countStatus(finalRows, "review");
  const readyCount = countStatus(finalRows, "ready");
  const commandPermissions = new Set(
    manifest?.commands.flatMap((command) =>
      command.permission ? [command.permission] : [],
    ) ?? [],
  );
  const unusedPermissionCount =
    manifest?.permissions.filter((permission) => !commandPermissions.has(permission))
      .length ?? 0;
  const missingPermissionCount =
    manifest?.commands.filter(
      (command) =>
        command.permission && !manifest.permissions.includes(command.permission),
    ).length ?? 0;

  return {
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(
      0,
      100 - blockedCount * 24 - reviewCount * 7 - missingPermissionCount * 8,
    ),
    filename,
    importedAt,
    manifest,
    installedManifestCount: installedManifests.length,
    commandCount: manifest?.commands.length ?? 0,
    widgetCount: manifest?.widgets.length ?? 0,
    dependencyCount: manifest?.dependencies.length ?? 0,
    declaredPermissionCount: manifest?.permissions.length ?? 0,
    unusedPermissionCount,
    missingPermissionCount,
    permissionDiffCount:
      manifest === null
        ? 0
        : getPluginPackagePermissionDiffCount(manifest, installedManifests),
    catalogConflictCount: finalRows.filter(
      (item) => item.category === "catalog" && item.status !== "ready",
    ).length,
    blockedCount,
    reviewCount,
    readyCount,
    rows: finalRows.sort(sortRows),
    installedCatalog: installedManifests,
  };
}

function countStatus(
  rows: PluginPackageImportRow[],
  status: PluginPackageImportStatus,
) {
  return rows.filter((item) => item.status === status).length;
}

function sortRows(
  first: PluginPackageImportRow,
  second: PluginPackageImportRow,
) {
  const statusOrder = { blocked: 0, review: 1, ready: 2 };

  if (first.status !== second.status) {
    return statusOrder[first.status] - statusOrder[second.status];
  }

  return `${first.category}:${first.label}`.localeCompare(
    `${second.category}:${second.label}`,
  );
}

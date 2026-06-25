import {
  pluginPermissionLabels,
  type EditorPluginManifest,
  type EditorPluginPermission,
} from "@/features/editor/editor-plugin-api";
import {
  createPackageImportRow,
  type LocalPluginPackageManifest,
  type PluginPackageImportRow,
} from "@/features/editor/plugin-package-import-types";

export function getPluginPackageManifestRows(
  manifest: LocalPluginPackageManifest,
  installedManifests: EditorPluginManifest[],
) {
  return [
    ...getSchemaRows(manifest),
    ...getCommandRows(manifest),
    ...getWidgetRows(manifest),
    ...getDependencyRows(manifest),
    ...getPermissionRows(manifest, installedManifests),
    ...getCatalogRows(manifest, installedManifests),
  ];
}

export function toPluginPackageCatalogCandidate(
  manifest: LocalPluginPackageManifest,
): EditorPluginManifest {
  return {
    id: manifest.package.id,
    name: manifest.package.name,
    version: manifest.package.version,
    description: manifest.package.description,
    permissions: manifest.permissions,
  };
}

export function getPluginPackagePermissionDiffCount(
  manifest: LocalPluginPackageManifest,
  installedManifests: EditorPluginManifest[],
) {
  const installed = getInstalledManifest(manifest, installedManifests);

  if (!installed) {
    return 0;
  }

  return (
    manifest.permissions.filter(
      (permission) => !installed.permissions.includes(permission),
    ).length +
    installed.permissions.filter(
      (permission) => !manifest.permissions.includes(permission),
    ).length
  );
}

function getSchemaRows(manifest: LocalPluginPackageManifest) {
  const rows: PluginPackageImportRow[] = [];

  if (!/^[a-z0-9-]+$/.test(manifest.package.id)) {
    rows.push(
      createPackageImportRow({
        id: "plugin-package-import-id-format",
        status: "blocked",
        category: "schema",
        label: "Package id format",
        detail: `${manifest.package.id} should be lowercase kebab-case.`,
        recommendation:
          "Use a stable lowercase id so catalog keys, approvals, and permissions resolve safely.",
        metric: 1,
      }),
    );
  }

  if (!/^\d+\.\d+\.\d+$/.test(manifest.package.version)) {
    rows.push(
      createPackageImportRow({
        id: "plugin-package-import-version-format",
        status: "review",
        category: "schema",
        label: "Package version format",
        detail: `${manifest.package.version} is not a simple semver version.`,
        recommendation:
          "Use semver so permission diffs and catalog updates are easier to audit.",
        metric: 1,
      }),
    );
  }

  if (manifest.commands.length === 0 && manifest.widgets.length === 0) {
    rows.push(
      createPackageImportRow({
        id: "plugin-package-import-empty-capabilities",
        status: "blocked",
        category: "schema",
        label: "No commands or widgets",
        detail:
          "The package does not expose a command or widget entry for the editor.",
        recommendation:
          "Add at least one command or widget before adding the package to the catalog.",
        metric: 0,
      }),
    );
  }

  return rows;
}

function getCommandRows(manifest: LocalPluginPackageManifest) {
  const seenIds = new Set<string>();

  return manifest.commands.flatMap((command) => {
    const rows: PluginPackageImportRow[] = [];

    if (seenIds.has(command.id)) {
      rows.push(commandRow(command.id, "Duplicate command id", "is declared more than once."));
    }

    seenIds.add(command.id);

    if (!/^[a-z0-9-]+$/.test(command.id)) {
      rows.push(commandRow(command.id, "Command id format", "should be lowercase kebab-case."));
    }

    if (!command.title) {
      rows.push(commandRow(command.id, "Command title missing", "does not have a title."));
    }

    if (!command.entry) {
      rows.push(commandRow(command.id, "Command entry missing", "does not declare an entry file."));
    }

    if (
      command.destructive &&
      !manifest.permissions.includes("write-layer-state")
    ) {
      rows.push(
        createPackageImportRow({
          id: `plugin-package-command-destructive:${command.id}`,
          status: "blocked",
          category: "command",
          label: "Destructive command without write permission",
          detail: `${command.id} is marked destructive but write-layer-state is not declared.`,
          recommendation:
            "Declare write-layer-state and require approval before destructive commands run.",
          metric: 1,
        }),
      );
    }

    return rows;
  });
}

function getWidgetRows(manifest: LocalPluginPackageManifest) {
  return manifest.widgets.flatMap((widget) => {
    const rows: PluginPackageImportRow[] = [];

    if (!/^[a-z0-9-]+$/.test(widget.id)) {
      rows.push(
        createPackageImportRow({
          id: `plugin-package-widget-format:${widget.id}`,
          status: "blocked",
          category: "widget",
          label: "Widget id format",
          detail: `${widget.id} should be lowercase kebab-case.`,
          recommendation:
            "Use stable widget ids for catalog updates and saved layout state.",
          metric: 1,
        }),
      );
    }

    if (!widget.entry) {
      rows.push(
        createPackageImportRow({
          id: `plugin-package-widget-entry:${widget.id}`,
          status: "blocked",
          category: "widget",
          label: "Widget entry missing",
          detail: `${widget.id} does not declare an entry file.`,
          recommendation: "Declare a local widget entry before catalog import.",
          metric: 1,
        }),
      );
    }

    if (widget.surfaces.length === 0) {
      rows.push(
        createPackageImportRow({
          id: `plugin-package-widget-surfaces:${widget.id}`,
          status: "review",
          category: "widget",
          label: "Widget surfaces missing",
          detail: `${widget.id} does not declare where it can appear.`,
          recommendation:
            "Declare surfaces such as inspector, sidebar, canvas, or dev-mode.",
          metric: 0,
        }),
      );
    }

    return rows;
  });
}

function getDependencyRows(manifest: LocalPluginPackageManifest) {
  const rows = manifest.dependencies.flatMap((dependency) => {
    const output: PluginPackageImportRow[] = [];

    if (!dependency.version) {
      output.push(
        createPackageImportRow({
          id: `plugin-package-dependency-unpinned:${dependency.name}`,
          status: "review",
          category: "dependency",
          label: "Unpinned dependency",
          detail: `${dependency.name} does not declare a version.`,
          recommendation:
            "Pin dependency versions before adding this package to a shared catalog.",
          metric: 1,
        }),
      );
    }

    if (dependency.source === "url") {
      output.push(
        createPackageImportRow({
          id: `plugin-package-dependency-url:${dependency.name}`,
          status: "review",
          category: "dependency",
          label: "URL dependency",
          detail: `${dependency.name} is sourced from a URL.`,
          recommendation:
            "Prefer local or registry-pinned dependencies for reproducible package review.",
          metric: 1,
        }),
      );
    }

    return output;
  });

  if (manifest.dependencies.length > 12) {
    rows.push(
      createPackageImportRow({
        id: "plugin-package-dependencies-heavy",
        status: "review",
        category: "dependency",
        label: "Large dependency set",
        detail: `${manifest.dependencies.length} dependencies are declared.`,
        recommendation:
          "Keep local plugins small enough for predictable editor startup and sandbox review.",
        metric: manifest.dependencies.length,
      }),
    );
  }

  return rows;
}

function getPermissionRows(
  manifest: LocalPluginPackageManifest,
  installedManifests: EditorPluginManifest[],
) {
  const rows: PluginPackageImportRow[] = [];
  const commandPermissions = new Set(
    manifest.commands.flatMap((command) =>
      command.permission ? [command.permission] : [],
    ),
  );

  for (const command of manifest.commands) {
    if (command.permission && !manifest.permissions.includes(command.permission)) {
      rows.push(
        createPackageImportRow({
          id: `plugin-package-command-permission-missing:${command.id}`,
          status: "blocked",
          category: "permission",
          label: "Command permission not declared",
          detail: `${command.id} requires ${pluginPermissionLabels[command.permission]}, but the package permissions do not include it.`,
          recommendation:
            "Add the command permission to the manifest before catalog import.",
          metric: 1,
        }),
      );
    }
  }

  for (const permission of manifest.permissions) {
    if (!commandPermissions.has(permission) && manifest.commands.length > 0) {
      rows.push(
        createPackageImportRow({
          id: `plugin-package-permission-unused:${permission}`,
          status: "review",
          category: "permission",
          label: "Unused declared permission",
          detail: `${pluginPermissionLabels[permission]} is declared but no command references it.`,
          recommendation:
            "Remove unused permissions or attach them to specific command definitions.",
          metric: 1,
        }),
      );
    }
  }

  const installed = getInstalledManifest(manifest, installedManifests);

  if (installed) {
    const added = manifest.permissions.filter(
      (permission) => !installed.permissions.includes(permission),
    );
    const removed = installed.permissions.filter(
      (permission) => !manifest.permissions.includes(permission),
    );

    if (added.length > 0 || removed.length > 0) {
      rows.push(
        createPackageImportRow({
          id: "plugin-package-permission-diff",
          status: "review",
          category: "permission",
          label: "Catalog permission diff",
          detail: `Added ${formatPermissionList(added) || "none"}; removed ${formatPermissionList(removed) || "none"}.`,
          recommendation:
            "Require a fresh approval when catalog updates change requested permissions.",
          metric: added.length + removed.length,
        }),
      );
    }
  }

  return rows;
}

function getCatalogRows(
  manifest: LocalPluginPackageManifest,
  installedManifests: EditorPluginManifest[],
) {
  const installed = getInstalledManifest(manifest, installedManifests);

  if (!installed) {
    return [
      createPackageImportRow({
        id: "plugin-package-catalog-new-entry",
        status: "ready",
        category: "catalog",
        label: "New catalog candidate",
        detail: `${manifest.package.name} can be exported as a new local catalog entry.`,
        recommendation:
          "Export the JSON bundle and review it before installing this package.",
        metric: 1,
      }),
    ];
  }

  return [
    createPackageImportRow({
      id:
        installed.version === manifest.package.version
          ? "plugin-package-catalog-existing-version"
          : "plugin-package-catalog-update",
      status: "review",
      category: "catalog",
      label:
        installed.version === manifest.package.version
          ? "Existing catalog version"
          : "Catalog update candidate",
      detail:
        installed.version === manifest.package.version
          ? `${manifest.package.id} already exists at version ${installed.version}.`
          : `${manifest.package.id} would update ${installed.version} to ${manifest.package.version}.`,
      recommendation:
        "Review permission diffs and dependency changes before approving the catalog entry.",
      metric: 1,
    }),
  ];
}

function getInstalledManifest(
  manifest: LocalPluginPackageManifest,
  installedManifests: EditorPluginManifest[],
) {
  return installedManifests.find(
    (installed) => installed.id === manifest.package.id,
  );
}

function commandRow(commandId: string, label: string, detail: string) {
  return createPackageImportRow({
    id: `plugin-package-command:${commandId}:${label}`,
    status: "blocked",
    category: "command",
    label,
    detail: `${commandId || "Unknown command"} ${detail}`,
    recommendation:
      "Fix command definitions before adding the package to the local catalog.",
    metric: 1,
  });
}

function formatPermissionList(permissions: EditorPluginPermission[]) {
  return permissions
    .map((permission) => pluginPermissionLabels[permission])
    .join(", ");
}

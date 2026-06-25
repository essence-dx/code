import {
  createPackageImportRow,
  createPackageImportSchemaRow,
  getString,
  isEditorPluginPermission,
  isRecord,
  pluginPackageType,
  type LocalPluginPackageCommand,
  type LocalPluginPackageDependency,
  type LocalPluginPackageManifest,
  type LocalPluginPackageWidget,
  type PluginPackageImportRow,
} from "@/features/editor/plugin-package-import-types";

export type ParsedPluginPackageImport = {
  manifest: LocalPluginPackageManifest | null;
  rows: PluginPackageImportRow[];
};

export function parsePluginPackageText(
  text: string,
): ParsedPluginPackageImport {
  try {
    return normalizePackageRoot(JSON.parse(text));
  } catch (error) {
    return {
      manifest: null,
      rows: [
        createPackageImportSchemaRow(
          "Invalid JSON",
          error instanceof Error
            ? error.message
            : "The selected package could not be parsed.",
        ),
      ],
    };
  }
}

function normalizePackageRoot(raw: unknown): ParsedPluginPackageImport {
  if (!isRecord(raw)) {
    return {
      manifest: null,
      rows: [createPackageImportSchemaRow("Package root", "JSON root must be an object.")],
    };
  }

  if (raw.type === pluginPackageType && isRecord(raw.package)) {
    return normalizeEssencePackage(raw);
  }

  const embedded = isRecord(raw.essencePlugin)
    ? { value: raw.essencePlugin, kind: "plugin" as const }
    : isRecord(raw.essenceWidget)
      ? { value: raw.essenceWidget, kind: "widget" as const }
      : null;

  if (embedded) {
    return normalizeEssencePackage({
      type: pluginPackageType,
      schemaVersion: 1,
      package: {
        id: embedded.value.id ?? raw.name,
        name: embedded.value.name ?? raw.name,
        version: embedded.value.version ?? raw.version,
        description: embedded.value.description ?? raw.description,
        kind: embedded.kind,
        author: raw.author,
      },
      permissions: embedded.value.permissions,
      commands: embedded.value.commands,
      dependencies: normalizeDependencyMap(raw.dependencies),
      widgets: embedded.value.widgets,
    });
  }

  if (
    typeof raw.id === "string" &&
    typeof raw.name === "string" &&
    typeof raw.version === "string"
  ) {
    return normalizeEssencePackage({
      type: pluginPackageType,
      schemaVersion: 1,
      package: {
        id: raw.id,
        name: raw.name,
        version: raw.version,
        description:
          typeof raw.description === "string" ? raw.description : raw.name,
        kind: "plugin",
      },
      permissions: raw.permissions,
      commands: raw.commands,
      dependencies: raw.dependencies,
      widgets: raw.widgets,
    });
  }

  return {
    manifest: null,
    rows: [
      createPackageImportSchemaRow(
        "Unsupported package shape",
        "Expected an Essence package, package.json essencePlugin/essenceWidget block, or legacy plugin manifest.",
      ),
    ],
  };
}

function normalizeEssencePackage(
  raw: Record<string, unknown>,
): ParsedPluginPackageImport {
  const rows: PluginPackageImportRow[] = [];
  const info = isRecord(raw.package) ? raw.package : {};
  const id = getString(info.id);
  const name = getString(info.name);
  const version = getString(info.version);
  const description = getString(info.description);

  if (!id || !name || !version || !description) {
    rows.push(
      createPackageImportSchemaRow(
        "Required package metadata",
        "Package id, name, version, and description are required.",
      ),
    );
    return { manifest: null, rows };
  }

  if (raw.schemaVersion !== 1) {
    rows.push(
      createPackageImportRow({
        id: "plugin-package-import-schema-version",
        status: "review",
        category: "schema",
        label: "Schema version",
        detail: `Expected schemaVersion 1, received ${String(raw.schemaVersion ?? "none")}.`,
        recommendation:
          "Pin package schemaVersion to 1 so validation remains deterministic.",
        metric: 1,
      }),
    );
  }

  return {
    manifest: {
      schemaVersion: 1,
      type: pluginPackageType,
      package: {
        id,
        name,
        version,
        description,
        kind: info.kind === "widget" ? "widget" : "plugin",
        author: getString(info.author) || undefined,
      },
      permissions: normalizePermissions(raw.permissions, rows),
      commands: normalizeCommands(raw.commands, rows),
      dependencies: normalizeDependencies(raw.dependencies, rows),
      widgets: normalizeWidgets(raw.widgets, rows),
    },
    rows,
  };
}

function normalizePermissions(
  value: unknown,
  rows: PluginPackageImportRow[],
) {
  if (!Array.isArray(value)) {
    rows.push(
      createPackageImportSchemaRow(
        "Permissions",
        "Permissions must be an array of known editor permissions.",
      ),
    );
    return [];
  }

  const permissions = value.flatMap((item) => {
    if (isEditorPluginPermission(item)) {
      return [item];
    }

    rows.push(
      createPackageImportRow({
        id: `plugin-package-unknown-permission:${String(item)}`,
        status: "blocked",
        category: "permission",
        label: "Unknown permission",
        detail: `${String(item)} is not a supported editor permission.`,
        recommendation:
          "Use only known editor permissions until the host adds a typed permission contract.",
        metric: 1,
      }),
    );
    return [];
  });

  return Array.from(new Set(permissions));
}

function normalizeCommands(
  value: unknown,
  rows: PluginPackageImportRow[],
): LocalPluginPackageCommand[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    rows.push(createPackageImportSchemaRow("Commands", "Commands must be an array."));
    return [];
  }

  return value.filter(isRecord).map((command) => ({
    id: getString(command.id),
    title: getString(command.title),
    entry: getString(command.entry),
    permission: isEditorPluginPermission(command.permission)
      ? command.permission
      : undefined,
    destructive: command.destructive === true,
  }));
}

function normalizeDependencies(
  value: unknown,
  rows: PluginPackageImportRow[],
): LocalPluginPackageDependency[] {
  if (value === undefined) {
    return [];
  }

  if (isRecord(value)) {
    return normalizeDependencyMap(value);
  }

  if (!Array.isArray(value)) {
    rows.push(
      createPackageImportSchemaRow(
        "Dependencies",
        "Dependencies must be an array or map.",
      ),
    );
    return [];
  }

  return value.filter(isRecord).flatMap((dependency) => {
    const name = getString(dependency.name);

    if (!name) {
      rows.push(
        createPackageImportSchemaRow(
          "Dependency name",
          "Every dependency needs a name.",
        ),
      );
      return [];
    }

    return [
      {
        name,
        version: getString(dependency.version) || undefined,
        source:
          dependency.source === "url" || dependency.source === "local"
            ? dependency.source
            : "npm",
        optional: dependency.optional === true,
      },
    ];
  });
}

function normalizeDependencyMap(
  value: unknown,
): LocalPluginPackageDependency[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).map(([name, version]) => ({
    name,
    version: typeof version === "string" ? version : undefined,
    source:
      typeof version === "string" && /^https?:\/\//.test(version)
        ? "url"
        : typeof version === "string" && version.startsWith("file:")
          ? "local"
          : "npm",
  }));
}

function normalizeWidgets(
  value: unknown,
  rows: PluginPackageImportRow[],
): LocalPluginPackageWidget[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    rows.push(createPackageImportSchemaRow("Widgets", "Widgets must be an array."));
    return [];
  }

  return value.filter(isRecord).map((widget) => ({
    id: getString(widget.id),
    title: getString(widget.title),
    entry: getString(widget.entry),
    surfaces: Array.isArray(widget.surfaces)
      ? widget.surfaces.filter(
          (surface): surface is string => typeof surface === "string",
        )
      : [],
  }));
}

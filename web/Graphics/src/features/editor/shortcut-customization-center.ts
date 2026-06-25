import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import {
  defaultToolShortcutPreferences,
  normalizeShortcutKey,
  type ToolShortcutPreferences,
} from "@/features/editor/shortcut-preferences";
import type { EditorTool } from "@/features/editor/types";

export type ShortcutCustomizationScope =
  | "canvas"
  | "command-palette"
  | "selection"
  | "tool"
  | "workspace";

export type ShortcutCustomizationStatus = "ready" | "review" | "blocked";

export type ShortcutCustomizationBinding = {
  id: string;
  scope: ShortcutCustomizationScope;
  status: ShortcutCustomizationStatus;
  commandId: string;
  label: string;
  shortcut: string;
  defaultShortcut: string | null;
  override: boolean;
  source: "command-palette" | "tool-preference";
  detail: string;
};

export type ShortcutCustomizationConflict = {
  id: string;
  scope: ShortcutCustomizationScope;
  status: ShortcutCustomizationStatus;
  shortcut: string;
  labels: string[];
  commandIds: string[];
};

export type ShortcutCustomizationRow = {
  id: string;
  scope: ShortcutCustomizationScope;
  status: ShortcutCustomizationStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
};

export type ShortcutCustomizationCenterReport = {
  generatedAt: string;
  status: ShortcutCustomizationStatus;
  score: number;
  bindingCount: number;
  scopeCount: number;
  overrideCount: number;
  conflictCount: number;
  commandPaletteEvidenceCount: number;
  exportReady: boolean;
  rows: ShortcutCustomizationRow[];
  bindings: ShortcutCustomizationBinding[];
  conflicts: ShortcutCustomizationConflict[];
  commandPaletteEvidence: ShortcutCustomizationBinding[];
};

export type ShortcutCustomizationCenterInput = {
  commands: CommandPaletteCommand[];
  generatedAt?: string;
  toolShortcuts: ToolShortcutPreferences;
};

export type ShortcutCustomizationCenterExport = {
  version: 1;
  exportedAt: string;
  status: ShortcutCustomizationStatus;
  toolShortcuts: ToolShortcutPreferences;
  bindings: ShortcutCustomizationBinding[];
  conflicts: ShortcutCustomizationConflict[];
  rows: ShortcutCustomizationRow[];
};

export type ParsedShortcutCustomizationCenterImport = {
  toolShortcuts: ToolShortcutPreferences;
  conflicts: ShortcutCustomizationConflict[];
  skippedShortcutKeys: string[];
  report: ShortcutCustomizationCenterReport;
};

const scopeLabels: Record<ShortcutCustomizationScope, string> = {
  canvas: "Canvas shortcuts",
  "command-palette": "Command palette evidence",
  selection: "Selection shortcuts",
  tool: "Tool overrides",
  workspace: "Workspace shortcuts",
};

const scopeOrder: ShortcutCustomizationScope[] = [
  "tool",
  "command-palette",
  "canvas",
  "selection",
  "workspace",
];

export function getShortcutCustomizationCenterReport({
  commands,
  generatedAt = new Date().toISOString(),
  toolShortcuts,
}: ShortcutCustomizationCenterInput): ShortcutCustomizationCenterReport {
  const toolBindings = getToolBindings(toolShortcuts);
  const commandPaletteEvidence = getCommandPaletteEvidence({
    commands,
    toolShortcuts,
  });
  const bindings = [...toolBindings, ...commandPaletteEvidence].sort(sortBindings);
  const conflicts = getShortcutCustomizationConflicts(bindings);
  const rows = getShortcutCustomizationRows({
    bindings,
    conflicts,
  });
  const overrideCount = toolBindings.filter((binding) => binding.override).length;
  const conflictCount = conflicts.length;
  const reviewRows = rows.filter((row) => row.status === "review").length;
  const blockedRows = rows.filter((row) => row.status === "blocked").length;

  return {
    generatedAt,
    status: getWorstStatus(rows.map((row) => row.status)),
    score: Math.max(
      0,
      100 - conflictCount * 14 - overrideCount * 2 - blockedRows * 6 - reviewRows * 2,
    ),
    bindingCount: bindings.length,
    scopeCount: new Set(bindings.map((binding) => binding.scope)).size,
    overrideCount,
    conflictCount,
    commandPaletteEvidenceCount: commandPaletteEvidence.length,
    exportReady: conflictCount === 0,
    rows,
    bindings,
    conflicts,
    commandPaletteEvidence,
  };
}

export function createShortcutCustomizationCenterExport(
  report: ShortcutCustomizationCenterReport,
): ShortcutCustomizationCenterExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    status: report.status,
    toolShortcuts: getToolShortcutsFromBindings(report.bindings),
    bindings: report.bindings,
    conflicts: report.conflicts,
    rows: report.rows,
  };
}

export function parseShortcutCustomizationCenterImport(
  raw: string,
  currentShortcuts: ToolShortcutPreferences,
  commands: CommandPaletteCommand[],
): ParsedShortcutCustomizationCenterImport {
  const parsed = JSON.parse(raw) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("Shortcut center import must contain a JSON object.");
  }

  const shortcutRecord = isRecord(parsed.toolShortcuts)
    ? parsed.toolShortcuts
    : {};
  const skippedShortcutKeys = Object.keys(shortcutRecord).filter(
    (key) => !isEditorTool(key),
  );
  const toolShortcuts = normalizeImportedToolShortcuts(
    shortcutRecord,
    currentShortcuts,
  );
  const report = getShortcutCustomizationCenterReport({
    commands,
    toolShortcuts,
  });

  return {
    toolShortcuts,
    conflicts: report.conflicts,
    skippedShortcutKeys,
    report,
  };
}

export function getShortcutCustomizationCenterMarkdown(
  report: ShortcutCustomizationCenterReport,
) {
  return [
    "# Shortcut Customization Center",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Bindings: ${report.bindingCount}`,
    `Scopes: ${report.scopeCount}`,
    `Overrides: ${report.overrideCount}`,
    `Conflicts: ${report.conflictCount}`,
    "",
    "## collision detection",
    ...(report.conflicts.length > 0
      ? report.conflicts.map(
          (conflict) =>
            `- ${scopeLabels[conflict.scope]} ${conflict.shortcut.toUpperCase()}: ${conflict.labels.join(", ")}`,
        )
      : ["- No shortcut collisions detected."]),
    "",
    "## per-scope overrides",
    ...report.rows.map(
      (row) =>
        `- ${row.label}: ${row.status} (${row.value}) - ${row.recommendation}`,
    ),
    "",
    "## command palette evidence",
    ...report.commandPaletteEvidence.slice(0, 20).map(
      (binding) =>
        `- ${binding.label}: ${binding.shortcut.toUpperCase()} (${binding.scope})`,
    ),
  ].join("\n");
}

function getToolBindings(
  toolShortcuts: ToolShortcutPreferences,
): ShortcutCustomizationBinding[] {
  return getEditorTools().map((tool) => {
    const shortcut = normalizeShortcutValue(toolShortcuts[tool]);
    const defaultShortcut = normalizeShortcutValue(defaultToolShortcutPreferences[tool]);
    const override = shortcut !== defaultShortcut;

    return {
      id: `tool-${tool}`,
      scope: "tool",
      status: "ready",
      commandId: `tool-${tool}`,
      label: `${formatToolName(tool)} tool`,
      shortcut,
      defaultShortcut,
      override,
      source: "tool-preference",
      detail: override
        ? `Overrides default ${defaultShortcut.toUpperCase()} shortcut.`
        : "Uses the default tool shortcut.",
    };
  });
}

function getCommandPaletteEvidence({
  commands,
  toolShortcuts,
}: {
  commands: CommandPaletteCommand[];
  toolShortcuts: ToolShortcutPreferences;
}): ShortcutCustomizationBinding[] {
  return commands
    .filter((command) => getCommandShortcut(command, toolShortcuts))
    .map((command) => {
      const tool = getToolFromCommandId(command.id);
      const shortcut = getCommandShortcut(command, toolShortcuts);
      const defaultShortcut = tool
        ? normalizeShortcutValue(defaultToolShortcutPreferences[tool])
        : command.shortcut
          ? normalizeShortcutValue(command.shortcut)
          : null;
      const override = Boolean(
        tool && shortcut && defaultShortcut && shortcut !== defaultShortcut,
      );

      return {
        id: `command-${command.id}`,
        scope: getCommandScope(command),
        status: command.disabled ? "review" : "ready",
        commandId: command.id,
        label: command.label,
        shortcut: shortcut ?? "",
        defaultShortcut,
        override,
        source: "command-palette",
        detail: command.detail,
      } satisfies ShortcutCustomizationBinding;
    })
    .filter((binding) => binding.shortcut);
}

function getShortcutCustomizationConflicts(
  bindings: ShortcutCustomizationBinding[],
): ShortcutCustomizationConflict[] {
  const groups = new Map<string, ShortcutCustomizationBinding[]>();

  for (const binding of bindings) {
    const key = `${binding.scope}:${binding.shortcut}`;
    groups.set(key, [...(groups.get(key) ?? []), binding]);
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const [scope, shortcut] = key.split(":") as [
        ShortcutCustomizationScope,
        string,
      ];

      return {
        id: `shortcut-conflict-${scope}-${shortcut}`,
        scope,
        status: "blocked" as const,
        shortcut,
        labels: group.map((binding) => binding.label),
        commandIds: group.map((binding) => binding.commandId),
      };
    })
    .sort(sortConflicts);
}

function getShortcutCustomizationRows({
  bindings,
  conflicts,
}: {
  bindings: ShortcutCustomizationBinding[];
  conflicts: ShortcutCustomizationConflict[];
}): ShortcutCustomizationRow[] {
  return scopeOrder
    .map((scope) => {
      const scopedBindings = bindings.filter((binding) => binding.scope === scope);

      if (scopedBindings.length === 0) {
        return null;
      }

      const scopedConflicts = conflicts.filter(
        (conflict) => conflict.scope === scope,
      );
      const overrideCount = scopedBindings.filter(
        (binding) => binding.override,
      ).length;
      const disabledCount = scopedBindings.filter(
        (binding) => binding.status === "review",
      ).length;
      const status =
        scopedConflicts.length > 0
          ? "blocked"
          : disabledCount > 0 || overrideCount > 0
            ? "review"
            : "ready";

      return {
        id: `shortcut-scope-${scope}`,
        scope,
        status,
        label: scopeLabels[scope],
        value: `${scopedBindings.length} bindings`,
        detail: `${overrideCount} overrides and ${scopedConflicts.length} collisions in this shortcut scope.`,
        recommendation:
          scopedConflicts.length > 0
            ? "Resolve duplicate shortcuts before exporting or relying on this scope."
            : overrideCount > 0
              ? "Review overrides and confirm they match the team keyboard standard."
              : "Shortcut scope is ready.",
        count: scopedConflicts.length,
      };
    })
    .filter((row): row is ShortcutCustomizationRow => Boolean(row));
}

function getCommandShortcut(
  command: CommandPaletteCommand,
  toolShortcuts: ToolShortcutPreferences,
) {
  const tool = getToolFromCommandId(command.id);

  if (tool) {
    return normalizeShortcutValue(toolShortcuts[tool]);
  }

  return command.shortcut ? normalizeShortcutValue(command.shortcut) : null;
}

function getCommandScope(command: CommandPaletteCommand): ShortcutCustomizationScope {
  if (getToolFromCommandId(command.id)) {
    return "command-palette";
  }

  const haystack = `${command.id} ${command.label} ${command.detail}`.toLowerCase();

  if (/select|selection|duplicate|delete|group|align|distribute|lock|hide/.test(haystack)) {
    return "selection";
  }

  if (/zoom|canvas|page|grid|guide|ruler|prototype/.test(haystack)) {
    return "canvas";
  }

  return "workspace";
}

function getToolFromCommandId(commandId: string): EditorTool | null {
  if (!commandId.startsWith("tool-")) {
    return null;
  }

  const candidate = commandId.slice("tool-".length);

  return isEditorTool(candidate) ? candidate : null;
}

function getToolShortcutsFromBindings(
  bindings: ShortcutCustomizationBinding[],
): ToolShortcutPreferences {
  const next = { ...defaultToolShortcutPreferences };

  for (const binding of bindings) {
    if (binding.scope !== "tool") {
      continue;
    }

    const tool = getToolFromCommandId(binding.commandId);

    if (tool) {
      next[tool] = binding.shortcut;
    }
  }

  return next;
}

function normalizeImportedToolShortcuts(
  shortcutRecord: Record<string, unknown>,
  currentShortcuts: ToolShortcutPreferences,
) {
  const next = { ...currentShortcuts };

  for (const tool of getEditorTools()) {
    const rawShortcut = shortcutRecord[tool];

    if (typeof rawShortcut !== "string") {
      continue;
    }

    const normalized = normalizeShortcutValue(rawShortcut);

    if (normalized) {
      next[tool] = normalized;
    }
  }

  return next;
}

function normalizeShortcutValue(value: string) {
  const trimmed = value.trim();

  if (trimmed.length <= 1) {
    return normalizeShortcutKey(trimmed);
  }

  return trimmed
    .replace(/\s*\+\s*/g, "+")
    .replace(/\s+/g, "+")
    .toLowerCase();
}

function getWorstStatus(statuses: ShortcutCustomizationStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function statusWeight(status: ShortcutCustomizationStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortBindings(
  left: ShortcutCustomizationBinding,
  right: ShortcutCustomizationBinding,
) {
  return (
    scopeOrder.indexOf(left.scope) - scopeOrder.indexOf(right.scope) ||
    left.shortcut.localeCompare(right.shortcut) ||
    left.label.localeCompare(right.label)
  );
}

function sortConflicts(
  left: ShortcutCustomizationConflict,
  right: ShortcutCustomizationConflict,
) {
  return (
    scopeOrder.indexOf(left.scope) - scopeOrder.indexOf(right.scope) ||
    statusWeight(left.status) - statusWeight(right.status) ||
    left.shortcut.localeCompare(right.shortcut)
  );
}

function formatToolName(tool: EditorTool) {
  return tool.replace(/-/g, " ");
}

function getEditorTools() {
  return Object.keys(defaultToolShortcutPreferences) as EditorTool[];
}

function isEditorTool(value: string): value is EditorTool {
  return value in defaultToolShortcutPreferences;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

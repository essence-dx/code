import type { EditorTool } from "@/features/editor/types";
import {
  defaultToolShortcutPreferences,
  normalizeShortcutKey,
  type ToolShortcutPreferences,
} from "@/features/editor/shortcut-preferences";

export type EditorSettingsExport = {
  version: 1;
  exportedAt: string;
  toolShortcuts: ToolShortcutPreferences;
  pluginGrants: Record<string, boolean>;
};

export type ShortcutConflict = {
  shortcut: string;
  tools: EditorTool[];
};

export type ParsedEditorSettings = {
  toolShortcuts: ToolShortcutPreferences;
  pluginGrants: Record<string, boolean> | null;
  conflicts: ShortcutConflict[];
  skippedShortcutKeys: string[];
};

export function createEditorSettingsExport(
  toolShortcuts: ToolShortcutPreferences,
  pluginGrants: Record<string, boolean>,
): EditorSettingsExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    toolShortcuts,
    pluginGrants,
  };
}

export function parseEditorSettingsExport(
  raw: string,
  currentShortcuts: ToolShortcutPreferences,
): ParsedEditorSettings {
  const parsed = JSON.parse(raw) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("Settings file must contain a JSON object.");
  }

  const shortcutRecord = isRecord(parsed.toolShortcuts)
    ? parsed.toolShortcuts
    : {};
  const skippedShortcutKeys = Object.keys(shortcutRecord).filter(
    (key) => !isEditorTool(key),
  );
  const toolShortcuts = normalizeImportedShortcuts(
    shortcutRecord,
    currentShortcuts,
  );
  const pluginGrants = isRecord(parsed.pluginGrants)
    ? normalizeBooleanRecord(parsed.pluginGrants)
    : null;

  return {
    toolShortcuts,
    pluginGrants,
    conflicts: getShortcutConflicts(toolShortcuts),
    skippedShortcutKeys,
  };
}

export function getShortcutConflicts(shortcuts: ToolShortcutPreferences) {
  const shortcutsByKey = new Map<string, EditorTool[]>();

  for (const [tool, shortcut] of Object.entries(shortcuts) as Array<
    [EditorTool, string]
  >) {
    const normalized = normalizeShortcutKey(shortcut);

    if (!normalized) {
      continue;
    }

    shortcutsByKey.set(normalized, [
      ...(shortcutsByKey.get(normalized) ?? []),
      tool,
    ]);
  }

  return Array.from(shortcutsByKey.entries())
    .filter(([, tools]) => tools.length > 1)
    .map(([shortcut, tools]) => ({ shortcut, tools }));
}

function normalizeImportedShortcuts(
  shortcutRecord: Record<string, unknown>,
  currentShortcuts: ToolShortcutPreferences,
): ToolShortcutPreferences {
  const next = { ...currentShortcuts };

  for (const tool of getEditorTools()) {
    const rawShortcut = shortcutRecord[tool];

    if (typeof rawShortcut !== "string") {
      continue;
    }

    const normalized = normalizeShortcutKey(rawShortcut);

    if (normalized) {
      next[tool] = normalized;
    }
  }

  return next;
}

function normalizeBooleanRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  );
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

import {
  defaultToolShortcutPreferences,
  normalizeToolShortcutPreferences,
  type ToolShortcutPreferences,
} from "@/features/editor/shortcut-preferences";
import {
  normalizePluginApprovals,
  normalizePluginRunHistory,
} from "@/features/editor/plugin-sandbox-history";
import type {
  DesignDocument,
  DesignWorkspaceSettings,
} from "@/features/editor/types";
import type {
  EditorPluginApprovalRecord,
  EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";

export const workspaceSettingsStorageKey = "essence.workspace-settings";
export const legacyToolShortcutsStorageKey = "essence.tool-shortcuts";
export const legacyPluginGrantsStorageKey = "essence.plugin-grants";

export type EditorWorkspaceSettingsState = {
  toolShortcuts: ToolShortcutPreferences;
  pluginGrants: Record<string, boolean>;
  pluginApprovals: Record<string, EditorPluginApprovalRecord>;
  pluginRunHistory: EditorPluginRunHistoryEntry[];
  updatedAt: string | null;
  updatedBy: string | null;
};

export function getWorkspaceSettingsState(
  document: DesignDocument,
): EditorWorkspaceSettingsState {
  return {
    toolShortcuts: normalizeToolShortcutPreferences(
      document.workspaceSettings?.toolShortcuts,
    ),
    pluginGrants: normalizePluginGrants(
      document.workspaceSettings?.pluginGrants,
    ),
    pluginApprovals: normalizePluginApprovals(
      document.workspaceSettings?.pluginApprovals,
    ),
    pluginRunHistory: normalizePluginRunHistory(
      document.workspaceSettings?.pluginRunHistory,
    ),
    updatedAt: document.workspaceSettings?.updatedAt ?? null,
    updatedBy: document.workspaceSettings?.updatedBy ?? null,
  };
}

export function createWorkspaceSettings(
  current: DesignWorkspaceSettings | undefined,
  patch: Partial<
    Pick<
      DesignWorkspaceSettings,
      "pluginApprovals" | "pluginGrants" | "pluginRunHistory" | "toolShortcuts"
    >
  >,
  updatedBy: string,
  updatedAt = new Date().toISOString(),
): DesignWorkspaceSettings {
  return {
    version: 1,
    toolShortcuts:
      patch.toolShortcuts ??
      current?.toolShortcuts ??
      defaultToolShortcutPreferences,
    pluginGrants:
      patch.pluginGrants ?? current?.pluginGrants ?? {},
    pluginApprovals:
      patch.pluginApprovals ?? current?.pluginApprovals ?? {},
    pluginRunHistory:
      patch.pluginRunHistory ?? current?.pluginRunHistory ?? [],
    updatedAt,
    updatedBy,
  };
}

export function readLocalWorkspaceSettings():
  | Partial<EditorWorkspaceSettingsState>
  | null {
  const bundled = readJsonObject(window.localStorage.getItem(workspaceSettingsStorageKey));
  const legacyShortcuts = readJsonObject(
    window.localStorage.getItem(legacyToolShortcutsStorageKey),
  );
  const legacyGrants = readJsonObject(
    window.localStorage.getItem(legacyPluginGrantsStorageKey),
  );

  if (!bundled && !legacyShortcuts && !legacyGrants) {
    return null;
  }

  return {
    toolShortcuts: normalizeToolShortcutPreferences(
      bundled?.toolShortcuts ?? legacyShortcuts,
    ),
    pluginGrants: normalizePluginGrants(
      bundled?.pluginGrants ?? legacyGrants,
    ),
    pluginApprovals: normalizePluginApprovals(bundled?.pluginApprovals),
    pluginRunHistory: normalizePluginRunHistory(bundled?.pluginRunHistory),
    updatedAt: readString(bundled?.updatedAt),
    updatedBy: readString(bundled?.updatedBy),
  };
}

export function writeLocalWorkspaceSettings(
  settings: EditorWorkspaceSettingsState,
) {
  const payload = {
    version: 1,
    toolShortcuts: settings.toolShortcuts,
    pluginGrants: settings.pluginGrants,
    pluginApprovals: settings.pluginApprovals,
    pluginRunHistory: settings.pluginRunHistory,
    updatedAt: settings.updatedAt,
    updatedBy: settings.updatedBy,
  };

  window.localStorage.setItem(
    workspaceSettingsStorageKey,
    JSON.stringify(payload),
  );
  window.localStorage.setItem(
    legacyToolShortcutsStorageKey,
    JSON.stringify(settings.toolShortcuts),
  );
  window.localStorage.setItem(
    legacyPluginGrantsStorageKey,
    JSON.stringify(settings.pluginGrants),
  );
}

export function normalizePluginGrants(input: unknown) {
  if (!isRecord(input)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).filter(
      (entry): entry is [string, boolean] =>
        typeof entry[0] === "string" && typeof entry[1] === "boolean",
    ),
  );
}

function readJsonObject(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

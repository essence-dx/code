"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, RotateCcw, Settings2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import {
  createEditorSettingsExport,
  getShortcutConflicts,
  parseEditorSettingsExport,
  type ParsedEditorSettings,
  type ShortcutConflict,
} from "@/features/editor/editor-settings-portability";
import {
  defaultToolShortcutPreferences,
  type ToolShortcutPreferences,
} from "@/features/editor/shortcut-preferences";
import {
  createShortcutCustomizationCenterExport,
  getShortcutCustomizationCenterReport,
  parseShortcutCustomizationCenterImport,
  type ParsedShortcutCustomizationCenterImport,
  type ShortcutCustomizationStatus,
} from "@/features/editor/shortcut-customization-center";
import type { EditorTool } from "@/features/editor/types";

type EditorSettingsPanelProps = {
  shortcuts: ToolShortcutPreferences;
  commandPaletteCommands: CommandPaletteCommand[];
  pluginGrants: Record<string, boolean>;
  onUpdateToolShortcut: (tool: EditorTool, shortcut: string) => void;
  onReplaceToolShortcuts: (shortcuts: ToolShortcutPreferences) => void;
  onReplacePluginGrants: (grants: Record<string, boolean>) => void;
};

export function EditorSettingsPanel({
  commandPaletteCommands,
  shortcuts,
  pluginGrants,
  onUpdateToolShortcut,
  onReplaceToolShortcuts,
  onReplacePluginGrants,
}: EditorSettingsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] =
    useState<ParsedEditorSettings | null>(null);
  const [importShortcutPreview, setImportShortcutPreview] =
    useState<ParsedShortcutCustomizationCenterImport | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const currentConflicts = useMemo(
    () => getShortcutConflicts(shortcuts),
    [shortcuts],
  );
  const shortcutCenter = useMemo(
    () =>
      getShortcutCustomizationCenterReport({
        commands: commandPaletteCommands,
        toolShortcuts: shortcuts,
      }),
    [commandPaletteCommands, shortcuts],
  );
  const tools = Object.keys(shortcuts) as EditorTool[];

  function exportSettings() {
    const payload = createEditorSettingsExport(shortcuts, pluginGrants);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "essence-editor-settings.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Settings exported.");
  }

  function exportShortcutCenter() {
    const payload = createShortcutCustomizationCenterExport(shortcutCenter);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "essence-shortcut-customization-center.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Shortcut center exported.");
  }

  async function importSettings(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = parseEditorSettingsExport(raw, shortcuts);
      const shortcutPreview = parseShortcutCustomizationCenterImport(
        raw,
        shortcuts,
        commandPaletteCommands,
      );

      setImportResult(parsed);
      setImportShortcutPreview(shortcutPreview);
      setMessage(
        parsed.conflicts.length > 0 || shortcutPreview.conflicts.length > 0
          ? "Resolve shortcut conflicts before applying imported settings."
          : "Settings import is ready to apply.",
      );
    } catch (error) {
      setImportResult(null);
      setImportShortcutPreview(null);
      setMessage(
        error instanceof Error ? error.message : "Could not read settings file.",
      );
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function applyImportedSettings() {
    if (
      !importResult ||
      importResult.conflicts.length > 0 ||
      (importShortcutPreview?.conflicts.length ?? 0) > 0
    ) {
      return;
    }

    onReplaceToolShortcuts(importResult.toolShortcuts);
    if (importResult.pluginGrants) {
      onReplacePluginGrants(importResult.pluginGrants);
    }

    setImportResult(null);
    setImportShortcutPreview(null);
    setMessage("Imported settings applied.");
  }

  function resetShortcuts() {
    onReplaceToolShortcuts(defaultToolShortcutPreferences);
    setImportResult(null);
    setImportShortcutPreview(null);
    setMessage("Tool shortcuts reset.");
  }

  function resetPluginGrants() {
    onReplacePluginGrants({});
    setMessage("Plugin permissions reset.");
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Editor settings
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="Export editor settings"
            onClick={exportSettings}
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="Export shortcut customization center"
            onClick={exportShortcutCenter}
          >
            <Settings2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="Import editor settings"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="size-3.5" />
          </Button>
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void importSettings(event.target.files?.[0] ?? null)}
      />

      <div className="mt-2 rounded-md border border-border bg-muted/20 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium">Shortcut customization center</div>
            <div className="text-[11px] text-muted-foreground">
              Collision detection, per-scope overrides, and command palette evidence.
            </div>
          </div>
          <Badge variant={getStatusVariant(shortcutCenter.status)}>
            {shortcutCenter.status} {shortcutCenter.score}
          </Badge>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
          <ShortcutMetric label="Bindings" value={shortcutCenter.bindingCount} />
          <ShortcutMetric label="Overrides" value={shortcutCenter.overrideCount} />
          <ShortcutMetric label="Conflicts" value={shortcutCenter.conflictCount} />
        </div>
        <div className="mt-2 grid gap-1.5">
          {shortcutCenter.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-sm border border-border bg-background p-2 text-[11px]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{row.label}</div>
                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
              </div>
              <div className="mt-1 text-muted-foreground">{row.detail}</div>
            </div>
          ))}
        </div>
        {shortcutCenter.conflicts.length > 0 ? (
          <div className="mt-2 rounded-sm border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
            <div className="flex items-center gap-1 font-medium">
              <AlertTriangle className="size-3.5" />
              Collision detection
            </div>
            <div className="mt-1 space-y-1">
              {shortcutCenter.conflicts.slice(0, 4).map((conflict) => (
                <div key={conflict.id}>
                  {conflict.shortcut.toUpperCase()} / {conflict.scope}:{" "}
                  {conflict.labels.join(", ")}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {tools.map((tool) => (
          <label
            key={tool}
            className="grid grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-1.5 rounded-sm bg-muted/30 px-2 py-1 text-xs"
          >
            <span className="truncate capitalize text-muted-foreground">
              {tool.replace("-", " ")}
            </span>
            <Input
              value={shortcuts[tool]}
              maxLength={1}
              className="h-7 rounded-sm text-center font-mono text-xs"
              aria-label={`${tool} shortcut`}
              onChange={(event) =>
                onUpdateToolShortcut(tool, event.target.value)
              }
            />
          </label>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 flex-1"
          onClick={resetShortcuts}
        >
          <RotateCcw className="size-3.5" />
          Reset shortcuts
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 flex-1"
          onClick={resetPluginGrants}
        >
          Reset permissions
        </Button>
      </div>

      {message ? (
        <div className="mt-2 rounded-sm border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
          {message}
        </div>
      ) : null}

      <ShortcutConflictList conflicts={currentConflicts} title="Current conflicts" />

      {importResult ? (
        <div className="mt-2 rounded-md border border-border bg-muted/20 p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium">Imported settings</div>
            <div className="text-[11px] text-muted-foreground">
              {Object.keys(importResult.toolShortcuts).length} shortcuts
            </div>
          </div>
          <ShortcutConflictList
            conflicts={importResult.conflicts}
            title="Import conflicts"
          />
          {importShortcutPreview ? (
            <div className="mt-2 rounded-sm border border-border bg-background p-2 text-[11px] text-muted-foreground">
              Shortcut center preview: {importShortcutPreview.report.bindingCount}{" "}
              bindings, {importShortcutPreview.report.conflictCount} conflicts,{" "}
              {importShortcutPreview.report.commandPaletteEvidenceCount} command
              palette rows.
            </div>
          ) : null}
          {importResult.skippedShortcutKeys.length > 0 ? (
            <div className="mt-2 rounded-sm border border-border bg-background p-2 text-[11px] text-muted-foreground">
              Skipped unknown shortcuts:{" "}
              {importResult.skippedShortcutKeys.join(", ")}
            </div>
          ) : null}
          <div className="mt-2 flex gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-8 flex-1"
              disabled={
                importResult.conflicts.length > 0 ||
                (importShortcutPreview?.conflicts.length ?? 0) > 0
              }
              onClick={applyImportedSettings}
            >
              Apply import
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 flex-1"
              onClick={() => {
                setImportResult(null);
                setImportShortcutPreview(null);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShortcutMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border bg-background p-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function ShortcutConflictList({
  conflicts,
  title,
}: {
  conflicts: ShortcutConflict[];
  title: string;
}) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 rounded-sm border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
      <div className="font-medium">{title}</div>
      <div className="mt-1 space-y-1">
        {conflicts.map((conflict) => (
          <div key={conflict.shortcut}>
            {conflict.shortcut.toUpperCase()}:{" "}
            {conflict.tools.map((tool) => tool.replace("-", " ")).join(", ")}
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusVariant(status: ShortcutCustomizationStatus) {
  if (status === "ready") {
    return "default";
  }

  if (status === "review") {
    return "secondary";
  }

  return "destructive";
}

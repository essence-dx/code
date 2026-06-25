"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ExportFormat,
  ExportScope,
  ExportScale,
  ExportSettings,
  SavedExportPreset,
} from "@/features/editor/exporters/export-settings";
import {
  exportBatchPresets,
  getExportFileEntries,
  getExportSettingsSummary,
} from "@/features/editor/exporters/export-settings";
import { cn } from "@/lib/utils";
import { Save, Trash2 } from "lucide-react";

type ExportSettingsDialogProps = {
  open: boolean;
  hasSelection: boolean;
  isExporting: boolean;
  savedPresets: SavedExportPreset[];
  onOpenChange: (open: boolean) => void;
  onExport: (settings: ExportSettings) => void;
  onSavePreset: (name: string, settings: ExportSettings) => void;
  onDeletePreset: (presetId: string) => void;
};

const exportFormats: Array<{
  id: ExportFormat;
  label: string;
  detail: string;
}> = [
  { id: "png", label: "PNG", detail: "Raster preview" },
  { id: "jpg", label: "JPG", detail: "Compressed raster" },
  { id: "svg", label: "SVG", detail: "Editable vector file" },
  { id: "pdf", label: "PDF", detail: "Document handoff" },
  { id: "json", label: "JSON", detail: "Source document" },
];

const exportScales: ExportScale[] = [1, 2, 3];

export function ExportSettingsDialog({
  open,
  hasSelection,
  isExporting,
  savedPresets,
  onOpenChange,
  onExport,
  onSavePreset,
  onDeletePreset,
}: ExportSettingsDialogProps) {
  const [scope, setScope] = useState<ExportScope>("page");
  const [formats, setFormats] = useState<ExportFormat[]>(["png", "svg"]);
  const [includeManifest, setIncludeManifest] = useState(true);
  const [scale, setScale] = useState<ExportScale>(1);
  const [presetName, setPresetName] = useState("");
  const currentSettings = {
    formats,
    includeManifest,
    scale,
    scope,
  } satisfies ExportSettings;
  const previewFiles = getExportFileEntries("current-file", currentSettings);
  const fileCount = previewFiles.length;

  useEffect(() => {
    if (!hasSelection && scope === "selection") {
      setScope("page");
    }
  }, [hasSelection, scope]);

  function toggleFormat(format: ExportFormat) {
    setFormats((current) =>
      current.includes(format)
        ? current.filter((item) => item !== format)
        : [...current, format],
    );
  }

  function applyPreset(settings: ExportSettings) {
    setFormats(settings.formats);
    setIncludeManifest(settings.includeManifest);
    setScale(settings.scale);
    setScope(
      settings.scope === "selection" && !hasSelection ? "page" : settings.scope,
    );
  }

  function savePreset() {
    const name = presetName.trim();

    if (!name || formats.length === 0) {
      return;
    }

    onSavePreset(name, currentSettings);
    setPresetName("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Choose the layer scope and file formats for this export batch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Built-in presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {exportBatchPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="rounded-md border border-border p-3 text-left text-sm hover:border-primary hover:bg-primary/5"
                  onClick={() => applyPreset(preset.settings)}
                >
                  <span className="block font-medium">{preset.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {preset.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>File presets</Label>
              <span className="text-xs text-muted-foreground">
                {savedPresets.length} saved
              </span>
            </div>
            <div className="grid gap-2">
              {savedPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="grid grid-cols-[1fr_auto] items-stretch gap-2"
                >
                  <button
                    type="button"
                    className="rounded-md border border-border p-3 text-left text-sm hover:border-primary hover:bg-primary/5"
                    onClick={() => applyPreset(preset.settings)}
                  >
                    <span className="block font-medium">{preset.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {getExportSettingsSummary(preset.settings)}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label={`Remove ${preset.name} export preset`}
                    onClick={() => onDeletePreset(preset.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {savedPresets.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  No saved presets for this file yet.
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                value={presetName}
                placeholder="Preset name"
                onChange={(event) => setPresetName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    savePreset();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!presetName.trim() || formats.length === 0}
                onClick={savePreset}
              >
                <Save className="mr-2 size-4" />
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <div className="grid grid-cols-2 gap-2">
              <ScopeButton
                active={scope === "page"}
                label="Page"
                onClick={() => setScope("page")}
              />
              <ScopeButton
                active={scope === "selection"}
                disabled={!hasSelection}
                label="Selection"
                onClick={() => setScope("selection")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Formats</Label>
            <div className="grid gap-2">
              {exportFormats.map((format) => (
                <label
                  key={format.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm",
                    formats.includes(format.id) && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={formats.includes(format.id)}
                    className="size-4 accent-primary"
                    onChange={() => toggleFormat(format.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{format.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {format.detail}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scale</Label>
            <div className="grid grid-cols-3 gap-2">
              {exportScales.map((exportScale) => (
                <ScopeButton
                  key={exportScale}
                  active={scale === exportScale}
                  label={`${exportScale}x`}
                  onClick={() => setScale(exportScale)}
                />
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={includeManifest}
              className="size-4 accent-primary"
              onChange={(event) => setIncludeManifest(event.target.checked)}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Export manifest</span>
              <span className="block text-xs text-muted-foreground">
                Include a JSON record for filenames, scope, scale, and document counts.
              </span>
            </span>
          </label>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {fileCount} file{fileCount === 1 ? "" : "s"} will be downloaded.
          </div>

          <div className="space-y-1 rounded-md border border-border bg-background p-2">
            <div className="text-xs font-medium text-muted-foreground">
              File preview
            </div>
            <div className="space-y-1">
              {previewFiles.slice(0, 6).map((file) => (
                <div
                  key={file.filename}
                  className="flex items-center justify-between gap-2 rounded-sm bg-muted/40 px-2 py-1 text-xs"
                >
                  <span className="min-w-0 truncate font-mono">
                    {file.filename}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                    {file.format}
                  </span>
                </div>
              ))}
              {previewFiles.length > 6 ? (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  +{previewFiles.length - 6} more files
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={formats.length === 0 || isExporting}
            onClick={() => onExport(currentSettings)}
          >
            {isExporting ? "Exporting" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "secondary"}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

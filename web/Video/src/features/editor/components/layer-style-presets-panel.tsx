"use client";

import { useState } from "react";
import { Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditorStore } from "@/features/editor/state/editor-store";
import type { TimelineLayer } from "@/lib/editor/types";

export function LayerStylePresetsPanel({ layer }: { layer: TimelineLayer }) {
  const project = useEditorStore((state) => state.project);
  const saveSelectedLayerStylePreset = useEditorStore((state) => state.saveSelectedLayerStylePreset);
  const applyLayerStylePreset = useEditorStore((state) => state.applyLayerStylePreset);
  const removeLayerStylePreset = useEditorStore((state) => state.removeLayerStylePreset);
  const presets = project.layerStylePresets ?? [];
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const activePresetId = presets.some((preset) => preset.id === selectedPresetId) ? selectedPresetId : (presets[0]?.id ?? "");
  const activePreset = presets.find((preset) => preset.id === activePresetId);

  function savePreset() {
    const result = saveSelectedLayerStylePreset(presetName || `${layer.name} style`);
    if (!result.saved) {
      setMessage("Select a layer before saving a style preset.");
      return;
    }

    setPresetName("");
    setMessage(`${result.presetName ?? "Style preset"} saved.`);
  }

  function applyPreset() {
    if (!activePresetId) return;
    const changedCount = applyLayerStylePreset(activePresetId);
    setMessage(changedCount > 0 ? `Style applied to ${changedCount} ${changedCount === 1 ? "layer" : "layers"}.` : "No editable selected layers.");
  }

  function removePreset() {
    if (!activePreset) return;
    removeLayerStylePreset(activePreset.id);
    setSelectedPresetId("");
    setMessage(`${activePreset.name} removed.`);
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Palette className="size-4" />
        Style presets
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input
          className="h-8"
          value={presetName}
          onChange={(event) => setPresetName(event.target.value)}
          placeholder="Preset name"
          onKeyDown={(event) => {
            if (event.key === "Enter") savePreset();
          }}
        />
        <Button size="sm" variant="outline" className="h-8" onClick={savePreset}>
          Save
        </Button>
      </div>
      {presets.length ? (
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <Select value={activePresetId} onValueChange={setSelectedPresetId}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={applyPreset}>
            Apply
          </Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={removePreset} aria-label="Remove style preset">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
          Save this layer style to reuse it on other selected layers.
        </div>
      )}
      {activePreset ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-4 rounded border border-border" style={{ background: activePreset.style.fill }} />
          <span className="size-4 rounded border border-border" style={{ background: activePreset.style.background }} />
          <span>{activePreset.style.fontFamily}</span>
          <span>{activePreset.style.fontSize}px</span>
        </div>
      ) : null}
      {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
    </div>
  );
}

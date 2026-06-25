"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditorStore } from "@/features/editor/state/editor-store";
import type { MemeStyle } from "@/lib/editor/meme";
import { findMemeTemplatePreset, memeTemplatePresets } from "@/lib/editor/meme-templates";
import { exportPresets } from "@/lib/editor/presets";

export function MemeGeneratorPanel() {
  const [memeTemplateId, setMemeTemplateId] = useState(memeTemplatePresets[0]?.id ?? "");
  const [memeAssetId, setMemeAssetId] = useState("solid");
  const [memeStyle, setMemeStyle] = useState<MemeStyle>("classic");
  const [memeDuration, setMemeDuration] = useState("6");
  const [topText, setTopText] = useState("WHEN THE TIMELINE FINALLY WORKS");
  const [bottomText, setBottomText] = useState("AND THE EXPORT DOES TOO");
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const addMemeLayout = useEditorStore((state) => state.addMemeLayout);
  const setAspectRatio = useEditorStore((state) => state.setAspectRatio);
  const memeAssets = mediaAssets.filter((asset) => asset.type === "image" || asset.type === "video");
  const selectedTemplate = findMemeTemplatePreset(memeTemplateId);
  const selectedExportPreset = exportPresets.find((preset) => preset.id === selectedTemplate.exportPresetId);
  const selectedMemeAssetId = memeAssets.some((asset) => asset.id === memeAssetId) ? memeAssetId : undefined;
  const resolvedMemeAssetId = memeAssetId === "solid" ? undefined : selectedMemeAssetId ?? memeAssets[0]?.id;
  const canCreateMeme = Boolean(topText.trim() || bottomText.trim());

  function applyTemplate(templateId: string) {
    const template = findMemeTemplatePreset(templateId);
    setMemeTemplateId(template.id);
    setMemeStyle(template.style);
    setMemeDuration(template.duration.toString());
    setTopText(template.topText);
    setBottomText(template.bottomText);
    setAspectRatio(template.aspectRatio);
  }

  function createMeme() {
    setAspectRatio(selectedTemplate.aspectRatio);
    addMemeLayout({
      assetId: resolvedMemeAssetId,
      topText,
      bottomText,
      duration: readDuration(memeDuration),
      style: memeStyle,
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Templates</Label>
        <div className="grid grid-cols-2 gap-2">
          {memeTemplatePresets.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`rounded-md border p-2 text-left text-xs transition ${
                selectedTemplate.id === template.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"
              }`}
              onClick={() => applyTemplate(template.id)}
            >
              <span className="font-medium">{template.label}</span>
              <span className="mt-1 block text-muted-foreground">{template.bestFor}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">
        {selectedTemplate.aspectRatio} / {selectedExportPreset?.label ?? selectedTemplate.exportPresetId}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Background</Label>
        <Select value={resolvedMemeAssetId ?? "solid"} onValueChange={setMemeAssetId}>
          <SelectTrigger className="w-full" size="sm">
            <SelectValue placeholder="Choose media" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid background</SelectItem>
            {memeAssets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Top text</Label>
        <Input value={topText} maxLength={120} onChange={(event) => setTopText(event.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Bottom text</Label>
        <Input value={bottomText} maxLength={120} onChange={(event) => setBottomText(event.target.value)} />
      </div>
      <div className="grid grid-cols-[1fr_82px] gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Style</Label>
          <Select value={memeStyle} onValueChange={(value) => setMemeStyle(value as MemeStyle)}>
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic</SelectItem>
              <SelectItem value="boxed">Boxed</SelectItem>
              <SelectItem value="lower-third">Lower third</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Seconds</Label>
          <Input type="number" min={1} max={120} value={memeDuration} onChange={(event) => setMemeDuration(event.target.value)} />
        </div>
      </div>
      <Button size="sm" className="w-full" onClick={createMeme} disabled={!canCreateMeme}>
        Create meme
      </Button>
    </div>
  );
}

function readDuration(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(120, Math.max(1, parsed));
}

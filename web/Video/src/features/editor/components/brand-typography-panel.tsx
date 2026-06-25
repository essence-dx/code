"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Type, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { normalizeBrandKitSettings } from "@/lib/editor/brand-kit";
import { saveBrowserBrandFont } from "@/lib/media/brand-font-store";

const systemFontOptions = [
  "Geist",
  "Inter",
  "Arial",
  "Georgia",
  "Impact, Geist",
  "Verdana",
  "system-ui",
  "serif",
  "monospace",
];

export function BrandTypographyPanel() {
  const project = useEditorStore((state) => state.project);
  const saveBrandTypographyPreset = useEditorStore((state) => state.saveBrandTypographyPreset);
  const applyBrandTypographyPreset = useEditorStore((state) => state.applyBrandTypographyPreset);
  const removeBrandTypographyPreset = useEditorStore((state) => state.removeBrandTypographyPreset);
  const addBrandFontAsset = useEditorStore((state) => state.addBrandFontAsset);
  const removeBrandFontAsset = useEditorStore((state) => state.removeBrandFontAsset);
  const updateBrandKitSettings = useEditorStore((state) => state.updateBrandKitSettings);
  const presets = project.brandTypographyPresets ?? [];
  const brandKit = normalizeBrandKitSettings(project.brandKit);
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [headingFontFamily, setHeadingFontFamily] = useState("Geist");
  const [bodyFontFamily, setBodyFontFamily] = useState("Inter");
  const [captionFontFamily, setCaptionFontFamily] = useState("Geist");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const activePresetId = presets.some((preset) => preset.id === selectedPresetId) ? selectedPresetId : (presets[0]?.id ?? "");
  const activePreset = presets.find((preset) => preset.id === activePresetId);
  const fontOptions = useMemo(
    () => [
      ...systemFontOptions.map((font) => ({ value: font, label: font })),
      ...brandKit.fontAssets.map((font) => ({ value: font.family, label: `${font.name} (uploaded)` })),
    ],
    [brandKit.fontAssets],
  );

  async function importFont(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      const asset = await saveBrowserBrandFont(file);
      const added = addBrandFontAsset(asset);
      if (!added) {
        setMessage("Font could not be added to the brand kit.");
        return;
      }

      updateBrandKitSettings({ defaultFontAssetId: asset.id });
      setHeadingFontFamily(asset.family);
      setBodyFontFamily(asset.family);
      setCaptionFontFamily(asset.family);
      setMessage(`${asset.name} uploaded and loaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Font upload failed.");
    }
  }

  function savePreset() {
    const preset = saveBrandTypographyPreset({
      name: name || "Brand type",
      headingFontFamily,
      bodyFontFamily,
      captionFontFamily,
    });

    if (!preset) {
      setMessage("Enter a typography preset name.");
      return;
    }

    setName("");
    setSelectedPresetId(preset.id);
    setMessage(`${preset.name} typography saved.`);
  }

  function applyPreset(role: "heading" | "body" | "caption") {
    if (!activePresetId) return;
    const changedCount = applyBrandTypographyPreset(activePresetId, role);
    setMessage(changedCount > 0 ? `${roleLabel(role)} typography applied to ${changedCount} ${changedCount === 1 ? "layer" : "layers"}.` : "Select editable text, caption, or sticker layers.");
  }

  function removePreset() {
    if (!activePreset) return;
    removeBrandTypographyPreset(activePreset.id);
    setSelectedPresetId("");
    setMessage(`${activePreset.name} typography removed.`);
  }

  function removeFont(assetId: string) {
    const asset = brandKit.fontAssets.find((font) => font.id === assetId);
    if (!asset) return;

    removeBrandFontAsset(asset.id);
    if (headingFontFamily === asset.family) setHeadingFontFamily("Geist");
    if (bodyFontFamily === asset.family) setBodyFontFamily("Inter");
    if (captionFontFamily === asset.family) setCaptionFontFamily("Geist");
    setMessage(`${asset.name} removed from brand fonts.`);
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Type className="size-4" />
        Typography
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input className="h-8" value={name} onChange={(event) => setName(event.target.value)} placeholder="Typography preset" />
        <Button size="sm" variant="outline" className="h-8" onClick={savePreset}>
          Save
        </Button>
      </div>
      <input ref={fontInputRef} hidden type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onChange={importFont} />
      <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => fontInputRef.current?.click()}>
        <Upload className="size-4" />
        Upload font
      </Button>
      <div className="grid gap-2">
        <FontSelect label="Heading" value={headingFontFamily} options={fontOptions} onChange={setHeadingFontFamily} />
        <FontSelect label="Body" value={bodyFontFamily} options={fontOptions} onChange={setBodyFontFamily} />
        <FontSelect label="Caption" value={captionFontFamily} options={fontOptions} onChange={setCaptionFontFamily} />
      </div>
      {brandKit.fontAssets.length ? (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Uploaded fonts</Label>
          {brandKit.fontAssets.map((font) => (
            <div key={font.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-xs">
              <span className="min-w-0 truncate" style={{ fontFamily: font.family }}>
                {font.name}
              </span>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => removeFont(font.id)} aria-label={`Remove ${font.name}`}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {presets.length ? (
        <div className="grid grid-cols-[1fr_auto] gap-2">
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
          <Button size="icon" variant="ghost" className="size-8" onClick={removePreset} aria-label="Remove typography preset">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-1">
        <Button size="sm" variant="outline" className="h-8 px-1 text-xs" onClick={() => applyPreset("heading")} disabled={!activePresetId}>
          Heading
        </Button>
        <Button size="sm" variant="outline" className="h-8 px-1 text-xs" onClick={() => applyPreset("body")} disabled={!activePresetId}>
          Body
        </Button>
        <Button size="sm" variant="outline" className="h-8 px-1 text-xs" onClick={() => applyPreset("caption")} disabled={!activePresetId}>
          Caption
        </Button>
      </div>
      {activePreset ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div style={{ fontFamily: activePreset.headingFontFamily, fontWeight: activePreset.headingWeight }}>Heading: {activePreset.headingFontFamily}</div>
          <div style={{ fontFamily: activePreset.bodyFontFamily, fontWeight: activePreset.bodyWeight }}>Body: {activePreset.bodyFontFamily}</div>
          <div style={{ fontFamily: activePreset.captionFontFamily, fontWeight: activePreset.captionWeight }}>Caption: {activePreset.captionFontFamily}</div>
        </div>
      ) : null}
      {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
    </div>
  );
}

function FontSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function roleLabel(role: "heading" | "body" | "caption") {
  return role[0].toUpperCase() + role.slice(1);
}

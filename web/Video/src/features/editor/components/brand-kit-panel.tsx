"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, ImagePlus, Palette, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { normalizeBrandKitSettings } from "@/lib/editor/brand-kit";

const noneValue = "none";

export function BrandKitPanel() {
  const project = useEditorStore((state) => state.project);
  const brandColors = useEditorStore((state) => state.brandColors);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const updateBrandKitSettings = useEditorStore((state) => state.updateBrandKitSettings);
  const addBrandLogoAsset = useEditorStore((state) => state.addBrandLogoAsset);
  const removeBrandLogoAsset = useEditorStore((state) => state.removeBrandLogoAsset);
  const applyBrandKitToSelected = useEditorStore((state) => state.applyBrandKitToSelected);
  const addLayerFromAsset = useEditorStore((state) => state.addLayerFromAsset);
  const [message, setMessage] = useState<string | null>(null);
  const typographyPresets = project.brandTypographyPresets ?? [];
  const imageAssets = useMemo(() => mediaAssets.filter((asset) => asset.type === "image"), [mediaAssets]);
  const brandKit = normalizeBrandKitSettings(project.brandKit, { mediaAssets, typographyPresets });
  const logoAssets = brandKit.logoAssetIds
    .map((assetId) => mediaAssets.find((asset) => asset.id === assetId && asset.type === "image"))
    .filter((asset): asset is (typeof mediaAssets)[number] => Boolean(asset));
  const activeLogoId = brandKit.defaultLogoAssetId ?? noneValue;
  const activeTypographyId = brandKit.defaultTypographyPresetId ?? noneValue;
  const activePrimaryColor = brandKit.defaultPrimaryColor ?? noneValue;
  const activeSecondaryColor = brandKit.defaultSecondaryColor ?? noneValue;

  function setDefaultLogo(assetId: string) {
    if (assetId === noneValue) {
      updateBrandKitSettings({ defaultLogoAssetId: undefined });
      setMessage("Default logo cleared.");
      return;
    }

    const added = addBrandLogoAsset(assetId);
    if (!added) {
      setMessage("Choose an imported image asset for the logo.");
      return;
    }

    updateBrandKitSettings({ defaultLogoAssetId: assetId });
    setMessage("Default logo saved.");
  }

  function placeLogo() {
    const logoAsset = mediaAssets.find((asset) => asset.id === brandKit.defaultLogoAssetId && asset.type === "image");
    if (!logoAsset) {
      setMessage("Choose an image logo first.");
      return;
    }

    const width = Math.round(Math.min(project.width * 0.18, 280));
    const ratio = logoAsset.width && logoAsset.height ? logoAsset.height / logoAsset.width : 1;
    const layerId = addLayerFromAsset(logoAsset.id, {
      name: `Logo - ${logoAsset.name}`,
      duration: project.duration,
      notes: "Brand kit logo",
      transform: {
        x: 0.88,
        y: 0.14,
        width,
        height: Math.max(48, Math.round(width * ratio)),
        rotation: 0,
        scale: 1,
        flipX: false,
        flipY: false,
        framing: "fit",
        crop: { x: 0, y: 0, width: 1, height: 1 },
      },
    });

    setMessage(layerId ? "Logo placed on the canvas." : "Logo asset is not available in this project.");
  }

  function enforceBrandKit() {
    const changedCount = applyBrandKitToSelected();
    setMessage(
      changedCount > 0
        ? `Brand kit applied to ${changedCount} ${changedCount === 1 ? "layer" : "layers"}.`
        : "Select editable text, caption, sticker, shape, or progress layers.",
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BadgeCheck className="size-4" />
          Brand kit
        </div>
        <Badge variant="outline">{enabledCount(brandKit)} active</Badge>
      </div>

      <div className="grid gap-2">
        <ColorSelect label="Primary" value={activePrimaryColor} colors={brandColors} onChange={(value) => updateBrandKitSettings({ defaultPrimaryColor: value })} />
        <ColorSelect
          label="Secondary"
          value={activeSecondaryColor}
          colors={brandColors}
          onChange={(value) => updateBrandKitSettings({ defaultSecondaryColor: value })}
        />
        <TypographySelect
          value={activeTypographyId}
          presets={typographyPresets}
          onChange={(value) => updateBrandKitSettings({ defaultTypographyPresetId: value === noneValue ? undefined : value })}
        />
        <LogoSelect value={activeLogoId} imageAssets={imageAssets} onChange={setDefaultLogo} />
      </div>

      {logoAssets.length ? (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Logos</Label>
          {logoAssets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-xs">
              <span className="truncate">{asset.name}</span>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => removeBrandLogoAsset(asset.id)} aria-label={`Remove ${asset.name}`}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 rounded-md border border-border p-2">
        <BrandSwitch label="Enforce colors" checked={brandKit.enforceColors} onCheckedChange={(enforceColors) => updateBrandKitSettings({ enforceColors })} />
        <BrandSwitch
          label="Enforce typography"
          checked={brandKit.enforceTypography}
          onCheckedChange={(enforceTypography) => updateBrandKitSettings({ enforceTypography })}
        />
        <BrandSwitch label="Require logo" checked={brandKit.enforceLogo} onCheckedChange={(enforceLogo) => updateBrandKitSettings({ enforceLogo })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="h-8" onClick={placeLogo} disabled={!brandKit.defaultLogoAssetId}>
          <ImagePlus className="size-4" />
          Logo
        </Button>
        <Button size="sm" className="h-8" onClick={enforceBrandKit}>
          <Palette className="size-4" />
          Apply
        </Button>
      </div>

      {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
    </div>
  );
}

function ColorSelect({ label, value, colors, onChange }: { label: string; value: string; colors: string[]; onChange: (value: string | undefined) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue === noneValue ? undefined : nextValue)}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={noneValue}>None</SelectItem>
          {colors.map((color) => (
            <SelectItem key={color} value={color}>
              {color}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TypographySelect({
  value,
  presets,
  onChange,
}: {
  value: string;
  presets: Array<{ id: string; name: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Default type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={noneValue}>None</SelectItem>
          {presets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LogoSelect({
  value,
  imageAssets,
  onChange,
}: {
  value: string;
  imageAssets: Array<{ id: string; name: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Default logo</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={noneValue}>None</SelectItem>
          {imageAssets.map((asset) => (
            <SelectItem key={asset.id} value={asset.id}>
              {asset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BrandSwitch({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function enabledCount(settings: { enforceColors: boolean; enforceTypography: boolean; enforceLogo: boolean }) {
  return [settings.enforceColors, settings.enforceTypography, settings.enforceLogo].filter(Boolean).length;
}

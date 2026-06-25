"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { Circle, Eye, EyeOff, Film, Flame, ImageIcon, Layers3, Plus, SlidersHorizontal, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { Material, MaterialLayer, MaterialLayerKind, SceneObject } from "../../types";
import { readFileAsDataUrl } from "../../utils/file-readers";

const maxLayerImageBytes = 8 * 1024 * 1024;
const maxLayerVideoBytes = 24 * 1024 * 1024;

const materialLayerOptions: Array<{ icon: typeof Circle; kind: MaterialLayerKind; label: string }> = [
  { icon: Circle, kind: "color", label: "Color" },
  { icon: Layers3, kind: "gradient", label: "Gradient" },
  { icon: ImageIcon, kind: "image", label: "Image" },
  { icon: Film, kind: "video", label: "Video" },
  { icon: Sparkles, kind: "noise", label: "Noise" },
  { icon: Layers3, kind: "pattern", label: "Pattern" },
  { icon: SlidersHorizontal, kind: "normal", label: "Normal" },
  { icon: ImageIcon, kind: "bumpMap", label: "Bump Map" },
  { icon: ImageIcon, kind: "roughnessMap", label: "Roughness Map" },
  { icon: Eye, kind: "mask", label: "Mask" },
  { icon: SlidersHorizontal, kind: "displace", label: "Displace" },
  { icon: Circle, kind: "outline", label: "Outline" },
  { icon: Circle, kind: "matcap", label: "Matcap" },
  { icon: Sparkles, kind: "lighting", label: "Lighting" },
  { icon: SlidersHorizontal, kind: "depth", label: "Depth" },
  { icon: Sparkles, kind: "rainbow", label: "Rainbow" },
  { icon: Sparkles, kind: "fresnel", label: "Fresnel" },
  { icon: Circle, kind: "toon", label: "Toon" },
  { icon: Circle, kind: "glass", label: "Glass" },
  { icon: Eye, kind: "opacity", label: "Opacity" },
  { icon: SlidersHorizontal, kind: "roughness", label: "Roughness" },
  { icon: Sparkles, kind: "metalness", label: "Metalness" },
  { icon: Flame, kind: "emissive", label: "Emissive" },
];

function firstSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getDefaultLayerColor(kind: MaterialLayerKind) {
  switch (kind) {
    case "color":
      return "#ffffff";
    case "gradient":
      return "#51e0c3";
    case "noise":
      return "#f8fafc";
    case "pattern":
    case "outline":
      return "#111827";
    case "matcap":
      return "#9bdcff";
    case "lighting":
      return "#ffffff";
    case "depth":
      return "#f8fafc";
    case "rainbow":
      return "#b38cff";
    case "fresnel":
      return "#ffffff";
    case "toon":
      return "#ffcf5c";
    case "glass":
      return "#c8f4ff";
    case "emissive":
      return "#51e0c3";
    default:
      return undefined;
  }
}

function getDefaultLayerSecondaryColor(kind: MaterialLayerKind) {
  switch (kind) {
    case "gradient":
      return "#b38cff";
    case "matcap":
      return "#ffffff";
    case "depth":
      return "#111827";
    default:
      return undefined;
  }
}

function getDefaultLayerValue(kind: MaterialLayerKind) {
  switch (kind) {
    case "opacity":
      return 0.72;
    case "roughness":
      return 0.35;
    case "metalness":
      return 0.75;
    case "image":
    case "video":
      return 1;
    case "noise":
      return 0.7;
    case "pattern":
      return 0.72;
    case "normal":
      return 0.28;
    case "bumpMap":
      return 0.18;
    case "roughnessMap":
      return 1;
    case "mask":
      return 0.8;
    case "displace":
      return 0.16;
    case "outline":
      return 0.04;
    case "matcap":
      return 0.72;
    case "lighting":
      return 0.72;
    case "depth":
      return 0.65;
    case "rainbow":
      return 0.68;
    case "fresnel":
      return 0.85;
    case "glass":
      return 0.72;
    case "emissive":
      return 0.65;
    default:
      return undefined;
  }
}

function createMaterialLayer(kind: MaterialLayerKind, index: number): MaterialLayer {
  const label = materialLayerOptions.find((option) => option.kind === kind)?.label ?? "Layer";

  return {
    id: nanoid(),
    name: `${label} ${index}`,
    kind,
    enabled: true,
    color: getDefaultLayerColor(kind),
    secondaryColor: getDefaultLayerSecondaryColor(kind),
    value: getDefaultLayerValue(kind),
    angle: kind === "gradient" ? 90 : undefined,
    intensity: 1,
  };
}

function getLayerValueLabel(layer: MaterialLayer) {
  if (layer.kind === "opacity") {
    return "Opacity";
  }

  if (layer.kind === "roughness") {
    return "Roughness";
  }

  if (layer.kind === "metalness") {
    return "Metalness";
  }

  if (layer.kind === "glass") {
    return "Transmission";
  }

  if (layer.kind === "image" || layer.kind === "video") {
    return "Repeat";
  }

  if (layer.kind === "noise") {
    return "Scale";
  }

  if (layer.kind === "pattern") {
    return "Scale";
  }

  if (layer.kind === "normal") {
    return "Depth";
  }

  if (layer.kind === "bumpMap") {
    return "Height";
  }

  if (layer.kind === "roughnessMap") {
    return "Repeat";
  }

  if (layer.kind === "mask") {
    return "Scale";
  }

  if (layer.kind === "displace") {
    return "Height";
  }

  if (layer.kind === "outline") {
    return "Width";
  }

  if (layer.kind === "matcap") {
    return "Shine";
  }

  if (layer.kind === "lighting") {
    return "Boost";
  }

  if (layer.kind === "depth") {
    return "Range";
  }

  if (layer.kind === "rainbow") {
    return "Film";
  }

  if (layer.kind === "fresnel") {
    return "Edge";
  }

  return "Glow";
}

function getLayerValueMax(layer: MaterialLayer) {
  if (layer.kind === "outline") {
    return 0.35;
  }

  if (layer.kind === "image" || layer.kind === "video") {
    return 2;
  }

  return layer.kind === "emissive" ||
    layer.kind === "noise" ||
    layer.kind === "pattern" ||
    layer.kind === "normal" ||
    layer.kind === "bumpMap" ||
    layer.kind === "roughnessMap" ||
    layer.kind === "mask" ||
    layer.kind === "displace"
    ? 2
    : 1;
}

export function MaterialLayersPanel({
  object,
  updateMaterial,
}: {
  object: SceneObject;
  updateMaterial: (id: string, material: Partial<Material>) => void;
}) {
  const layers = object.material.layers ?? [];
  const [layerMessage, setLayerMessage] = useState<Record<string, string>>({});

  function setLayers(nextLayers: MaterialLayer[]) {
    updateMaterial(object.id, { layers: nextLayers });
  }

  function updateLayer(id: string, layer: Partial<MaterialLayer>) {
    setLayers(layers.map((entry) => (entry.id === id ? { ...entry, ...layer } : entry)));
  }

  function addLayer(kind: MaterialLayerKind) {
    setLayers([...layers, createMaterialLayer(kind, layers.length + 1)]);
  }

  function deleteLayer(id: string) {
    setLayers(layers.filter((layer) => layer.id !== id));
  }

  async function handleMediaLayerUpload(layer: MaterialLayer, file: File | undefined) {
    if (!file) {
      return;
    }

    const isVideo = layer.kind === "video";
    const expectedType = isVideo ? "video/" : "image/";
    const maxBytes = isVideo ? maxLayerVideoBytes : maxLayerImageBytes;
    const label = isVideo ? "Video layer" : layer.kind === "bumpMap" ? "Bump map" : layer.kind === "roughnessMap" ? "Roughness map" : "Image layer";

    if (!file.type.startsWith(expectedType)) {
      setLayerMessage((messages) => ({ ...messages, [layer.id]: `Choose a ${isVideo ? "video" : "image"} file.` }));
      return;
    }

    if (file.size > maxBytes) {
      setLayerMessage((messages) => ({ ...messages, [layer.id]: `${label}s support files up to ${isVideo ? "24" : "8"} MB.` }));
      return;
    }

    try {
      const sourceDataUrl = await readFileAsDataUrl(file, label);
      updateLayer(layer.id, { fileName: file.name, sourceDataUrl });
      setLayerMessage((messages) => ({ ...messages, [layer.id]: `${file.name} attached.` }));
    } catch (error) {
      setLayerMessage((messages) => ({ ...messages, [layer.id]: error instanceof Error ? error.message : `${label} could not be read.` }));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Layers3 className="size-3.5" />
          Layers
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{layers.length}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {materialLayerOptions.map((option) => {
          const Icon = option.icon;

          return (
            <Button key={option.kind} className="justify-start gap-2" size="sm" variant="secondary" onClick={() => addLayer(option.kind)}>
              <Plus className="size-3.5" />
              <Icon className="size-3.5" />
              {option.label}
            </Button>
          );
        })}
      </div>

      {layers.length ? (
        <div className="space-y-3">
          {layers.map((layer) => {
            const option = materialLayerOptions.find((entry) => entry.kind === layer.kind) ?? materialLayerOptions[0];
            const Icon = option.icon;
            const hasColor =
              layer.kind === "color" ||
              layer.kind === "emissive" ||
              layer.kind === "noise" ||
              layer.kind === "pattern" ||
              layer.kind === "outline" ||
              layer.kind === "matcap" ||
              layer.kind === "lighting" ||
              layer.kind === "depth" ||
              layer.kind === "rainbow" ||
              layer.kind === "fresnel" ||
              layer.kind === "toon" ||
              layer.kind === "glass";
            const hasGradient = layer.kind === "gradient";
            const hasSecondaryColor = layer.kind === "matcap" || layer.kind === "depth";
            const hasValue = layer.kind !== "color" && layer.kind !== "gradient" && layer.kind !== "toon";
            const hasMediaUpload = layer.kind === "image" || layer.kind === "video" || layer.kind === "bumpMap" || layer.kind === "roughnessMap";

            return (
              <div key={layer.id} className="space-y-3 rounded-md border border-border p-3">
                <div className="grid grid-cols-[24px_1fr_32px] items-center gap-2">
                  <Checkbox checked={layer.enabled} onCheckedChange={(checked) => updateLayer(layer.id, { enabled: checked === true })} />
                  <Input value={layer.name} onChange={(event) => updateLayer(layer.id, { name: event.target.value })} />
                  <Button aria-label={`Delete ${layer.name}`} className="size-8" size="icon" variant="ghost" onClick={() => deleteLayer(layer.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {layer.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  <Icon className="size-3.5" />
                  <span>{option.label}</span>
                </div>

                {hasColor ? (
                  <div className="grid grid-cols-[1fr_44px] items-center gap-3">
                    <Label htmlFor={`layer-${layer.id}-color`}>{layer.kind === "depth" ? "Near" : layer.kind === "matcap" ? "Base" : "Color"}</Label>
                    <Input
                      id={`layer-${layer.id}-color`}
                      className="h-9 p-1"
                      type="color"
                      value={layer.color ?? "#ffffff"}
                      onChange={(event) => updateLayer(layer.id, { color: event.target.value })}
                    />
                  </div>
                ) : null}

                {hasGradient ? (
                  <>
                    <div className="grid grid-cols-[1fr_44px] items-center gap-3">
                      <Label htmlFor={`layer-${layer.id}-start-color`}>Start</Label>
                      <Input
                        id={`layer-${layer.id}-start-color`}
                        className="h-9 p-1"
                        type="color"
                        value={layer.color ?? "#51e0c3"}
                        onChange={(event) => updateLayer(layer.id, { color: event.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_44px] items-center gap-3">
                      <Label htmlFor={`layer-${layer.id}-end-color`}>End</Label>
                      <Input
                        id={`layer-${layer.id}-end-color`}
                        className="h-9 p-1"
                        type="color"
                        value={layer.secondaryColor ?? "#b38cff"}
                        onChange={(event) => updateLayer(layer.id, { secondaryColor: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Angle</Label>
                        <span className="font-mono text-[11px] text-muted-foreground">{Number((layer.angle ?? 90).toFixed(0))} deg</span>
                      </div>
                      <Slider max={360} min={0} step={1} value={[layer.angle ?? 90]} onValueChange={(value) => updateLayer(layer.id, { angle: firstSliderValue(value) })} />
                    </div>
                  </>
                ) : null}

                {hasMediaUpload ? (
                  <div className="space-y-2">
                    <Label htmlFor={`layer-${layer.id}-media`}>Texture</Label>
                    <Input
                      id={`layer-${layer.id}-media`}
                      accept={layer.kind === "video" ? "video/mp4,video/webm,video/ogg" : "image/*"}
                      type="file"
                      onChange={(event) => void handleMediaLayerUpload(layer, event.currentTarget.files?.[0])}
                    />
                    <p className="truncate text-xs text-muted-foreground">{layer.fileName ?? layerMessage[layer.id] ?? "No media attached."}</p>
                  </div>
                ) : null}

                {hasSecondaryColor ? (
                  <div className="grid grid-cols-[1fr_44px] items-center gap-3">
                    <Label htmlFor={`layer-${layer.id}-highlight-color`}>{layer.kind === "depth" ? "Far" : "Highlight"}</Label>
                    <Input
                      id={`layer-${layer.id}-highlight-color`}
                      className="h-9 p-1"
                      type="color"
                      value={layer.secondaryColor ?? (layer.kind === "depth" ? "#111827" : "#ffffff")}
                      onChange={(event) => updateLayer(layer.id, { secondaryColor: event.target.value })}
                    />
                  </div>
                ) : null}

                {hasValue ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>{getLayerValueLabel(layer)}</Label>
                      <span className="font-mono text-[11px] text-muted-foreground">{Number((layer.value ?? 0).toFixed(2))}</span>
                    </div>
                    <Slider
                      max={getLayerValueMax(layer)}
                      min={0}
                      step={0.01}
                      value={[layer.value ?? 0]}
                      onValueChange={(value) => updateLayer(layer.id, { value: firstSliderValue(value) })}
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Blend</Label>
                    <span className="font-mono text-[11px] text-muted-foreground">{Number(((layer.intensity ?? 1) * 100).toFixed(0))}%</span>
                  </div>
                  <Slider max={1} min={0} step={0.01} value={[layer.intensity ?? 1]} onValueChange={(value) => updateLayer(layer.id, { intensity: firstSliderValue(value) })} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Add layers to blend material color, gradients, image and video maps, noise, checker patterns, normal detail, bump and roughness maps, masks, displacement, outlines, matcap shading, lighting response, camera depth, rainbow film, fresnel edges, toon shading, glass, opacity, surface response, and glow on top of the base material.</div>
      )}
    </div>
  );
}

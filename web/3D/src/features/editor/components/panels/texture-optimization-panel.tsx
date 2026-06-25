"use client";

import { useState } from "react";
import { ImageDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { optimizeSceneTextureAssets, type TextureOptimizationOptions } from "../../utils/texture-optimization";
import { useEditorStore } from "../../store/editor-store";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function TextureOptimizationPanel() {
  const [format, setFormat] = useState<TextureOptimizationOptions["format"]>("image/webp");
  const [maxSize, setMaxSize] = useState(1024);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [quality, setQuality] = useState(0.82);
  const document = useEditorStore((state) => state.document);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const replaceDocument = useEditorStore((state) => state.replaceDocument);

  async function handleOptimize() {
    setPending(true);

    try {
      const result = await optimizeSceneTextureAssets(document, {
        format,
        maxSize: clamp(maxSize, 256, 4096),
        quality: clamp(quality, 0.3, 0.95),
      });

      if (result.optimizedTextureCount === 0) {
        setMessage(result.originalBytes > 0 ? "Textures are already at the selected target." : "No compressible image textures found.");
        return;
      }

      replaceDocument(result.optimizedDocument, selectedObjectId);
      setMessage(`${result.optimizedTextureCount} texture${result.optimizedTextureCount === 1 ? "" : "s"} optimized, ${formatBytes(result.savedBytes)} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Texture optimization failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <ImageDown className="size-4 shrink-0" />
          <span className="truncate">Texture optimization</span>
        </div>
        <div className="flex rounded-md border border-border p-0.5">
          {(["image/webp", "image/jpeg"] as const).map((option) => (
            <Button key={option} className="h-6 px-2 text-[11px]" size="sm" variant={format === option ? "default" : "ghost"} onClick={() => setFormat(option)}>
              {option === "image/webp" ? "WebP" : "JPEG"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="texture-max-size">Max size</Label>
          <Input
            id="texture-max-size"
            inputMode="numeric"
            max={4096}
            min={256}
            step={128}
            type="number"
            value={maxSize}
            onChange={(event) => setMaxSize(Math.round(clamp(toNumber(event.target.value, maxSize), 256, 4096)))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="texture-quality">Quality</Label>
          <Input
            id="texture-quality"
            inputMode="decimal"
            max={0.95}
            min={0.3}
            step={0.01}
            type="number"
            value={quality}
            onChange={(event) => setQuality(clamp(toNumber(event.target.value, quality), 0.3, 0.95))}
          />
        </div>
      </div>

      <Button className="w-full gap-2" disabled={pending} size="sm" variant="secondary" onClick={() => void handleOptimize()}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ImageDown className="size-4" />}
        Optimize image textures
      </Button>

      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}

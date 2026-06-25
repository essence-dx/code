"use client";

import { Check, Volume2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AudioPreviewButton } from "@/features/editor/components/audio-preview-button";
import type { AudioCleanupMetrics, AudioCleanupResult } from "@/lib/audio/cleanup";
import { audioCleanupIntensity, audioCleanupModes, audioCleanupProfiles, type AudioCleanupMode } from "@/lib/audio/cleanup-contract";
import type { MediaAsset } from "@/lib/editor/types";

export type AudioCleanupEngine = "local" | "service";

export interface AudioCleanupPreviewDetails {
  adapter: string;
  mode: AudioCleanupMode;
  intensity: number;
  profileLabel: string;
  before?: AudioCleanupMetrics;
  after?: AudioCleanupMetrics;
  summary: string;
}

export interface AiAudioCleanupPreview {
  sourceAsset: MediaAsset;
  cleanedAsset: MediaAsset;
  cleanup: AudioCleanupResult | AudioCleanupPreviewDetails;
}

interface AiAudioCleanupControlsProps {
  targetName?: string;
  mode: AudioCleanupMode;
  engine: AudioCleanupEngine;
  intensity: number;
  serviceConfigured: boolean;
  serviceStatusLabel?: string;
  preview: AiAudioCleanupPreview | null;
  onModeChange: (mode: AudioCleanupMode) => void;
  onEngineChange: (engine: AudioCleanupEngine) => void;
  onIntensityChange: (intensity: number) => void;
}

export function AiAudioCleanupControls({
  targetName,
  mode,
  engine,
  intensity,
  serviceConfigured,
  serviceStatusLabel,
  preview,
  onModeChange,
  onEngineChange,
  onIntensityChange,
}: AiAudioCleanupControlsProps) {
  const intensityPercent = Math.round(intensity * 100);

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Volume2 className="size-4 text-muted-foreground" />
            Audio cleanup
          </div>
          <div className="truncate text-xs text-muted-foreground">{targetName ?? "Choose an audio layer"}</div>
        </div>
        <Badge variant="secondary" className="shrink-0">
          WAV
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={engine === "local" ? "secondary" : "outline"}
          className="h-auto justify-start px-2 py-2 text-left"
          onClick={() => onEngineChange("local")}
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium">Local cleanup</span>
            <span className="block text-[11px] font-normal leading-4 text-muted-foreground">Runs in this browser.</span>
          </span>
        </Button>
        <Button
          type="button"
          variant={engine === "service" ? "secondary" : "outline"}
          className="h-auto justify-start px-2 py-2 text-left"
          disabled={!serviceConfigured}
          onClick={() => onEngineChange("service")}
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium">Advanced service</span>
            <span className="block text-[11px] font-normal leading-4 text-muted-foreground">{serviceStatusLabel ?? "Optional connected restoration."}</span>
          </span>
        </Button>
      </div>
      <div className="grid gap-1">
        {audioCleanupModes.map((option) => {
          const profile = audioCleanupProfiles[option];
          const isSelected = option === mode;

          return (
            <Button
              key={option}
              type="button"
              variant={isSelected ? "secondary" : "ghost"}
              className="h-auto justify-start gap-2 px-2 py-2 text-left"
              onClick={() => onModeChange(option)}
            >
              {isSelected ? <Check className="size-3.5 shrink-0" /> : <Wand2 className="size-3.5 shrink-0 text-muted-foreground" />}
              <span className="min-w-0">
                <span className="block text-xs font-medium">{profile.label}</span>
                <span className="block text-[11px] font-normal leading-4 text-muted-foreground">{profile.description}</span>
              </span>
            </Button>
          );
        })}
      </div>
      <div className="space-y-2 rounded-md border border-border bg-background p-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">Strength</span>
          <span className="font-mono text-muted-foreground">{intensityPercent}%</span>
        </div>
        <Slider
          min={audioCleanupIntensity.min * 100}
          max={audioCleanupIntensity.max * 100}
          step={audioCleanupIntensity.step * 100}
          value={[intensityPercent]}
          onValueChange={(value) => onIntensityChange((value[0] ?? audioCleanupIntensity.defaultValue * 100) / 100)}
          aria-label="Audio cleanup strength"
        />
      </div>
      {preview ? <AudioCleanupPreviewPanel preview={preview} /> : null}
    </div>
  );
}

function AudioCleanupPreviewPanel({ preview }: { preview: AiAudioCleanupPreview }) {
  const before = preview.cleanup.before;
  const after = preview.cleanup.after;

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{preview.cleanup.profileLabel}</span>
        <Badge variant="outline" className="shrink-0">
          Compare
        </Badge>
      </div>
      <div className="grid gap-2">
        <PreviewRow label="Before" asset={preview.sourceAsset} metrics={before} />
        <PreviewRow label="After" asset={preview.cleanedAsset} metrics={after} />
      </div>
    </div>
  );
}

function PreviewRow({ label, asset, metrics }: { label: string; asset: MediaAsset; metrics?: AudioCleanupMetrics }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md bg-muted/40 px-2 py-1">
      <AudioPreviewButton asset={asset} />
      <div className="min-w-0">
        <div className="truncate text-xs font-medium">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{asset.name}</div>
      </div>
      {metrics ? (
        <div className="text-right font-mono text-[10px] leading-4 text-muted-foreground">
          <div>Peak {formatDb(metrics.peakDb)}</div>
          <div>Floor {formatDb(metrics.noiseFloorDb)}</div>
        </div>
      ) : (
        <div className="text-right text-[10px] leading-4 text-muted-foreground">Ready</div>
      )}
    </div>
  );
}

function formatDb(value: number) {
  return `${value.toFixed(1)} dB`;
}

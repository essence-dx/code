"use client";

import { useState } from "react";
import { AudioLines, Loader2, Save, Scissors, Trash2, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { WaveformBars } from "@/features/editor/components/waveform-bars";
import { useEditorStore } from "@/features/editor/state/editor-store";
import type { MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { formatTime } from "@/lib/editor/factory";
import { beatMarkerColor, beatMarkerLabel, detectBeatMarkerTimes, isBeatMarker } from "@/lib/audio/beat-markers";
import { isLikelyMusicLayer } from "@/lib/audio/auto-ducking";
import { normalizeLayerAudioMix } from "@/lib/audio/mix";
import { audioMixPresets } from "@/lib/audio/mix-presets";
import { createVocalSplitFiles } from "@/lib/audio/vocal-split";
import { loadBrowserMediaBlob, saveBrowserMedia } from "@/lib/media/browser-media-store";
import { loadTauriMediaBlob } from "@/lib/media/tauri-media";

interface AudioMixPanelProps {
  layer: TimelineLayer;
  asset?: MediaAsset;
  onChange: (patch: Partial<TimelineLayer>) => void;
}

const waveformZoomOptions = [1, 2, 4];

export function AudioMixPanel({ layer, asset, onChange }: AudioMixPanelProps) {
  const [waveformZoom, setWaveformZoom] = useState(1);
  const [presetName, setPresetName] = useState("");
  const [beatMessage, setBeatMessage] = useState<string | null>(null);
  const [duckingMessage, setDuckingMessage] = useState<string | null>(null);
  const [isSplittingVocals, setIsSplittingVocals] = useState(false);
  const [vocalSplitMessage, setVocalSplitMessage] = useState<string | null>(null);
  const projectAudioMixPresets = useEditorStore((state) => state.project.audioMixPresets ?? []);
  const markers = useEditorStore((state) => state.project.markers ?? []);
  const addMediaAsset = useEditorStore((state) => state.addMediaAsset);
  const addLayerFromAsset = useEditorStore((state) => state.addLayerFromAsset);
  const addTimelineMarker = useEditorStore((state) => state.addTimelineMarker);
  const updateTimelineMarker = useEditorStore((state) => state.updateTimelineMarker);
  const removeTimelineMarker = useEditorStore((state) => state.removeTimelineMarker);
  const applyAutoDuckingToLayer = useEditorStore((state) => state.applyAutoDuckingToLayer);
  const saveSelectedAudioMixPreset = useEditorStore((state) => state.saveSelectedAudioMixPreset);
  const applyAudioMixPreset = useEditorStore((state) => state.applyAudioMixPreset);
  const removeAudioMixPreset = useEditorStore((state) => state.removeAudioMixPreset);
  const mix = normalizeLayerAudioMix(layer);
  const sourceStart = layer.trimStart;
  const sourceEnd = layer.trimStart + layer.duration * layer.playbackRate;
  const visiblePeaks = waveformPeaksForRegion(asset?.waveformPeaks, asset?.duration ?? sourceEnd, sourceStart, sourceEnd, waveformZoom);
  const beatMarkerCount = markers.filter(isBeatMarker).length;
  const likelyMusicLayer = isLikelyMusicLayer(layer, asset);

  function replaceBeatMarkers() {
    const times = detectBeatMarkerTimes({ layer, asset });
    if (!times.length) {
      setBeatMessage("No beat peaks found for this audio layer.");
      return;
    }

    markers.filter(isBeatMarker).forEach((marker) => removeTimelineMarker(marker.id));
    times.forEach((time, index) => {
      const marker = addTimelineMarker(time);
      updateTimelineMarker(marker.id, { label: beatMarkerLabel(index), color: beatMarkerColor });
    });
    setBeatMessage(`${times.length} beat markers added.`);
  }

  function clearBeatMarkers() {
    const beatMarkers = markers.filter(isBeatMarker);
    beatMarkers.forEach((marker) => removeTimelineMarker(marker.id));
    setBeatMessage(beatMarkers.length ? `${beatMarkers.length} beat markers removed.` : "No beat markers to remove.");
  }

  function applyAutoDucking() {
    const summary = applyAutoDuckingToLayer(layer.id);
    if (summary.changedLayerCount === 0) {
      setDuckingMessage(summary.skippedReason ?? "Auto-ducking could not find a useful split.");
      return;
    }

    setDuckingMessage(`${summary.duckedRegionCount} dialogue region${summary.duckedRegionCount === 1 ? "" : "s"} ducked into ${summary.createdLayerCount} music segments.`);
  }

  async function splitVocals() {
    setIsSplittingVocals(true);
    setVocalSplitMessage(null);

    try {
      if (!asset || asset.type !== "audio") {
        setVocalSplitMessage("Choose an audio layer before splitting vocals.");
        return;
      }

      const sourceBlob = await loadAudioAssetBlob(asset);
      if (!sourceBlob) {
        setVocalSplitMessage("Reconnect this audio file before splitting vocals.");
        return;
      }

      const split = await createVocalSplitFiles(sourceBlob, { filename: asset.name });
      const [voiceAsset, instrumentalAsset] = await Promise.all([saveBrowserMedia(split.vocalFile), saveBrowserMedia(split.instrumentalFile)]);
      addMediaAsset(voiceAsset);
      addMediaAsset(instrumentalAsset);

      const voiceLayerId = addLayerFromAsset(voiceAsset.id, {
        start: layer.start,
        duration: layer.duration,
        track: layer.track + 1,
        name: `${asset.name} voice stem`,
        notes: split.summary,
        fadeIn: mix.fadeIn,
        fadeOut: mix.fadeOut,
      });
      const instrumentalLayerId = addLayerFromAsset(instrumentalAsset.id, {
        start: layer.start,
        duration: layer.duration,
        track: layer.track + 2,
        name: `${asset.name} instrumental stem`,
        notes: split.summary,
        volume: Math.min(1, mix.volume),
        fadeIn: mix.fadeIn,
        fadeOut: mix.fadeOut,
      });

      setVocalSplitMessage(
        voiceLayerId && instrumentalLayerId
          ? "Voice and instrumental stems were saved and added to the timeline."
          : "Stem files were saved, but one timeline layer could not be added.",
      );
    } catch (error) {
      setVocalSplitMessage(error instanceof Error ? error.message : "The vocal split could not be completed.");
    } finally {
      setIsSplittingVocals(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Volume2 className="size-4 text-muted-foreground" />
        Audio mix
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Label>Volume</Label>
          <span>{Math.round(mix.volume * 100)}%</span>
        </div>
        <Slider value={[mix.volume]} min={0} max={2} step={0.01} onValueChange={([volume]) => onChange({ volume: volume ?? 1 })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FadeField label="Fade in" value={mix.fadeIn} max={layer.duration} onChange={(fadeIn) => onChange({ fadeIn })} />
        <FadeField label="Fade out" value={mix.fadeOut} max={layer.duration} onChange={(fadeOut) => onChange({ fadeOut })} />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {audioMixPresets.map((preset) => (
          <Button
            key={preset.id}
            size="sm"
            variant="outline"
            className="h-auto min-h-14 flex-col items-start gap-0 px-2 py-1 text-left"
            onClick={() => onChange(preset.patch)}
          >
            <span className="text-xs font-medium">{preset.label}</span>
            <span className="line-clamp-2 text-[10px] font-normal text-muted-foreground">{preset.description}</span>
          </Button>
        ))}
      </div>
      <div className="space-y-2 rounded-md bg-muted/40 p-2">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            className="h-8 text-xs"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Save mix preset"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              const result = saveSelectedAudioMixPreset(presetName);
              if (result.saved) setPresetName("");
            }}
          >
            <Save className="size-3.5" />
            Save
          </Button>
        </div>
        {projectAudioMixPresets.length ? (
          <div className="grid gap-1">
            {projectAudioMixPresets.slice(0, 5).map((preset) => (
              <div key={preset.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                <button className="truncate text-left text-xs" onClick={() => applyAudioMixPreset(preset.id)}>
                  {preset.name}
                </button>
                <span className="text-[10px] text-muted-foreground">{Math.round(preset.volume * 100)}%</span>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => removeAudioMixPreset(preset.id)} aria-label={`Remove ${preset.name}`}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="space-y-2 rounded-md bg-muted/40 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AudioLines className="size-3.5 text-muted-foreground" />
            Beat markers
          </div>
          <Badge variant="outline">{beatMarkerCount}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={replaceBeatMarkers} disabled={!asset?.waveformPeaks?.length}>
            Generate
          </Button>
          <Button size="sm" variant="ghost" onClick={clearBeatMarkers} disabled={beatMarkerCount === 0}>
            Clear
          </Button>
        </div>
        {beatMessage ? <div className="text-[11px] text-muted-foreground">{beatMessage}</div> : null}
      </div>
      <div className="space-y-2 rounded-md bg-muted/40 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <VolumeX className="size-3.5 text-muted-foreground" />
            Auto-duck music
          </div>
          <Badge variant={likelyMusicLayer ? "secondary" : "outline"}>{likelyMusicLayer ? "Music" : "Audio"}</Badge>
        </div>
        <Button size="sm" variant="outline" className="w-full" onClick={applyAutoDucking} disabled={layer.kind !== "audio"}>
          Analyze dialogue regions
        </Button>
        {duckingMessage ? <div className="text-[11px] text-muted-foreground">{duckingMessage}</div> : null}
      </div>
      <div className="space-y-2 rounded-md bg-muted/40 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Scissors className="size-3.5 text-muted-foreground" />
            Split vocals
          </div>
          <Badge variant={asset?.type === "audio" ? "secondary" : "outline"}>{asset?.type === "audio" ? "Stereo" : "Audio only"}</Badge>
        </div>
        <Button size="sm" variant="outline" className="w-full" onClick={splitVocals} disabled={asset?.type !== "audio" || isSplittingVocals}>
          {isSplittingVocals ? <Loader2 className="size-3.5 animate-spin" /> : <Scissors className="size-3.5" />}
          Create voice and instrumental stems
        </Button>
        {vocalSplitMessage ? <div className="text-[11px] text-muted-foreground">{vocalSplitMessage}</div> : null}
      </div>
      <div className="space-y-2 rounded-md bg-muted/40 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium">Region</div>
          <div className="flex gap-1">
            {waveformZoomOptions.map((zoom) => (
              <Button
                key={zoom}
                size="sm"
                variant={waveformZoom === zoom ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setWaveformZoom(zoom)}
              >
                {zoom}x
              </Button>
            ))}
          </div>
        </div>
        <WaveformBars peaks={visiblePeaks} className="h-10 text-primary" barClassName="w-0.5" />
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>
            Timeline {formatTime(layer.start)} - {formatTime(layer.start + layer.duration)}
          </div>
          <div>
            Source {formatTime(sourceStart)} - {formatTime(sourceEnd)}
          </div>
          <div>Clip {formatTime(layer.duration)}</div>
          <div>Speed {layer.playbackRate.toFixed(2)}x</div>
        </div>
      </div>
    </div>
  );
}

async function loadAudioAssetBlob(asset: MediaAsset) {
  if (asset.source === "tauri-fs") {
    return loadTauriMediaBlob(asset);
  }

  if (asset.source === "browser-indexeddb" || asset.source === "browser-opfs") {
    return loadBrowserMediaBlob(asset.storageKey);
  }

  if (asset.objectUrl || asset.storageKey) {
    const response = await fetch(asset.objectUrl || asset.storageKey);
    return response.ok ? response.blob() : null;
  }

  return null;
}

function waveformPeaksForRegion(peaks: number[] | undefined, assetDuration: number, sourceStart: number, sourceEnd: number, zoom: number) {
  if (!peaks?.length) return undefined;

  const safeDuration = Math.max(assetDuration, sourceEnd, 0.001);
  const startIndex = Math.max(0, Math.floor((sourceStart / safeDuration) * peaks.length));
  const endIndex = Math.min(peaks.length, Math.ceil((Math.min(sourceEnd, safeDuration) / safeDuration) * peaks.length));
  const region = peaks.slice(startIndex, Math.max(startIndex + 1, endIndex));
  const targetLength = Math.max(8, Math.floor(region.length / zoom));

  return region.slice(0, targetLength);
}

function FadeField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  function handleChange(rawValue: string) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.max(0, Math.min(max, parsed)));
  }

  return (
    <label className="space-y-1 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <Input className="h-8 font-mono text-xs" type="number" min={0} max={max} step={0.05} value={value} onChange={(event) => handleChange(event.target.value)} />
    </label>
  );
}

"use client";

import {
  Download,
  Eraser,
  FileMusic,
  Layers3,
  MapPinned,
  Mic2,
  Minus,
  Music2,
  Plus,
  RotateCcw,
  Save,
  Scissors,
  Shuffle,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cropAndFadeAudio } from "@/features/audio/audio-processing";
import { audioExtension, downloadAudioBlob } from "@/features/audio/download";
import { formatDuration } from "@/features/audio/format";
import { WaveformCanvas } from "@/features/audio/waveform-canvas";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import type { EditableSongPatch, LocalSong } from "@/features/library/types";

type StudioPanelProps = {
  song?: LocalSong;
  onUpdate: (id: string, patch: EditableSongPatch) => Promise<void>;
  onSaveEdit: (
    source: LocalSong,
    blob: Blob,
    patch: EditableSongPatch,
  ) => Promise<LocalSong>;
  onExtractStems?: (song: LocalSong) => Promise<void>;
  onCoverRemixRegion?: (input: {
    audioBlob: Blob;
    durationMs: number;
    endMs: number;
    source: LocalSong;
    startMs: number;
    targetStyle: string;
    title: string;
  }) => Promise<void>;
  onExtendFromSplit?: (input: {
    continuationPrompt: string;
    extendFromMs: number;
    source: LocalSong;
    title: string;
  }) => Promise<void>;
  onExtractMidiRegion?: (input: {
    audioBlob: Blob;
    durationMs: number;
    endMs: number;
    source: LocalSong;
    startMs: number;
    title: string;
  }) => Promise<void>;
  onCreateWarpMarkersRegion?: (input: {
    audioBlob: Blob;
    durationMs: number;
    endMs: number;
    source: LocalSong;
    startMs: number;
    title: string;
  }) => Promise<void>;
  onCreateStemVariationRegion?: (input: {
    audioBlob: Blob;
    directionPrompt: string;
    durationMs: number;
    endMs: number;
    source: LocalSong;
    startMs: number;
    title: string;
  }) => Promise<void>;
  onGenerateVocalsRegion?: (input: {
    audioBlob: Blob;
    durationMs: number;
    endMs: number;
    source: LocalSong;
    startMs: number;
    title: string;
  }) => Promise<void>;
  onGenerateInstrumentalRegion?: (input: {
    audioBlob: Blob;
    durationMs: number;
    endMs: number;
    source: LocalSong;
    startMs: number;
    title: string;
  }) => Promise<void>;
  onRemasterRegion?: (input: {
    audioBlob: Blob;
    durationMs: number;
    endMs: number;
    source: LocalSong;
    startMs: number;
    title: string;
  }) => Promise<void>;
  onRemoveFxRegion?: (input: {
    audioBlob: Blob;
    durationMs: number;
    endMs: number;
    source: LocalSong;
    startMs: number;
    title: string;
  }) => Promise<void>;
  onReplaceSectionRegion?: (input: {
    directionPrompt: string;
    endMs: number;
    mode: "replace";
    source: LocalSong;
    startMs: number;
    title: string;
  }) => Promise<void>;
  remasterBusy?: boolean;
  remasterReady?: boolean;
  removeFxBusy?: boolean;
  removeFxReady?: boolean;
  midiBusy?: boolean;
  midiReady?: boolean;
  vocalsBusy?: boolean;
  vocalsReady?: boolean;
  instrumentalBusy?: boolean;
  instrumentalReady?: boolean;
  replaceSectionBusy?: boolean;
  replaceSectionReady?: boolean;
  coverRemixBusy?: boolean;
  coverRemixReady?: boolean;
  extendBusy?: boolean;
  extendReady?: boolean;
  stemExtractionBusy?: boolean;
  stemExtractionReady?: boolean;
  stemVariationBusy?: boolean;
  stemVariationReady?: boolean;
  warpMarkersBusy?: boolean;
  warpMarkersReady?: boolean;
};

const MIN_REGION_MS = 500;
const NUDGE_MS = 500;

export function StudioPanel({
  song,
  onUpdate,
  onSaveEdit,
  onCoverRemixRegion,
  onExtendFromSplit,
  onExtractMidiRegion,
  onCreateWarpMarkersRegion,
  onCreateStemVariationRegion,
  onExtractStems,
  onGenerateVocalsRegion,
  onGenerateInstrumentalRegion,
  onRemasterRegion,
  onRemoveFxRegion,
  onReplaceSectionRegion,
  remasterBusy,
  remasterReady,
  removeFxBusy,
  removeFxReady,
  midiBusy,
  midiReady,
  vocalsBusy,
  vocalsReady,
  instrumentalBusy,
  instrumentalReady,
  replaceSectionBusy,
  replaceSectionReady,
  coverRemixBusy,
  coverRemixReady,
  extendBusy,
  extendReady,
  stemExtractionBusy,
  stemExtractionReady,
  stemVariationBusy,
  stemVariationReady,
  warpMarkersBusy,
  warpMarkersReady,
}: StudioPanelProps) {
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const generationActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "generation", title);
  const durationMs = Math.max(1000, song?.durationMs || 1000);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [region, setRegion] = useState<[number, number]>([0, durationMs]);
  const [splitMs, setSplitMs] = useState(Math.round(durationMs / 2));
  const [fadeIn, setFadeIn] = useState(true);
  const [fadeOut, setFadeOut] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setTitle(song?.title ?? "");
    setLyrics(song?.lyrics ?? "");
    setStylePrompt(song?.stylePrompt ?? "");
    const nextDuration = Math.max(1000, song?.durationMs || 1000);
    setRegion([0, nextDuration]);
    setSplitMs(Math.round(nextDuration / 2));
  }, [song?.id, song?.lyrics, song?.stylePrompt, song?.title, song?.durationMs]);

  const regionLabel = useMemo(
    () => `${formatDuration(region[0])} - ${formatDuration(region[1])}`,
    [region],
  );
  const splitLabel = useMemo(() => formatDuration(splitMs), [splitMs]);

  async function saveMetadata() {
    if (!song) {
      return;
    }

    await onUpdate(song.id, { title, lyrics, stylePrompt });
    toast.success("Track notes saved.");
  }

  function resetRegion() {
    setRegion([0, durationMs]);
  }

  function resetSplit() {
    setSplitMs(Math.round(durationMs / 2));
  }

  function nudgeRegionStart(deltaMs: number) {
    setRegion(([start, end]) => [
      clamp(start + deltaMs, 0, end - MIN_REGION_MS),
      end,
    ]);
  }

  function nudgeRegionEnd(deltaMs: number) {
    setRegion(([start, end]) => [
      start,
      clamp(end + deltaMs, start + MIN_REGION_MS, durationMs),
    ]);
  }

  function nudgeSplit(deltaMs: number) {
    setSplitMs((current) =>
      clamp(
        current + deltaMs,
        MIN_REGION_MS,
        Math.max(MIN_REGION_MS, durationMs - MIN_REGION_MS),
      ),
    );
  }

  async function saveEdit() {
    if (!song) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: fadeIn ? 250 : 0,
        fadeOutMs: fadeOut ? 450 : 0,
      });
      await onSaveEdit(song, edited.blob, {
        title: `${title || song.title} cut`,
        lyrics,
        stylePrompt,
        durationMs: edited.durationMs,
        tags: Array.from(new Set([...song.tags, "edit"])),
      });
    } finally {
      setProcessing(false);
    }
  }

  async function saveSplit() {
    if (!song) {
      return;
    }

    setProcessing(true);
    try {
      const left = await cropAndFadeAudio(song.audioBlob, {
        startMs: 0,
        endMs: splitMs,
        fadeInMs: 0,
        fadeOutMs: fadeOut ? 250 : 0,
      });
      const right = await cropAndFadeAudio(song.audioBlob, {
        startMs: splitMs,
        endMs: durationMs,
        fadeInMs: fadeIn ? 250 : 0,
        fadeOutMs: 0,
      });
      const baseTitle = title || song.title;

      await onSaveEdit(song, left.blob, {
        title: `${baseTitle} part 1`,
        lyrics,
        stylePrompt,
        durationMs: left.durationMs,
        tags: Array.from(new Set([...song.tags, "split"])),
      });
      await onSaveEdit(song, right.blob, {
        title: `${baseTitle} part 2`,
        lyrics,
        stylePrompt,
        durationMs: right.durationMs,
        tags: Array.from(new Set([...song.tags, "split"])),
      });
    } finally {
      setProcessing(false);
    }
  }

  async function exportRange() {
    if (!song) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: fadeIn ? 250 : 0,
        fadeOutMs: fadeOut ? 450 : 0,
      });
      downloadAudioBlob(edited.blob, `${title || song.title} range.wav`);
    } finally {
      setProcessing(false);
    }
  }

  async function remasterRegion() {
    if (!song || !onRemasterRegion) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: fadeIn ? 250 : 0,
        fadeOutMs: fadeOut ? 450 : 0,
      });
      await onRemasterRegion({
        audioBlob: edited.blob,
        durationMs: edited.durationMs,
        endMs: region[1],
        source: song,
        startMs: region[0],
        title: `${title || song.title} region remaster`,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function removeFxRegion() {
    if (!song || !onRemoveFxRegion) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: 0,
        fadeOutMs: 0,
      });
      await onRemoveFxRegion({
        audioBlob: edited.blob,
        durationMs: edited.durationMs,
        endMs: region[1],
        source: song,
        startMs: region[0],
        title: `${title || song.title} cleaned region`,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function extractMidiRegion() {
    if (!song || !onExtractMidiRegion) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: 0,
        fadeOutMs: 0,
      });
      await onExtractMidiRegion({
        audioBlob: edited.blob,
        durationMs: edited.durationMs,
        endMs: region[1],
        source: song,
        startMs: region[0],
        title: `${title || song.title} region MIDI`,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function createStemVariationRegion() {
    if (!song || !onCreateStemVariationRegion) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: 0,
        fadeOutMs: 0,
      });
      await onCreateStemVariationRegion({
        audioBlob: edited.blob,
        directionPrompt:
          stylePrompt ||
          song.stylePrompt ||
          "Create a tasteful alternate take for this selected region.",
        durationMs: edited.durationMs,
        endMs: region[1],
        source: song,
        startMs: region[0],
        title: `${title || song.title} region variation`,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function createWarpMarkersRegion() {
    if (!song || !onCreateWarpMarkersRegion) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: 0,
        fadeOutMs: 0,
      });
      await onCreateWarpMarkersRegion({
        audioBlob: edited.blob,
        durationMs: edited.durationMs,
        endMs: region[1],
        source: song,
        startMs: region[0],
        title: `${title || song.title} warp markers`,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function generateVocalsRegion() {
    if (!song || !onGenerateVocalsRegion) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: 0,
        fadeOutMs: 0,
      });
      await onGenerateVocalsRegion({
        audioBlob: edited.blob,
        durationMs: edited.durationMs,
        endMs: region[1],
        source: song,
        startMs: region[0],
        title: `${title || song.title} vocals`,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function generateInstrumentalRegion() {
    if (!song || !onGenerateInstrumentalRegion) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: 0,
        fadeOutMs: 0,
      });
      await onGenerateInstrumentalRegion({
        audioBlob: edited.blob,
        durationMs: edited.durationMs,
        endMs: region[1],
        source: song,
        startMs: region[0],
        title: `${title || song.title} instrumental`,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function replaceSectionRegion() {
    if (!song || !onReplaceSectionRegion) {
      return;
    }

    await onReplaceSectionRegion({
      directionPrompt:
        stylePrompt ||
        song.stylePrompt ||
        "Replace the selected section with a natural alternate performance.",
      endMs: region[1],
      mode: "replace",
      source: song,
      startMs: region[0],
      title: `${title || song.title} section edit`,
    });
  }

  async function coverRemixRegion() {
    if (!song || !onCoverRemixRegion) {
      return;
    }

    setProcessing(true);
    try {
      const edited = await cropAndFadeAudio(song.audioBlob, {
        startMs: region[0],
        endMs: region[1],
        fadeInMs: fadeIn ? 250 : 0,
        fadeOutMs: fadeOut ? 450 : 0,
      });
      await onCoverRemixRegion({
        audioBlob: edited.blob,
        durationMs: edited.durationMs,
        endMs: region[1],
        source: song,
        startMs: region[0],
        targetStyle: stylePrompt || song.stylePrompt || "fresh remix arrangement",
        title: `${title || song.title} region remix`,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function extendFromSplit() {
    if (!song || !onExtendFromSplit) {
      return;
    }

    await onExtendFromSplit({
      continuationPrompt:
        stylePrompt ||
        song.stylePrompt ||
        "Continue the arrangement naturally with a stronger next section.",
      extendFromMs: splitMs,
      source: song,
      title: `${title || song.title} extension`,
    });
  }

  function exportFullSong() {
    if (!song) {
      return;
    }

    downloadAudioBlob(
      song.audioBlob,
      `${title || song.title}.${audioExtension(song.audioType)}`,
    );
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="size-4 text-emerald-200" />
          Studio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <WaveformCanvas
          blob={song?.audioBlob}
          startMs={region[0]}
          endMs={region[1]}
          durationMs={song?.durationMs}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Region</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{regionLabel}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs"
                disabled={!song}
                onClick={resetRegion}
              >
                <RotateCcw className="size-3" />
                Full
              </Button>
            </div>
          </div>
          <Slider
            value={region}
            min={0}
            max={durationMs}
            step={NUDGE_MS}
            disabled={!song}
            onValueChange={([start, end]) =>
              setRegion([
                Math.min(start, end - MIN_REGION_MS),
                Math.max(end, start + MIN_REGION_MS),
              ])
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <NudgeButton
                label="Move region start earlier"
                disabled={!song}
                direction="down"
                onClick={() => nudgeRegionStart(-NUDGE_MS)}
              />
              <NudgeButton
                label="Move region start later"
                disabled={!song}
                direction="up"
                onClick={() => nudgeRegionStart(NUDGE_MS)}
              />
              <span className="text-xs text-muted-foreground">Start</span>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <span className="text-xs text-muted-foreground">End</span>
              <NudgeButton
                label="Move region end earlier"
                disabled={!song}
                direction="down"
                onClick={() => nudgeRegionEnd(-NUDGE_MS)}
              />
              <NudgeButton
                label="Move region end later"
                disabled={!song}
                direction="up"
                onClick={() => nudgeRegionEnd(NUDGE_MS)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FadeSwitch label="Fade in" checked={fadeIn} onCheckedChange={setFadeIn} />
            <FadeSwitch label="Fade out" checked={fadeOut} onCheckedChange={setFadeOut} />
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <Label>Split point</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{splitLabel}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs"
                disabled={!song}
                onClick={resetSplit}
              >
                <RotateCcw className="size-3" />
                Center
              </Button>
            </div>
          </div>
          <Slider
            value={[splitMs]}
            min={MIN_REGION_MS}
            max={Math.max(1000, durationMs - MIN_REGION_MS)}
            step={NUDGE_MS}
            disabled={!song || durationMs <= 1000}
            onValueChange={([value]) => setSplitMs(value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <NudgeButton
              label="Move split point earlier"
              disabled={!song || durationMs <= 1000}
              direction="down"
              onClick={() => nudgeSplit(-NUDGE_MS)}
            />
            <NudgeButton
              label="Move split point later"
              disabled={!song || durationMs <= 1000}
              direction="up"
              onClick={() => nudgeSplit(NUDGE_MS)}
            />
            <Button
              variant="secondary"
              className="gap-2"
              disabled={!song || processing}
              onClick={saveSplit}
            >
              <Scissors className="size-4" />
              Save split
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="track-title">Title</Label>
            <Input
              id="track-title"
              value={title}
              disabled={!song}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-style">Style prompt</Label>
            <Input
              id="track-style"
              value={stylePrompt}
              disabled={!song}
              onChange={(event) => setStylePrompt(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="track-lyrics">Lyrics</Label>
          <Textarea
            id="track-lyrics"
            value={lyrics}
            disabled={!song}
            onChange={(event) => setLyrics(event.target.value)}
            className="min-h-44"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {connectionDisabled ? (
            <Badge variant="outline">{onlineGuard.generationDisabledReason}</Badge>
          ) : null}
          <Button className="gap-2" disabled={!song} onClick={saveMetadata}>
            <Save className="size-4" />
            Save notes
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!song}
            onClick={exportFullSong}
          >
            <Download className="size-4" />
            Export full
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!song || processing}
            onClick={exportRange}
          >
            <Download className="size-4" />
            Export range
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!song || processing}
            onClick={saveEdit}
          >
            <Scissors className="size-4" />
            Save edit
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onExtractStems ||
              !stemExtractionReady ||
              stemExtractionBusy
            }
            title={generationActionTitle(
              stemExtractionReady
                ? "Extract stems"
                : "Stem extraction is not connected",
            )}
            onClick={() => {
              if (song && onExtractStems) {
                void onExtractStems(song);
              }
            }}
          >
            <Layers3 className="size-4" />
            Stems
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onCreateStemVariationRegion ||
              !stemVariationReady ||
              stemVariationBusy
            }
            title={generationActionTitle(
              stemVariationReady
                ? "Create a stem-style variation from selected region"
                : "Stem variation is not connected",
            )}
            onClick={() => {
              void createStemVariationRegion();
            }}
          >
            <Sparkles className="size-4" />
            Stem variation
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onExtractMidiRegion ||
              !midiReady ||
              midiBusy
            }
            title={generationActionTitle(
              midiReady
                ? "Extract MIDI from selected region"
                : "Audio-to-MIDI extraction is not connected",
            )}
            onClick={() => {
              void extractMidiRegion();
            }}
          >
            <FileMusic className="size-4" />
            Audio to MIDI
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onCreateWarpMarkersRegion ||
              !warpMarkersReady ||
              warpMarkersBusy
            }
            title={generationActionTitle(
              warpMarkersReady
                ? "Analyze timing markers for selected region"
                : "Warp marker analysis is not connected",
            )}
            onClick={() => {
              void createWarpMarkersRegion();
            }}
          >
            <MapPinned className="size-4" />
            Warp markers
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onGenerateVocalsRegion ||
              !vocalsReady ||
              vocalsBusy
            }
            title={generationActionTitle(
              vocalsReady
                ? "Generate vocals for selected region"
                : "Generated vocals are not connected",
            )}
            onClick={() => {
              void generateVocalsRegion();
            }}
          >
            <Mic2 className="size-4" />
            Add vocals
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onGenerateInstrumentalRegion ||
              !instrumentalReady ||
              instrumentalBusy
            }
            title={generationActionTitle(
              instrumentalReady
                ? "Generate instrumental for selected region"
                : "Instrumental backing is not connected",
            )}
            onClick={() => {
              void generateInstrumentalRegion();
            }}
          >
            <Music2 className="size-4" />
            Add instrumental
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onRemasterRegion ||
              !remasterReady ||
              remasterBusy
            }
            title={generationActionTitle(
              remasterReady
                ? "Remaster selected region"
                : "Remastering is not connected",
            )}
            onClick={() => {
              void remasterRegion();
            }}
          >
            <Sparkles className="size-4" />
            Remaster region
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onRemoveFxRegion ||
              !removeFxReady ||
              removeFxBusy
            }
            title={generationActionTitle(
              removeFxReady
                ? "Clean selected region"
                : "Remove FX cleanup is not connected",
            )}
            onClick={() => {
              void removeFxRegion();
            }}
          >
            <Eraser className="size-4" />
            Remove FX
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onReplaceSectionRegion ||
              !replaceSectionReady ||
              replaceSectionBusy
            }
            title={generationActionTitle(
              replaceSectionReady
                ? "Replace selected region"
                : "Section replacement is not connected",
            )}
            onClick={() => {
              void replaceSectionRegion();
            }}
          >
            <Scissors className="size-4" />
            Replace region
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onCoverRemixRegion ||
              !coverRemixReady ||
              coverRemixBusy
            }
            title={generationActionTitle(
              coverRemixReady
                ? "Create remix from selected region"
                : "Cover/remix generation is not connected",
            )}
            onClick={() => {
              void coverRemixRegion();
            }}
          >
            <Shuffle className="size-4" />
            Remix region
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={
              !song ||
              connectionDisabled ||
              processing ||
              !onExtendFromSplit ||
              !extendReady ||
              extendBusy
            }
            title={generationActionTitle(
              extendReady
                ? "Extend from split point"
                : "Song extension is not connected",
            )}
            onClick={() => {
              void extendFromSplit();
            }}
          >
            <SkipForward className="size-4" />
            Extend from split
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function NudgeButton({
  direction,
  disabled,
  label,
  onClick,
}: {
  direction: "down" | "up";
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {direction === "down" ? (
            <Minus className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function FadeSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-slate-950/50 px-3 py-2">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

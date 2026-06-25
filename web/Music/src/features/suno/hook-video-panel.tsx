"use client";

import { Download, Film, Loader2, Play, Send, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/features/audio/format";
import { exportHookVideo } from "@/features/hooks/hook-video-export";
import type {
  HookPostInput,
  HookVisibility,
} from "@/features/hooks/local-hook-feed";
import type { LocalSong } from "@/features/library/types";
import { useObjectUrl } from "@/hooks/use-object-url";

type HookVideoPanelProps = {
  onSaveHook?: (input: HookPostInput) => Promise<unknown>;
  song?: LocalSong;
};

const maxHookDurationMs = 30_000;
const minHookDurationMs = 3_000;
const stepMs = 500;

export function HookVideoPanel({ onSaveHook, song }: HookVideoPanelProps) {
  const [videoFile, setVideoFile] = useState<File | undefined>();
  const [startMs, setStartMs] = useState(0);
  const [durationMs, setDurationMs] = useState(15_000);
  const [overlayText, setOverlayText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<HookVisibility>("public");
  const videoUrl = useObjectUrl(videoFile);
  const audioUrl = useObjectUrl(song?.audioBlob);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const songDurationMs = Math.max(song?.durationMs ?? 0, minHookDurationMs);
  const safeDurationMs = Math.min(
    durationMs,
    Math.max(minHookDurationMs, songDurationMs - startMs),
    maxHookDurationMs,
  );

  useEffect(() => {
    setStartMs(0);
    setDurationMs(Math.min(15_000, Math.max(minHookDurationMs, songDurationMs)));
    setOverlayText(createInitialOverlay(song));
  }, [song?.id, songDurationMs, song]);

  async function previewHook() {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio || !videoUrl || !song) {
      return;
    }

    try {
      video.currentTime = 0;
      audio.currentTime = startMs / 1000;
      video.muted = true;
      await Promise.all([video.play(), audio.play()]);
      window.setTimeout(() => {
        video.pause();
        audio.pause();
      }, safeDurationMs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not preview hook.");
    }
  }

  async function exportVideo() {
    setExporting(true);
    try {
      const blob = await renderHookBlob();

      downloadBlob(blob, `${safeFileName(song?.title ?? "hook")}-hook.webm`);
      toast.success("Hook video exported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export hook.");
    } finally {
      setExporting(false);
    }
  }

  async function saveToFeed() {
    if (!onSaveHook || !song) {
      return;
    }

    setSaving(true);
    try {
      const blob = await renderHookBlob();

      await onSaveHook({
        durationMs: safeDurationMs,
        overlayText,
        song,
        startMs,
        videoBlob: blob,
        visibility,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save hook.");
    } finally {
      setSaving(false);
    }
  }

  async function renderHookBlob() {
    const video = videoRef.current;

    if (!video || !song || !videoFile) {
      throw new Error("Choose a selected song and a video first.");
    }

    return exportHookVideo({
      audioBlob: song.audioBlob,
      durationMs: safeDurationMs,
      overlayText,
      startMs,
      video,
    });
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Film className="size-4 text-emerald-200" />
          Hook video
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="relative aspect-[9/16] max-h-[620px] overflow-hidden rounded-md border border-white/10 bg-slate-950">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="size-full object-cover"
                controls
                loop
                muted
                playsInline
              />
            ) : (
              <div className="flex size-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Upload a vertical or horizontal video to preview the hook.
              </div>
            )}
            {overlayText.trim() ? (
              <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md bg-slate-950/70 p-4 text-lg font-semibold leading-tight text-white">
                {overlayText}
              </div>
            ) : null}
          </div>
          {audioUrl ? (
            <audio ref={audioRef} src={audioUrl} className="w-full" controls />
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
            <p className="font-medium">{song?.title ?? "No track selected"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {song
                ? `${song.artist} / ${formatDuration(song.durationMs)}`
                : "Select a library track before creating a hook."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hook-video">Video</Label>
            <Input
              id="hook-video"
              type="file"
              accept="video/*"
              onChange={(event) => setVideoFile(event.target.files?.[0])}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Start</Label>
              <span className="text-xs text-muted-foreground">
                {formatDuration(startMs)}
              </span>
            </div>
            <Slider
              value={[startMs]}
              min={0}
              max={Math.max(0, songDurationMs - minHookDurationMs)}
              step={stepMs}
              disabled={!song}
              onValueChange={([value]) => setStartMs(value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Length</Label>
              <span className="text-xs text-muted-foreground">
                {formatDuration(safeDurationMs)}
              </span>
            </div>
            <Slider
              value={[safeDurationMs]}
              min={minHookDurationMs}
              max={Math.min(maxHookDurationMs, songDurationMs)}
              step={stepMs}
              disabled={!song}
              onValueChange={([value]) => setDurationMs(value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hook-overlay">Lyric overlay</Label>
            <Textarea
              id="hook-overlay"
              value={overlayText}
              onChange={(event) => setOverlayText(event.target.value)}
              className="min-h-32"
              placeholder="Add a hook lyric or caption"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="gap-2"
              disabled={!song || !videoFile || exporting || saving}
              onClick={() => {
                void previewHook();
              }}
            >
              <Play className="size-4" />
              Preview
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              disabled={!song || !videoFile || exporting || saving}
              onClick={() => {
                void exportVideo();
              }}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export WebM
            </Button>
            <Button
              className="gap-2"
              disabled={!song || !videoFile || exporting || saving || !onSaveHook}
              onClick={() => {
                void saveToFeed();
              }}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Save feed
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm">
            <span className="text-muted-foreground">Feed visibility</span>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as HookVisibility)}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Export a short WebM from the selected song section, uploaded video,
            and overlay text.
          </p>
          {!videoFile ? (
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm text-muted-foreground">
              <Upload className="size-4" />
              Upload a short video to activate preview and export.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function createInitialOverlay(song?: LocalSong) {
  if (!song?.lyrics.trim()) {
    return song?.title ?? "";
  }

  return song.lyrics
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && line.length <= 96) ?? song.title;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "hook-video";
}

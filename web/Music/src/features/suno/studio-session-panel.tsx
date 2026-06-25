"use client";

import {
  Download,
  MapPinned,
  Music2,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/features/audio/format";
import type { LocalSong } from "@/features/library/types";
import {
  createStudioMarkerMidiFile,
  studioMidiFileName,
} from "@/features/studio/midi-export";
import type {
  LocalStudioMarker,
  LocalStudioProject,
  LocalStudioTakeLane,
  StudioMarkerKind,
  StudioTimeSignature,
} from "@/features/studio/types";

type StudioSessionPanelProps = {
  loading: boolean;
  onAddMarker: (startMs: number) => Promise<void>;
  onAddTakeLane: (trackId: string) => Promise<void>;
  onUpdateProject: (patch: Partial<LocalStudioProject>) => Promise<void>;
  project?: LocalStudioProject;
  songMap: Map<string, LocalSong>;
};

const timeSignatures: StudioTimeSignature[] = ["4/4", "3/4", "6/8", "5/4", "7/8"];
const markerKinds: StudioMarkerKind[] = [
  "intro",
  "verse",
  "chorus",
  "hook",
  "bridge",
  "outro",
  "note",
];

export function StudioSessionPanel({
  loading,
  onAddMarker,
  onAddTakeLane,
  onUpdateProject,
  project,
  songMap,
}: StudioSessionPanelProps) {
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const durationMs = useMemo(() => getProjectDuration(project, songMap), [project, songMap]);
  const trackId = selectedTrackId || project?.tracks[0]?.id || "";

  if (!project) {
    return (
      <div className="rounded-md border border-white/10 bg-slate-950/50 p-4 text-sm text-muted-foreground">
        {loading ? "Loading Studio session..." : "Create a Studio project to edit session controls."}
      </div>
    );
  }
  const currentProject = project;

  function updateMarker(markerId: string, patch: Partial<LocalStudioMarker>) {
    void onUpdateProject({
      markers: currentProject.markers.map((marker) =>
        marker.id === markerId ? { ...marker, ...patch } : marker,
      ),
    });
  }

  function updateTakeLane(takeId: string, patch: Partial<LocalStudioTakeLane>) {
    void onUpdateProject({
      takeLanes: currentProject.takeLanes.map((take) =>
        take.id === takeId ? { ...take, ...patch } : take,
      ),
    });
  }

  function removeMarker(markerId: string) {
    void onUpdateProject({
      markers: currentProject.markers.filter((marker) => marker.id !== markerId),
    });
  }

  function removeTakeLane(takeId: string) {
    void onUpdateProject({
      takeLanes: currentProject.takeLanes.filter((take) => take.id !== takeId),
    });
  }

  function exportMetadata() {
    const tracks = currentProject.tracks.map((track) => {
      const song = songMap.get(track.songId);

      return {
        ...track,
        durationMs: song?.durationMs ?? null,
        rightsMetadata: song?.rightsMetadata ?? null,
        sourceTitle: song?.title ?? track.trackName,
        tags: song?.tags ?? [],
      };
    });
    const payload = {
      exportedAt: new Date().toISOString(),
      project: {
        bpm: currentProject.bpm,
        markers: currentProject.markers,
        pitchSemitones: currentProject.pitchSemitones,
        takeLanes: currentProject.takeLanes,
        timeSignature: currentProject.timeSignature,
        title: currentProject.title,
        tracks,
      },
      type: "essence-suno-studio-session",
      version: 2,
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
      `${safeFileName(currentProject.title)}-studio-session.json`,
    );
    toast.success("Studio session metadata exported.");
  }

  function exportMidiMarkers() {
    const midi = createStudioMarkerMidiFile(currentProject);

    downloadBlob(
      new Blob([midi], { type: "audio/midi" }),
      studioMidiFileName(currentProject.title),
    );
    toast.success("Studio MIDI markers exported.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-emerald-200" />
            <p className="font-medium">Session controls</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="gap-2" onClick={exportMetadata}>
              <Download className="size-4" />
              Export metadata
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              disabled={!project.markers.length}
              onClick={exportMidiMarkers}
            >
              <Download className="size-4" />
              Export MIDI
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="studio-bpm">BPM</Label>
            <Input
              id="studio-bpm"
              type="number"
              min={40}
              max={240}
              value={project.bpm}
              onChange={(event) => {
                void onUpdateProject({
                  bpm: clampInteger(Number(event.target.value), 40, 240),
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Time signature</Label>
            <Select
              value={project.timeSignature}
              onValueChange={(value) => {
                void onUpdateProject({
                  timeSignature: value as StudioTimeSignature,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSignatures.map((signature) => (
                  <SelectItem key={signature} value={signature}>
                    {signature}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Pitch</Label>
              <span className="text-xs text-muted-foreground">
                {project.pitchSemitones > 0 ? "+" : ""}
                {project.pitchSemitones} st
              </span>
            </div>
            <Slider
              value={[project.pitchSemitones]}
              min={-12}
              max={12}
              step={1}
              onValueChange={([value]) => {
                void onUpdateProject({ pitchSemitones: value });
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <MapPinned className="size-4 text-emerald-200" />
            <p className="font-medium">Arrangement markers</p>
          </div>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              void onAddMarker(nextMarkerStart(project.markers, durationMs));
            }}
          >
            <Plus className="size-4" />
            Add marker
          </Button>
        </div>
        <div className="space-y-3">
          {project.markers.map((marker) => (
            <div
              key={marker.id}
              className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-3 lg:grid-cols-[1fr_160px_1.4fr_auto]"
            >
              <Input
                aria-label="Marker label"
                value={marker.label}
                onChange={(event) =>
                  updateMarker(marker.id, { label: event.target.value })
                }
              />
              <Select
                value={marker.kind}
                onValueChange={(value) =>
                  updateMarker(marker.id, { kind: value as StudioMarkerKind })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {markerKinds.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {capitalize(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{formatDuration(marker.startMs)}</span>
                  <span>{formatDuration(durationMs)}</span>
                </div>
                <Slider
                  value={[marker.startMs]}
                  min={0}
                  max={Math.max(1000, durationMs)}
                  step={500}
                  onValueChange={([value]) =>
                    updateMarker(marker.id, { startMs: value })
                  }
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${marker.label}`}
                onClick={() => removeMarker(marker.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {!project.markers.length ? (
            <p className="text-sm text-muted-foreground">
              Add markers for verses, hooks, bridges, and edit notes.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-slate-950/50 p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Music2 className="size-4 text-emerald-200" />
              <p className="font-medium">Take lanes</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep alternates and notes tied to project tracks.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={trackId || undefined}
              onValueChange={setSelectedTrackId}
              disabled={!project.tracks.length}
            >
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue placeholder="Choose track" />
              </SelectTrigger>
              <SelectContent>
                {project.tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {songMap.get(track.songId)?.title ?? track.trackName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              className="gap-2"
              disabled={!trackId}
              onClick={() => {
                void onAddTakeLane(trackId);
              }}
            >
              <Plus className="size-4" />
              Add take
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {project.takeLanes.map((take) => (
            <div
              key={take.id}
              className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-3 lg:grid-cols-[1fr_1.4fr_auto]"
            >
              <div className="space-y-2">
                <Input
                  aria-label="Take name"
                  value={take.name}
                  onChange={(event) =>
                    updateTakeLane(take.id, { name: event.target.value })
                  }
                />
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{trackName(take.trackId, project, songMap)}</span>
                  <label className="flex items-center gap-2">
                    Active
                    <Switch
                      checked={take.active}
                      onCheckedChange={(active) =>
                        updateTakeLane(take.id, { active })
                      }
                    />
                  </label>
                </div>
              </div>
              <Textarea
                aria-label="Take notes"
                value={take.notes}
                onChange={(event) =>
                  updateTakeLane(take.id, { notes: event.target.value })
                }
                placeholder="Notes, punch-in ideas, or alternate direction"
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${take.name}`}
                onClick={() => removeTakeLane(take.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {!project.takeLanes.length ? (
            <p className="text-sm text-muted-foreground">
              Add a track to the mixer, then create alternates here.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getProjectDuration(
  project: LocalStudioProject | undefined,
  songMap: Map<string, LocalSong>,
) {
  const durations =
    project?.tracks.map((track) => songMap.get(track.songId)?.durationMs ?? 0) ?? [];

  return Math.max(30_000, ...durations);
}

function nextMarkerStart(markers: LocalStudioMarker[], durationMs: number) {
  const lastMarker = markers.toSorted((a, b) => b.startMs - a.startMs)[0];

  if (!lastMarker) {
    return 0;
  }

  return Math.min(lastMarker.startMs + 30_000, Math.max(0, durationMs - 5_000));
}

function trackName(
  trackId: string,
  project: LocalStudioProject,
  songMap: Map<string, LocalSong>,
) {
  const track = project.tracks.find((item) => item.id === trackId);

  if (!track) {
    return "Missing track";
  }

  return songMap.get(track.songId)?.title ?? track.trackName;
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "studio";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.round(value), min), max);
}

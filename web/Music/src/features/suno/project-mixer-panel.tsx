"use client";

import {
  Clock,
  MapPinned,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { createTrackAudition, type TrackAudition } from "@/features/audio/audition";
import type { LocalSong } from "@/features/library/types";
import { mergeWarpMarkersIntoStudioMarkers } from "@/features/studio/warp-markers";
import { useStudioProject } from "@/features/studio/use-studio-project";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import type {
  WarpMarkerBusyState,
  WarpMarkerJobView,
} from "@/features/ai/use-warp-marker-job";
import type { WarpMarkerJobMarker } from "@/lib/ai/schemas";
import type {
  LocalStudioProjectVersion,
  LocalStudioTrack,
} from "@/features/studio/types";
import { StudioSessionPanel } from "./studio-session-panel";
import { WarpMarkerPanel } from "./warp-marker-panel";

type ProjectMixerPanelProps = {
  onAnalyzeWarpMarkers?: (song: LocalSong) => Promise<void>;
  onApplyWarpMarkers?: (
    apply: (markers: WarpMarkerJobMarker[]) => Promise<unknown>,
  ) => Promise<unknown>;
  onRefreshWarpMarkers?: () => Promise<unknown>;
  songs: LocalSong[];
  selectedSong?: LocalSong;
  warpMarkerJob?: WarpMarkerJobView;
  warpMarkersBusy?: WarpMarkerBusyState;
  warpMarkersReady?: boolean;
};

export function ProjectMixerPanel({
  onAnalyzeWarpMarkers,
  onApplyWarpMarkers,
  onRefreshWarpMarkers,
  songs,
  selectedSong,
  warpMarkerJob,
  warpMarkersBusy,
  warpMarkersReady,
}: ProjectMixerPanelProps) {
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const generationActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "generation", title);
  const {
    project,
    versions,
    loading,
    songMap,
    addMarker,
    addTakeLane,
    addSong,
    updateProject,
    updateTrack,
    removeTrack,
    restoreVersion,
  } = useStudioProject(songs);
  const auditionRef = useRef<TrackAudition | null>(null);
  const [auditioningId, setAuditioningId] = useState<string | undefined>();
  const [restoringId, setRestoringId] = useState<string | undefined>();

  async function applyWarpMarkers(markers: WarpMarkerJobMarker[]) {
    if (!project) {
      return;
    }

    const merged = mergeWarpMarkersIntoStudioMarkers(project.markers, markers);

    if (!merged.addedCount) {
      toast.info("These warp markers are already in the Studio session.");
      return;
    }

    await updateProject({
      markers: merged.markers,
    });
  }

  async function audition(track: LocalStudioTrack) {
    const song = songMap.get(track.songId);

    if (!song) {
      toast.error("This project track is missing from the local library.");
      return;
    }

    auditionRef.current?.stop();
    const soloActive = Boolean(project?.tracks.some((item) => item.solo));
    const muted = track.muted || (soloActive && !track.solo);
    auditionRef.current = await createTrackAudition(song.audioBlob, {
      gainDb: track.gainDb,
      pan: track.pan,
      muted,
    });
    setAuditioningId(track.id);
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="size-4 text-emerald-200" />
            Project mixer
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {connectionDisabled ? (
              <Badge variant="outline">{onlineGuard.generationDisabledReason}</Badge>
            ) : null}
            <Button
              variant="secondary"
              className="gap-2"
              disabled={
                !selectedSong ||
                connectionDisabled ||
                !onAnalyzeWarpMarkers ||
                !warpMarkersReady ||
                warpMarkersBusy === "queue"
              }
              title={generationActionTitle(
                warpMarkersReady
                  ? "Analyze selected track timing markers"
                  : "Warp marker analysis is not connected",
              )}
              onClick={() => {
                if (selectedSong && onAnalyzeWarpMarkers) {
                  void onAnalyzeWarpMarkers(selectedSong);
                }
              }}
            >
              <MapPinned className="size-4" />
              Analyze markers
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              disabled={!selectedSong || loading}
              onClick={() => {
                if (selectedSong) {
                  void addSong(selectedSong);
                }
              }}
            >
              <Plus className="size-4" />
              Add selected
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <WarpMarkerPanel
          busy={warpMarkersBusy}
          job={warpMarkerJob}
          onApply={() =>
            onApplyWarpMarkers
              ? onApplyWarpMarkers(applyWarpMarkers)
              : Promise.resolve()
          }
          onRefresh={() =>
            onRefreshWarpMarkers ? onRefreshWarpMarkers() : Promise.resolve()
          }
        />
        <StudioSessionPanel
          loading={loading}
          project={project}
          songMap={songMap}
          onAddMarker={addMarker}
          onAddTakeLane={addTakeLane}
          onUpdateProject={updateProject}
        />
        <ScrollArea className="h-[420px] pr-3">
          <div className="space-y-3">
            {project?.tracks.map((track) => (
              <MixerTrackRow
                key={track.id}
                track={track}
                title={songMap.get(track.songId)?.title ?? track.trackName}
                auditioning={auditioningId === track.id}
                onAudition={() => {
                  audition(track).catch((error) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Could not audition track.",
                    );
                  });
                }}
                onUpdate={(patch) => {
                  void updateTrack(track.id, patch);
                }}
                onRemove={() => {
                  void removeTrack(track.id);
                }}
              />
            ))}
            {!project?.tracks.length ? (
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-8 text-center text-sm text-muted-foreground">
                Add the selected library track to start a local Studio project.
              </div>
            ) : null}
          </div>
        </ScrollArea>
        <VersionHistory
          versions={versions}
          restoringId={restoringId}
          onRestore={async (versionId) => {
            setRestoringId(versionId);
            try {
              await restoreVersion(versionId);
            } finally {
              setRestoringId(undefined);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function VersionHistory({
  versions,
  restoringId,
  onRestore,
}: {
  versions: LocalStudioProjectVersion[];
  restoringId?: string;
  onRestore: (versionId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-emerald-200" />
        <p className="font-medium">Autosave versions</p>
      </div>
      <div className="space-y-2">
        {versions.slice(0, 5).map((version) => (
          <div
            key={version.id}
            className="flex flex-col gap-2 rounded-md border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium">
                {version.tracks.length} track
                {version.tracks.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(version.createdAt).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={restoringId === version.id}
              onClick={() => {
                void onRestore(version.id);
              }}
            >
              <RotateCcw className="size-4" />
              Restore
            </Button>
          </div>
        ))}
        {!versions.length ? (
          <p className="text-sm text-muted-foreground">
            Mixer changes will create restore points automatically.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MixerTrackRow({
  track,
  title,
  auditioning,
  onAudition,
  onUpdate,
  onRemove,
}: {
  track: LocalStudioTrack;
  title: string;
  auditioning: boolean;
  onAudition: () => void;
  onUpdate: (patch: Partial<LocalStudioTrack>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4 rounded-md border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: track.color }}
          />
          <p className="truncate font-medium">{title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={track.muted ? "secondary" : "ghost"}
            onClick={() => onUpdate({ muted: !track.muted })}
          >
            Mute
          </Button>
          <Button
            size="sm"
            variant={track.solo ? "secondary" : "ghost"}
            onClick={() => onUpdate({ solo: !track.solo })}
          >
            Solo
          </Button>
          <Button
            size="icon"
            variant="secondary"
            aria-label={`Audition ${title}`}
            onClick={onAudition}
          >
            <Play
              className={
                auditioning ? "size-4 fill-emerald-200 text-emerald-200" : "size-4"
              }
            />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Remove ${title} from project`}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TrackSlider
          label={`Volume ${track.gainDb.toFixed(0)} dB`}
          value={track.gainDb}
          min={-24}
          max={6}
          step={1}
          onValueChange={(gainDb) => onUpdate({ gainDb })}
        />
        <TrackSlider
          label={`Pan ${track.pan.toFixed(1)}`}
          value={track.pan}
          min={-1}
          max={1}
          step={0.1}
          onValueChange={(pan) => onUpdate({ pan })}
        />
      </div>
    </div>
  );
}

function TrackSlider({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([nextValue]) => onValueChange(nextValue)}
      />
    </div>
  );
}

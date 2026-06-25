"use client";

import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Magnet,
  Music,
  Plus,
  Scissors,
  Trash2,
  Video,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { detectAudioBeats } from "@/features/editor/audio-beat-detection";
import { LayerMotionReadinessPanel } from "@/features/editor/components/layer-motion-readiness-panel";
import { MediaClipPreview } from "@/features/editor/components/media-clip-preview";
import { MediaProductionReadinessPanel } from "@/features/editor/components/media-production-readiness-panel";
import { MediaSubtitleControls } from "@/features/editor/components/media-subtitle-controls";
import { MediaWaveform } from "@/features/editor/components/media-waveform";
import { createPanelWindow } from "@/features/editor/panel-list-window";
import {
  createAudioDuckingUpdates,
  createMediaProductionReadinessReport,
} from "@/features/editor/media-production-readiness";
import { createLayerMotionReadinessReport } from "@/features/editor/layer-motion-advanced";
import {
  clampMediaTimelineDuration,
  createAudioBeatDetectionUpdates,
  createAudioBeatMarkerUpdates,
  compareMediaTimelineElements,
  createAudioVolumeKeyframeUpdates,
  createMediaTimelineReorderUpdates,
  getAudioBeatMarkers,
  getAudioBeatSyncSuggestions,
  getAudioFadeIn,
  getAudioFadeOut,
  getAudioVolumeKeyframes,
  getMediaTimelineBounds,
  getMediaTimelineDuration,
  getMediaTimelineEnd,
  getMediaTimelineStart,
  getMediaTrimEnd,
  getMediaTrimStart,
  getMediaVolume,
  getVideoTransitionDuration,
  getVideoTransitionIn,
  getVideoTransitionOut,
  isMediaTimelineElement,
  mediaTimelineSnapSeconds,
  snapMediaTimelineSeconds,
  type MediaTimelineElement,
} from "@/features/editor/media-timeline";
import type {
  DesignElement,
  DesignPage,
  VideoClipTransition,
} from "@/features/editor/types";
import { videoClipTransitionOptions } from "@/features/editor/video-transitions";
import { cn } from "@/lib/utils";

type MediaTimelinePanelProps = {
  page: DesignPage;
  selectedElementIds: string[];
  onSelectElement: (elementId: string) => void;
  onUpdateElement: (elementId: string, updates: Partial<DesignElement>) => void;
  onUpdateElements: (updates: ElementUpdate[]) => void;
  onBeginElementEdit: () => void;
  onPreviewElement: (
    elementId: string,
    updates: Partial<DesignElement>,
  ) => void;
  onCommitElement: (elementId: string, updates: Partial<DesignElement>) => void;
  onSplitElement: (elementId: string, splitAtSeconds: number) => void;
};

type ElementUpdate = {
  elementId: string;
  updates: Partial<DesignElement>;
};

export function MediaTimelinePanel({
  page,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  onUpdateElements,
  onBeginElementEdit,
  onPreviewElement,
  onCommitElement,
  onSplitElement,
}: MediaTimelinePanelProps) {
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [showAllMediaClips, setShowAllMediaClips] = useState(false);
  const selectedElementIdSet = useMemo(
    () => new Set(selectedElementIds),
    [selectedElementIds],
  );
  const mediaElements = useMemo(
    () => page.elements.filter(isMediaTimelineElement),
    [page.elements],
  );
  const productionReadiness = useMemo(
    () => createMediaProductionReadinessReport(page.elements),
    [page.elements],
  );
  const motionReadiness = useMemo(
    () => createLayerMotionReadinessReport(page.elements),
    [page.elements],
  );
  const audioDuckingUpdates = useMemo(
    () => createAudioDuckingUpdates(page.elements),
    [page.elements],
  );
  const selectedMediaElement =
    mediaElements.find((element) => selectedElementIdSet.has(element.id)) ??
    mediaElements[0] ??
    null;
  const timelineBounds = getMediaTimelineBounds(mediaElements);
  const timelineEnd = timelineBounds.end;
  const playhead = Math.min(
    timelineEnd,
    snapMediaTimelineSeconds(playheadSeconds),
  );
  const tracks = useMemo<
    Array<{
      id: string;
      label: string;
      elements: MediaTimelineElement[];
    }>
  >(
    () => [
      {
        id: "video",
        label: "Video",
        elements: mediaElements
          .filter((element) => element.type === "video")
          .sort(compareMediaTimelineElements),
      },
      {
        id: "audio",
        label: "Audio",
        elements: mediaElements
          .filter((element) => element.type === "audio")
          .sort(compareMediaTimelineElements),
      },
    ],
    [mediaElements],
  );

  const applyAudioDucking = () => {
    if (!audioDuckingUpdates.length) return;

    onUpdateElements(audioDuckingUpdates);
    onSelectElement(audioDuckingUpdates[0].elementId);
  };

  return (
    <details className="group border-t border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            Media timeline
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            Arrange video and audio timing
          </span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatSeconds(timelineEnd)}
        </span>
      </summary>
      <div className="p-3">
        {mediaElements.length ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Playhead</span>
              <span>{formatSeconds(playhead)}</span>
            </div>
            <Slider
              value={[playhead]}
              min={0}
              max={timelineEnd}
              step={mediaTimelineSnapSeconds}
              onValueChange={(value) =>
                setPlayheadSeconds(value[0] ?? playhead)
              }
            />
          </div>
        ) : null}
      </div>
      <Separator />
      <ScrollArea className="max-h-80">
        <div className="flex flex-col gap-3 p-3">
          <LayerMotionReadinessPanel report={motionReadiness} />
          {mediaElements.length ? (
            <>
              <MediaClipPreview element={selectedMediaElement} />
              <MediaProductionReadinessPanel
                report={productionReadiness}
                canApplyAudioDucking={audioDuckingUpdates.length > 0}
                onApplyAudioDucking={applyAudioDucking}
              />
              {tracks.map((track) => {
                if (!track.elements.length) return null;

                const trackWindow = showAllMediaClips
                  ? {
                      items: track.elements,
                      hiddenCount: 0,
                      isWindowed: false,
                    }
                  : createPanelWindow(track.elements, {
                      activeIds: selectedElementIds,
                      limit: 24,
                    });

                return (
                  <div key={track.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
                      <span>{track.label}</span>
                      <span>{track.elements.length} clips</span>
                    </div>
                    {trackWindow.items.map((element) => (
                      <MediaTimelineRow
                        key={element.id}
                        element={element}
                        trackElements={track.elements}
                        selected={selectedElementIdSet.has(element.id)}
                        timelineEnd={timelineEnd}
                        playhead={playhead}
                        onSelectElement={onSelectElement}
                        onUpdateElement={onUpdateElement}
                        onUpdateElements={onUpdateElements}
                        onBeginElementEdit={onBeginElementEdit}
                        onPreviewElement={onPreviewElement}
                        onCommitElement={onCommitElement}
                        onSplitElement={onSplitElement}
                      />
                    ))}
                    {trackWindow.isWindowed || showAllMediaClips ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setShowAllMediaClips((current) => !current)
                        }
                      >
                        {showAllMediaClips
                          ? "Collapse clips"
                          : `Show ${trackWindow.hiddenCount} more clips`}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Upload video or audio to arrange timing.
            </div>
          )}
        </div>
      </ScrollArea>
    </details>
  );
}

function MediaTimelineRow({
  element,
  trackElements,
  selected,
  timelineEnd,
  playhead,
  onSelectElement,
  onUpdateElement,
  onUpdateElements,
  onBeginElementEdit,
  onPreviewElement,
  onCommitElement,
  onSplitElement,
}: {
  element: MediaTimelineElement;
  trackElements: MediaTimelineElement[];
  selected: boolean;
  timelineEnd: number;
  playhead: number;
  onSelectElement: (elementId: string) => void;
  onUpdateElement: (elementId: string, updates: Partial<DesignElement>) => void;
  onUpdateElements: (updates: ElementUpdate[]) => void;
  onBeginElementEdit: () => void;
  onPreviewElement: (
    elementId: string,
    updates: Partial<DesignElement>,
  ) => void;
  onCommitElement: (elementId: string, updates: Partial<DesignElement>) => void;
  onSplitElement: (elementId: string, splitAtSeconds: number) => void;
}) {
  const start = getMediaTimelineStart(element);
  const duration = getMediaTimelineDuration(element);
  const end = getMediaTimelineEnd(element);
  const trimStart = getMediaTrimStart(element);
  const trimEnd = getMediaTrimEnd(element);
  const volume = getMediaVolume(element);
  const transitionIn = getVideoTransitionIn(element);
  const transitionOut = getVideoTransitionOut(element);
  const transitionDuration = getVideoTransitionDuration(element);
  const fadeIn = getAudioFadeIn(element);
  const fadeOut = getAudioFadeOut(element);
  const volumeKeyframes = getAudioVolumeKeyframes(element);
  const beatMarkers = getAudioBeatMarkers(element);
  const beatSyncSuggestions = getAudioBeatSyncSuggestions(element);
  const left = Math.min(100, (start / timelineEnd) * 100);
  const width = Math.max(
    4,
    Math.min(100 - left, (duration / timelineEnd) * 100),
  );
  const playheadLeft = Math.min(100, (playhead / timelineEnd) * 100);
  const canSplit = playhead - start >= 1 && end - playhead >= 1;
  const Icon = element.type === "video" ? Video : Music;
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [isDetectingBeats, setIsDetectingBeats] = useState(false);
  const [beatDetectionMessage, setBeatDetectionMessage] = useState<
    string | null
  >(null);
  const sequenceIndex = trackElements.findIndex(
    (trackElement) => trackElement.id === element.id,
  );
  const canMoveEarlier = sequenceIndex > 0;
  const canMoveLater =
    sequenceIndex >= 0 && sequenceIndex < trackElements.length - 1;

  function reorderClip(direction: "earlier" | "later") {
    const updates = createMediaTimelineReorderUpdates(
      trackElements,
      element.id,
      direction,
    );

    if (!updates.length) return;

    onUpdateElements(updates);
    onSelectElement(element.id);
  }

  function addVolumeKeyframe() {
    const updates = createAudioVolumeKeyframeUpdates(element, playhead);

    if (!Object.keys(updates).length) return;

    onUpdateElement(element.id, updates);
    onSelectElement(element.id);
  }

  function addBeatMarker() {
    const updates = createAudioBeatMarkerUpdates(element, playhead);

    if (!Object.keys(updates).length) return;

    onUpdateElement(element.id, updates);
    onSelectElement(element.id);
  }

  async function detectBeatMarkers() {
    if (element.type !== "audio") return;

    setIsDetectingBeats(true);
    setBeatDetectionMessage(null);

    try {
      const result = await detectAudioBeats(element);

      if (!result.beatMarkers.length) {
        setBeatDetectionMessage("No clear beats found.");
        return;
      }

      onUpdateElement(element.id, createAudioBeatDetectionUpdates(result));
      onSelectElement(element.id);
      setBeatDetectionMessage(
        `Detected ${result.beatMarkers.length} beats and ${result.beatSyncSuggestions.length} sync points.`,
      );
    } catch {
      setBeatDetectionMessage("Could not analyze this audio clip.");
    } finally {
      setIsDetectingBeats(false);
    }
  }

  function startPointerEdit(
    event: ReactPointerEvent<HTMLElement>,
    mode: "move" | "trim-start" | "trim-end",
  ) {
    const track = timelineRef.current;

    if (!track) return;

    event.preventDefault();
    event.stopPropagation();
    onSelectElement(element.id);
    onBeginElementEdit();

    const rect = track.getBoundingClientRect();
    const initialPointerX = event.clientX;
    const initialStart = start;
    const initialDuration = duration;
    const initialTrimStart = trimStart;
    const initialTrimEnd = trimEnd;

    function getDeltaSeconds(pointerX: number) {
      const pixels = pointerX - initialPointerX;
      const rawSeconds = (pixels / Math.max(1, rect.width)) * timelineEnd;

      return snapMediaTimelineSeconds(rawSeconds);
    }

    function getPointerUpdates(pointerX: number) {
      const deltaSeconds = getDeltaSeconds(pointerX);

      if (mode === "move") {
        return {
          timelineStartSeconds: snapMediaTimelineSeconds(
            initialStart + deltaSeconds,
          ),
        } as Partial<DesignElement>;
      }

      if (mode === "trim-start") {
        const nextStart = Math.min(
          initialStart + initialDuration - 1,
          Math.max(0, initialStart + deltaSeconds),
        );
        const trimDelta = nextStart - initialStart;

        return {
          timelineStartSeconds: snapMediaTimelineSeconds(nextStart),
          timelineDurationSeconds: clampMediaTimelineDuration(
            initialDuration - trimDelta,
          ),
          trimStartSeconds: snapMediaTimelineSeconds(
            initialTrimStart + trimDelta,
          ),
        } as Partial<DesignElement>;
      }

      return {
        timelineDurationSeconds: clampMediaTimelineDuration(
          initialDuration + deltaSeconds,
        ),
        trimEndSeconds:
          initialTrimEnd === null
            ? null
            : Math.max(
                initialTrimStart + 1,
                snapMediaTimelineSeconds(initialTrimEnd + deltaSeconds),
              ),
      } as Partial<DesignElement>;
    }

    let latestUpdates: Partial<DesignElement> | null = null;

    function handlePointerMove(pointerEvent: PointerEvent) {
      latestUpdates = getPointerUpdates(pointerEvent.clientX);
      onPreviewElement(element.id, latestUpdates);
    }

    function handlePointerUp(pointerEvent: PointerEvent) {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      latestUpdates = latestUpdates ?? getPointerUpdates(pointerEvent.clientX);
      onCommitElement(element.id, latestUpdates);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  return (
    <article
      className={cn(
        "rounded-md border border-border bg-background p-2",
        selected && "border-primary bg-primary/5",
      )}
    >
      <Button
        variant="ghost"
        className="mb-2 h-auto w-full justify-start px-1 py-1"
        onClick={() => onSelectElement(element.id)}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="min-w-0 truncate text-xs font-medium">
          {element.title}
        </span>
      </Button>

      <div ref={timelineRef} className="relative mb-3 h-7 rounded bg-muted">
        <div
          className="absolute top-1 h-5 cursor-grab overflow-hidden rounded bg-primary shadow-sm active:cursor-grabbing"
          style={{
            left: `${left}%`,
            width: `${width}%`,
          }}
          onPointerDown={(event) => startPointerEdit(event, "move")}
        >
          {element.type === "audio" ? (
            <MediaWaveform src={element.src} />
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Trim ${element.title} start`}
          className="absolute top-0 h-7 w-2 cursor-ew-resize rounded bg-primary-foreground shadow ring-1 ring-primary"
          style={{ left: `calc(${left}% - 4px)` }}
          onPointerDown={(event) => startPointerEdit(event, "trim-start")}
        />
        <button
          type="button"
          aria-label={`Trim ${element.title} end`}
          className="absolute top-0 h-7 w-2 cursor-ew-resize rounded bg-primary-foreground shadow ring-1 ring-primary"
          style={{ left: `calc(${left + width}% - 4px)` }}
          onPointerDown={(event) => startPointerEdit(event, "trim-end")}
        />
        <div
          className="pointer-events-none absolute top-0 h-7 w-px bg-foreground/70"
          style={{ left: `${playheadLeft}%` }}
        />
        {element.type === "audio"
          ? beatMarkers.map((marker) => {
              const markerLeft = Math.min(
                100,
                ((start + marker.timeSeconds) / timelineEnd) * 100,
              );

              return (
                <div
                  key={marker.timeSeconds}
                  className="pointer-events-none absolute top-0 h-7 w-px bg-amber-500"
                  style={{ left: `${markerLeft}%` }}
                  title={marker.label ?? "Beat marker"}
                />
              );
            })
          : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TimelineNumberField
          label="Start"
          value={start}
          onChange={(timelineStartSeconds) =>
            onUpdateElement(element.id, {
              timelineStartSeconds:
                snapMediaTimelineSeconds(timelineStartSeconds),
            } as Partial<DesignElement>)
          }
        />
        <TimelineNumberField
          label="Length"
          value={duration}
          min={1}
          onChange={(timelineDurationSeconds) =>
            onUpdateElement(element.id, {
              timelineDurationSeconds: Math.max(
                1,
                clampMediaTimelineDuration(timelineDurationSeconds),
              ),
            } as Partial<DesignElement>)
          }
        />
        <TimelineNumberField
          label="Trim in"
          value={trimStart}
          onChange={(trimStartSeconds) =>
            onUpdateElement(element.id, {
              trimStartSeconds: snapMediaTimelineSeconds(trimStartSeconds),
            } as Partial<DesignElement>)
          }
        />
        <TimelineNumberField
          label="Trim out"
          value={trimEnd ?? 0}
          onChange={(value) =>
            onUpdateElement(element.id, {
              trimEndSeconds:
                value > 0 ? snapMediaTimelineSeconds(value) : null,
            } as Partial<DesignElement>)
          }
        />
        <TimelineNumberField
          label="Volume"
          value={Math.round(volume * 100)}
          min={0}
          max={100}
          onChange={(value) =>
            onUpdateElement(element.id, {
              volume: Math.max(0, Math.min(100, value)) / 100,
            } as Partial<DesignElement>)
          }
        />
        {element.type === "audio" ? (
          <>
            <TimelineNumberField
              label="Fade in"
              value={fadeIn}
              min={0}
              max={duration}
              onChange={(fadeInSeconds) =>
                onUpdateElement(element.id, {
                  fadeInSeconds: snapMediaTimelineSeconds(fadeInSeconds),
                } as Partial<DesignElement>)
              }
            />
            <TimelineNumberField
              label="Fade out"
              value={fadeOut}
              min={0}
              max={duration}
              onChange={(fadeOutSeconds) =>
                onUpdateElement(element.id, {
                  fadeOutSeconds: snapMediaTimelineSeconds(fadeOutSeconds),
                } as Partial<DesignElement>)
              }
            />
          </>
        ) : null}
        {element.type === "video" ? (
          <>
            <VideoTransitionSelect
              label="In"
              value={transitionIn}
              onChange={(transitionIn) =>
                onUpdateElement(element.id, {
                  transitionIn,
                } as Partial<DesignElement>)
              }
            />
            <VideoTransitionSelect
              label="Out"
              value={transitionOut}
              onChange={(transitionOut) =>
                onUpdateElement(element.id, {
                  transitionOut,
                } as Partial<DesignElement>)
              }
            />
            <TimelineNumberField
              label="Transition"
              value={transitionDuration}
              min={0}
              max={3}
              step={0.1}
              onChange={(transitionDurationSeconds) =>
                onUpdateElement(element.id, {
                  transitionDurationSeconds: Math.max(
                    0,
                    Math.min(3, transitionDurationSeconds),
                  ),
                } as Partial<DesignElement>)
              }
            />
            <MediaSubtitleControls
              element={element}
              onUpdateElement={(updates) =>
                onUpdateElement(element.id, updates)
              }
            />
          </>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {element.type === "audio" ? (
          <>
            <Button variant="outline" size="sm" onClick={addVolumeKeyframe}>
              <Plus className="h-3.5 w-3.5" />
              Keyframe
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdateElement(element.id, {
                  volumeKeyframes: [],
                } as Partial<DesignElement>)
              }
              disabled={!volumeKeyframes.length}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear keys
            </Button>
            <Button variant="outline" size="sm" onClick={addBeatMarker}>
              <Plus className="h-3.5 w-3.5" />
              Beat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void detectBeatMarkers()}
              disabled={isDetectingBeats}
            >
              <WandSparkles className="h-3.5 w-3.5" />
              {isDetectingBeats ? "Detecting" : "Detect"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdateElement(element.id, {
                  beatMarkers: [],
                  beatSyncSuggestions: [],
                } as Partial<DesignElement>)
              }
              disabled={!beatMarkers.length && !beatSyncSuggestions.length}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear beats
            </Button>
          </>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => reorderClip("earlier")}
          disabled={!canMoveEarlier}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Earlier
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reorderClip("later")}
          disabled={!canMoveLater}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Later
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onUpdateElement(element.id, {
              timelineStartSeconds: snapMediaTimelineSeconds(start),
              timelineDurationSeconds: Math.max(
                1,
                clampMediaTimelineDuration(duration),
              ),
              trimStartSeconds: snapMediaTimelineSeconds(trimStart),
              trimEndSeconds:
                trimEnd === null ? null : snapMediaTimelineSeconds(trimEnd),
            } as Partial<DesignElement>)
          }
        >
          <Magnet className="h-3.5 w-3.5" />
          Snap
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSplitElement(element.id, playhead)}
          disabled={!canSplit}
        >
          <Scissors className="h-3.5 w-3.5" />
          Split
        </Button>
      </div>
      {element.type === "audio" &&
      (beatDetectionMessage || beatSyncSuggestions.length) ? (
        <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          {beatDetectionMessage ? <p>{beatDetectionMessage}</p> : null}
          {beatSyncSuggestions.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {beatSyncSuggestions.slice(0, 6).map((suggestion) => (
                <span
                  key={`${suggestion.timeSeconds}-${suggestion.label}`}
                  className="rounded bg-background px-2 py-1"
                  title={`${Math.round(suggestion.confidence * 100)}% confidence`}
                >
                  {suggestion.label} @ {formatSeconds(suggestion.timeSeconds)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function TimelineNumberField({
  label,
  value,
  min = 0,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        className="h-8"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function VideoTransitionSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: VideoClipTransition;
  onChange: (value: VideoClipTransition) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as VideoClipTransition)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {videoClipTransitionOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

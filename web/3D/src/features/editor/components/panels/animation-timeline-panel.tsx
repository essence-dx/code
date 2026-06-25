"use client";

import { useMemo, useState } from "react";
import { Clock3, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  animationPropertyDefinitions,
  supportsAnimationProperty,
} from "../../animation/animation-registry";
import { useEditorStore } from "../../store/editor-store";
import type {
  AnimationEasing,
  AnimationKeyframeValue,
  AnimationTrack,
  SceneObject,
} from "../../types";

const easingLabels: Record<AnimationEasing, string> = {
  easeIn: "Ease in",
  easeInOut: "Ease in-out",
  easeOut: "Ease out",
  linear: "Linear",
};

const easingValues: AnimationEasing[] = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
];
const emptyAnimationTracks: AnimationTrack[] = [];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatValue(value: AnimationKeyframeValue) {
  return Array.isArray(value)
    ? value.map((entry) => Number(entry.toFixed(2))).join(", ")
    : Number(value.toFixed(2));
}

function getDuration(tracks: AnimationTrack[]) {
  return Math.max(
    2,
    ...tracks.flatMap((track) =>
      track.keyframes.map((keyframe) => keyframe.time),
    ),
  );
}

function firstSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
}

function sampleEasing(easing: AnimationEasing, progress: number) {
  if (easing === "easeIn") {
    return progress * progress;
  }

  if (easing === "easeOut") {
    return 1 - (1 - progress) * (1 - progress);
  }

  if (easing === "easeInOut") {
    return progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  }

  return progress;
}

function CurvePreview({ easing }: { easing: AnimationEasing }) {
  return (
    <div className="flex h-10 items-end gap-0.5 rounded-md border border-border px-2 py-1">
      {Array.from({ length: 18 }, (_, index) => {
        const progress = index / 17;
        const height = 10 + sampleEasing(easing, progress) * 24;

        return (
          <span
            key={index}
            className="w-full rounded-sm bg-primary/70"
            style={{ height }}
          />
        );
      })}
    </div>
  );
}

export function AnimationTimelinePanel({ object }: { object: SceneObject }) {
  const [scrubTime, setScrubTime] = useState(0);
  const animationTracks = useEditorStore(
    (state) => state.document.animationTracks,
  );
  const setAnimationKeyframe = useEditorStore(
    (state) => state.setAnimationKeyframe,
  );
  const setObjectAnimationDuration = useEditorStore(
    (state) => state.setObjectAnimationDuration,
  );
  const updateAnimationTrack = useEditorStore(
    (state) => state.updateAnimationTrack,
  );
  const updateAnimationKeyframeTime = useEditorStore(
    (state) => state.updateAnimationKeyframeTime,
  );
  const removeAnimationKeyframe = useEditorStore(
    (state) => state.removeAnimationKeyframe,
  );
  const removeAnimationTrack = useEditorStore(
    (state) => state.removeAnimationTrack,
  );
  const tracks = useMemo(
    () =>
      (animationTracks ?? emptyAnimationTracks).filter(
        (track) => track.objectId === object.id,
      ),
    [animationTracks, object.id],
  );
  const duration = getDuration(tracks);
  const properties = useMemo(
    () =>
      animationPropertyDefinitions.filter((definition) =>
        supportsAnimationProperty(object, definition.property),
      ),
    [object],
  );
  const trackByProperty = useMemo(
    () => new Map(tracks.map((track) => [track.property, track])),
    [tracks],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Clock3 className="size-3.5" />
          Timeline
        </div>
        <div className="flex items-center gap-2">
          <Label
            className="text-xs text-muted-foreground"
            htmlFor={`timeline-${object.id}-duration`}
          >
            Duration
          </Label>
          <Input
            id={`timeline-${object.id}-duration`}
            className="h-8 w-20"
            inputMode="decimal"
            min={0.05}
            max={120}
            step={0.05}
            type="number"
            value={Number(duration.toFixed(2))}
            onChange={(event) =>
              setObjectAnimationDuration(
                object.id,
                toNumber(event.target.value, duration),
              )
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Scrubber</span>
          <span>{Number(scrubTime.toFixed(2))}s</span>
        </div>
        <Slider
          max={duration}
          min={0}
          step={0.05}
          value={[Math.min(scrubTime, duration)]}
          onValueChange={(value) => setScrubTime(firstSliderValue(value))}
        />
      </div>

      <div className="space-y-2">
        {properties.map((definition) => {
          const track = trackByProperty.get(definition.property);

          return (
            <div
              key={definition.property}
              className="space-y-3 rounded-md border border-border p-3"
            >
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {definition.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {track
                      ? `${track.keyframes.length} keyframe${track.keyframes.length === 1 ? "" : "s"}`
                      : "No keyframes"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setAnimationKeyframe(
                      object.id,
                      definition.property,
                      scrubTime,
                    )
                  }
                >
                  <Plus className="mr-1 size-3.5" />
                  Key
                </Button>
                <Button
                  aria-label={`Remove ${definition.label.toLowerCase()} track`}
                  className="size-8"
                  disabled={!track}
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    removeAnimationTrack(object.id, definition.property)
                  }
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              {track ? (
                <>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <Select
                      value={track.easing ?? "linear"}
                      onValueChange={(value) =>
                        updateAnimationTrack(object.id, definition.property, {
                          easing: value as AnimationEasing,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        {easingValues.map((easing) => (
                          <SelectItem key={easing} value={easing}>
                            {easingLabels[easing]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={track.loop}
                        onCheckedChange={(checked) =>
                          updateAnimationTrack(object.id, definition.property, {
                            loop: checked === true,
                          })
                        }
                      />
                      Loop
                    </Label>
                  </div>

                  <CurvePreview easing={track.easing ?? "linear"} />

                  <div className="space-y-2">
                    {track.keyframes.map((keyframe) => (
                      <div
                        key={keyframe.id}
                        className="grid grid-cols-[72px_1fr_32px] items-center gap-2"
                      >
                        <Input
                          inputMode="decimal"
                          min={0}
                          max={120}
                          step={0.05}
                          type="number"
                          value={Number(keyframe.time.toFixed(2))}
                          onChange={(event) =>
                            updateAnimationKeyframeTime(
                              object.id,
                              definition.property,
                              keyframe.id,
                              toNumber(event.target.value, keyframe.time),
                            )
                          }
                        />
                        <div className="truncate text-xs text-muted-foreground">
                          {formatValue(keyframe.value)}
                        </div>
                        <Button
                          aria-label={`Remove ${definition.label.toLowerCase()} keyframe`}
                          className="size-8"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            removeAnimationKeyframe(
                              object.id,
                              definition.property,
                              keyframe.id,
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

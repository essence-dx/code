"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  NumberField,
} from "@/features/editor/components/property-fields";
import {
  createLayerMotionKeyframe,
  getLayerMotionDuration,
  getLayerMotionEasing,
  getLayerMotionKeyframes,
  getLayerMotionPreset,
  getLayerMotionStart,
  layerMotionEasingOptions,
  layerMotionPresetOptions,
  upsertLayerMotionKeyframe,
} from "@/features/editor/layer-motion";
import {
  createLayerMotionGroupId,
  createLayerMotionPresetPackUpdates,
  createLayerMotionReadinessReport,
  getLayerMotionPresetPack,
  layerMotionPresetPacks,
  type LayerMotionReadinessStatus,
} from "@/features/editor/layer-motion-advanced";
import type {
  DesignElement,
  LayerMotionEasing,
  LayerMotionPresetPackId,
  LayerMotionPreset,
} from "@/features/editor/types";

export function LayerMotionControls({
  element,
  pageElements,
  onUpdateElement,
}: {
  element: DesignElement;
  pageElements: readonly DesignElement[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const preset = getLayerMotionPreset(element);
  const keyframes = getLayerMotionKeyframes(element);
  const readiness = createLayerMotionReadinessReport(pageElements);
  const [keyframeTime, setKeyframeTime] = useState(
    getLayerMotionStart(element),
  );
  const [presetPackId, setPresetPackId] = useState<LayerMotionPresetPackId>(
    element.motionPresetPackId ?? "soft-entrance",
  );

  useEffect(() => {
    setKeyframeTime(getLayerMotionStart(element));
  }, [element.id, element.motionStartSeconds]);

  useEffect(() => {
    setPresetPackId(element.motionPresetPackId ?? "soft-entrance");
  }, [element.id, element.motionPresetPackId]);

  function addKeyframe() {
    onUpdateElement({
      motionKeyframes: upsertLayerMotionKeyframe(
        element,
        createLayerMotionKeyframe(element, keyframeTime),
      ),
    } as Partial<DesignElement>);
  }

  function applyPresetPack() {
    onUpdateElement(
      createLayerMotionPresetPackUpdates(element, presetPackId),
    );
  }

  function removeKeyframe(timeSeconds: number) {
    onUpdateElement({
      motionKeyframes: keyframes.filter(
        (keyframe) => keyframe.timeSeconds !== timeSeconds,
      ),
    } as Partial<DesignElement>);
  }

  return (
    <div className="space-y-3">
      <Field label="Layer motion">
        <Select
          value={preset}
          onValueChange={(motionPreset) =>
            onUpdateElement({
              motionPreset: motionPreset as LayerMotionPreset,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {layerMotionPresetOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Reusable motion pack">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            value={presetPackId}
            onValueChange={(value) =>
              setPresetPackId(value as LayerMotionPresetPackId)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layerMotionPresetPacks.map((pack) => (
                <SelectItem key={pack.id} value={pack.id}>
                  {pack.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={applyPresetPack}
            aria-label="Apply motion pack"
          >
            <WandSparkles className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {getLayerMotionPresetPack(presetPackId).description}
        </p>
      </Field>

      {preset !== "none" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Start"
              value={getLayerMotionStart(element)}
              min={0}
              step={0.1}
              onChange={(motionStartSeconds) =>
                onUpdateElement({
                  motionStartSeconds: Math.max(0, motionStartSeconds),
                } as Partial<DesignElement>)
              }
            />
            <NumberField
              label="Duration"
              value={getLayerMotionDuration(element)}
              min={0.1}
              step={0.1}
              onChange={(motionDurationSeconds) =>
                onUpdateElement({
                  motionDurationSeconds: Math.max(0.1, motionDurationSeconds),
                } as Partial<DesignElement>)
              }
            />
          </div>
          <Field label="Easing">
            <Select
              value={getLayerMotionEasing(element)}
              onValueChange={(motionEasing) =>
                onUpdateElement({
                  motionEasing: motionEasing as LayerMotionEasing,
                } as Partial<DesignElement>)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {layerMotionEasingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}

      <Field label="Timeline group">
        <div className="space-y-2">
          <Input
            value={element.motionGroupId ?? ""}
            placeholder="motion-hero"
            onChange={(event) =>
              onUpdateElement({
                motionGroupId: event.target.value.trim() || undefined,
              } as Partial<DesignElement>)
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdateElement({
                  motionGroupId: createLayerMotionGroupId(element),
                } as Partial<DesignElement>)
              }
            >
              Create group
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!element.motionGroupId}
              onClick={() =>
                onUpdateElement({
                  motionGroupId: undefined,
                } as Partial<DesignElement>)
              }
            >
              Clear
            </Button>
          </div>
        </div>
      </Field>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <NumberField
            label="Key time"
            value={keyframeTime}
            min={0}
            step={0.1}
            onChange={(value) => setKeyframeTime(Math.max(0, value))}
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addKeyframe}
              aria-label="Add motion keyframe"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {keyframes.length ? (
          <div className="space-y-1 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-2 text-xs font-medium">
              <span>Keyframes</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onUpdateElement({
                    motionKeyframes: [],
                  } as Partial<DesignElement>)
                }
              >
                Clear
              </Button>
            </div>
            {keyframes.map((keyframe) => (
              <div
                key={keyframe.timeSeconds}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
              >
                <span className="truncate">
                  {formatKeyframeTime(keyframe.timeSeconds)} · x{" "}
                  {Math.round(keyframe.x)}, y {Math.round(keyframe.y)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeKeyframe(keyframe.timeSeconds)}
                  aria-label="Remove motion keyframe"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">Motion readiness</p>
          <Badge variant={getReadinessVariant(readiness.status)}>
            {readiness.score}/100
          </Badge>
        </div>
        <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
          <p>{readiness.counts.animatedLayers} animated layers</p>
          <p>{readiness.counts.totalKeyframes} editable keyframes</p>
          <p>{readiness.counts.timelineGroups} timeline groups</p>
        </div>
      </div>
    </div>
  );
}

function formatKeyframeTime(value: number) {
  return `${value.toFixed(1)}s`;
}

function getReadinessVariant(
  status: LayerMotionReadinessStatus,
): "secondary" | "outline" | "destructive" {
  if (status === "ready") return "secondary";
  if (status === "attention") return "outline";

  return "destructive";
}

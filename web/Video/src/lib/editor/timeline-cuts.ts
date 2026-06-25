import { createId } from "@/lib/editor/factory";
import { cloneLayerKeyframes } from "@/lib/editor/keyframes";
import { TIMELINE_MIN_LAYER_SECONDS } from "@/lib/editor/timeline";
import type { SubtitleCue, TimelineLayer } from "@/lib/editor/types";

export interface TimelineCutRange {
  start: number;
  end: number;
  reason?: string;
}

export interface NormalizedTimelineCutRange extends TimelineCutRange {
  duration: number;
}

export interface AppliedTimelineCutSummary {
  layers: TimelineLayer[];
  ranges: NormalizedTimelineCutRange[];
  durationRemoved: number;
  changedLayerCount: number;
  removedLayerCount: number;
  createdLayerCount: number;
  changedLayerIds: string[];
}

interface TimelineSegment {
  start: number;
  end: number;
}

export function normalizeTimelineCutRanges(ranges: TimelineCutRange[]): NormalizedTimelineCutRange[] {
  const sorted = ranges
    .map((range) => ({
      start: finiteSeconds(range.start, 0),
      end: finiteSeconds(range.end, 0),
      reason: range.reason?.trim() || undefined,
    }))
    .map((range) => ({
      ...range,
      start: Math.max(0, Math.min(range.start, range.end)),
      end: Math.max(0, Math.max(range.start, range.end)),
    }))
    .filter((range) => range.end - range.start > 0.0001)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: TimelineCutRange[] = [];

  for (const range of sorted) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end + 0.0001) {
      merged.push(range);
      continue;
    }

    previous.end = Math.max(previous.end, range.end);
    previous.reason = [previous.reason, range.reason].filter(Boolean).join("; ") || undefined;
  }

  return merged.map((range) => ({
    ...range,
    duration: roundTimelineSeconds(range.end - range.start),
  }));
}

export function applyTimelineCutRangesToLayers(
  layers: TimelineLayer[],
  ranges: TimelineCutRange[],
  updatedAt = new Date().toISOString(),
): AppliedTimelineCutSummary {
  const normalizedRanges = normalizeTimelineCutRanges(ranges);
  if (!normalizedRanges.length) {
    return emptyAppliedTimelineCutSummary(layers);
  }

  const nextLayers: TimelineLayer[] = [];
  const changedLayerIds: string[] = [];
  let changedLayerCount = 0;
  let removedLayerCount = 0;
  let createdLayerCount = 0;

  for (const layer of layers) {
    if (layer.locked) {
      nextLayers.push(layer);
      continue;
    }

    const segments = keptSegmentsForLayer(layer, normalizedRanges);
    const shiftedStart = shiftTimeAfterCuts(layer.start, normalizedRanges);
    const startsShifted = Math.abs(shiftedStart - layer.start) > 0.0001;

    if (!segments.length) {
      removedLayerCount += 1;
      changedLayerCount += 1;
      continue;
    }

    const isUncutSingleSegment =
      segments.length === 1 &&
      Math.abs(segments[0].start - layer.start) < 0.0001 &&
      Math.abs(segments[0].end - layerEnd(layer)) < 0.0001;

    if (isUncutSingleSegment && !startsShifted) {
      nextLayers.push(layer);
      continue;
    }

    changedLayerCount += 1;

    for (const [index, segment] of segments.entries()) {
      const id = index === 0 ? layer.id : createId("layer");
      if (index > 0) createdLayerCount += 1;
      changedLayerIds.push(id);
      nextLayers.push(createLayerSegment(layer, segment, normalizedRanges, id, index, updatedAt));
    }
  }

  return {
    layers: nextLayers,
    ranges: normalizedRanges,
    durationRemoved: normalizedRanges.reduce((sum, range) => sum + range.duration, 0),
    changedLayerCount,
    removedLayerCount,
    createdLayerCount,
    changedLayerIds,
  };
}

export function shiftTimeAfterCuts(time: number, ranges: NormalizedTimelineCutRange[]) {
  const removedBeforeTime = ranges.reduce((sum, range) => {
    if (time <= range.start) return sum;
    return sum + Math.max(0, Math.min(time, range.end) - range.start);
  }, 0);

  return roundTimelineSeconds(Math.max(0, time - removedBeforeTime));
}

function keptSegmentsForLayer(layer: TimelineLayer, ranges: NormalizedTimelineCutRange[]) {
  let segments: TimelineSegment[] = [{ start: layer.start, end: layerEnd(layer) }];

  for (const range of ranges) {
    segments = segments.flatMap((segment) => subtractRangeFromSegment(segment, range));
  }

  return segments.filter((segment) => segment.end - segment.start >= TIMELINE_MIN_LAYER_SECONDS);
}

function subtractRangeFromSegment(segment: TimelineSegment, range: NormalizedTimelineCutRange) {
  if (range.end <= segment.start || range.start >= segment.end) {
    return [segment];
  }

  const nextSegments: TimelineSegment[] = [];
  const leftEnd = Math.min(range.start, segment.end);
  const rightStart = Math.max(range.end, segment.start);

  if (leftEnd - segment.start >= TIMELINE_MIN_LAYER_SECONDS) {
    nextSegments.push({ start: segment.start, end: leftEnd });
  }

  if (segment.end - rightStart >= TIMELINE_MIN_LAYER_SECONDS) {
    nextSegments.push({ start: rightStart, end: segment.end });
  }

  return nextSegments;
}

function createLayerSegment(
  layer: TimelineLayer,
  segment: TimelineSegment,
  ranges: NormalizedTimelineCutRange[],
  id: string,
  index: number,
  updatedAt: string,
): TimelineLayer {
  const trimDelta = Math.max(0, segment.start - layer.start);
  const duration = roundTimelineSeconds(segment.end - segment.start);
  const splitName = index === 0 ? layer.name : `${layer.name} segment ${index + 1}`;

  return {
    ...cloneLayerShape(layer),
    id,
    name: splitName,
    start: shiftTimeAfterCuts(segment.start, ranges),
    duration,
    trimStart: roundTimelineSeconds(layer.trimStart + trimDelta),
    cues: cloneSegmentCues(layer.cues, trimDelta, duration, index),
    notes: appendCutNote(layer.notes, index),
    updatedAt,
  };
}

function cloneLayerShape(layer: TimelineLayer): TimelineLayer {
  return {
    ...layer,
    transform: {
      ...layer.transform,
      crop: layer.transform.crop ? { ...layer.transform.crop } : undefined,
    },
    style: { ...layer.style },
    speed: layer.speed
      ? {
          ...layer.speed,
          ramp: { ...layer.speed.ramp },
        }
      : undefined,
    motion: layer.motion ? { ...layer.motion } : undefined,
    keyframes: cloneLayerKeyframes(layer.keyframes),
    transition: layer.transition ? { ...layer.transition } : undefined,
    cues: layer.cues?.map((cue) => ({ ...cue })),
  };
}

function cloneSegmentCues(cues: SubtitleCue[] | undefined, trimDelta: number, duration: number, segmentIndex: number) {
  if (!cues?.length) return cues;

  const segmentStart = trimDelta;
  const segmentEnd = trimDelta + duration;

  return cues
    .filter((cue) => cue.end > segmentStart && cue.start < segmentEnd)
    .map((cue) => ({
      ...cue,
      id: segmentIndex === 0 ? cue.id : createId("cue"),
      start: roundTimelineSeconds(Math.max(cue.start, segmentStart)),
      end: roundTimelineSeconds(Math.min(cue.end, segmentEnd)),
    }))
    .filter((cue) => cue.end - cue.start >= TIMELINE_MIN_LAYER_SECONDS);
}

function appendCutNote(notes: string | undefined, index: number) {
  if (index === 0) return notes;
  return [notes, "Created by applying reviewed timeline cuts."].filter(Boolean).join("\n");
}

function layerEnd(layer: TimelineLayer) {
  return layer.start + layer.duration;
}

function emptyAppliedTimelineCutSummary(layers: TimelineLayer[]): AppliedTimelineCutSummary {
  return {
    layers,
    ranges: [],
    durationRemoved: 0,
    changedLayerCount: 0,
    removedLayerCount: 0,
    createdLayerCount: 0,
    changedLayerIds: [],
  };
}

function finiteSeconds(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function roundTimelineSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}

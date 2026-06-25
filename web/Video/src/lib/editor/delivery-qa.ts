import { formatTime } from "@/lib/editor/factory";
import type { EditorProject, MediaAsset, TimelineLayer } from "@/lib/editor/types";

export type DeliveryQaSeverity = "blocker" | "warning";

export interface DeliveryQaIssue {
  id: string;
  label: string;
  detail: string;
  severity: DeliveryQaSeverity;
  count: number;
}

export interface DeliveryQaReport {
  status: "ready" | "review" | "blocked";
  issues: DeliveryQaIssue[];
}

const timelineGapToleranceSeconds = 0.25;

export function createDeliveryQaReport(project: EditorProject, mediaAssets: MediaAsset[]): DeliveryQaReport {
  const issues = [
    missingMediaIssue(project.layers, mediaAssets),
    hiddenLayersIssue(project.layers),
    mutedLayersIssue(project.layers),
    audioOnlyTimelineIssue(project.layers),
    reviewIssue(project.layers),
    timelineGapIssue(project),
  ].filter((issue): issue is DeliveryQaIssue => Boolean(issue));

  return {
    status: issues.some((issue) => issue.severity === "blocker") ? "blocked" : issues.length ? "review" : "ready",
    issues,
  };
}

function audioOnlyTimelineIssue(layers: TimelineLayer[]): DeliveryQaIssue | null {
  const visibleLayers = layers.filter((layer) => !layer.hidden);
  if (!visibleLayers.length || !visibleLayers.every((layer) => layer.kind === "audio")) return null;

  return {
    id: "audio-only-timeline",
    label: "Audio-only timeline",
    detail: "Use the WAV Audio preset for audio export, or add visual coverage before video/GIF delivery.",
    severity: "warning",
    count: visibleLayers.length,
  };
}

function missingMediaIssue(layers: TimelineLayer[], mediaAssets: MediaAsset[]): DeliveryQaIssue | null {
  const assetById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
  const layersWithMissingMedia = layers.filter((layer) => {
    if (!["audio", "image", "video"].includes(layer.kind) || !layer.assetId) return false;
    const asset = assetById.get(layer.assetId);
    return !asset || !asset.objectUrl;
  });

  if (!layersWithMissingMedia.length) return null;
  return {
    id: "missing-media",
    label: "Missing media",
    detail: summarizeLayerNames(layersWithMissingMedia, "Reconnect media before export."),
    severity: "blocker",
    count: layersWithMissingMedia.length,
  };
}

function hiddenLayersIssue(layers: TimelineLayer[]): DeliveryQaIssue | null {
  const hiddenLayers = layers.filter((layer) => layer.hidden);
  if (!hiddenLayers.length) return null;

  return {
    id: "hidden-layers",
    label: "Hidden layers",
    detail: summarizeLayerNames(hiddenLayers, "Hidden layers will not render."),
    severity: "warning",
    count: hiddenLayers.length,
  };
}

function mutedLayersIssue(layers: TimelineLayer[]): DeliveryQaIssue | null {
  const mutedLayers = layers.filter((layer) => layer.muted && (layer.kind === "audio" || layer.kind === "video"));
  if (!mutedLayers.length) return null;

  return {
    id: "muted-layers",
    label: "Muted layers",
    detail: summarizeLayerNames(mutedLayers, "Muted audio will not be heard in the export."),
    severity: "warning",
    count: mutedLayers.length,
  };
}

function reviewIssue(layers: TimelineLayer[]): DeliveryQaIssue | null {
  const unresolvedLayers = layers.filter((layer) => layer.reviewStatus === "needs-review" || layer.reviewStatus === "changes-requested");
  if (!unresolvedLayers.length) return null;

  return {
    id: "unapproved-review",
    label: "Unapproved review items",
    detail: summarizeLayerNames(unresolvedLayers, "Resolve review items or approve layers before delivery."),
    severity: "warning",
    count: unresolvedLayers.length,
  };
}

function timelineGapIssue(project: EditorProject): DeliveryQaIssue | null {
  const visualIntervals = project.layers
    .filter((layer) => !layer.hidden && layer.kind !== "audio")
    .map((layer) => ({ start: layer.start, end: layer.start + layer.duration }))
    .filter((interval) => Number.isFinite(interval.start) && Number.isFinite(interval.end) && interval.end > interval.start)
    .sort((a, b) => a.start - b.start);

  if (!visualIntervals.length) return null;

  const gaps: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const interval of visualIntervals) {
    if (interval.start - cursor > timelineGapToleranceSeconds) {
      gaps.push({ start: cursor, end: interval.start });
    }
    cursor = Math.max(cursor, interval.end);
  }

  if (project.duration - cursor > timelineGapToleranceSeconds) {
    gaps.push({ start: cursor, end: project.duration });
  }

  if (!gaps.length) return null;
  const preview = gaps
    .slice(0, 3)
    .map((gap) => `${formatTime(gap.start)}-${formatTime(gap.end)}`)
    .join(", ");

  return {
    id: "timeline-gaps",
    label: "Timeline gaps",
    detail: `${preview}${gaps.length > 3 ? ` and ${gaps.length - 3} more` : ""}. Add visual coverage or shorten the project.`,
    severity: "warning",
    count: gaps.length,
  };
}

function summarizeLayerNames(layers: TimelineLayer[], fallback: string) {
  const names = layers.slice(0, 3).map((layer) => layer.name).join(", ");
  const suffix = layers.length > 3 ? ` and ${layers.length - 3} more` : "";
  return names ? `${names}${suffix}. ${fallback}` : fallback;
}

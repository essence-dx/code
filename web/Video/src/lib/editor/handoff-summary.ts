import { formatTime } from "@/lib/editor/factory";
import { safeExportBaseName } from "@/lib/render/export-filenames";
import type { EditorProject, LayerReviewStatus, MediaAsset, TimelineLayer } from "@/lib/editor/types";

const reviewStatusLabels: Record<LayerReviewStatus, string> = {
  none: "No status",
  "needs-review": "Needs review",
  "changes-requested": "Changes requested",
  approved: "Approved",
};

export function handoffSummaryFilename(projectTitle: string) {
  return `${safeExportBaseName(projectTitle)}-handoff.md`;
}

export function createHandoffSummary(project: EditorProject, mediaAssets: MediaAsset[]) {
  const reviewCounts = countReviewStates(project.layers);
  const lines = [
    `# ${project.title} Handoff Summary`,
    "",
    "## Project",
    `- Size: ${project.width} x ${project.height} (${project.aspectRatio})`,
    `- Duration: ${formatTime(project.duration)}`,
    `- Frame rate: ${project.fps} fps`,
    `- Layers: ${project.layers.length}`,
    `- Media assets: ${mediaAssets.length}`,
    `- Updated: ${project.updatedAt}`,
    "",
    "## Review State",
    `- Needs review: ${reviewCounts.needsReview}`,
    `- Changes requested: ${reviewCounts.changesRequested}`,
    `- Approved: ${reviewCounts.approved}`,
    `- Layers with notes: ${reviewCounts.withNotes}`,
    "",
    ...markerSection(project),
    ...mediaSection(mediaAssets),
    ...layerSection(project.layers, mediaAssets),
  ];

  return `${lines.join("\n").trim()}\n`;
}

function markerSection(project: EditorProject) {
  const markers = project.markers ?? [];
  if (!markers.length) {
    return ["## Markers", "- None", ""];
  }

  return [
    "## Markers",
    ...markers
      .slice()
      .sort((a, b) => a.time - b.time)
      .map((marker) => `- ${formatTime(marker.time)} - ${cleanMarkdown(marker.label)}`),
    "",
  ];
}

function mediaSection(mediaAssets: MediaAsset[]) {
  if (!mediaAssets.length) {
    return ["## Media Assets", "- None", ""];
  }

  return [
    "## Media Assets",
    ...mediaAssets
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((asset) => `- ${cleanMarkdown(asset.name)} (${asset.type}, ${formatBytes(asset.size)}, ${formatTime(asset.duration)})`),
    "",
  ];
}

function layerSection(layers: TimelineLayer[], mediaAssets: MediaAsset[]) {
  if (!layers.length) {
    return ["## Layers", "- None", ""];
  }

  const assetById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
  return [
    "## Layers",
    ...layers
      .slice()
      .sort((a, b) => a.track - b.track || a.start - b.start || a.name.localeCompare(b.name))
      .flatMap((layer) => layerSummaryLines(layer, assetById.get(layer.assetId ?? ""))),
    "",
  ];
}

function layerSummaryLines(layer: TimelineLayer, asset: MediaAsset | undefined) {
  const status = reviewStatusLabels[layer.reviewStatus ?? "none"];
  const lines = [
    `### ${cleanMarkdown(layer.name)}`,
    `- Type: ${layer.kind}`,
    `- Track: ${layer.track + 1}`,
    `- Timing: ${formatTime(layer.start)} to ${formatTime(layer.start + layer.duration)} (${formatTime(layer.duration)})`,
    `- Review: ${status}`,
  ];

  if (asset) {
    lines.push(`- Media: ${cleanMarkdown(asset.name)}`);
  } else if (layer.assetId) {
    lines.push("- Media: Missing");
  }

  const flags = layerFlags(layer);
  if (flags.length) {
    lines.push(`- Flags: ${flags.join(", ")}`);
  }

  if (layer.notes?.trim()) {
    lines.push("", cleanMarkdown(layer.notes.trim()));
  }

  return [...lines, ""];
}

function countReviewStates(layers: TimelineLayer[]) {
  return layers.reduce(
    (counts, layer) => ({
      needsReview: counts.needsReview + (layer.reviewStatus === "needs-review" ? 1 : 0),
      changesRequested: counts.changesRequested + (layer.reviewStatus === "changes-requested" ? 1 : 0),
      approved: counts.approved + (layer.reviewStatus === "approved" ? 1 : 0),
      withNotes: counts.withNotes + (layer.notes?.trim() ? 1 : 0),
    }),
    { needsReview: 0, changesRequested: 0, approved: 0, withNotes: 0 },
  );
}

function layerFlags(layer: TimelineLayer) {
  return [
    layer.hidden ? "hidden" : "",
    layer.locked ? "locked" : "",
    layer.muted ? "muted" : "",
    layer.groupId ? "grouped" : "",
  ].filter(Boolean);
}

function cleanMarkdown(value: string) {
  return value.replace(/\r/g, "").trim();
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

import type { EditorProject, ExportFormat, ExportQaSnapshot, ExportQaSnapshotSection, ExportQaSnapshotStatus, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { preferredSocialFormatForCanvas, socialFormatPresets } from "@/lib/editor/social-format-presets";
import { formatSupportsEmbeddedAudio, isAudioExportFormat, isImageExportFormat } from "@/lib/render/export-formats";
import type { RenderPlan } from "@/lib/render/export-planner";
import type { RenderHandoffReport } from "@/lib/render/render-handoff";

export type ExportQaStatus = ExportQaSnapshotStatus;
export type ExportQaSection = ExportQaSnapshotSection;

export interface ExportQaSummary {
  status: ExportQaStatus;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  sections: ExportQaSection[];
}

interface ExportQaSummaryInput {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  plan: RenderPlan;
  handoff: RenderHandoffReport;
}

export function createExportQaSummary({ project, mediaAssets, plan, handoff }: ExportQaSummaryInput): ExportQaSummary {
  const sections: ExportQaSection[] = [
    createFormatSection(project, plan),
    createSafeZoneSection(project, plan),
    createSubtitleSection(project, plan),
    createAudioSection(project, plan),
    createMissingMediaSection(project.layers, mediaAssets),
    createRenderRouteSection(handoff),
  ];
  const blockedCount = sections.filter((section) => section.status === "blocked").length;
  const reviewCount = sections.filter((section) => section.status === "review").length;
  const readyCount = sections.filter((section) => section.status === "ready").length;

  return {
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    readyCount,
    reviewCount,
    blockedCount,
    sections,
  };
}

export function createExportQaSnapshot({
  capturedAt = new Date().toISOString(),
  ...input
}: ExportQaSummaryInput & { capturedAt?: string }): ExportQaSnapshot {
  const summary = createExportQaSummary(input);

  return {
    ...summary,
    capturedAt,
    preset: input.plan.preset,
    format: input.plan.format,
    renderRouteLabel: input.handoff.label,
    renderRouteStatus: input.handoff.status,
  };
}

function createFormatSection(project: EditorProject, plan: RenderPlan): ExportQaSection {
  const output = outputSettings(project, plan);
  if (!plan.supported) {
    return {
      id: "format",
      label: "Format",
      status: "blocked",
      summary: `${formatLabel(plan.format)} is not ready`,
      detail: plan.reason ?? "The selected format cannot render from this timeline yet.",
    };
  }

  if (plan.mode === "project-bundle") {
    return {
      id: "format",
      label: "Format",
      status: "ready",
      summary: "Project bundle metadata",
      detail: "This exports the project structure and media metadata instead of rendered media.",
    };
  }

  return {
    id: "format",
    label: "Format",
    status: "ready",
    summary: `${formatLabel(plan.format)} / ${output.width}x${output.height}`,
    detail: `${output.fps} FPS, ${formatDuration(plan.duration)}, ${plan.mode === "single-media-ffmpeg" ? "single-source transcode" : "timeline composite"}.`,
  };
}

function createSafeZoneSection(project: EditorProject, plan: RenderPlan): ExportQaSection {
  if (!isVisualFormat(plan.format)) {
    return {
      id: "safe-zones",
      label: "Safe zones",
      status: "ready",
      summary: "Not needed for this export",
      detail: "Audio and project bundle exports do not use visual safe-zone overlays.",
    };
  }

  const output = outputSettings(project, plan);
  const projectFormat = preferredSocialFormatForCanvas({
    socialFormatId: project.socialFormatId,
    aspectRatio: project.aspectRatio,
    width: project.width,
    height: project.height,
  });
  const outputFormat =
    socialFormatPresets.find((preset) => preset.width === output.width && preset.height === output.height) ??
    preferredSocialFormatForCanvas({
      aspectRatio: aspectRatioFromDimensions(output.width, output.height),
      width: output.width,
      height: output.height,
    });
  const matchesProjectAspect = outputFormat.aspectRatio === projectFormat.aspectRatio;

  return {
    id: "safe-zones",
    label: "Safe zones",
    status: matchesProjectAspect ? "ready" : "review",
    summary: `${outputFormat.label} safe zones`,
    detail: matchesProjectAspect
      ? `${outputFormat.safeZones.title.label} and ${outputFormat.safeZones.action.label} match the selected canvas.`
      : `Selected export changes from ${projectFormat.aspectRatio} to ${outputFormat.aspectRatio}. Recheck text and action-safe areas before export.`,
  };
}

function createSubtitleSection(project: EditorProject, plan: RenderPlan): ExportQaSection {
  const subtitleLayers = project.layers.filter((layer) => !layer.hidden && layer.kind === "subtitle");
  const cueCount = subtitleLayers.reduce((total, layer) => total + (layer.cues?.length ?? 0), 0);
  const captionMode = plan.conversionOptions?.captionMode ?? "burn-in";

  if (!isVisualFormat(plan.format)) {
    return {
      id: "subtitles",
      label: "Subtitles",
      status: "ready",
      summary: "Not rendered in this export",
      detail: "Audio and project bundle exports keep caption data in the project instead of burning visual subtitles.",
    };
  }

  if (cueCount === 0) {
    return {
      id: "subtitles",
      label: "Subtitles",
      status: "review",
      summary: "No subtitle cues found",
      detail: "Add captions or confirm this export is intentionally caption-free.",
    };
  }

  if (captionMode === "none") {
    return {
      id: "subtitles",
      label: "Subtitles",
      status: "review",
      summary: `${cueCount} cues will be omitted`,
      detail: "The selected caption mode disables caption output for this export.",
    };
  }

  return {
    id: "subtitles",
    label: "Subtitles",
    status: "ready",
    summary: `${cueCount} cues ${captionMode === "sidecar" ? "as SRT sidecar" : "burned in"}`,
    detail: `${subtitleLayers.length} subtitle ${subtitleLayers.length === 1 ? "layer" : "layers"} will be included by the selected caption mode.`,
  };
}

function createAudioSection(project: EditorProject, plan: RenderPlan): ExportQaSection {
  if (plan.mode === "project-bundle") {
    return {
      id: "audio-loudness",
      label: "Audio",
      status: "ready",
      summary: "Stored as project metadata",
      detail: "Project bundle exports preserve layer and asset metadata instead of rendering or embedding audio.",
    };
  }

  const audibleLayers = project.layers.filter(isAudibleMediaLayer);
  const loudLayers = audibleLayers.filter((layer) => (layer.volume ?? 1) > 1.15);
  const peakVolume = audibleLayers.reduce((peak, layer) => Math.max(peak, layer.volume ?? 1), 0);

  if (!formatSupportsEmbeddedAudio(plan.format)) {
    return {
      id: "audio-loudness",
      label: "Audio",
      status: audibleLayers.length > 0 ? "review" : "ready",
      summary: audibleLayers.length > 0 ? "Audio will not be embedded" : "No embedded audio needed",
      detail:
        audibleLayers.length > 0
          ? `${formatLabel(plan.format)} exports do not carry timeline audio. Choose MP4/WebM or an audio preset if sound is required.`
          : "The selected format does not support embedded audio and no audible layers were found.",
    };
  }

  if (audibleLayers.length === 0) {
    return {
      id: "audio-loudness",
      label: "Audio",
      status: "review",
      summary: "No audible layers",
      detail: "Add or unmute audio if this delivery needs sound.",
    };
  }

  return {
    id: "audio-loudness",
    label: "Audio",
    status: loudLayers.length > 0 ? "review" : "ready",
    summary: `${audibleLayers.length} audible ${audibleLayers.length === 1 ? "layer" : "layers"}`,
    detail:
      loudLayers.length > 0
        ? `${loudLayers.length} layer ${loudLayers.length === 1 ? "is" : "are"} boosted above 115%. Check loudness before delivery.`
        : `Peak layer volume is ${Math.round(peakVolume * 100)}%; no boosted loudness risk detected.`,
  };
}

function createMissingMediaSection(layers: TimelineLayer[], mediaAssets: MediaAsset[]): ExportQaSection {
  const mediaById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
  const missingLayers = layers.filter((layer) => {
    if (!layer.assetId || !["audio", "image", "video"].includes(layer.kind)) return false;
    const asset = mediaById.get(layer.assetId);
    return !asset || !asset.objectUrl;
  });

  if (missingLayers.length > 0) {
    return {
      id: "missing-media",
      label: "Missing media",
      status: "blocked",
      summary: `${missingLayers.length} missing ${missingLayers.length === 1 ? "source" : "sources"}`,
      detail: `${summarizeLayerNames(missingLayers)} ${missingLayers.length === 1 ? "needs" : "need"} reconnecting before export.`,
    };
  }

  return {
    id: "missing-media",
    label: "Missing media",
    status: "ready",
    summary: `${mediaAssets.length} media ${mediaAssets.length === 1 ? "asset" : "assets"} available`,
    detail: "Referenced browser, desktop, and linked media sources are present for the selected render path.",
  };
}

function createRenderRouteSection(handoff: RenderHandoffReport): ExportQaSection {
  return {
    id: "render-route",
    label: "Render route",
    status: handoff.status === "unsupported" || handoff.status === "desktop-required" ? "blocked" : handoff.status === "desktop-recommended" ? "review" : "ready",
    summary: handoff.label,
    detail: handoff.detail,
  };
}

function isAudibleMediaLayer(layer: TimelineLayer) {
  return !layer.hidden && !layer.muted && (layer.kind === "audio" || layer.kind === "video") && (layer.volume ?? 1) > 0;
}

function isVisualFormat(format: ExportFormat) {
  return !isAudioExportFormat(format) && format !== "json";
}

function outputSettings(project: EditorProject, plan: RenderPlan) {
  return {
    width: plan.conversionOptions?.width || plan.presetOptions?.width || project.width,
    height: plan.conversionOptions?.height || plan.presetOptions?.height || project.height,
    fps: plan.conversionOptions?.fps || plan.presetOptions?.fps || project.fps,
  };
}

function aspectRatioFromDimensions(width: number, height: number) {
  if (width <= 0 || height <= 0) return "16:9";
  const divisor = greatestCommonDivisor(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : greatestCommonDivisor(b, a % b);
}

function formatLabel(format: ExportFormat) {
  if (isImageExportFormat(format)) return format.toUpperCase();
  return format === "json" ? "Project bundle" : format.toUpperCase();
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

function summarizeLayerNames(layers: TimelineLayer[]) {
  const names = layers.slice(0, 3).map((layer) => layer.name).join(", ");
  return layers.length > 3 ? `${names}, and ${layers.length - 3} more` : names;
}

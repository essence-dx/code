import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import type { RenderPlan } from "@/lib/render/export-planner";

export type RenderHandoffTarget = "browser" | "desktop";
export type RenderHandoffStatus = "browser-ready" | "desktop-ready" | "desktop-recommended" | "desktop-required" | "unsupported";

export interface RenderHandoffReport {
  target: RenderHandoffTarget;
  status: RenderHandoffStatus;
  label: string;
  detail: string;
  reasons: string[];
  canAttemptInBrowser: boolean;
}

export interface RenderHandoffInput {
  project: EditorProject;
  assets: MediaAsset[];
  plan: RenderPlan;
  isDesktopRuntime: boolean;
}

const LONG_PROJECT_SECONDS = 180;
const DESKTOP_REQUIRED_SECONDS = 600;
const MANY_LAYER_COUNT = 28;
const MANY_MEDIA_LAYER_COUNT = 12;
const LARGE_CANVAS_PIXELS = 3840 * 2160;
const VERY_LARGE_CANVAS_PIXELS = 5120 * 2880;
const MANY_OUTPUT_FRAMES = 9000;
const DESKTOP_REQUIRED_FRAMES = 18000;
const DESKTOP_REQUIRED_LAYER_FRAME_BUDGET = 120000;
const DESKTOP_REQUIRED_MEDIA_FRAME_BUDGET = 42000;

export function createRenderHandoffPlan({
  project,
  assets,
  plan,
  isDesktopRuntime,
}: RenderHandoffInput): RenderHandoffReport {
  if (!plan.supported) {
    return {
      target: "browser",
      status: "unsupported",
      label: "Needs changes",
      detail: plan.reason ?? "This export preset is not supported for the current timeline.",
      reasons: ["unsupported-preset"],
      canAttemptInBrowser: false,
    };
  }

  if (plan.mode === "project-bundle") {
    return {
      target: "browser",
      status: "browser-ready",
      label: "Backup route",
      detail: "Project bundles export as local metadata and do not need the heavy render pipeline.",
      reasons: ["metadata-export"],
      canAttemptInBrowser: true,
    };
  }

  const desktopMediaLayerCount = countDesktopMediaLayers(project, assets);
  if (desktopMediaLayerCount > 0 && !isDesktopRuntime) {
    return {
      target: "desktop",
      status: "desktop-required",
      label: "Desktop required",
      detail: "This project uses desktop-only media. Open it in the desktop app or reconnect the files in the browser before exporting.",
      reasons: ["desktop-media"],
      canAttemptInBrowser: false,
    };
  }

  const complexity = createRenderComplexityReport(project, plan);
  const hasDesktopMedia = desktopMediaLayerCount > 0;
  if (hasDesktopMedia || complexity.reasons.length > 0) {
    const reasons = hasDesktopMedia ? ["desktop-media", ...complexity.reasons] : complexity.reasons;

    if (isDesktopRuntime) {
      return {
        target: "desktop",
        status: "desktop-ready",
        label: "Desktop route",
        detail: "The desktop app can keep local files and saved output on the machine for this heavier export.",
        reasons,
        canAttemptInBrowser: true,
      };
    }

    if (complexity.desktopRequiredReasons.length > 0) {
      return {
        target: "desktop",
        status: "desktop-required",
        label: "Desktop required",
        detail: "This timeline is beyond the browser render budget. Use the desktop app so the render can run through the local desktop pipeline.",
        reasons,
        canAttemptInBrowser: false,
      };
    }

    return {
      target: "desktop",
      status: "desktop-recommended",
      label: "Desktop recommended",
      detail: "This export may be slow or memory-heavy in the browser. The desktop app is the safer route for this timeline.",
      reasons,
      canAttemptInBrowser: true,
    };
  }

  return {
    target: "browser",
    status: "browser-ready",
    label: "Browser route",
    detail: "This export is within the browser render budget.",
    reasons: ["browser-safe"],
    canAttemptInBrowser: true,
  };
}

interface RenderComplexityReport {
  reasons: string[];
  desktopRequiredReasons: string[];
}

function createRenderComplexityReport(project: EditorProject, plan: RenderPlan): RenderComplexityReport {
  const visibleLayers = project.layers.filter((layer) => !layer.hidden);
  const mediaLayerCount = visibleLayers.filter((layer) => Boolean(layer.assetId)).length;
  const fps = plan.conversionOptions?.fps || plan.presetOptions?.fps || project.fps || 30;
  const width = plan.conversionOptions?.width || plan.presetOptions?.width || project.width;
  const height = plan.conversionOptions?.height || plan.presetOptions?.height || project.height;
  const estimatedFrames = Math.max(0, plan.duration) * fps;
  const reasons: string[] = [];
  const desktopRequiredReasons: string[] = [];

  if (plan.duration > LONG_PROJECT_SECONDS) reasons.push("long-project");
  if (visibleLayers.length > MANY_LAYER_COUNT) reasons.push("many-layers");
  if (mediaLayerCount > MANY_MEDIA_LAYER_COUNT) reasons.push("many-media-layers");
  if (width * height > LARGE_CANVAS_PIXELS) reasons.push("large-canvas");
  if (estimatedFrames > MANY_OUTPUT_FRAMES) reasons.push("many-frames");

  if (plan.duration > DESKTOP_REQUIRED_SECONDS) desktopRequiredReasons.push("very-long-project");
  if (estimatedFrames > DESKTOP_REQUIRED_FRAMES) desktopRequiredReasons.push("browser-frame-budget");
  if (visibleLayers.length * estimatedFrames > DESKTOP_REQUIRED_LAYER_FRAME_BUDGET) desktopRequiredReasons.push("layer-frame-budget");
  if (mediaLayerCount * estimatedFrames > DESKTOP_REQUIRED_MEDIA_FRAME_BUDGET) desktopRequiredReasons.push("media-frame-budget");
  if (width * height > VERY_LARGE_CANVAS_PIXELS && estimatedFrames > MANY_OUTPUT_FRAMES) desktopRequiredReasons.push("large-canvas-frame-budget");

  return {
    reasons: uniqueStrings([...reasons, ...desktopRequiredReasons]),
    desktopRequiredReasons,
  };
}

function countDesktopMediaLayers(project: EditorProject, assets: MediaAsset[]) {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  return project.layers.filter((layer) => layer.assetId && assetsById.get(layer.assetId)?.source === "tauri-fs").length;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

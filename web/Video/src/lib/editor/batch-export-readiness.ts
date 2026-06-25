import { createExportQaSummary, type ExportQaStatus } from "@/lib/editor/export-qa-summary";
import { exportPresets, type ExportPreset } from "@/lib/editor/presets";
import { findSocialFormatPreset, type SocialDeliveryPreset } from "@/lib/editor/social-format-presets";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import { createRenderPlan, type ExportConversionSettings, type RenderPlan } from "@/lib/render/export-planner";
import { createRenderHandoffPlan, type RenderHandoffReport } from "@/lib/render/render-handoff";

export interface BatchExportReadinessItem {
  delivery: SocialDeliveryPreset;
  preset?: ExportPreset;
  deliveryProject: EditorProject;
  plan?: RenderPlan;
  handoff?: RenderHandoffReport;
  status: ExportQaStatus;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  outputLabel: string;
  routeLabel: string;
  routeStatus: string;
  summary: string;
  details: string[];
  conversionSettings: ExportConversionSettings;
}

export interface BatchExportReadinessReport {
  status: ExportQaStatus;
  canStart: boolean;
  selectedCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  items: BatchExportReadinessItem[];
}

export function createBatchExportReadinessReport({
  project,
  mediaAssets,
  deliveries,
  conversionSettings,
  isDesktopRuntime,
}: {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  deliveries: SocialDeliveryPreset[];
  conversionSettings: ExportConversionSettings;
  isDesktopRuntime: boolean;
}): BatchExportReadinessReport {
  const items = deliveries.map((delivery) =>
    createBatchExportReadinessItem({
      project,
      mediaAssets,
      delivery,
      conversionSettings,
      isDesktopRuntime,
    }),
  );
  const readyCount = items.filter((item) => item.status === "ready").length;
  const reviewCount = items.filter((item) => item.status === "review").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;

  return {
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    canStart: items.length > 0 && blockedCount === 0,
    selectedCount: items.length,
    readyCount,
    reviewCount,
    blockedCount,
    items,
  };
}

function createBatchExportReadinessItem({
  project,
  mediaAssets,
  delivery,
  conversionSettings,
  isDesktopRuntime,
}: {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  delivery: SocialDeliveryPreset;
  conversionSettings: ExportConversionSettings;
  isDesktopRuntime: boolean;
}): BatchExportReadinessItem {
  const preset = exportPresets.find((item) => item.id === delivery.exportPresetId);
  const deliveryConversionSettings = createDeliveryConversionSettings(delivery, preset, conversionSettings);

  if (!preset) {
    return {
      delivery,
      deliveryProject: projectForDelivery(project, delivery),
      status: "blocked",
      readyCount: 0,
      reviewCount: 0,
      blockedCount: 1,
      outputLabel: "Preset missing",
      routeLabel: "Not ready",
      routeStatus: "unsupported",
      summary: "Export preset is missing",
      details: [`${delivery.label} references ${delivery.exportPresetId}, but that preset is not available.`],
      conversionSettings: deliveryConversionSettings,
    };
  }

  const deliveryProject = projectForDelivery(project, delivery);
  const plan = createRenderPlan(deliveryProject, mediaAssets, preset.id, preset.format, { conversion: deliveryConversionSettings });
  const handoff = createRenderHandoffPlan({ project: deliveryProject, assets: mediaAssets, plan, isDesktopRuntime });
  const qa = createExportQaSummary({ project: deliveryProject, mediaAssets, plan, handoff });
  const details = qa.sections.filter((section) => section.status !== "ready").map((section) => `${section.label}: ${section.summary}`);

  return {
    delivery,
    deliveryProject,
    preset,
    plan,
    handoff,
    status: qa.status,
    readyCount: qa.readyCount,
    reviewCount: qa.reviewCount,
    blockedCount: qa.blockedCount,
    outputLabel: `${plan.conversionOptions?.width || deliveryProject.width}x${plan.conversionOptions?.height || deliveryProject.height} ${preset.format.toUpperCase()}`,
    routeLabel: handoff.label,
    routeStatus: handoff.status,
    summary:
      qa.status === "ready"
        ? "Ready for batch render"
        : `${qa.blockedCount} blocked and ${qa.reviewCount} review ${qa.reviewCount === 1 ? "item" : "items"}`,
    details: details.length > 0 ? details : [delivery.description],
    conversionSettings: deliveryConversionSettings,
  };
}

function createDeliveryConversionSettings(delivery: SocialDeliveryPreset, preset: ExportPreset | undefined, settings: ExportConversionSettings) {
  const format = findSocialFormatPreset(delivery.socialFormatId);
  const presetMatchesTargetAspect = Boolean(preset?.width && preset?.height && aspectRatioFromDimensions(preset.width, preset.height) === format.aspectRatio);

  return {
    ...settings,
    width: presetMatchesTargetAspect ? preset?.width ?? format.width : format.width,
    height: presetMatchesTargetAspect ? preset?.height ?? format.height : format.height,
    fps: preset?.fps ?? settings.fps,
  };
}

function projectForDelivery(project: EditorProject, delivery: SocialDeliveryPreset): EditorProject {
  const format = findSocialFormatPreset(delivery.socialFormatId);

  return {
    ...project,
    socialFormatId: format.id,
    aspectRatio: format.aspectRatio,
    width: format.width,
    height: format.height,
  };
}

function aspectRatioFromDimensions(width: number, height: number) {
  if (width <= 0 || height <= 0) return "";
  const divisor = greatestCommonDivisor(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : greatestCommonDivisor(b, a % b);
}

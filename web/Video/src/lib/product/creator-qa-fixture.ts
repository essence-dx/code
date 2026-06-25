import type { DeliveryQaReport } from "@/lib/editor/delivery-qa";
import { createDeliveryQaReport } from "@/lib/editor/delivery-qa";
import { createRenderPlan, type RenderPlan } from "@/lib/render/export-planner";
import { createNativeRenderGraph, type NativeRenderGraph } from "@/lib/render/native-render-graph";
import { createRenderHandoffPlan, type RenderHandoffReport } from "@/lib/render/render-handoff";
import {
  createCreatorQaSampleProjectFixture,
  type CreatorQaSampleProjectFixture,
} from "@/lib/product/creator-qa-fixture-data";

export { createCreatorQaSampleProjectFixture, type CreatorQaSampleProjectFixture };

export interface CreatorQaSampleProjectReport {
  status: "ready" | "blocked";
  coverage: Record<CreatorQaCoverageId, boolean>;
  issues: string[];
  deliveryQa: DeliveryQaReport;
  renderPlan: RenderPlan;
  browserHandoff: RenderHandoffReport;
  desktopHandoff: RenderHandoffReport;
  nativeGraph: NativeRenderGraph;
  reviewLinkCount: number;
  uploadEvidenceCount: number;
}

export type CreatorQaCoverageId =
  | "multi-track-video"
  | "captions"
  | "voiceover"
  | "stock-assets"
  | "native-render"
  | "review-links"
  | "upload-handoff";

export function createCreatorQaSampleProjectReport(
  fixture: CreatorQaSampleProjectFixture = createCreatorQaSampleProjectFixture(),
): CreatorQaSampleProjectReport {
  const deliveryQa = createDeliveryQaReport(fixture.project, fixture.assets);
  const renderPlan = createRenderPlan(fixture.project, fixture.assets, "mp4-1080p", "mp4", {
    conversion: { captionMode: "burn-in", fps: 30, width: 1920, height: 1080 },
  });
  const browserHandoff = createRenderHandoffPlan({ project: fixture.project, assets: fixture.assets, plan: renderPlan, isDesktopRuntime: false });
  const desktopHandoff = createRenderHandoffPlan({ project: fixture.project, assets: fixture.assets, plan: renderPlan, isDesktopRuntime: true });
  const nativeGraph = createNativeRenderGraph(fixture.project, fixture.assets, renderPlan);
  const coverage = createCreatorQaCoverage(fixture, { deliveryQa, renderPlan, browserHandoff, desktopHandoff, nativeGraph });
  const issues = Object.entries(coverage)
    .filter(([, ready]) => !ready)
    .map(([id]) => id);

  if (deliveryQa.status !== "ready") {
    issues.push(...deliveryQa.issues.map((issue) => issue.id));
  }

  return {
    status: issues.length === 0 ? "ready" : "blocked",
    coverage,
    issues,
    deliveryQa,
    renderPlan,
    browserHandoff,
    desktopHandoff,
    nativeGraph,
    reviewLinkCount: fixture.reviewLinks.length,
    uploadEvidenceCount: fixture.uploadEvidence.entryCount,
  };
}

function createCreatorQaCoverage(
  fixture: CreatorQaSampleProjectFixture,
  report: Pick<CreatorQaSampleProjectReport, "deliveryQa" | "renderPlan" | "browserHandoff" | "desktopHandoff" | "nativeGraph">,
): Record<CreatorQaCoverageId, boolean> {
  const videoLayers = fixture.project.layers.filter((layer) => layer.kind === "video" && !layer.hidden);
  const subtitleLayers = fixture.project.layers.filter((layer) => layer.kind === "subtitle" && !layer.hidden);
  const audioLayers = fixture.project.layers.filter((layer) => layer.kind === "audio" && !layer.hidden);
  const stockAssetIds = new Set(fixture.project.mediaCollections?.find((collection) => collection.id === "collection_stock")?.assetIds ?? []);
  const mediaSources = new Set(report.nativeGraph.media.map((asset) => asset.source));

  return {
    "multi-track-video": videoLayers.length >= 3 && new Set(videoLayers.map((layer) => layer.track)).size >= 2,
    captions: subtitleLayers.some((layer) => (layer.cues?.length ?? 0) >= 4),
    voiceover: audioLayers.some((layer) => layer.name.toLowerCase().includes("voiceover")),
    "stock-assets": fixture.assets.filter((asset) => stockAssetIds.has(asset.id) && asset.source === "self-hosted-url").length >= 3,
    "native-render":
      report.renderPlan.supported &&
      report.renderPlan.mode === "composite" &&
      report.browserHandoff.status === "desktop-required" &&
      report.desktopHandoff.status === "desktop-ready" &&
      mediaSources.has("tauri-fs") &&
      mediaSources.has("self-hosted-url"),
    "review-links": fixture.reviewLinks.some((link) => link.permission === "comment-only") && fixture.reviewLinks.some((link) => link.permission === "download"),
    "upload-handoff": fixture.uploadEvidence.verifiedCount >= 2 && fixture.uploadEvidence.entries.some((entry) => stockAssetIds.has(entry.assetId)),
  };
}

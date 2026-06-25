import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBatchExportReadinessReport } from "../src/lib/editor/batch-export-readiness";
import { createLayerFromAsset, createProject, createTextLayer } from "../src/lib/editor/factory";
import { socialDeliveryPresets } from "../src/lib/editor/social-format-presets";
import type { MediaAsset } from "../src/lib/editor/types";
import { DEFAULT_EXPORT_CONVERSION_SETTINGS } from "../src/lib/render/export-planner";

const asset = createMediaAsset({ objectUrl: "blob:batch-ready-video" });
const project = createProject("Batch delivery readiness", "16:9");
project.duration = 12;
project.layers = [
  { ...createLayerFromAsset(asset, 0), duration: 12 },
  { ...createTextLayer("subtitle", 1), duration: 12 },
];

const selectedDeliveries = socialDeliveryPresets.filter((delivery) => ["shorts-mp4", "linkedin-feed-mp4", "thumbnail-png"].includes(delivery.id));
const report = createBatchExportReadinessReport({
  project,
  mediaAssets: [asset],
  deliveries: selectedDeliveries,
  conversionSettings: DEFAULT_EXPORT_CONVERSION_SETTINGS,
  isDesktopRuntime: false,
});

assert.equal(report.selectedCount, 3);
assert.equal(report.canStart, true);
assert.equal(report.blockedCount, 0);

const shorts = report.items.find((item) => item.delivery.id === "shorts-mp4");
assert.ok(shorts);
assert.equal(shorts.conversionSettings.width, 1080);
assert.equal(shorts.conversionSettings.height, 1920);

const linkedinFeed = report.items.find((item) => item.delivery.id === "linkedin-feed-mp4");
assert.ok(linkedinFeed);
assert.equal(linkedinFeed.deliveryProject.socialFormatId, "linkedin-feed");
assert.equal(linkedinFeed.conversionSettings.width, 1080);
assert.equal(linkedinFeed.conversionSettings.height, 1350);
assert.equal(linkedinFeed.outputLabel, "1080x1350 MP4");

const thumbnail = report.items.find((item) => item.delivery.id === "thumbnail-png");
assert.ok(thumbnail);
assert.equal(thumbnail.conversionSettings.width, 1280);
assert.equal(thumbnail.conversionSettings.height, 720);
assert.equal(thumbnail.outputLabel, "1280x720 PNG");

const blocked = createBatchExportReadinessReport({
  project,
  mediaAssets: [{ ...asset, objectUrl: undefined }],
  deliveries: selectedDeliveries.slice(0, 1),
  conversionSettings: DEFAULT_EXPORT_CONVERSION_SETTINGS,
  isDesktopRuntime: false,
});

assert.equal(blocked.status, "blocked");
assert.equal(blocked.canStart, false);
assert.equal(blocked.items[0]?.details.some((detail) => detail.includes("Missing media")), true);

const exportPanel = read("src/features/editor/components/export-panel.tsx");
const dialog = read("src/features/editor/components/batch-export-readiness-dialog.tsx");
const batchReadiness = read("src/lib/editor/batch-export-readiness.ts");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");

assert.match(exportPanel, /createBatchExportReadinessReport/);
assert.match(exportPanel, /BatchExportReadinessDialog/);
assert.match(exportPanel, /batchReadinessReport\.canStart/);
assert.match(exportPanel, /conversionOverride: item\.conversionSettings/);
assert.match(exportPanel, /qaProject: item\.deliveryProject/);
assert.match(dialog, /Batch Export Readiness/);
assert.match(dialog, /Compare selected social deliveries/);
assert.match(batchReadiness, /createDeliveryConversionSettings/);
assert.match(batchReadiness, /projectForDelivery/);
assert.match(packageJson, /check:batch-export-readiness-workflow/);
assert.match(lightweight, /check:batch-export-readiness-workflow/);

console.log("Batch export readiness workflow checks passed.");

function createMediaAsset(input: Partial<MediaAsset>): MediaAsset {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name ?? "batch-ready-video.mp4",
    type: input.type ?? "video",
    mimeType: input.mimeType ?? "video/mp4",
    size: input.size ?? 1_024_000,
    duration: input.duration ?? 12,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
    storageKey: input.storageKey ?? "batch-ready-video.mp4",
    source: input.source ?? "browser-indexeddb",
    objectUrl: input.objectUrl,
    createdAt: input.createdAt ?? "2026-05-16T04:37:14.197Z",
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

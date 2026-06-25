import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import { createMediaAttributionSummary, createSelfHostedMediaAttribution, createStockMediaAttribution } from "../src/lib/editor/media-attribution";
import type { MediaAsset } from "../src/lib/editor/types";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";
import type { StockAsset } from "../src/lib/stock/stock-assets";

const capturedAt = "2026-05-16T05:09:54.840Z";
const stockAsset = createMediaAsset({
  id: "asset_stock",
  name: "commons-broll.mp4",
  source: "browser-indexeddb",
  attribution: createStockMediaAttribution(createStockAsset(), capturedAt),
});
const selfHostedAsset = createMediaAsset({
  id: "asset_self_hosted",
  name: "creator-cdn.mp4",
  source: "self-hosted-url",
  storageKey: "https://cdn.example.com/video.mp4",
  objectUrl: "https://cdn.example.com/video.mp4",
  attribution: createSelfHostedMediaAttribution({ url: "https://cdn.example.com/video.mp4", title: "creator-cdn.mp4", capturedAt }),
});
const browserAsset = createMediaAsset({ id: "asset_browser", name: "local-upload.mp4", source: "browser-indexeddb" });
const desktopAsset = createMediaAsset({ id: "asset_desktop", name: "desktop-file.mp4", source: "tauri-fs" });
const project = createProject("Media attribution handoff", "16:9");
project.layers = [stockAsset, selfHostedAsset, browserAsset, desktopAsset].map((asset, index) => ({
  ...createLayerFromAsset(asset, index),
  duration: 5,
}));

const summary = createMediaAttributionSummary({
  project,
  mediaAssets: [stockAsset, selfHostedAsset, browserAsset, desktopAsset],
  generatedAt: capturedAt,
});

assert.equal(summary.itemCount, 4);
assert.equal(summary.stockCount, 1);
assert.equal(summary.selfHostedCount, 1);
assert.equal(summary.browserCount, 1);
assert.equal(summary.desktopCount, 1);
assert.equal(summary.status, "review");
assert.equal(summary.items.find((item) => item.assetId === "asset_stock")?.status, "ready");
assert.equal(summary.items.find((item) => item.assetId === "asset_stock")?.licenseLabel, "CC BY-SA 4.0");
assert.equal(summary.items.find((item) => item.assetId === "asset_browser")?.detail.includes("Confirm creator ownership"), true);
assert.equal(
  syncedProjectPayloadSchema.safeParse({
    project,
    mediaAssets: [stockAsset, selfHostedAsset, browserAsset, desktopAsset],
  }).success,
  true,
);

const types = read("src/lib/editor/types.ts");
const exportPanel = read("src/features/editor/components/export-panel.tsx");
const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
const collaborationStore = read("src/lib/projects/collaboration-store.ts");
const aiAssistant = read("src/features/editor/components/ai-assistant-panel.tsx");
const selfHostedMedia = read("src/lib/media/self-hosted-media.ts");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");

assert.match(types, /mediaAttributionSummary\?: MediaAttributionSummary/);
assert.match(types, /export interface MediaAttributionSummary/);
assert.match(exportPanel, /createMediaAttributionSummary/);
assert.match(exportPanel, /mediaAttributionSummary: createMediaAttributionSummary/);
assert.match(reviewClient, /Media Attribution/);
assert.match(reviewClient, /MediaAttributionRow/);
assert.match(reviewClient, /AttributionLink/);
assert.match(collaborationStore, /mediaAttributionSummary\?: MediaAttributionSummary/);
assert.match(collaborationStore, /mediaAttributionSummary: input\.job\.mediaAttributionSummary/);
assert.match(aiAssistant, /createStockMediaAttribution\(stockAsset\)/);
assert.match(selfHostedMedia, /createSelfHostedMediaAttribution/);
assert.match(packageJson, /check:media-attribution-handoff-workflow/);
assert.match(lightweight, /check:media-attribution-handoff-workflow/);

console.log("Media attribution handoff workflow checks passed.");

function createMediaAsset(input: Partial<MediaAsset>): MediaAsset {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name ?? "media.mp4",
    type: input.type ?? "video",
    mimeType: input.mimeType ?? "video/mp4",
    size: input.size ?? 512_000,
    duration: input.duration ?? 5,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
    storageKey: input.storageKey ?? input.name ?? "media.mp4",
    source: input.source ?? "browser-indexeddb",
    objectUrl: input.objectUrl ?? "blob:media",
    attribution: input.attribution,
    createdAt: input.createdAt ?? capturedAt,
  };
}

function createStockAsset(): StockAsset {
  return {
    id: "commons_file",
    provider: "wikimedia-commons",
    providerLabel: "Wikimedia Commons",
    title: "Commons B-roll",
    name: "commons-broll.mp4",
    kind: "video",
    mimeType: "video/mp4",
    size: 512_000,
    sourceUrl: "https://upload.wikimedia.org/example/commons-broll.mp4",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Commons_B-roll.mp4",
    licenseLabel: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution: "Example Creator",
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROJECT_FORMAT_VERSION, type EditorProject, type MediaAsset, type TimelineLayer } from "../src/lib/editor/types";
import { createMediaHealthReport, summarizeMissingMediaImpact } from "../src/lib/media/media-health";

const now = "2026-05-14T00:00:00.000Z";

const readyAsset = mediaAsset({ id: "asset-ready", name: "ready.mp4", objectUrl: "blob:ready", type: "video", mimeType: "video/mp4" });
const missingAsset = mediaAsset({ id: "asset-missing", name: "missing.mov", type: "video", mimeType: "video/quicktime" });
const unusedAsset = mediaAsset({ id: "asset-unused", name: "unused.png", objectUrl: "blob:unused", type: "image", mimeType: "image/png" });

const project: EditorProject = {
  formatVersion: PROJECT_FORMAT_VERSION,
  id: "project-media-health",
  title: "Media health check",
  aspectRatio: "16:9",
  width: 1920,
  height: 1080,
  duration: 12,
  fps: 30,
  background: "#111827",
  layers: [
    timelineLayer({ id: "layer-ready", name: "Ready clip", kind: "video", assetId: readyAsset.id }),
    timelineLayer({ id: "layer-missing", name: "Missing clip", kind: "video", assetId: missingAsset.id, track: 1 }),
    timelineLayer({ id: "layer-orphan", name: "Orphan clip", kind: "image", assetId: "asset-orphan", track: 2 }),
    timelineLayer({ id: "layer-text", name: "Title", kind: "text", track: 3 }),
  ],
  markers: [],
  mediaCollections: [],
  layerStylePresets: [],
  audioMixPresets: [],
  brandTypographyPresets: [],
  updatedAt: now,
};

const report = createMediaHealthReport(project, [readyAsset, missingAsset, unusedAsset], [unusedAsset.id]);
assert.equal(report.totalAssets, 3);
assert.equal(report.availableAssets, 2);
assert.equal(report.missingAssets, 1);
assert.equal(report.usedAssets, 2);
assert.equal(report.unusedAssets, 1);
assert.equal(report.favoriteAssets, 1);
assert.equal(report.recoverableAssets, 1);
assert.equal(report.reconnectRequiredAssets, 1);
assert.equal(report.missingLayerCount, 2);
assert.equal(report.missingReferenceCount, 1);

const missingHealth = report.assets.find((item) => item.asset.id === missingAsset.id);
assert.equal(missingHealth?.isRecoverable, true);
assert.equal(missingHealth?.impactedLayers[0]?.name, "Missing clip");
assert.equal(summarizeMissingMediaImpact(report), "Missing clip, Orphan clip");

const mediaBinSource = readFileSync("src/features/editor/components/media-bin.tsx", "utf8");
assert.match(mediaBinSource, /createMediaHealthReport/);
assert.match(mediaBinSource, /MediaBinStatusPanels/);
assert.match(mediaBinSource, /summarizeMissingMediaImpact/);
assert.match(mediaBinSource, /mediaFilter === "recoverable"/);
assert.match(readFileSync("src/features/editor/components/media-asset-card.tsx", "utf8"), /needsReconnect/);
assert.match(readFileSync("src/features/editor/components/media-bin-import-controls.tsx", "utf8"), /onFiles/);
assert.match(readFileSync("src/features/editor/components/media-bin-collection-controls.tsx", "utf8"), /mediaFilters/);

const mediaHealthStripSource = readFileSync("src/features/editor/components/media-health-strip.tsx", "utf8");
assert.match(mediaHealthStripSource, /report\.recoverableAssets/);
assert.match(mediaHealthStripSource, /report\.missingLayerCount/);
assert.match(mediaHealthStripSource, /filter="missing"/);

console.log("Media health workflow checks passed.");

function mediaAsset(input: Partial<MediaAsset> & Pick<MediaAsset, "id" | "name" | "type" | "mimeType">): MediaAsset {
  return {
    size: 1000,
    duration: 5,
    storageKey: input.id,
    source: "browser-indexeddb",
    createdAt: now,
    ...input,
  };
}

function timelineLayer(input: Partial<TimelineLayer> & Pick<TimelineLayer, "id" | "name" | "kind">): TimelineLayer {
  return {
    track: 0,
    start: 0,
    duration: 5,
    trimStart: 0,
    playbackRate: 1,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    locked: false,
    muted: false,
    hidden: false,
    transform: {
      x: 0.5,
      y: 0.5,
      width: 640,
      height: 360,
      rotation: 0,
      scale: 1,
      flipX: false,
      flipY: false,
      framing: "fill",
    },
    style: {
      fill: "#ffffff",
      stroke: "#000000",
      background: "#00000000",
      fontFamily: "Inter",
      fontSize: 24,
      fontWeight: 600,
      radius: 0,
      opacity: 1,
      blur: 0,
    },
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

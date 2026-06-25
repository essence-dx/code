import assert from "node:assert/strict";
import { PROJECT_FORMAT_VERSION, type EditorProject, type MediaAsset, type TimelineLayer } from "../src/lib/editor/types";
import { createDeliveryQaReport } from "../src/lib/editor/delivery-qa";
import { createHandoffSummary, handoffSummaryFilename } from "../src/lib/editor/handoff-summary";
import { createProjectReviewSummary } from "../src/lib/editor/project-review-summary";

const now = "2026-05-14T00:00:00.000Z";
const mediaAsset: MediaAsset = {
  id: "asset_video",
  name: "Source video.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 1024 * 1024,
  duration: 4,
  width: 1280,
  height: 720,
  storageKey: "media/source-video",
  source: "browser-indexeddb",
  objectUrl: "blob:source",
  createdAt: now,
};

const layers: TimelineLayer[] = [
  createLayer({
    id: "layer_video",
    name: "Main video",
    kind: "video",
    assetId: mediaAsset.id,
    duration: 4,
    reviewStatus: "approved",
  }),
  createLayer({
    id: "layer_hidden",
    name: "Hidden overlay",
    kind: "text",
    track: 1,
    start: 1,
    duration: 2,
    hidden: true,
    notes: "Cut this if final delivery needs a clean frame.",
  }),
  createLayer({
    id: "layer_missing",
    name: "Missing b-roll",
    kind: "image",
    track: 2,
    start: 5,
    duration: 2,
    assetId: "asset_missing",
    reviewStatus: "changes-requested",
    notes: "Client wants a replacement shot.",
  }),
  createLayer({
    id: "layer_audio",
    name: "Muted music",
    kind: "audio",
    track: 3,
    duration: 7,
    muted: true,
  }),
];

const project: EditorProject = {
  formatVersion: PROJECT_FORMAT_VERSION,
  id: "project_handoff_check",
  title: "Handoff Check",
  aspectRatio: "16:9",
  width: 1920,
  height: 1080,
  duration: 8,
  fps: 30,
  background: "#111827",
  layers,
  markers: [{ id: "marker_intro", time: 1.5, label: "Review intro", color: "#f59e0b", createdAt: now, updatedAt: now }],
  updatedAt: now,
};

const handoff = createHandoffSummary(project, [mediaAsset]);
assert.equal(handoffSummaryFilename(project.title), "handoff-check-handoff.md");
assert.match(handoff, /# Handoff Check Handoff Summary/);
assert.match(handoff, /Review intro/);
assert.match(handoff, /Missing b-roll/);
assert.match(handoff, /Changes requested/);
assert.match(handoff, /Client wants a replacement shot/);

const qa = createDeliveryQaReport(project, [mediaAsset]);
assert.equal(qa.status, "blocked");
assert.equal(qa.issues.some((issue) => issue.id === "missing-media" && issue.severity === "blocker"), true);
assert.equal(qa.issues.some((issue) => issue.id === "hidden-layers"), true);
assert.equal(qa.issues.some((issue) => issue.id === "muted-layers"), true);
assert.equal(qa.issues.some((issue) => issue.id === "unapproved-review"), true);
assert.equal(qa.issues.some((issue) => issue.id === "timeline-gaps"), true);

const review = createProjectReviewSummary(project);
assert.equal(review.status, "changes-requested");
assert.equal(review.changesRequested, 1);
assert.equal(review.approved, 1);
assert.equal(review.withNotes, 2);

console.log("Handoff and delivery QA checks passed.");

function createLayer(patch: Partial<TimelineLayer>): TimelineLayer {
  return {
    id: "layer",
    kind: "text",
    name: "Layer",
    track: 0,
    start: 0,
    duration: 5,
    trimStart: 0,
    playbackRate: 1,
    locked: false,
    muted: false,
    hidden: false,
    transform: { x: 0.5, y: 0.5, width: 640, height: 360, rotation: 0, scale: 1 },
    style: {
      fill: "#ffffff",
      stroke: "transparent",
      background: "transparent",
      fontFamily: "Geist",
      fontSize: 32,
      fontWeight: 700,
      radius: 0,
      opacity: 1,
      blur: 0,
    },
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

import assert from "node:assert/strict";
import { PROJECT_FORMAT_VERSION, type EditorProject } from "../src/lib/editor/types";
import { projectBundleSchema, syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

const now = "2026-05-14T00:00:00.000Z";
const project: EditorProject = {
  formatVersion: PROJECT_FORMAT_VERSION,
  id: "project_schema_check",
  title: "Schema check",
  aspectRatio: "16:9",
  width: 1920,
  height: 1080,
  duration: 30,
  fps: 30,
  background: "#111827",
  updatedAt: now,
  layers: [
    {
      id: "layer_caption",
      kind: "subtitle",
      name: "Caption",
      track: 1,
      start: 0,
      duration: 5,
      trimStart: 0,
      playbackRate: 1,
      text: "Caption",
      cues: [{ id: "cue_1", start: 0, end: 2.5, text: "Ready", emphasis: "normal" }],
      locked: false,
      muted: false,
      hidden: false,
      transform: { x: 0.5, y: 0.5, width: 680, height: 160, rotation: 0, scale: 1 },
      style: {
        fill: "#ffffff",
        stroke: "transparent",
        background: "#00000088",
        fontFamily: "Geist",
        fontSize: 42,
        fontWeight: 700,
        radius: 8,
        opacity: 1,
        blur: 0,
      },
      createdAt: now,
      updatedAt: now,
    },
  ],
};

assert.equal(syncedProjectPayloadSchema.safeParse({ project, mediaAssets: [] }).success, true);
assert.equal(syncedProjectPayloadSchema.safeParse({ project: { ...project, duration: Number.POSITIVE_INFINITY }, mediaAssets: [] }).success, false);
assert.equal(syncedProjectPayloadSchema.safeParse({ project: { ...project, width: 0 }, mediaAssets: [] }).success, false);
assert.equal(
  syncedProjectPayloadSchema.safeParse({
    project: {
      ...project,
      layers: [{ ...project.layers[0], cues: [{ id: "cue_bad", start: 2, end: 1, text: "Broken" }] }],
    },
    mediaAssets: [],
  }).success,
  false,
);
assert.equal(
  syncedProjectPayloadSchema.safeParse({
    project: {
      ...project,
      layers: [{ ...project.layers[0], cues: [{ id: "cue_zero", start: 2, end: 2, text: "Zero length" }] }],
    },
    mediaAssets: [],
  }).success,
  false,
);
assert.deepEqual(projectBundleSchema.parse({ project, assets: [] }), { project, mediaAssets: [] });

console.log("Project sync schema checks passed.");

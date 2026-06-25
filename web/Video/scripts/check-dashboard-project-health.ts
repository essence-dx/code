import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import type { MediaAsset } from "../src/lib/editor/types";
import type { LocalProjectRecord } from "../src/lib/projects/local-project-record";
import {
  createProjectHealthSummary,
  createProjectLibraryHealthReport,
} from "../src/lib/projects/project-health";

const now = "2026-05-14T00:00:00.000Z";
const readyAsset = mediaAsset({ id: "asset-ready", objectUrl: "blob:ready" });
const recoverableAsset = mediaAsset({ id: "asset-recoverable" });

const readyProject = createProject("Ready project");
readyProject.layers = [createLayerFromAsset(readyAsset)];

const attentionProject = createProject("Attention project");
attentionProject.layers = [createLayerFromAsset(recoverableAsset)];

const blockedProject = createProject("Blocked project");
blockedProject.layers = [
  {
    ...createLayerFromAsset(readyAsset),
    id: "layer-orphan",
    name: "Orphan layer",
    assetId: "asset-missing-reference",
    reviewStatus: "changes-requested",
  },
];

const readyRecord = localRecord(readyProject, [readyAsset]);
const attentionRecord = localRecord(attentionProject, [recoverableAsset]);
const blockedRecord = localRecord(blockedProject, [readyAsset]);

const readyHealth = createProjectHealthSummary(readyRecord);
assert.equal(readyHealth.status, "ready");
assert.equal(readyHealth.blockers, 0);

const attentionHealth = createProjectHealthSummary(attentionRecord);
assert.equal(attentionHealth.status, "attention");
assert.equal(attentionHealth.recoverableMedia, 1);
assert.match(attentionHealth.details.join(" "), /recover on open/);

const blockedHealth = createProjectHealthSummary(blockedRecord);
assert.equal(blockedHealth.status, "blocked");
assert.equal(blockedHealth.reconnectRequiredMedia, 1);
assert.equal(blockedHealth.reviewItems, 1);
assert.equal(blockedHealth.blockers, 1);

const libraryHealth = createProjectLibraryHealthReport([readyRecord, attentionRecord, blockedRecord]);
assert.equal(libraryHealth.total, 3);
assert.equal(libraryHealth.ready, 1);
assert.equal(libraryHealth.attention, 1);
assert.equal(libraryHealth.blocked, 1);
assert.equal(libraryHealth.recoverableMedia, 1);
assert.equal(libraryHealth.reconnectRequiredMedia, 1);
assert.equal(libraryHealth.reviewItems, 1);

const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
assert.match(localLibraryHook, /createProjectHealthSummary/);
assert.match(localLibraryHook, /createProjectLibraryHealthReport/);
assert.match(localLibraryCard, /healthFilterLabels/);
assert.match(localLibraryCard, /ProjectLibraryHealthSummary/);
assert.match(localLibraryCard, /ProjectHealthBadge/);
assert.match(localLibraryHook, /matchesHealthFilter/);

const healthDashboard = readFileSync("src/features/dashboard/components/project-health-dashboard.tsx", "utf8");
assert.match(healthDashboard, /healthFilterLabels/);
assert.match(healthDashboard, /ProjectLibraryHealthSummary/);
assert.match(healthDashboard, /ProjectHealthBadge/);
assert.match(healthDashboard, /recoverable/);
assert.match(healthDashboard, /reconnect/);

console.log("Dashboard project health checks passed.");

function mediaAsset(input: Partial<MediaAsset> & Pick<MediaAsset, "id">): MediaAsset {
  return {
    name: `${input.id}.mp4`,
    type: "video",
    mimeType: "video/mp4",
    size: 1000,
    duration: 5,
    storageKey: input.id,
    source: "browser-indexeddb",
    createdAt: now,
    ...input,
  };
}

function localRecord(project: LocalProjectRecord["project"], mediaAssets: MediaAsset[]): LocalProjectRecord {
  return {
    id: project.id,
    title: project.title,
    aspectRatio: project.aspectRatio,
    duration: project.duration,
    layerCount: project.layers.length,
    mediaCount: mediaAssets.length,
    updatedAt: now,
    createdAt: now,
    project,
    mediaAssets,
  };
}

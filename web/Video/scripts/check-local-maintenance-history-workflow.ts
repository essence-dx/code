import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopLaunchProofSummary } from "../src/lib/desktop/desktop-launch-proof";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import type { ExportJob, MediaAsset } from "../src/lib/editor/types";
import { createLocalMaintenanceReport } from "../src/lib/operations/local-maintenance-center";
import {
  createLocalMaintenanceEvidencePacket,
  createLocalMaintenanceHistoryEntry,
  filterLocalMaintenanceHistory,
  localMaintenanceHistoryLabel,
  normalizeLocalMaintenanceEvidencePacket,
  saveLocalMaintenanceHistoryEntry,
} from "../src/lib/operations/local-maintenance-history";
import type { ReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import type { ProjectSyncConflictHistoryEntry } from "../src/lib/projects/project-sync-conflict-history";

const now = "2026-05-16T05:09:54.840Z";
const usedAsset = createMediaAsset({ id: "asset-used", name: "used.mp4" });
const unusedAsset = createMediaAsset({ id: "asset-unused", name: "unused.mp4" });
const project = createProject("Maintenance history sample", "16:9");
project.layers = [
  createLayerFromAsset(usedAsset, 0),
  {
    ...createLayerFromAsset(usedAsset, 1),
    id: "layer-missing",
    name: "Missing source",
    assetId: "asset-missing",
  },
];
const cleanProject = createProject("Clean maintenance sample", "16:9");
cleanProject.layers = [createLayerFromAsset(usedAsset, 0)];

const releaseEvidenceSummary: ReleaseEvidenceSummary = {
  score: 33,
  status: "missing",
  readyCount: 1,
  total: 3,
  requirements: [
    { id: "deployment-url", label: "Deployment URL", status: "ready", detail: "Deployment URL is saved." },
    { id: "deployment-screenshot", label: "Screenshot proof", status: "stale", detail: "Screenshot is stale." },
    { id: "desktop-proof", label: "Desktop proof", status: "missing", detail: "Desktop proof is missing." },
  ],
};
const desktopProofSummary: DesktopLaunchProofSummary = {
  status: "failed",
  readyCount: 7,
  limitedCount: 1,
  failedCount: 1,
  missingCount: 0,
  total: 9,
  requirements: [{ id: "native-export-output", label: "Export output", status: "failed", detail: "Native export output failed." }],
};
const exportJobs: ExportJob[] = [
  {
    id: "export-failed",
    projectId: project.id,
    format: "mp4",
    preset: "YouTube",
    status: "failed",
    progress: 52,
    outputName: "broken-export.mp4",
    error: "Render failed.",
    createdAt: now,
    updatedAt: now,
  },
];
const cloudConflicts: ProjectSyncConflictHistoryEntry[] = [
  {
    id: "conflict-1",
    code: "project_conflict",
    projectId: project.id,
    baseUpdatedAt: "2026-05-16T04:00:00.000Z",
    remoteUpdatedAt: "2026-05-16T04:30:00.000Z",
    localUpdatedAt: "2026-05-16T05:00:00.000Z",
    recordedAt: now,
  },
];

const blockedReport = createLocalMaintenanceReport({
  project,
  mediaAssets: [usedAsset, unusedAsset],
  exportJobs,
  releaseEvidenceSummary,
  desktopProofSummary,
  cloudConflicts,
});
const readyReport = createLocalMaintenanceReport({
  project: cleanProject,
  mediaAssets: [usedAsset],
  exportJobs: [],
  releaseEvidenceSummary: {
    score: 100,
    status: "ready",
    readyCount: 3,
    total: 3,
    requirements: [
      { id: "deployment-url", label: "Deployment URL", status: "ready", detail: "Deployment URL is saved." },
      { id: "deployment-screenshot", label: "Screenshot proof", status: "ready", detail: "Screenshot proof is saved." },
      { id: "desktop-proof", label: "Desktop proof", status: "ready", detail: "Desktop proof is fresh." },
    ],
  },
  desktopProofSummary: {
    status: "ready",
    readyCount: 9,
    limitedCount: 0,
    failedCount: 0,
    missingCount: 0,
    total: 9,
    requirements: [],
  },
  cloudConflicts: [],
});
const draftReport = { ...readyReport, status: "attention" as const, attentionCount: 1, readyCount: 4, score: 90 };

const blockedPacket = createLocalMaintenanceEvidencePacket(project, blockedReport, now, {
  exportJobCount: exportJobs.length,
  mediaAssetCount: 2,
});
const readyEntry = createLocalMaintenanceHistoryEntry(createLocalMaintenanceEvidencePacket(cleanProject, readyReport, "2026-05-16T05:15:00.000Z"));
const draftEntry = createLocalMaintenanceHistoryEntry(createLocalMaintenanceEvidencePacket(cleanProject, draftReport, "2026-05-16T05:20:00.000Z"));
const blockedEntry = createLocalMaintenanceHistoryEntry(blockedPacket);

assert.equal(blockedPacket.schemaVersion, 1);
assert.equal(blockedPacket.project.mediaAssetCount, 2);
assert.equal(blockedPacket.project.exportJobCount, 1);
assert.equal(blockedEntry.label, "Blocked");
assert.equal(readyEntry.label, "Ready");
assert.equal(draftEntry.label, "Draft");
assert.equal(localMaintenanceHistoryLabel(draftEntry), "Draft");
assert.equal(filterLocalMaintenanceHistory([readyEntry, draftEntry, blockedEntry], "ready").length, 1);
assert.equal(filterLocalMaintenanceHistory([readyEntry, draftEntry, blockedEntry], "draft")[0]?.id, draftEntry.id);
assert.equal(filterLocalMaintenanceHistory([readyEntry, draftEntry, blockedEntry], "blocked")[0]?.id, blockedEntry.id);
assert.equal(normalizeLocalMaintenanceEvidencePacket(JSON.parse(JSON.stringify(blockedPacket)))?.project.id, project.id);
assert.equal(normalizeLocalMaintenanceEvidencePacket({ schemaVersion: 1, project: {}, report: {} }), null);
assert.equal(saveLocalMaintenanceHistoryEntry(blockedPacket, now)[0]?.label, "Blocked");

const historyModule = read("src/lib/operations/local-maintenance-history.ts");
const historyPanel = read("src/features/settings/components/local-maintenance-history-panel.tsx");
const maintenanceCard = read("src/features/settings/components/local-maintenance-center-card.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(historyModule, /createLocalMaintenanceEvidencePacket/);
assert.match(historyModule, /downloadLocalMaintenanceEvidencePacket/);
assert.match(historyModule, /filterLocalMaintenanceHistory/);
assert.match(historyPanel, /Maintenance evidence/);
assert.match(historyPanel, /Save snapshot/);
assert.match(historyPanel, /Export packet/);
assert.match(maintenanceCard, /LocalMaintenanceHistoryPanel/);
assert.match(maintenanceCard, /saveMaintenanceSnapshot/);
assert.match(maintenanceCard, /exportMaintenancePacket/);
assert.match(packageJson, /check:local-maintenance-history-workflow/);
assert.match(lightweight, /check:local-maintenance-history-workflow/);
assert.match(todo, /\[x\] Add saved local maintenance history/);
assert.match(changelog, /Local Maintenance History/);

console.log("Local maintenance history workflow checks passed.");

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
    createdAt: input.createdAt ?? now,
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

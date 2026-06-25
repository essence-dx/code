import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopLaunchProofSummary } from "../src/lib/desktop/desktop-launch-proof";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import type { ExportJob, MediaAsset } from "../src/lib/editor/types";
import { createLocalMaintenanceReport } from "../src/lib/operations/local-maintenance-center";
import type { ReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import type { ProjectSyncConflictHistoryEntry } from "../src/lib/projects/project-sync-conflict-history";

const now = "2026-05-16T05:09:54.840Z";
const usedAsset = createMediaAsset({ id: "asset-used", name: "used.mp4" });
const unusedAsset = createMediaAsset({ id: "asset-unused", name: "unused.mp4" });
const project = createProject("Maintenance sample", "16:9");
project.layers = [
  createLayerFromAsset(usedAsset, 0),
  {
    ...createLayerFromAsset(usedAsset, 1),
    id: "layer-missing",
    name: "Missing source",
    assetId: "asset-missing",
  },
];

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
  requirements: [
    { id: "native-export-output", label: "Export output", status: "failed", detail: "Native export output failed." },
  ],
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

const report = createLocalMaintenanceReport({
  project,
  mediaAssets: [usedAsset, unusedAsset],
  exportJobs,
  releaseEvidenceSummary,
  desktopProofSummary,
  cloudConflicts,
});

assert.equal(report.status, "blocked");
assert.equal(report.score, 10);
assert.equal(report.blockedCount, 4);
assert.equal(report.attentionCount, 1);
assert.equal(report.items.find((item) => item.id === "unused-media")?.count, 1);
assert.equal(report.items.find((item) => item.id === "missing-sources")?.status, "blocked");
assert.equal(report.items.find((item) => item.id === "failed-exports")?.count, 1);
assert.equal(report.items.find((item) => item.id === "cloud-version-conflicts")?.count, 1);
assert.match(report.items.find((item) => item.id === "stale-proof")?.detail ?? "", /Desktop proof has failed checks/);

const maintenanceModule = read("src/lib/operations/local-maintenance-center.ts");
const conflictHistory = read("src/lib/projects/project-sync-conflict-history.ts");
const maintenanceCard = read("src/features/settings/components/local-maintenance-center-card.tsx");
const settingsPage = read("src/app/settings/page.tsx");
const cloudHook = read("src/features/dashboard/hooks/use-dashboard-cloud-library.ts");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(maintenanceModule, /createLocalMaintenanceReport/);
assert.match(maintenanceModule, /stale-proof/);
assert.match(maintenanceModule, /cloud-version-conflicts/);
assert.match(conflictHistory, /recordProjectSyncConflict/);
assert.match(conflictHistory, /clearProjectSyncConflictHistory/);
assert.match(maintenanceCard, /removeMediaAsset/);
assert.match(maintenanceCard, /removeExportJob/);
assert.match(maintenanceCard, /clearProjectSyncConflictHistory/);
assert.match(settingsPage, /LocalMaintenanceCenterCard/);
assert.match(cloudHook, /recordProjectSyncConflict/);
assert.match(packageJson, /check:local-maintenance-center-workflow/);
assert.match(lightweight, /check:local-maintenance-center-workflow/);
assert.match(todo, /Add a local maintenance center/);
assert.match(changelog, /Local Maintenance Center/);

console.log("Local maintenance center workflow checks passed.");

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

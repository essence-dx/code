import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ExportJob } from "../src/lib/editor/types";
import { createOperationalReadinessReport } from "../src/lib/operations/operational-readiness";
import type { ProjectLibraryHealthReport } from "../src/lib/projects/project-health";

const healthyProjects: ProjectLibraryHealthReport = {
  total: 2,
  ready: 2,
  attention: 0,
  blocked: 0,
  recoverableMedia: 0,
  reconnectRequiredMedia: 0,
  reviewItems: 0,
};

const readyReport = createOperationalReadinessReport({
  projectLibrary: healthyProjects,
  localProjectStatus: "ready",
  exportJobs: [],
  hasOnlineActions: true,
  isSignedIn: true,
  aiConfigured: true,
  dailyAiRemaining: 10,
});
assert.equal(readyReport.status, "ready");
assert.equal(readyReport.score, 100);

const blockedReport = createOperationalReadinessReport({
  projectLibrary: { ...healthyProjects, ready: 1, blocked: 1, reconnectRequiredMedia: 2 },
  localProjectStatus: "ready",
  exportJobs: [failedExportJob()],
  hasOnlineActions: false,
  isSignedIn: false,
  aiConfigured: false,
  dailyAiRemaining: null,
});
assert.equal(blockedReport.status, "blocked");
assert.equal(blockedReport.signals.some((signal) => signal.id === "media" && signal.status === "blocked"), true);
assert.equal(blockedReport.signals.some((signal) => signal.id === "exports" && signal.status === "blocked"), true);
assert.equal(blockedReport.signals.some((signal) => signal.id === "account" && signal.status === "blocked"), true);
assert.equal(blockedReport.signals.some((signal) => signal.id === "ai-limits" && signal.status === "blocked"), true);

const attentionReport = createOperationalReadinessReport({
  projectLibrary: { ...healthyProjects, ready: 1, attention: 1, recoverableMedia: 1 },
  localProjectStatus: "ready",
  exportJobs: [],
  hasOnlineActions: true,
  isSignedIn: false,
  aiConfigured: true,
  dailyAiRemaining: 0,
});
assert.equal(attentionReport.status, "attention");
assert.equal(attentionReport.signals.some((signal) => signal.id === "ai-limits" && signal.status === "attention"), true);

const settingsPage = read("src/app/settings/page.tsx");
assert.match(settingsPage, /OperationalReadinessCard/);
assert.match(settingsPage, /ProductionTelemetryCard/);
assert.match(settingsPage, /dailyAiRemaining/);

const card = read("src/features/settings/components/operational-readiness-card.tsx");
assert.match(card, /listLocalProjects/);
assert.match(card, /createProjectLibraryHealthReport/);
assert.match(card, /useEditorStore/);
assert.match(card, /useHasClientApiRuntime/);

const capability = read("src/lib/product/capabilities/platform.ts");
assert.match(capability, /operational-readiness/);
assert.match(capability, /Project health signals/);
assert.match(capability, /provider-neutral production telemetry/);

console.log("Operational readiness workflow checks passed.");

function failedExportJob(): ExportJob {
  return {
    id: "export_failed",
    projectId: "project_a",
    format: "mp4",
    preset: "mp4-1080p",
    status: "failed",
    progress: 100,
    outputName: "failed.mp4",
    error: "Export failed.",
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

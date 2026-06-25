import { strict as assert } from "node:assert";
import type { ProjectRegressionWatchlistItemTriageState, ProjectRegressionWatchlistReport } from "@/features/projects/regression-watchlist";
import { createProjectRegressionWatchlistCsv, filterActiveProjectRegressionWatchlistItems, summarizeProjectRegressionWatchlistTriage } from "@/features/projects/regression-watchlist";
import {
  createProjectRegressionWatchlistSnapshotRecord,
  getProjectRegressionWatchlistSnapshotDownload,
} from "@/features/projects/regression-watchlist-history";

const report: ProjectRegressionWatchlistReport = {
  generatedAt: "2026-05-16T23:10:00.000Z",
  items: [
    {
      detail: "Public viewer returned 500 twice.",
      evidence: ["Viewer route returned 500.", "Viewer route returned 502."],
      evidenceCount: 2,
      id: "public-surface:project-1-viewer",
      lastSeenAt: "2026-05-16T23:00:00.000Z",
      nextAction: "Re-run public smoke.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "high",
      source: "public-surface",
      title: "Viewer regression",
      trend: "recurring",
    },
    {
      detail: "Android signing expires soon.",
      evidence: ["Certificate expires within 30 days."],
      evidenceCount: 1,
      id: "signing:project-1-android",
      lastSeenAt: "2026-05-20T00:00:00.000Z",
      nextAction: "Refresh certificate.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "medium",
      source: "signing",
      title: "Android signing expiring",
      trend: "watch",
    },
  ],
  summary: {
    activeCount: 1,
    affectedProjectCount: 1,
    cadConversionCount: 0,
    criticalCount: 0,
    highCount: 1,
    incidentCount: 0,
    latestSeenAt: "2026-05-20T00:00:00.000Z",
    lowCount: 0,
    mediumCount: 1,
    publicSurfaceCount: 1,
    recurringCount: 1,
    signingCount: 1,
    totalCount: 2,
    watchCount: 1,
  },
};

const states: ProjectRegressionWatchlistItemTriageState[] = [
  {
    itemId: "public-surface:project-1-viewer",
    note: "Release owner is watching this during promotion.",
    ownerEmail: "owner@example.com",
    ownerName: "Release Owner",
    ownerUserId: "user-1",
    projectId: "project-1",
    snoozedUntil: null,
    status: "watching",
    title: "Viewer regression",
    updatedAt: "2026-05-16T23:05:00.000Z",
  },
  {
    itemId: "signing:project-1-android",
    note: null,
    ownerEmail: "owner@example.com",
    ownerName: "Release Owner",
    ownerUserId: "user-1",
    projectId: "project-1",
    snoozedUntil: "2026-05-18T23:05:00.000Z",
    status: "snoozed",
    title: "Android signing expiring",
    updatedAt: "2026-05-16T23:06:00.000Z",
  },
];

const triage = summarizeProjectRegressionWatchlistTriage(states);

assert.equal(triage.watchingCount, 1);
assert.equal(triage.snoozedCount, 1);
assert.equal(filterActiveProjectRegressionWatchlistItems({ items: report.items, now: new Date("2026-05-17T00:00:00.000Z"), states }).length, 1);
assert.equal(filterActiveProjectRegressionWatchlistItems({ items: report.items, now: new Date("2026-05-19T00:00:00.000Z"), states }).length, 2);

const csv = createProjectRegressionWatchlistCsv(report, states);

assert.match(csv, /triageStatus,owner,snoozedUntil/);
assert.match(csv, /watching,Release Owner/);
assert.match(csv, /snoozed,Release Owner,2026-05-18T23:05:00.000Z/);

const snapshot = createProjectRegressionWatchlistSnapshotRecord({
  actor: {
    email: "owner@example.com",
    name: "Release Owner",
    userId: "user-1",
  },
  createdAt: "2026-05-16T23:07:00.000Z",
  report,
  states,
  workspace: {
    id: "workspace-1",
    name: "Launch workspace",
  },
});

assert.equal(snapshot.itemCount, 2);
assert.equal(snapshot.severeCount, 1);
assert.equal(snapshot.recurringCount, 1);
assert.equal(snapshot.states.length, 2);
assert.ok(snapshot.contentHash.startsWith("sha256:"));

const snapshotCsv = getProjectRegressionWatchlistSnapshotDownload(snapshot, "csv");
const snapshotJson = getProjectRegressionWatchlistSnapshotDownload(snapshot, "json");

assert.equal(snapshotCsv.mimeType, "text/csv;charset=utf-8");
assert.match(snapshotCsv.body, /Release Owner/);
assert.equal(JSON.parse(snapshotJson.body).states.length, 2);

console.log("regression watchlist history smoke passed");

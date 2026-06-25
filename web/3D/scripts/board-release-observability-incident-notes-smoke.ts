import assert from "node:assert/strict";
import type { BoardReleaseObservabilityEventHealthReport } from "@/features/projects/board-release-observability-event-health";
import { createBoardReleaseObservabilityIncidentNotesReport } from "@/features/projects/board-release-observability-incident-notes";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";

const generatedAt = "2026-05-29T10:00:00.000Z";

const eventHealth = {
  generatedAt,
  monitors: [
    {
      evidenceHash: "sha256:ack-pending",
      lastSeenAt: "2026-05-25T10:00:00.000Z",
      monitorHash: "sha256:monitor-ack",
      monitorId: "monitor:ack",
      nextAction: "Repair blocked acknowledgement routes before release observability closeout.",
      releasePromotionId: "release-2026-05-20",
      severity: "critical",
      signal: "stuck-acknowledgement",
      status: "blocked",
      title: "Acknowledgement progress",
      workspaceId: "workspace-board",
    },
    {
      evidenceHash: "sha256:packet-ready",
      lastSeenAt: "2026-05-24T10:00:00.000Z",
      monitorHash: "sha256:monitor-packet",
      monitorId: "monitor:packet",
      nextAction: "Refresh the signed export packet before relying on distribution evidence.",
      releasePromotionId: "release-2026-05-20",
      severity: "warning",
      signal: "stale-packet",
      status: "watch",
      title: "Signed packet freshness",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    blockedCount: 1,
    criticalCount: 1,
    healthyCount: 0,
    monitorCount: 2,
    nextAction: "Repair blocked acknowledgement routes before release observability closeout.",
    status: "blocked",
    warningCount: 1,
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityEventHealthReport;

const incidentHistory = {
  generatedAt,
  incidents: [
    {
      actionLabel: "Run deploy smoke",
      count: 1,
      details: ["Public viewer: 500"],
      id: "scene-one:post-deploy-failure:2026-05-28T10:00:00.000Z",
      kind: "post-deploy-failure",
      message: "Public viewer failed after deployment.",
      occurredAt: "2026-05-28T10:00:00.000Z",
      projectId: "scene-one",
      projectName: "Scene One",
      severity: "critical",
      source: "post-deploy-smoke",
      title: "Post-deploy smoke failed",
    },
  ],
  summary: {
    blockedReviewCount: 0,
    criticalCount: 1,
    failedExportCount: 0,
    impactedProjectCount: 1,
    postDeployFailureCount: 1,
    totalCount: 1,
    warningCount: 0,
  },
} as ProjectIncidentHistory;

const report = createBoardReleaseObservabilityIncidentNotesReport({
  eventHealth,
  generatedAt,
  incidentHistory,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.noteCount, 3);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.watchCount, 1);
assert.equal(report.summary.criticalCount, 2);
assert.equal(report.summary.dueSoonCount, 2);
assert.equal(report.notes[0]?.ownerEmail, "board-secretary@essence.local");
assert.equal(report.notes.find((note) => note.source === "stale-packet")?.ownerRole, "Evidence owner");
assert.match(report.notes[0]?.noteHash ?? "", /^sha256:/);
assert.match(report.csvContent, /note_id,title,status,severity,owner_role,owner_email,due_at,release_promotion_id,source,evidence_hash,note_hash,summary/);
assert.match(report.jsonContent, /"ownerRole": "Incident response"/);
assert.equal(report.csvFileName, "workspace-board-board-release-observability-incident-notes-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-observability-incident-notes-20260529.json");

console.log("board release observability incident notes smoke passed");

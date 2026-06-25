import { strict as assert } from "node:assert";
import {
  createWorkspaceRiskDigestContentHash,
  createWorkspaceRiskDigestPacketHistoryReport,
  createWorkspaceRiskDigestPacketRecord,
  getWorkspaceRiskDigestPacketDownload,
  isWorkspaceRiskDigestReport,
} from "@/features/projects/workspace-risk-digest-history";
import type { WorkspaceRiskDigestReport } from "@/features/projects/workspace-risk-digest";

const digest: WorkspaceRiskDigestReport = {
  actionItems: [
    {
      detail: "Public viewer and review-gate events need release-owner review.",
      evidenceCount: 2,
      id: "blocked-audit-events",
      label: "Inspect blocked audit events",
      priority: "high",
      source: "audit",
    },
  ],
  audit: {
    dangerCount: 1,
    newestAt: "2026-05-16T22:10:00.000Z",
    rows: [
      {
        action: "project.publish_blocked",
        actorEmail: "owner@example.com",
        actorName: "Owner",
        category: "publishing",
        description: "Reviewer blocked the public link handoff.",
        eventId: "audit-1",
        id: "project-risk:audit-1",
        occurredAt: "2026-05-16T22:10:00.000Z",
        projectId: "project-risk",
        projectName: "Risk Scene",
        resourceId: "project-risk",
        resourceType: "project",
        status: "danger",
        title: "Publish blocked",
      },
    ],
    totalCount: 1,
    warningCount: 0,
  },
  generatedAt: "2026-05-16T22:15:00.000Z",
  incidents: {
    criticalCount: 1,
    incidents: [],
    totalCount: 1,
    warningCount: 0,
  },
  packetId: "risk-digest-workspace-risk-20260516",
  publicHealth: {
    failedCount: 1,
    snapshotDiffCount: 0,
    snapshots: [],
    totalCount: 1,
    warningCount: 0,
  },
  riskLevel: "critical",
  runbook: {
    blockedCount: 1,
    nextDueAt: "2026-05-17T00:00:00.000Z",
    records: [],
    totalCount: 1,
  },
  schemaVersion: 1,
  score: 42,
  trust: {
    projectRows: [],
    projectWithBlockerCount: 1,
    trustScore: 68,
  },
  workspace: {
    id: "workspace-risk",
    name: "Risk Workspace",
    role: "owner",
  },
};

assert.equal(isWorkspaceRiskDigestReport(digest), true);
assert.equal(isWorkspaceRiskDigestReport({ ...digest, schemaVersion: 2 }), false);

const firstPacket = createWorkspaceRiskDigestPacketRecord({
  actor: { email: "owner@example.com", name: "Owner", userId: "owner" },
  createdAt: "2026-05-16T22:16:00.000Z",
  digest,
  id: "packet-1",
});
const secondPacket = createWorkspaceRiskDigestPacketRecord({
  actor: { email: "admin@example.com", name: "Admin", userId: "admin" },
  createdAt: "2026-05-16T22:20:00.000Z",
  digest: { ...digest, score: 78, riskLevel: "watch" },
  id: "packet-2",
});

assert.match(firstPacket.contentHash, /^sha256:[a-f0-9]{64}$/);
assert.equal(firstPacket.contentHash, createWorkspaceRiskDigestContentHash(digest));
assert.equal(firstPacket.auditCsvFileName, "risk-digest-workspace-risk-20260516-audit.csv");
assert.equal(firstPacket.auditEventCount, 1);
assert.ok(firstPacket.auditCsvByteSize > 0);

const history = createWorkspaceRiskDigestPacketHistoryReport([firstPacket, secondPacket]);

assert.equal(history.summary.totalPacketCount, 2);
assert.equal(history.summary.criticalPacketCount, 1);
assert.equal(history.summary.watchPacketCount, 1);
assert.equal(history.summary.actorCount, 2);
assert.equal(history.packets[0]?.id, "packet-2");

const auditDownload = getWorkspaceRiskDigestPacketDownload(firstPacket, "audit-csv");

assert.equal(auditDownload.fileName, "risk-digest-workspace-risk-20260516-audit.csv");
assert.match(auditDownload.body, /project\.publish_blocked/);
assert.equal(getWorkspaceRiskDigestPacketDownload(firstPacket, "json").mimeType, "application/json;charset=utf-8");

console.log("workspace risk digest history smoke passed");

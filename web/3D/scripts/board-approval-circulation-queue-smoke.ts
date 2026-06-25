import { strict as assert } from "node:assert";
import { createBoardApprovalPacketCirculationQueueReport } from "@/features/projects/board-approval-circulation-queue";
import type { BoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type { BoardApprovalRedactionPolicyReport, BoardApprovalRedactionPolicyTemplate } from "@/features/projects/board-approval-redaction-policies";

const generatedAt = "2026-05-16T12:00:00.000Z";

function template(input: {
  audience: BoardApprovalRedactionPolicyTemplate["audience"];
  label: string;
  redactionCount: number;
}): BoardApprovalRedactionPolicyTemplate {
  return {
    allowedSections: ["approval state"],
    audience: input.audience,
    description: `${input.label} packet template`,
    id: `board-redaction-policy:${input.audience}`,
    label: input.label,
    preview: {
      audience: input.audience,
      criticalPath: [],
      executiveMemo: `${input.label} memo`,
      redactedSummary: `${input.label} summary`,
      redactionCount: input.redactionCount,
      removedFieldCount: input.redactionCount,
      retainedFieldCount: 8,
      signOffs: [],
      status: "ready",
    },
    removedSections: ["private owners"],
    rules: [],
    strictness: input.audience === "internal-board" ? "internal" : "strict",
    summary: `${input.label} ready for reviewer circulation.`,
  };
}

const redactionPolicies: BoardApprovalRedactionPolicyReport = {
  csvContent: "audience,label,status,strictness,redaction_count,retained_fields,removed_fields,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,audience",
  csvFileName: "workspace-1-board-redaction-policies.csv",
  generatedAt,
  summary: {
    externalTemplateCount: 3,
    nextAction: "Apply the matching redaction policy before circulation.",
    removedFieldCount: 6,
    retainedFieldCount: 32,
    status: "ready",
    templateCount: 4,
    totalRedactionCount: 6,
  },
  templates: [
    template({ audience: "investor", label: "Investor review", redactionCount: 4 }),
    template({ audience: "client", label: "Client review", redactionCount: 3 }),
    template({ audience: "partner", label: "Partner review", redactionCount: 2 }),
    template({ audience: "internal-board", label: "Internal board", redactionCount: 0 }),
  ],
};

const packetHistory: BoardApprovalPacketHistoryReport = {
  csvContent: "packet_id,status,approval_status,approval_score,recipient_purpose,download_count\n",
  csvDataUri: "data:text/csv;charset=utf-8,packet",
  csvFileName: "essence-spline-board-approval-packets-20260516.csv",
  records: [
    {
      approvalScore: 92,
      approvalStatus: "ready",
      auditTrail: [],
      blockedSignOffCount: 0,
      contentHash: "sha256:investor",
      createdAt: "2026-05-15T12:00:00.000Z",
      createdBy: { email: "admin@mail.com", name: "Admin", userId: "admin" },
      criticalPathCount: 0,
      csvByteSize: 120,
      csvFileName: "investor.csv",
      downloadCount: 2,
      id: "packet-investor",
      jsonByteSize: 240,
      jsonFileName: "investor.json",
      packet: {} as never,
      packetId: "board-approval-investor",
      readySignOffCount: 3,
      recipientEmail: "investor@example.com",
      recipientName: "Investor Reviewer",
      recipientPurpose: "Investor review - board approval packet",
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      status: "active",
      updatedAt: "2026-05-15T12:05:00.000Z",
      watchSignOffCount: 0,
      workspaceId: "workspace-1",
    },
    {
      approvalScore: 88,
      approvalStatus: "watch",
      auditTrail: [],
      blockedSignOffCount: 0,
      contentHash: "sha256:client",
      createdAt: "2026-05-15T12:00:00.000Z",
      createdBy: { email: "admin@mail.com", name: "Admin", userId: "admin" },
      criticalPathCount: 0,
      csvByteSize: 120,
      csvFileName: "client.csv",
      downloadCount: 1,
      id: "packet-client",
      jsonByteSize: 240,
      jsonFileName: "client.json",
      packet: {} as never,
      packetId: "board-approval-client",
      readySignOffCount: 2,
      recipientEmail: "client@example.com",
      recipientName: "Client Sponsor",
      recipientPurpose: "Client review - board approval packet",
      revokedAt: "2026-05-16T10:00:00.000Z",
      revokedBy: { email: "admin@mail.com", name: "Admin", userId: "admin" },
      revokeReason: "Superseded by redaction policy change.",
      status: "revoked",
      updatedAt: "2026-05-16T10:00:00.000Z",
      watchSignOffCount: 1,
      workspaceId: "workspace-1",
    },
    {
      approvalScore: 95,
      approvalStatus: "ready",
      auditTrail: [],
      blockedSignOffCount: 0,
      contentHash: "sha256:partner",
      createdAt: "2026-05-01T12:00:00.000Z",
      createdBy: { email: "admin@mail.com", name: "Admin", userId: "admin" },
      criticalPathCount: 0,
      csvByteSize: 120,
      csvFileName: "partner.csv",
      downloadCount: 4,
      id: "packet-partner",
      jsonByteSize: 240,
      jsonFileName: "partner.json",
      packet: {} as never,
      packetId: "board-approval-partner",
      readySignOffCount: 4,
      recipientEmail: "partner@example.com",
      recipientName: "Partner Lead",
      recipientPurpose: "Partner review - board approval packet",
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      status: "active",
      updatedAt: "2026-05-01T12:05:00.000Z",
      watchSignOffCount: 0,
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    activeCount: 2,
    blockedPacketCount: 0,
    downloadCount: 7,
    latestSavedAt: "2026-05-15T12:00:00.000Z",
    readyPacketCount: 2,
    revokedCount: 1,
    totalCount: 3,
    watchPacketCount: 1,
  },
};

const report = createBoardApprovalPacketCirculationQueueReport({
  generatedAt,
  packetHistory,
  redactionPolicies,
  workspaceId: "workspace-1",
});

assert.equal(report.summary.totalQueueCount, 4);
assert.equal(report.summary.externalQueueCount, 3);
assert.equal(report.summary.sentCount, 1);
assert.equal(report.summary.revokedCount, 1);
assert.equal(report.summary.expiredCount, 1);
assert.equal(report.summary.queuedCount, 1);
assert.equal(report.summary.status, "blocked");
assert.equal(report.rows.find((row) => row.audience === "investor")?.status, "sent");
assert.equal(report.rows.find((row) => row.audience === "investor")?.packetRecordId, "packet-investor");
assert.equal(report.rows.find((row) => row.audience === "client")?.status, "revoked");
assert.equal(report.rows.find((row) => row.audience === "partner")?.status, "expired");
assert.equal(report.rows.find((row) => row.audience === "internal-board")?.status, "queued");
assert.equal(report.rows.find((row) => row.audience === "internal-board")?.recipientPurpose, "Internal board - board approval packet");
assert.match(report.csvContent, /audience,template,status,recipient_purpose,recipient,expires_at,revoked_at,next_action/);
assert.match(report.csvDataUri, /^data:text\/csv/);
assert.equal(report.csvFileName, "workspace-1-board-circulation-queue.csv");

console.log("board approval circulation queue smoke passed");

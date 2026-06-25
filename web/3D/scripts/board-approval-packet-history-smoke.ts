import { strict as assert } from "node:assert";
import {
  createBoardApprovalPacketHistoryRecord,
  createBoardApprovalPacketHistoryReport,
  getBoardApprovalPacketHistoryDownload,
  recordBoardApprovalPacketHistoryDownload,
  revokeBoardApprovalPacketHistoryRecord,
} from "@/features/projects/board-approval-packet-history";
import type { BoardApprovalPacketReport } from "@/features/projects/board-approval-packet";

const generatedAt = "2026-05-16T12:00:00.000Z";

const packet: BoardApprovalPacketReport = {
  checksums: {
    packetHash: "sha256:packet",
    sources: [
      {
        contentHash: "sha256:source",
        id: "executive-release-intelligence",
        label: "Executive release intelligence",
        sourceRecordCount: 3,
        verified: true,
      },
    ],
  },
  criticalPath: [
    {
      action: "Repair public viewer smoke.",
      evidence: "[redacted-url] smoke evidence",
      evidenceHash: "sha256:evidence",
      id: "critical-1",
      label: "Launch promotion readiness",
      ownerName: "Release Owner",
      source: "executive",
      status: "blocked",
    },
  ],
  csvContent: "role,status,required,owner,due_at,evidence_hash,action\nlaunch,blocked,true,Release Owner,,sha256:evidence,Repair public viewer smoke.\n",
  csvDataUri: "data:text/csv;charset=utf-8,role",
  csvFileName: "workspace-board-approval-packet.csv",
  executiveMemo: "Board approval is blocked by one sign-off gap.",
  generatedAt,
  jsonContent: "{\"schemaVersion\":1}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "workspace-board-approval-packet.json",
  packetId: "board-approval-workspace-20260516",
  redactedSummary: "Approval status: blocked.",
  signOffs: [
    {
      action: "Repair public viewer smoke.",
      dueAt: null,
      evidenceHash: "sha256:evidence",
      evidenceLinks: [],
      ownerEmail: "[redacted-email]",
      ownerName: "Release Owner",
      required: true,
      role: "launch",
      status: "blocked",
    },
  ],
  summary: {
    approvalScore: 48,
    blockedSignOffCount: 1,
    checksumCount: 2,
    criticalPathCount: 1,
    nextAction: "Repair public viewer smoke.",
    readySignOffCount: 0,
    redactionCount: 2,
    status: "blocked",
    watchSignOffCount: 0,
  },
};

const actor = {
  email: "admin@mail.com",
  name: "Admin",
  userId: "user-admin",
};

const record = createBoardApprovalPacketHistoryRecord({
  actor,
  createdAt: generatedAt,
  packet,
  recipientName: "Board Review",
  recipientPurpose: "Board approval before public launch",
  workspaceId: "workspace-1",
});

assert.equal(record.status, "active");
assert.equal(record.recipientPurpose, "Board approval before public launch");
assert.equal(record.createdBy.email, "admin@mail.com");
assert.equal(record.downloadCount, 0);
assert.equal(record.auditTrail[0]?.action, "created");
assert.equal(record.approvalStatus, "blocked");
assert.equal(record.jsonByteSize > 0, true);
assert.equal(record.csvByteSize > 0, true);

const downloaded = recordBoardApprovalPacketHistoryDownload(record, {
  actor: { email: "board@example.com", name: "Board Reviewer", userId: null },
  downloadedAt: "2026-05-16T12:05:00.000Z",
  format: "json",
});

assert.equal(downloaded.downloadCount, 1);
assert.equal(downloaded.auditTrail.at(-1)?.action, "downloaded");
assert.equal(downloaded.auditTrail.at(-1)?.format, "json");

const revoked = revokeBoardApprovalPacketHistoryRecord(downloaded, {
  actor,
  reason: "Superseded by updated approval packet",
  revokedAt: "2026-05-16T12:10:00.000Z",
});

assert.equal(revoked.status, "revoked");
assert.equal(revoked.revokedBy?.userId, "user-admin");
assert.equal(revoked.revokeReason, "Superseded by updated approval packet");
assert.equal(revoked.auditTrail.at(-1)?.action, "revoked");

const report = createBoardApprovalPacketHistoryReport([revoked, record]);

assert.equal(report.summary.totalCount, 2);
assert.equal(report.summary.activeCount, 1);
assert.equal(report.summary.revokedCount, 1);
assert.equal(report.summary.downloadCount, 1);
assert.match(report.csvContent, /packet_id,status,approval_status,approval_score,recipient_purpose,download_count/);
assert.match(report.csvDataUri, /^data:text\/csv/);

const jsonDownload = getBoardApprovalPacketHistoryDownload(record, "json");
const csvDownload = getBoardApprovalPacketHistoryDownload(record, "csv");

assert.equal(jsonDownload.fileName, record.jsonFileName);
assert.equal(csvDownload.fileName, record.csvFileName);
assert.match(jsonDownload.body, /"packetId": "board-approval-workspace-20260516"/);
assert.match(csvDownload.body, /role,status,required/);

console.log("board approval packet history smoke passed");

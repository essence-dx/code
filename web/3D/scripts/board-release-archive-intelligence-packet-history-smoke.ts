import assert from "node:assert/strict";
import {
  createBoardReleaseArchiveIntelligencePacketContentHash,
  createBoardReleaseArchiveIntelligencePacketHistoryRecord,
  createBoardReleaseArchiveIntelligencePacketHistoryReport,
  getBoardReleaseArchiveIntelligencePacketHistoryDownload,
  isBoardReleaseArchiveIntelligencePacketReport,
} from "@/features/projects/board-release-archive-intelligence-packet-history";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";

const packet: BoardReleaseArchiveIntelligencePacketReport = {
  csvContent: "record_type,id,kind,title,status,score_or_priority,evidence_hash,record_hash,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,record_type",
  csvFileName: "workspace-board-board-release-archive-intelligence-packet-20260529.csv",
  executiveMemo: "BLOCKED archive intelligence packet: 5 evidence sections.",
  generatedAt: "2026-05-29T10:00:00.000Z",
  jsonContent: "{\"summary\":{\"packetHash\":\"sha256:packet\"}}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "workspace-board-board-release-archive-intelligence-packet-20260529.json",
  recommendations: [
    {
      action: "Require replay simulator sign-off.",
      evidenceHash: "sha256:replay",
      priority: "high",
      recommendationHash: "sha256:recommendation",
      recommendationId: "recommendation-1",
      recommendationKind: "decision-control",
      status: "blocked",
      title: "Replay sign-off control",
      workspaceId: "workspace-board",
    },
  ],
  sections: [
    {
      evidenceHash: "sha256:index",
      nextAction: "Resolve archive blockers.",
      score: 34,
      sectionHash: "sha256:section",
      sectionId: "section-1",
      sectionKind: "index",
      status: "blocked",
      summary: "Archive intelligence is blocked.",
      title: "Archive intelligence index",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    blockedRecommendationCount: 1,
    blockedSectionCount: 1,
    governanceUpdateCount: 1,
    nextAction: "Require replay simulator sign-off.",
    packetHash: "sha256:packet",
    packetScore: 34,
    recommendationCount: 1,
    sectionCount: 1,
    status: "blocked",
    watchRecommendationCount: 0,
    watchSectionCount: 0,
  },
  workspaceId: "workspace-board",
};

assert.equal(isBoardReleaseArchiveIntelligencePacketReport(packet), true);
assert.equal(isBoardReleaseArchiveIntelligencePacketReport({ ...packet, summary: { ...packet.summary, status: "unknown" } }), false);

const firstRecord = createBoardReleaseArchiveIntelligencePacketHistoryRecord({
  actor: { email: "owner@example.com", name: "Owner", userId: "owner" },
  createdAt: "2026-05-29T10:05:00.000Z",
  id: "packet-record-1",
  packet,
});
const secondRecord = createBoardReleaseArchiveIntelligencePacketHistoryRecord({
  actor: { email: "admin@example.com", name: "Admin", userId: "admin" },
  createdAt: "2026-05-29T10:10:00.000Z",
  id: "packet-record-2",
  packet: {
    ...packet,
    summary: {
      ...packet.summary,
      packetHash: "sha256:packet-watch",
      packetScore: 82,
      status: "watch",
    },
  },
});

assert.match(firstRecord.contentHash, /^sha256:[a-f0-9]{64}$/);
assert.equal(firstRecord.contentHash, createBoardReleaseArchiveIntelligencePacketContentHash(packet));
assert.equal(firstRecord.blockedSectionCount, 1);
assert.equal(firstRecord.blockedRecommendationCount, 1);
assert.equal(firstRecord.jsonByteSize > 0, true);
assert.equal(firstRecord.csvByteSize > 0, true);

const history = createBoardReleaseArchiveIntelligencePacketHistoryReport([firstRecord, secondRecord]);

assert.equal(history.summary.totalPacketCount, 2);
assert.equal(history.summary.blockedPacketCount, 1);
assert.equal(history.summary.watchPacketCount, 1);
assert.equal(history.summary.actorCount, 2);
assert.equal(history.summary.latestPacketHash, "sha256:packet-watch");
assert.equal(history.records[0]?.id, "packet-record-2");
assert.match(history.csvContent, /record_id,created_at,actor_name,actor_email,status,packet_score/);

const jsonDownload = getBoardReleaseArchiveIntelligencePacketHistoryDownload(firstRecord, "json");
const csvDownload = getBoardReleaseArchiveIntelligencePacketHistoryDownload(firstRecord, "csv");

assert.equal(jsonDownload.fileName, firstRecord.jsonFileName);
assert.equal(csvDownload.fileName, firstRecord.csvFileName);
assert.match(jsonDownload.body, /"executiveMemo": "BLOCKED archive intelligence packet/);
assert.match(csvDownload.body, /record_type,id,kind,title,status/);

console.log("board release archive intelligence packet history smoke passed");

import assert from "node:assert/strict";
import type { BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport } from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";
import { createBoardReleaseArchiveCertificationExternalAuditorPacket } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";

const generatedAt = "2026-05-29T10:00:00.000Z";

const finalCloseoutCertificate = {
  generatedAt,
  summary: {
    certificateHash: "sha256:certificate",
    status: "certified",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport;

const historyLedger = {
  summary: {
    ledgerHash: "sha256:ledger",
    status: "current",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationHistoryLedgerReport;

const replayVerifier = {
  summary: {
    replayHash: "sha256:replay",
    status: "matched",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;

const report = createBoardReleaseArchiveCertificationExternalAuditorPacket({
  accessWindowHours: 72,
  auditorAudience: "external certification auditor",
  finalCloseoutCertificate,
  generatedAt,
  historyLedger,
  replayVerifier,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.packetCount, 3);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.watchCount, 0);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.redactionCount, 6);
assert.equal(report.summary.externalPacketHash.startsWith("sha256:"), true);
assert.equal(report.summary.acknowledgementProofHash.startsWith("sha256:"), true);
assert.equal(report.rows.every((row) => row.accessExpiresAt === "2026-06-01T10:00:00.000Z"), true);
assert.equal(report.rows.every((row) => row.acknowledgementProofHash.startsWith("sha256:")), true);
assert.equal(report.rows.some((row) => row.kind === "replay-verification" && row.sourceHash === "sha256:replay"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-certification-external-auditor-packet-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-certification-external-auditor-packet-20260529.json");
assert.match(report.csvContent, /packet_id,kind,title,status,source_status,auditor_audience/);
assert.match(report.jsonContent, /"packetScore"/);

const watchReport = createBoardReleaseArchiveCertificationExternalAuditorPacket({
  finalCloseoutCertificate: {
    ...finalCloseoutCertificate,
    summary: {
      ...finalCloseoutCertificate.summary,
      status: "conditional",
    },
  } as BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport,
  generatedAt,
  historyLedger,
  replayVerifier,
  workspaceId: "workspace-board",
});

assert.equal(watchReport.summary.status, "watch");
assert.equal(watchReport.summary.watchCount, 1);

console.log("board release archive certification external auditor packet smoke passed");

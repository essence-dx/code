import assert from "node:assert/strict";
import type { BoardReleaseArchiveCertificationExternalAuditorPacketReport } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import { createBoardReleaseArchiveCertificationRevocationWorkflow } from "@/features/projects/board-release-archive-certification-revocation-workflow";

const generatedAt = "2026-05-29T10:00:00.000Z";

const historyLedger = {
  rows: [
    {
      certificateHash: "sha256:v1",
      issuer: "Archive service",
      revocationState: "superseded",
      sourceStatus: "evidence-freeze",
      status: "historical",
      version: "v1-evidence-freeze",
    },
    {
      certificateHash: "sha256:v3",
      issuer: "Archive service",
      revocationReason: null,
      revocationState: "active",
      sourceStatus: "certified",
      status: "current",
      version: "v3-final-closeout",
    },
  ],
  summary: {
    currentVersion: "v3-final-closeout",
    ledgerHash: "sha256:ledger",
    nextAction: "Keep active.",
    status: "current",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationHistoryLedgerReport;

const replayVerifier = {
  rows: [
    {
      actualHash: "sha256:old",
      expectedHash: "sha256:new",
      nextAction: "Review distribution replay drift.",
      status: "drift",
      title: "Distribution replay",
    },
  ],
  summary: {
    status: "drift",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;

const auditorPacket = {
  rows: [
    {
      auditorAudience: "external archive auditor",
      nextAction: "Resolve source blockers.",
      sourceHash: "sha256:auditor",
      status: "blocked",
      title: "Auditor replay packet",
    },
  ],
  summary: {
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveCertificationExternalAuditorPacketReport;

const report = createBoardReleaseArchiveCertificationRevocationWorkflow({
  auditorPacket,
  generatedAt,
  historyLedger,
  replayVerifier,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "open");
assert.equal(report.summary.rowCount, 3);
assert.equal(report.summary.openCount, 1);
assert.equal(report.summary.queuedCount, 1);
assert.equal(report.summary.resolvedCount, 1);
assert.equal(report.summary.revocationHash.startsWith("sha256:"), true);
assert.equal(report.rows.some((row) => row.kind === "failed-replay" && row.status === "queued"), true);
assert.equal(report.rows.some((row) => row.kind === "auditor-block" && row.status === "open"), true);
assert.equal(report.rows.some((row) => row.kind === "superseded-evidence" && row.status === "resolved"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-certification-revocation-workflow-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-certification-revocation-workflow-20260529.json");
assert.match(report.csvContent, /revocation_id,kind,title,status,source_status,owner/);
assert.match(report.jsonContent, /"revocationScore"/);

const cleanReport = createBoardReleaseArchiveCertificationRevocationWorkflow({
  auditorPacket: {
    rows: [],
    summary: {
      status: "ready",
    },
    workspaceId: "workspace-board",
  } as unknown as BoardReleaseArchiveCertificationExternalAuditorPacketReport,
  generatedAt,
  historyLedger: {
    ...historyLedger,
    rows: [],
  } as BoardReleaseArchiveCertificationHistoryLedgerReport,
  replayVerifier: {
    rows: [],
    summary: {
      status: "matched",
    },
    workspaceId: "workspace-board",
  } as unknown as BoardReleaseArchiveCertificationEvidenceReplayVerifierReport,
  workspaceId: "workspace-board",
});

assert.equal(cleanReport.summary.status, "resolved");
assert.equal(cleanReport.summary.resolvedCount, 1);

console.log("board release archive certification revocation workflow smoke passed");

import assert from "node:assert/strict";
import type { BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport } from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";
import { createBoardReleaseArchiveCertificationHistoryLedger } from "@/features/projects/board-release-archive-certification-history-ledger";

const generatedAt = "2026-05-29T10:00:00.000Z";

const finalCloseoutCertificate = {
  evidence: [
    {
      evidenceHash: "sha256:handoff",
      kind: "handoff-digest",
    },
    {
      evidenceHash: "sha256:notary",
      kind: "notarization",
    },
  ],
  generatedAt,
  summary: {
    certificateHash: "sha256:certificate",
    nextAction: "Final archive closeout certificate is ready to issue.",
    recommendation: "Issue final archive closeout certificate.",
    status: "certified",
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport;

const report = createBoardReleaseArchiveCertificationHistoryLedger({
  finalCloseoutCertificate,
  generatedAt,
  issuer: "Board archive officer",
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "current");
assert.equal(report.summary.rowCount, 3);
assert.equal(report.summary.activeCount, 1);
assert.equal(report.summary.supersededCount, 2);
assert.equal(report.summary.revocationHoldCount, 0);
assert.equal(report.summary.currentVersion, "v3-final-closeout");
assert.equal(report.summary.ledgerHash.startsWith("sha256:"), true);
assert.equal(report.rows.some((row) => row.version === "v3-final-closeout" && row.certificateHash === "sha256:certificate"), true);
assert.equal(report.rows.some((row) => row.version === "v2-closeout-review" && row.parentCertificateHash?.startsWith("sha256:")), true);
assert.equal(report.rows.every((row) => row.issuer === "Board archive officer"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-certification-history-ledger-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-certification-history-ledger-20260529.json");
assert.match(report.csvContent, /history_id,version,status,revocation_state,issuer,issued_at/);
assert.match(report.jsonContent, /"ledgerScore"/);

const blockedReport = createBoardReleaseArchiveCertificationHistoryLedger({
  finalCloseoutCertificate: {
    ...finalCloseoutCertificate,
    summary: {
      ...finalCloseoutCertificate.summary,
      nextAction: "Resolve blockers.",
      status: "blocked",
    },
  } as BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport,
  generatedAt,
  workspaceId: "workspace-board",
});

assert.equal(blockedReport.summary.status, "blocked");
assert.equal(blockedReport.summary.revocationHoldCount, 1);
assert.equal(blockedReport.rows.some((row) => row.revocationState === "revocation-hold" && row.revocationReason === "Resolve blockers."), true);

console.log("board release archive certification history ledger smoke passed");

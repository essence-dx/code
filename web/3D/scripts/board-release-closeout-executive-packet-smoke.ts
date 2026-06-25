import assert from "node:assert/strict";
import type { BoardReleaseCloseoutArchiveManifestReport } from "@/features/projects/board-release-closeout-archive-manifests";
import { createBoardReleaseCloseoutExecutivePacketReport } from "@/features/projects/board-release-closeout-executive-packet";
import type { BoardReleaseCloseoutOwnerAcknowledgementReport } from "@/features/projects/board-release-closeout-owner-acknowledgements";
import type { BoardReleaseCloseoutReadinessGateReport } from "@/features/projects/board-release-closeout-readiness-gates";
import type { BoardReleaseCloseoutVarianceRemediationReport } from "@/features/projects/board-release-closeout-variance-remediation";

const generatedAt = "2026-05-29T10:00:00.000Z";

const readinessGates = {
  generatedAt,
  jsonContent: "{\"summary\":{\"status\":\"blocked\"}}",
  summary: {
    blockedCount: 1,
    gateCount: 4,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    readinessScore: 73,
    readyCount: 2,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutReadinessGateReport;

const ownerAcknowledgements = {
  generatedAt,
  jsonContent: "{\"summary\":{\"status\":\"blocked\"}}",
  summary: {
    acknowledgementCount: 4,
    blockedCount: 1,
    dueCount: 1,
    missingRoleCount: 0,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    roleCoverageCount: 4,
    signedCount: 2,
    status: "blocked",
    waivedCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutOwnerAcknowledgementReport;

const archiveManifests = {
  generatedAt,
  summary: {
    blockedCount: 1,
    bundleHash: "sha256:bundle",
    evidenceHash: "sha256:evidence",
    manifestCount: 4,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    ownerAcknowledgementHash: "sha256:ack",
    readinessGateHash: "sha256:gates",
    readyCount: 2,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutArchiveManifestReport;

const remediation = {
  generatedAt,
  summary: {
    blockedCount: 2,
    completedCount: 2,
    criticalCount: 2,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    openCount: 2,
    overdueCount: 0,
    planCount: 6,
    remediationHash: "sha256:remediation",
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutVarianceRemediationReport;

const report = createBoardReleaseCloseoutExecutivePacketReport({
  archiveManifests,
  generatedAt,
  ownerAcknowledgements,
  readinessGates,
  remediation,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.decision, "hold");
assert.equal(report.summary.sectionCount, 5);
assert.equal(report.summary.blockedSectionCount, 5);
assert.equal(report.summary.watchSectionCount, 0);
assert.match(report.summary.packetHash, /^sha256:/);
assert.match(report.summary.finalDecisionHash, /^sha256:/);
assert.match(report.sections[0]?.sectionHash ?? "", /^sha256:/);
assert.equal(report.sections.find((section) => section.sectionKind === "decision")?.summary, "Final decision is hold with 30/100 closeout confidence.");
assert.match(report.executiveMemo, /Board release closeout decision: HOLD/);
assert.match(report.csvContent, /section_id,section_kind,title,status,score,evidence_hash,section_hash,summary,next_action/);
assert.match(report.jsonContent, /"decision": "hold"/);
assert.equal(report.csvFileName, "workspace-board-board-release-closeout-executive-packet-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-closeout-executive-packet-20260529.json");

console.log("board release closeout executive packet smoke passed");

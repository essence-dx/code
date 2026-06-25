import assert from "node:assert/strict";
import { createBoardReleaseArchiveAssuranceDecisionMemo } from "@/features/projects/board-release-archive-assurance-decision-memo";
import type { BoardReleaseArchiveEvidenceReleaseHandoffDigestReport } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";

const generatedAt = "2026-05-29T10:00:00.000Z";

const handoffDigest = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "handoff.csv",
  executiveMemo: "WATCH archive evidence handoff: 1/4 areas ready, 3 watch, 0 blocked.",
  generatedAt,
  jsonContent: "",
  jsonDataUri: "",
  jsonFileName: "handoff.json",
  rows: [
    {
      area: "vault",
      evidenceHash: "sha256:vault",
      id: "handoff-vault",
      metric: "vault-integrity",
      nextAction: "Archive evidence retention vault is sealed for board release archive evidence.",
      score: 100,
      status: "ready",
      title: "Retention vault integrity",
      value: "5/5 sealed",
    },
    {
      area: "diffs",
      evidenceHash: "sha256:diff",
      id: "handoff-diff",
      metric: "diff-drift",
      nextAction: "Review changed, added, or missing archive evidence bundles before release archive closeout.",
      score: 81,
      status: "watch",
      title: "Vault baseline diff drift",
      value: "1 changed, 1 added, 0 missing",
    },
    {
      area: "reviewers",
      evidenceHash: "sha256:reviewers",
      id: "handoff-reviewers",
      metric: "reviewer-packets",
      nextAction: "Collect reviewer acknowledgements.",
      score: 84,
      status: "watch",
      title: "Reviewer packet readiness",
      value: "1/4 ready",
    },
    {
      area: "renewals",
      evidenceHash: "sha256:renewals",
      id: "handoff-renewals",
      metric: "renewal-risk",
      nextAction: "Schedule renewal confirmation.",
      score: 92,
      status: "watch",
      title: "Exception renewal risk",
      value: "0 overdue, 0 blocked, 1 due soon",
    },
  ],
  summary: {
    blockedCount: 0,
    digestHash: "sha256:handoff",
    digestScore: 86,
    nextAction: "Review changed, added, or missing archive evidence bundles before release archive closeout.",
    readyCount: 1,
    rowCount: 4,
    status: "watch",
    watchCount: 3,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveEvidenceReleaseHandoffDigestReport;

const report = createBoardReleaseArchiveAssuranceDecisionMemo({
  generatedAt,
  handoffDigest,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "conditional");
assert.equal(report.summary.ownerCount, 3);
assert.equal(report.summary.blockedOwnerCount, 0);
assert.equal(report.summary.conditionalOwnerCount, 3);
assert.equal(report.owners.some((owner) => owner.sourceArea === "diffs"), true);
assert.equal(report.owners.some((owner) => owner.ownerRole === "review coordinator"), true);
assert.match(report.summary.approvalRecommendation, /conditionally/);
assert.match(report.executiveMemo, /CONDITIONAL archive assurance decision/);
assert.equal(report.summary.memoHash.startsWith("sha256:"), true);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-assurance-decision-memo-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-assurance-decision-memo-20260529.json");
assert.match(report.csvContent, /owner_id,source_area,title,status,risk_level,owner_role,due_window,evidence_hash,next_action/);
assert.match(report.jsonContent, /"memoScore"/);

console.log("board release archive assurance decision memo smoke passed");

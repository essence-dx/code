import assert from "node:assert/strict";
import type { BoardReleaseCloseoutReadinessGateReport } from "@/features/projects/board-release-closeout-readiness-gates";
import { createBoardReleaseCloseoutOwnerAcknowledgementReport } from "@/features/projects/board-release-closeout-owner-acknowledgements";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

const generatedAt = "2026-05-29T10:00:00.000Z";

const readinessGates = {
  csvContent: "gate_id,gate_kind,title,status,score,metric,evidence_hash,gate_hash,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,gate_id",
  csvFileName: "readiness.csv",
  gates: [
    {
      evidenceHash: "sha256:observability",
      gateHash: "sha256:observability-gate",
      gateId: "gate-observability",
      gateKind: "observability-digest",
      metric: "27/100 digest",
      nextAction: "Resolve blocked observability closeout signals before board release closure.",
      score: 27,
      status: "blocked",
      title: "Observability executive digest",
      workspaceId: "workspace-board",
    },
    {
      evidenceHash: "sha256:distribution",
      gateHash: "sha256:distribution-gate",
      gateId: "gate-distribution",
      gateKind: "distribution-readiness",
      metric: "84/100 distribution",
      nextAction: "Review watched delivery routes before final closeout.",
      score: 84,
      status: "watch",
      title: "Distribution readiness",
      workspaceId: "workspace-board",
    },
    {
      evidenceHash: "sha256:packet",
      gateHash: "sha256:packet-gate",
      gateId: "gate-packets",
      gateKind: "signed-export-packets",
      metric: "1/1 signed",
      nextAction: "Signed packets are ready for closeout.",
      score: 100,
      status: "ready",
      title: "Signed export packets",
      workspaceId: "workspace-board",
    },
    {
      evidenceHash: "sha256:archive",
      gateHash: "sha256:archive-gate",
      gateId: "gate-archive",
      gateKind: "evidence-archive",
      metric: "1 archive",
      nextAction: "Evidence archive is sealed.",
      score: 100,
      status: "ready",
      title: "Evidence archive state",
      workspaceId: "workspace-board",
    },
  ],
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "readiness.json",
  summary: {
    blockedCount: 1,
    gateCount: 4,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    readinessScore: 78,
    readyCount: 2,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutReadinessGateReport;

const members: WorkspaceMemberRow[] = [
  {
    email: "owner@example.com",
    id: "member-owner",
    joinedAt: generatedAt,
    name: "Board Owner",
    role: "owner",
    userId: "user-owner",
  },
  {
    email: "admin@example.com",
    id: "member-admin",
    joinedAt: generatedAt,
    name: "Release Admin",
    role: "admin",
    userId: "user-admin",
  },
];

const report = createBoardReleaseCloseoutOwnerAcknowledgementReport({
  generatedAt,
  members,
  readinessGates,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.acknowledgementCount, 4);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.summary.dueCount, 1);
assert.equal(report.summary.signedCount, 2);
assert.equal(report.summary.roleCoverageCount, 4);
assert.equal(report.summary.missingRoleCount, 0);
assert.equal(report.acknowledgements[0]?.gateKind, "observability-digest");
assert.equal(report.acknowledgements.find((acknowledgement) => acknowledgement.gateKind === "distribution-readiness")?.dueAt, "2026-06-01T10:00:00.000Z");
assert.equal(report.acknowledgements.find((acknowledgement) => acknowledgement.gateKind === "signed-export-packets")?.signedAt, generatedAt);
assert.match(report.acknowledgements[0]?.acknowledgementHash ?? "", /^sha256:/);
assert.match(
  report.csvContent,
  /acknowledgement_id,gate_kind,required_role,status,due_at,signed_at,signer_email,role_covered,evidence_hash,acknowledgement_hash,next_action/,
);
assert.match(report.jsonContent, /"gateKind": "signed-export-packets"/);
assert.equal(report.csvFileName, "workspace-board-board-release-closeout-owner-acknowledgements-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-closeout-owner-acknowledgements-20260529.json");

console.log("board release closeout owner acknowledgements smoke passed");

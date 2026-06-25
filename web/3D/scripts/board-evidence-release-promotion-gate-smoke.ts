import assert from "node:assert/strict";
import type { BoardEvidenceEscalationRoutingReport } from "@/features/projects/board-evidence-escalation-routing";
import type { BoardEvidenceCloseoutReport } from "@/features/projects/board-evidence-closeout-report";
import type { BoardEvidencePacketLockReport } from "@/features/projects/board-evidence-packet-lock";
import type { BoardEvidenceReleaseApprovalHandoffReport } from "@/features/projects/board-evidence-release-approval-handoff";
import { createBoardEvidenceReleasePromotionGateReport } from "@/features/projects/board-evidence-release-promotion-gate";

const generatedAt = "2026-05-20T10:00:00.000Z";

const blockedCloseout = {
  csvFileName: "workspace-board-board-evidence-closeout-report-20260520.csv",
  jsonFileName: "workspace-board-board-evidence-closeout-report-20260520.json",
  summary: {
    closeoutScore: 50,
    nextAction: "Attach corrected replay export before promotion.",
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceCloseoutReport;

const blockedPacketLock = {
  releasePromotionId: "release-2026-05-20",
  summary: {
    lockScore: 50,
    nextAction: "Lock remaining evidence rows before promotion.",
    promotionBlocked: true,
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardEvidencePacketLockReport;

const blockedEscalationRouting = {
  summary: {
    criticalCount: 1,
    eligibleRouteCount: 0,
    nextAction: "Route critical board evidence escalations before promotion.",
    routingScore: 0,
    status: "critical",
    warningCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceEscalationRoutingReport;

const blockedHandoff = {
  releasePromotionId: "release-2026-05-20",
  summary: {
    handoffScore: 40,
    nextAction: "Collect release signer approvals.",
    signerCount: 4,
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseApprovalHandoffReport;

const blockedGate = createBoardEvidenceReleasePromotionGateReport({
  closeout: blockedCloseout,
  escalationRouting: blockedEscalationRouting,
  generatedAt,
  handoff: blockedHandoff,
  packetLock: blockedPacketLock,
  releasePromotionId: "release-2026-05-20",
  workspaceId: "workspace-board",
});

assert.equal(blockedGate.summary.status, "blocked");
assert.equal(blockedGate.summary.promotionAllowed, false);
assert.equal(blockedGate.summary.blockerCount, 4);
assert.equal(blockedGate.summary.gateScore, 0);
assert.equal(blockedGate.summary.nextAction, "Attach corrected replay export before promotion.");
assert.equal(blockedGate.gates.find((gate) => gate.id === "closeout-export")?.status, "blocked");
assert.equal(blockedGate.gates.find((gate) => gate.id === "packet-lock")?.status, "blocked");
assert.equal(blockedGate.gates.find((gate) => gate.id === "escalation-routing")?.status, "blocked");
assert.match(blockedGate.csvContent, /gate_id,status,score,promotion_blocker,evidence,next_action/);
assert.match(blockedGate.jsonContent, /"promotionAllowed": false/);
assert.equal(blockedGate.csvFileName, "workspace-board-board-evidence-release-promotion-gate-20260520.csv");

const readyGate = createBoardEvidenceReleasePromotionGateReport({
  closeout: {
    ...blockedCloseout,
    summary: {
      ...blockedCloseout.summary,
      closeoutScore: 100,
      nextAction: "Board evidence closeout report is ready for export.",
      status: "ready",
    },
  },
  escalationRouting: {
    ...blockedEscalationRouting,
    summary: {
      ...blockedEscalationRouting.summary,
      criticalCount: 0,
      eligibleRouteCount: 0,
      nextAction: "No board evidence escalation routing is needed.",
      routingScore: 100,
      status: "ready",
      warningCount: 0,
    },
  },
  generatedAt,
  handoff: {
    ...blockedHandoff,
    summary: {
      ...blockedHandoff.summary,
      handoffScore: 100,
      nextAction: "Release approval handoff is ready for signer circulation.",
      status: "ready",
    },
  },
  packetLock: {
    ...blockedPacketLock,
    summary: {
      ...blockedPacketLock.summary,
      lockScore: 100,
      nextAction: "Board evidence packet is locked for release promotion.",
      promotionBlocked: false,
      status: "locked",
    },
  },
  releasePromotionId: "release-2026-05-20",
  workspaceId: "workspace-board",
});

assert.equal(readyGate.summary.status, "ready");
assert.equal(readyGate.summary.promotionAllowed, true);
assert.equal(readyGate.summary.blockerCount, 0);
assert.equal(readyGate.summary.gateScore, 100);
assert.match(readyGate.jsonContent, /"promotionAllowed": true/);

console.log("board evidence release promotion gate smoke passed");

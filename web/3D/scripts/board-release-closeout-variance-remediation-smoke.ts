import assert from "node:assert/strict";
import type { BoardReleaseCloseoutArchiveManifestReport } from "@/features/projects/board-release-closeout-archive-manifests";
import type { BoardReleaseCloseoutOwnerAcknowledgementReport } from "@/features/projects/board-release-closeout-owner-acknowledgements";
import { createBoardReleaseCloseoutVarianceRemediationReport } from "@/features/projects/board-release-closeout-variance-remediation";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

const generatedAt = "2026-05-29T10:00:00.000Z";

const archiveManifests = {
  generatedAt,
  manifests: [
    {
      csvFileName: "observability.csv",
      evidenceHash: "sha256:observability-evidence",
      jsonFileName: "observability.json",
      manifestHash: "sha256:observability-manifest",
      manifestId: "manifest-observability",
      manifestKind: "observability",
      nextAction: "Resolve blocked observability closeout signals before board release closure.",
      recordCount: 2,
      sourceStatus: "blocked",
      status: "blocked",
      title: "Observability executive digest",
      workspaceId: "workspace-board",
    },
    {
      csvFileName: "distribution.csv",
      evidenceHash: "sha256:distribution-evidence",
      jsonFileName: "distribution.json",
      manifestHash: "sha256:distribution-manifest",
      manifestId: "manifest-distribution",
      manifestKind: "distribution",
      nextAction: "Review watched delivery routes before final closeout.",
      recordCount: 4,
      sourceStatus: "watch",
      status: "watch",
      title: "Distribution readiness dashboard",
      workspaceId: "workspace-board",
    },
    {
      csvFileName: "operations.csv",
      evidenceHash: "sha256:operations-evidence",
      jsonFileName: "operations.json",
      manifestHash: "sha256:operations-manifest",
      manifestId: "manifest-operations",
      manifestKind: "operations",
      nextAction: "Operations export packets are signed for closeout.",
      recordCount: 2,
      sourceStatus: "ready",
      status: "ready",
      title: "Operations export packets",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    blockedCount: 1,
    bundleHash: "sha256:bundle",
    evidenceHash: "sha256:evidence",
    manifestCount: 3,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    ownerAcknowledgementHash: "sha256:ack",
    readinessGateHash: "sha256:gates",
    readyCount: 1,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutArchiveManifestReport;

const ownerAcknowledgements = {
  acknowledgements: [
    {
      acknowledgementHash: "sha256:ack-observability",
      acknowledgementId: "ack-observability",
      dueAt: "2026-05-30T10:00:00.000Z",
      evidenceHash: "sha256:observability-evidence",
      gateId: "gate-observability",
      gateKind: "observability-digest",
      gateStatus: "blocked",
      nextAction: "Resolve blocked observability closeout signals before board release closure.",
      requiredRole: "owner",
      roleCovered: true,
      signedAt: null,
      signerEmail: "owner@example.com",
      signerName: "Board Owner",
      signerUserId: "user-owner",
      status: "blocked",
      workspaceId: "workspace-board",
    },
    {
      acknowledgementHash: "sha256:ack-distribution",
      acknowledgementId: "ack-distribution",
      dueAt: "2026-06-01T10:00:00.000Z",
      evidenceHash: "sha256:distribution-evidence",
      gateId: "gate-distribution",
      gateKind: "distribution-readiness",
      gateStatus: "watch",
      nextAction: "Review watched delivery routes before final closeout.",
      requiredRole: "admin",
      roleCovered: true,
      signedAt: null,
      signerEmail: "admin@example.com",
      signerName: "Release Admin",
      signerUserId: "user-admin",
      status: "due",
      workspaceId: "workspace-board",
    },
  ],
  generatedAt,
  jsonContent: "{}",
  summary: {
    acknowledgementCount: 2,
    blockedCount: 1,
    dueCount: 1,
    missingRoleCount: 0,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    roleCoverageCount: 2,
    signedCount: 0,
    status: "blocked",
    waivedCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutOwnerAcknowledgementReport;

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

const report = createBoardReleaseCloseoutVarianceRemediationReport({
  archiveManifests,
  generatedAt,
  members,
  ownerAcknowledgements,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.planCount, 5);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.openCount, 2);
assert.equal(report.summary.completedCount, 1);
assert.equal(report.summary.criticalCount, 2);
assert.equal(report.plans[0]?.severity, "critical");
assert.equal(report.plans[0]?.dueAt, "2026-05-30T10:00:00.000Z");
assert.equal(report.plans.find((plan) => plan.sourceKind === "operations")?.status, "completed");
assert.match(report.plans.find((plan) => plan.sourceKind === "operations")?.completionEvidenceHash ?? "", /^sha256:/);
assert.match(report.summary.remediationHash, /^sha256:/);
assert.match(
  report.csvContent,
  /plan_id,source_type,source_kind,source_status,severity,status,owner_name,owner_email,owner_role,due_at,source_hash,completion_evidence_hash,plan_hash,next_action/,
);
assert.match(report.jsonContent, /"sourceType": "acknowledgement"/);
assert.equal(report.csvFileName, "workspace-board-board-release-closeout-variance-remediation-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-closeout-variance-remediation-20260529.json");

console.log("board release closeout variance remediation smoke passed");

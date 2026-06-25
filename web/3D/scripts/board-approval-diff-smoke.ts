import { strict as assert } from "node:assert";
import { createBoardApprovalPacketDiffReport } from "@/features/projects/board-approval-diff";
import { createBoardApprovalPacketHistoryRecord, createBoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import { createExecutiveReleaseSnapshotHistoryReport, createExecutiveReleaseSnapshotRecord } from "@/features/projects/executive-release-snapshots";
import type { BoardApprovalPacketReport, BoardApprovalPacketSignOffRow } from "@/features/projects/board-approval-packet";
import type { ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceSignal } from "@/features/projects/executive-release-intelligence";

const savedAt = "2026-05-15T10:00:00.000Z";
const generatedAt = "2026-05-16T12:00:00.000Z";

function signOff(input: Partial<BoardApprovalPacketSignOffRow> & Pick<BoardApprovalPacketSignOffRow, "role" | "status">): BoardApprovalPacketSignOffRow {
  return {
    action: `${input.role} action`,
    dueAt: "2026-05-16T13:00:00.000Z",
    evidenceHash: `sha256:${input.role}`,
    evidenceLinks: [],
    ownerEmail: `${input.role}@example.com`,
    ownerName: `${input.role} Owner`,
    required: true,
    ...input,
  };
}

function packet(input: {
  approvalScore: number;
  blocked: number;
  checksum: string;
  generatedAt: string;
  packetId: string;
  signOffs: BoardApprovalPacketSignOffRow[];
  status: BoardApprovalPacketReport["summary"]["status"];
  watch: number;
}): BoardApprovalPacketReport {
  return {
    checksums: {
      packetHash: input.checksum,
      sources: [
        {
          contentHash: input.checksum === "sha256:current" ? "sha256:executive-current" : "sha256:executive-saved",
          id: "executive-release-intelligence",
          label: "Executive release intelligence",
          sourceRecordCount: 3,
          verified: true,
        },
      ],
    },
    criticalPath:
      input.status === "blocked"
        ? [
            {
              action: "Repair public viewer smoke before board approval.",
              evidence: "Public smoke evidence failed.",
              evidenceHash: "sha256:smoke",
              id: "critical:smoke",
              label: "Public viewer smoke",
              ownerName: "Launch Owner",
              source: "control-room",
              status: "blocked",
            },
          ]
        : [],
    csvContent: "role,status,required,owner,due_at,evidence_hash,action\n",
    csvDataUri: "data:text/csv;charset=utf-8,role",
    csvFileName: `${input.packetId}.csv`,
    executiveMemo: input.status === "blocked" ? "Board approval is blocked." : "Board approval is watched.",
    generatedAt: input.generatedAt,
    jsonContent: "{}",
    jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
    jsonFileName: `${input.packetId}.json`,
    packetId: input.packetId,
    redactedSummary: `Approval status: ${input.status}.`,
    signOffs: input.signOffs,
    summary: {
      approvalScore: input.approvalScore,
      blockedSignOffCount: input.blocked,
      checksumCount: 2,
      criticalPathCount: input.status === "blocked" ? 1 : 0,
      nextAction: input.status === "blocked" ? "Repair public viewer smoke before board approval." : "Watch release evidence.",
      readySignOffCount: input.signOffs.filter((row) => row.status === "ready").length,
      redactionCount: 0,
      status: input.status,
      watchSignOffCount: input.watch,
    },
  };
}

const savedPacket = packet({
  approvalScore: 72,
  blocked: 0,
  checksum: "sha256:saved",
  generatedAt: savedAt,
  packetId: "board-packet-saved",
  signOffs: [signOff({ role: "launch", status: "watch" }), signOff({ role: "evidence", status: "ready" })],
  status: "watch",
  watch: 1,
});

const currentPacket = packet({
  approvalScore: 48,
  blocked: 1,
  checksum: "sha256:current",
  generatedAt,
  packetId: "board-packet-current",
  signOffs: [signOff({ role: "launch", status: "blocked" }), signOff({ role: "evidence", status: "ready" })],
  status: "blocked",
  watch: 0,
});

const packetHistory = createBoardApprovalPacketHistoryReport([
  createBoardApprovalPacketHistoryRecord({
    actor: { email: "admin@mail.com", name: "Admin", userId: "user-admin" },
    createdAt: savedAt,
    packet: savedPacket,
    recipientPurpose: "Initial board packet",
    workspaceId: "workspace-1",
  }),
]);

function signal(input: Partial<ExecutiveReleaseIntelligenceSignal> & Pick<ExecutiveReleaseIntelligenceSignal, "domain" | "id" | "label" | "status">): ExecutiveReleaseIntelligenceSignal {
  return {
    detail: input.detail ?? `${input.label} detail`,
    domain: input.domain,
    evidence: input.evidence ?? `${input.label} evidence`,
    evidenceCount: input.evidenceCount ?? 1,
    id: input.id,
    label: input.label,
    nextAction: input.nextAction ?? `${input.label} next action`,
    ownerHint: input.ownerHint ?? `${input.domain} owner`,
    score: input.score ?? (input.status === "blocked" ? 35 : input.status === "watch" ? 72 : 96),
    severity: input.severity ?? (input.status === "blocked" ? "critical" : input.status === "watch" ? "warning" : "info"),
    status: input.status,
    updatedAt: input.updatedAt ?? savedAt,
    value: input.value ?? input.status,
  };
}

const snapshotReport: ExecutiveReleaseIntelligenceReport = {
  criticalPath: [],
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "executive.csv",
  executiveMemo: "Executive snapshot was healthier than the current board packet.",
  generatedAt: savedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "executive.json",
  signals: [signal({ domain: "launch", id: "launch", label: "Launch", status: "watch" }), signal({ domain: "evidence", id: "evidence", label: "Evidence", status: "ready" })],
  summary: {
    blockedCount: 0,
    costScore: 80,
    domainCoverage: ["launch", "evidence"],
    evidenceScore: 96,
    executiveScore: 76,
    governanceScore: 90,
    incidentScore: 88,
    launchScore: 72,
    lowestDomain: "launch",
    readyCount: 1,
    riskScore: 82,
    signalCount: 2,
    status: "watch",
    topAction: "Keep launch evidence watched.",
    watchCount: 1,
  },
};

const executiveSnapshotHistory = createExecutiveReleaseSnapshotHistoryReport([
  createExecutiveReleaseSnapshotRecord({
    actor: { email: "admin@mail.com", name: "Admin", userId: "user-admin" },
    createdAt: savedAt,
    report: snapshotReport,
    workspace: { id: "workspace-1", name: "Workspace" },
  }),
]);

const diff = createBoardApprovalPacketDiffReport({
  currentPacket,
  executiveSnapshotHistory,
  generatedAt,
  packetHistory,
  workspaceId: "workspace-1",
});

assert.equal(diff.summary.status, "blocked");
assert.equal(diff.summary.baselinePacketId, "board-packet-saved");
assert.equal(diff.summary.currentPacketId, "board-packet-current");
assert.equal(diff.summary.latestSnapshotId?.startsWith("executive-release-workspace-1-"), true);
assert.equal(diff.summary.scoreDelta, -24);
assert.equal(diff.summary.blockerDelta, 1);
assert.equal(diff.summary.checksumChanged, true);
assert.equal(diff.summary.regressionCount >= 3, true);
assert.equal(diff.rows.some((row) => row.kind === "approval-score" && row.delta === -24 && row.severity === "critical"), true);
assert.equal(diff.rows.some((row) => row.kind === "sign-off" && row.metric === "launch sign-off" && row.previousValue === "watch" && row.currentValue === "blocked"), true);
assert.equal(diff.rows.some((row) => row.kind === "executive-snapshot" && row.metric === "Executive snapshot score" && row.delta === -28), true);
assert.match(diff.csvContent, /kind,severity,metric,previous,current,delta,next_action/);
assert.match(diff.csvDataUri, /^data:text\/csv/);
assert.equal(diff.csvFileName, "workspace-1-board-approval-diff.csv");

console.log("board approval diff smoke passed");

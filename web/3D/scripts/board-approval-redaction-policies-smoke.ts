import { strict as assert } from "node:assert";
import { createBoardApprovalRedactionPolicyReport } from "@/features/projects/board-approval-redaction-policies";
import type { BoardApprovalMeetingAgendaReport } from "@/features/projects/board-approval-agenda";
import type { BoardApprovalPacketDiffReport } from "@/features/projects/board-approval-diff";
import type { BoardApprovalPacketReport } from "@/features/projects/board-approval-packet";

const generatedAt = "2026-05-16T12:45:00.000Z";

const boardApprovalPacket: BoardApprovalPacketReport = {
  checksums: {
    packetHash: "sha256:secret-packet",
    sources: [
      {
        contentHash: "sha256:secret-executive",
        id: "executive-release-intelligence",
        label: "Executive release intelligence",
        sourceRecordCount: 4,
        verified: true,
      },
      {
        contentHash: "sha256:secret-control-room",
        id: "release-control-room-timeline",
        label: "Release control-room timeline",
        sourceRecordCount: 3,
        verified: true,
      },
    ],
  },
  criticalPath: [
    {
      action: "Ask release@example.com to repair https://internal.example.com/runbook before board sign-off.",
      evidence: "Internal runbook https://internal.example.com/runbook has checksum sha256:secret-runbook.",
      evidenceHash: "sha256:critical-path",
      id: "critical:launch",
      label: "Launch public viewer smoke",
      ownerName: "Release Director",
      source: "control-room",
      status: "blocked",
    },
    {
      action: "Attach partner integration evidence for https://partner.example.com/review.",
      evidence: "Partner review is waiting on release@example.com confirmation.",
      evidenceHash: "sha256:partner-evidence",
      id: "critical:partner",
      label: "Partner integration evidence",
      ownerName: "Partner Owner",
      source: "executive",
      status: "watch",
    },
  ],
  csvContent: "role,status,required,owner,due_at,evidence_hash,action\n",
  csvDataUri: "data:text/csv;charset=utf-8,role",
  csvFileName: "workspace-board-approval-packet.csv",
  executiveMemo: "Board approval is blocked until release@example.com clears https://internal.example.com/runbook and verifies sha256:secret-packet.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "workspace-board-approval-packet.json",
  packetId: "board-approval-workspace-20260516",
  redactedSummary:
    "Approval status: blocked.\nExecutive memo: release@example.com owns https://internal.example.com/runbook.\nPacket checksum: sha256:secret-packet.",
  signOffs: [
    {
      action: "Repair public viewer smoke using https://internal.example.com/runbook.",
      dueAt: "2026-05-16T13:00:00.000Z",
      evidenceHash: "sha256:launch-signoff",
      evidenceLinks: ["https://internal.example.com/runbook", "mailto:release@example.com"],
      ownerEmail: "release@example.com",
      ownerName: "Release Director",
      required: true,
      role: "launch",
      status: "blocked",
    },
    {
      action: "Confirm partner embed review with partner-success@example.com.",
      dueAt: "2026-05-17T13:00:00.000Z",
      evidenceHash: "sha256:partner-signoff",
      evidenceLinks: ["https://partner.example.com/review"],
      ownerEmail: "partner-success@example.com",
      ownerName: "Partner Owner",
      required: true,
      role: "evidence",
      status: "watch",
    },
  ],
  summary: {
    approvalScore: 48,
    blockedSignOffCount: 1,
    checksumCount: 3,
    criticalPathCount: 2,
    nextAction: "Ask release@example.com to repair https://internal.example.com/runbook before board sign-off.",
    readySignOffCount: 0,
    redactionCount: 0,
    status: "blocked",
    watchSignOffCount: 1,
  },
};

const boardApprovalDiff: BoardApprovalPacketDiffReport = {
  csvContent: "kind,severity,metric,previous,current,delta,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,kind",
  csvFileName: "workspace-board-approval-diff.csv",
  generatedAt,
  rows: [
    {
      currentValue: "sha256:secret-packet",
      delta: null,
      direction: "neutral",
      kind: "packet-checksum",
      metric: "Packet checksum",
      nextAction: "Review changed source evidence before external review.",
      previousValue: "sha256:older-secret-packet",
      severity: "warning",
      sourceLabel: "Packet hash",
    },
  ],
  summary: {
    baselinePacketId: "board-approval-older",
    baselineSavedAt: "2026-05-15T12:00:00.000Z",
    blockerDelta: 1,
    changeCount: 1,
    checksumChanged: true,
    criticalChangeCount: 0,
    currentPacketId: "board-approval-workspace-20260516",
    improvementCount: 0,
    latestSnapshotId: "executive-release-workspace-20260515",
    nextAction: "Review changed source evidence before external review.",
    regressionCount: 0,
    scoreDelta: -12,
    status: "watch",
    warningChangeCount: 1,
  },
};

const boardApprovalAgenda: BoardApprovalMeetingAgendaReport = {
  attendees: [
    {
      email: "release@example.com",
      itemCount: 2,
      name: "Release Director",
      required: true,
      role: "Sign-off owner",
    },
  ],
  csvContent: "kind,status,topic,owner,duration_minutes,decision_prompt,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,kind",
  csvFileName: "workspace-board-approval-agenda.csv",
  generatedAt,
  items: [
    {
      decisionPrompt: "Can the board approve launch with this gap open?",
      dueAt: "2026-05-16T13:00:00.000Z",
      durationMinutes: 12,
      evidence: "Internal runbook https://internal.example.com/runbook",
      href: "https://internal.example.com/runbook",
      id: "sign-off:launch",
      kind: "decision",
      nextAction: "Ask release@example.com to repair launch smoke.",
      ownerEmail: "release@example.com",
      ownerName: "Release Director",
      priority: 0,
      sourceId: "launch",
      sourceLabel: "Board packet sign-off",
      status: "blocked",
      topic: "Launch approval sign-off",
    },
  ],
  openingMemo: "Board meeting is blocked by 1 agenda item.",
  summary: {
    blockedItemCount: 1,
    estimatedDurationMinutes: 12,
    readyItemCount: 0,
    requiredAttendeeCount: 1,
    sourceCount: 1,
    status: "blocked",
    topDecision: "Can the board approve launch with this gap open?",
    totalItemCount: 1,
    watchItemCount: 0,
  },
};

const report = createBoardApprovalRedactionPolicyReport({
  boardApprovalAgenda,
  boardApprovalDiff,
  boardApprovalPacket,
  generatedAt,
  workspaceId: "workspace-1",
});

assert.equal(report.summary.templateCount, 4);
assert.equal(report.summary.externalTemplateCount, 3);
assert.equal(report.summary.status, "blocked");
assert.equal(report.templates.map((template) => template.audience).sort().join(","), "client,internal-board,investor,partner");

const investor = report.templates.find((template) => template.audience === "investor");
assert.ok(investor);
assert.equal(investor.strictness, "strict");
assert.equal(investor.removedSections.includes("raw checksums"), true);
assert.equal(investor.preview.redactedSummary.includes("release@example.com"), false);
assert.equal(investor.preview.redactedSummary.includes("https://"), false);
assert.equal(investor.preview.redactedSummary.includes("sha256:"), false);
assert.equal(investor.rules.some((rule) => rule.kind === "raw-checksum" && rule.action === "remove"), true);

const client = report.templates.find((template) => template.audience === "client");
assert.ok(client);
assert.equal(client.rules.some((rule) => rule.kind === "status-detail" && rule.action === "allow"), true);
assert.equal(client.preview.signOffs.some((row) => row.ownerEmail?.includes("@")), false);

const partner = report.templates.find((template) => template.audience === "partner");
assert.ok(partner);
assert.equal(partner.allowedSections.includes("integration-safe evidence labels"), true);
assert.equal(partner.preview.criticalPath.some((row) => row.label === "Partner integration evidence"), true);

const internalBoard = report.templates.find((template) => template.audience === "internal-board");
assert.ok(internalBoard);
assert.equal(internalBoard.strictness, "internal");
assert.equal(internalBoard.preview.redactedSummary.includes("sha256:"), true);
assert.equal(internalBoard.rules.some((rule) => rule.kind === "raw-checksum" && rule.action === "allow"), true);

assert.match(report.csvContent, /audience,label,status,strictness,redaction_count,retained_fields,removed_fields,next_action/);
assert.match(report.csvDataUri, /^data:text\/csv/);
assert.equal(report.csvFileName, "workspace-1-board-redaction-policies.csv");

console.log("board approval redaction policies smoke passed");

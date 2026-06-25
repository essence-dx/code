import { strict as assert } from "node:assert";
import { createBoardApprovalPacket } from "@/features/projects/board-approval-packet";
import type { ExecutiveActionOwnershipMatrix, ExecutiveActionOwnershipRow } from "@/features/projects/executive-action-ownership";
import type { ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceSignal } from "@/features/projects/executive-release-intelligence";
import type { ReleaseControlRoomTimelineReport, ReleaseControlRoomTimelineRow } from "@/features/projects/release-control-room-timeline";
import type { ReleaseScenarioComparisonReport } from "@/features/projects/release-scenario-comparison";

const generatedAt = "2026-05-16T12:00:00.000Z";

function signal(input: Partial<ExecutiveReleaseIntelligenceSignal> & Pick<ExecutiveReleaseIntelligenceSignal, "domain" | "id" | "label" | "status">): ExecutiveReleaseIntelligenceSignal {
  const base: ExecutiveReleaseIntelligenceSignal = {
    detail: `${input.label} needs release-owner review from release@example.com before https://essence-spline.vercel.app goes live.`,
    domain: input.domain,
    evidence: `${input.label} evidence from https://essence-spline.vercel.app/evidence/${input.id}.json`,
    evidenceCount: 2,
    id: input.id,
    label: input.label,
    nextAction: `Resolve ${input.label} with release@example.com`,
    ownerHint: `${input.domain} owner`,
    score: input.status === "blocked" ? 35 : input.status === "watch" ? 72 : 96,
    severity: input.status === "blocked" ? "critical" : input.status === "watch" ? "warning" : "info",
    status: input.status,
    updatedAt: generatedAt,
    value: input.status,
  };

  return {
    ...base,
    ...input,
  };
}

const launchSignal = signal({
  domain: "launch",
  id: "launch:promotion-decision",
  label: "Launch promotion readiness",
  nextAction: "Repair public viewer smoke before board approval.",
  ownerHint: "Release owner",
  status: "blocked",
});
const automationSignal = signal({
  domain: "automation",
  id: "automation:webhook-anomaly",
  label: "Automation integrity",
  nextAction: "Attach verified webhook retry evidence.",
  ownerHint: "Automation owner",
  status: "watch",
});
const evidenceSignal = signal({
  domain: "evidence",
  id: "evidence:bundle-graph",
  label: "Evidence coverage",
  nextAction: "Keep evidence packet checksums attached.",
  ownerHint: "Evidence owner",
  status: "ready",
});

const executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport = {
  criticalPath: [launchSignal, automationSignal],
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "executive.csv",
  executiveMemo: "Do not promote while release@example.com is resolving https://essence-spline.vercel.app smoke evidence.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "executive.json",
  signals: [launchSignal, automationSignal, evidenceSignal],
  summary: {
    blockedCount: 1,
    costScore: 80,
    domainCoverage: ["launch", "automation", "evidence"],
    evidenceScore: 96,
    executiveScore: 68,
    governanceScore: 84,
    incidentScore: 70,
    launchScore: 35,
    lowestDomain: "launch",
    readyCount: 1,
    riskScore: 66,
    signalCount: 3,
    status: "blocked",
    topAction: "Repair public viewer smoke before board approval.",
    watchCount: 1,
  },
};

const ownershipRows: ExecutiveActionOwnershipRow[] = [
  {
    action: "Repair public viewer smoke before board approval.",
    detail: "Public viewer smoke is blocking release approval.",
    domain: "launch",
    dueAt: "2026-05-16T13:00:00.000Z",
    dueWindowLabel: "Due in 1h",
    evidenceLinks: [
      {
        href: "https://essence-spline.vercel.app/evidence/smoke.json",
        kind: "runbook",
        label: "Smoke log",
        sourceId: "launch:promotion-decision",
      },
    ],
    id: "executive:launch:promotion-decision",
    ownerEmail: "release@example.com",
    ownerName: "Release Owner",
    ownerSource: "runbook",
    projectName: "Launch scene",
    riskScore: 35,
    signalLabel: "Launch promotion readiness",
    status: "blocked",
  },
  {
    action: "Attach webhook retry evidence.",
    detail: "Webhook retry evidence needs an accountable owner.",
    domain: "automation",
    dueAt: "2026-05-17T12:00:00.000Z",
    dueWindowLabel: "Due in 1d",
    evidenceLinks: [],
    id: "executive:automation:webhook-anomaly",
    ownerEmail: null,
    ownerName: "Automation owner",
    ownerSource: "hint",
    projectName: null,
    riskScore: 58,
    signalLabel: "Automation integrity",
    status: "watch",
  },
];

const executiveActionOwnership: ExecutiveActionOwnershipMatrix = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "ownership.csv",
  generatedAt,
  rows: ownershipRows,
  summary: {
    blockedCount: 1,
    dueSoonCount: 2,
    nextAction: "Assign owners and clear smoke blockers.",
    overdueCount: 0,
    ownerCoveragePercent: 50,
    ownershipScore: 52,
    readyCount: 0,
    status: "blocked",
    totalCount: 2,
    unassignedCount: 1,
    watchCount: 1,
  },
};

const releaseScenarioComparison: ReleaseScenarioComparisonReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "scenarios.csv",
  generatedAt,
  recommendedScenario: {
    blockerCount: 1,
    costScore: 82,
    description: "Public launch path.",
    evidence: [],
    id: "public-launch",
    label: "Public launch",
    nextAction: "Public launch: repair public viewer smoke.",
    ownerActions: [],
    ownerLoadScore: 52,
    readinessScore: 55,
    riskScore: 62,
    rollbackScore: 70,
    status: "blocked",
    warningCount: 1,
  },
  rows: [],
  summary: {
    blockedCount: 1,
    nextAction: "Public launch is the current recommended path. Repair public viewer smoke.",
    readyCount: 0,
    recommendedScenarioId: "public-launch",
    scenarioScore: 55,
    status: "blocked",
    totalCount: 1,
    watchCount: 0,
  },
};

function timelineRow(input: Partial<ReleaseControlRoomTimelineRow> & Pick<ReleaseControlRoomTimelineRow, "id" | "kind" | "status" | "title">): ReleaseControlRoomTimelineRow {
  return {
    detail: `${input.title} detail with board@example.com and https://essence-spline.vercel.app/evidence`,
    evidence: `${input.title} evidence`,
    href: "https://essence-spline.vercel.app/evidence",
    nextAction: `Resolve ${input.title}`,
    occurredAt: generatedAt,
    ownerEmail: "release@example.com",
    ownerName: "Release Owner",
    projectName: "Launch scene",
    severity: input.status === "blocked" ? "critical" : input.status === "watch" ? "warning" : "info",
    sourceLabel: "Control room",
    ...input,
  };
}

const releaseControlRoomTimeline: ReleaseControlRoomTimelineReport = {
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "timeline.csv",
  generatedAt,
  rows: [
    timelineRow({ id: "deploy:failure", kind: "deploy", status: "blocked", title: "Post-deploy smoke failed" }),
    timelineRow({ id: "owner-action:launch", kind: "owner-action", status: "blocked", title: "Launch owner action" }),
    timelineRow({ id: "webhook:retry", kind: "webhook", status: "watch", title: "Webhook retry evidence" }),
  ],
  summary: {
    blockedCount: 2,
    latestAt: generatedAt,
    nextAction: "Repair public viewer smoke.",
    ownerCount: 1,
    readyCount: 0,
    sourceCount: 3,
    status: "blocked",
    totalCount: 3,
    watchCount: 1,
  },
};

const packet = createBoardApprovalPacket({
  executiveActionOwnership,
  executiveReleaseIntelligence,
  generatedAt,
  releaseControlRoomTimeline,
  releaseScenarioComparison,
  workspaceId: "workspace-1",
});

assert.equal(packet.summary.status, "blocked");
assert.equal(packet.summary.blockedSignOffCount, 1);
assert.equal(packet.summary.watchSignOffCount >= 1, true);
assert.equal(packet.criticalPath.some((row) => row.source === "executive" && row.label === "Launch promotion readiness"), true);
assert.equal(packet.criticalPath.some((row) => row.source === "control-room" && row.label === "Post-deploy smoke failed"), true);
assert.equal(packet.signOffs.some((row) => row.role === "launch" && row.status === "blocked" && row.required), true);
assert.equal(packet.signOffs.some((row) => row.ownerEmail === "[redacted-email]"), true);
assert.equal(packet.redactedSummary.includes("[redacted-email]"), true);
assert.equal(packet.redactedSummary.includes("[redacted-url]"), true);
assert.equal(packet.redactedSummary.includes("release@example.com"), false);
assert.equal(packet.redactedSummary.includes("https://essence-spline.vercel.app"), false);
assert.equal(packet.checksums.packetHash.startsWith("sha256:"), true);
assert.equal(packet.checksums.sources.length >= 4, true);
assert.match(packet.jsonContent, /"schemaVersion": 1/);
assert.match(packet.csvContent, /role,status,required,owner,due_at,evidence_hash,action/);
assert.match(packet.jsonDataUri, /^data:application\/json/);
assert.match(packet.csvDataUri, /^data:text\/csv/);

console.log("board approval packet smoke passed");

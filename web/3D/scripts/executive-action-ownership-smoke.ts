import { strict as assert } from "node:assert";
import { createExecutiveActionOwnershipMatrix } from "@/features/projects/executive-action-ownership";
import type { ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceSignal } from "@/features/projects/executive-release-intelligence";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

const generatedAt = "2026-05-16T12:00:00.000Z";

function signal(input: Partial<ExecutiveReleaseIntelligenceSignal> & Pick<ExecutiveReleaseIntelligenceSignal, "domain" | "id" | "label" | "status">): ExecutiveReleaseIntelligenceSignal {
  const base: ExecutiveReleaseIntelligenceSignal = {
    detail: `${input.label} detail`,
    domain: input.domain,
    evidence: `${input.label} evidence`,
    evidenceCount: 1,
    id: input.id,
    label: input.label,
    nextAction: `Resolve ${input.label}`,
    ownerHint: `${input.domain} owner`,
    score: input.status === "blocked" ? 32 : input.status === "watch" ? 70 : 94,
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
  nextAction: "Repair post-deploy smoke",
  ownerHint: "Release owner",
  status: "blocked",
});

const automationSignal = signal({
  domain: "automation",
  id: "automation:webhook-anomaly",
  label: "Automation integrity",
  nextAction: "Repair webhook delivery",
  ownerHint: "Automation owner",
  status: "watch",
});

const executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport = {
  criticalPath: [launchSignal, automationSignal],
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "executive.csv",
  executiveMemo: "Do not promote until launch and automation owners clear the critical path.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "executive.json",
  signals: [
    launchSignal,
    automationSignal,
    signal({
      domain: "risk",
      id: "risk:digest",
      label: "Workspace risk posture",
      ownerHint: "Risk owner",
      status: "ready",
    }),
  ],
  summary: {
    blockedCount: 1,
    costScore: 92,
    domainCoverage: ["automation", "launch", "risk"],
    evidenceScore: 85,
    executiveScore: 58,
    governanceScore: 80,
    incidentScore: 88,
    launchScore: 32,
    lowestDomain: "launch",
    readyCount: 1,
    riskScore: 94,
    signalCount: 3,
    status: "blocked",
    topAction: "Repair post-deploy smoke",
    watchCount: 1,
  },
};

const releaseRunbook: WorkspaceReleaseRunbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 2,
  },
  records: [
    {
      attachments: [{ createdAt: generatedAt, id: "attachment-1", label: "Smoke log", url: "/evidence/smoke-log.json" }],
      auditLogHref: "/projects?workspaceId=workspace-1&auditSource=launch%3Apromotion-decision#audit",
      batchId: "batch-1",
      blockerCount: 1,
      checklistEvidence: ["API helper must pass before promotion."],
      comments: [],
      completedAt: null,
      detail: "Post-deploy smoke is blocking launch promotion.",
      dueAt: "2026-05-16T13:00:00.000Z",
      milestoneId: "launch:promotion-decision",
      ownerEmail: "release@example.com",
      ownerName: "Release Owner",
      ownerUserId: "user-release",
      projectId: "project-1",
      projectName: "Launch scene",
      sourceKey: "launch:promotion-decision",
      status: "blocked",
      title: "Launch promotion readiness",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1&auditSource=desktop-channel%3Abeta#audit",
      batchId: "batch-1",
      blockerCount: 0,
      checklistEvidence: ["Beta channel handoff needs owner sign-off."],
      comments: [],
      completedAt: null,
      detail: "Desktop beta channel should be prepared.",
      dueAt: "2026-05-18T12:00:00.000Z",
      milestoneId: "desktop-channel:beta",
      ownerEmail: null,
      ownerName: "Unassigned",
      ownerUserId: null,
      projectId: null,
      projectName: null,
      sourceKey: "desktop-channel:beta",
      status: "scheduled",
      title: "Desktop beta channel",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    blockedCount: 1,
    completeCount: 0,
    inProgressCount: 0,
    nextDueAt: "2026-05-16T13:00:00.000Z",
    ownerCount: 1,
    scheduledCount: 1,
    totalCount: 2,
  },
};

const releaseCalendar: WorkspaceReleaseCalendarReport = {
  generatedAt,
  milestones: [
    {
      actionLabel: "Resolve blockers",
      blockerCount: 1,
      completedAt: null,
      detail: "Post-deploy smoke must pass.",
      dueAt: "2026-05-16T13:00:00.000Z",
      id: "launch:promotion-decision",
      kind: "post-deploy",
      projectId: "project-1",
      projectName: "Launch scene",
      source: "post-deploy-smoke",
      sourceKey: "launch:promotion-decision",
      status: "blocked",
      title: "Launch promotion readiness",
    },
    {
      actionLabel: "Prepare channel",
      blockerCount: 0,
      completedAt: null,
      detail: "Beta channel handoff needs an owner.",
      dueAt: "2026-05-18T12:00:00.000Z",
      id: "desktop-channel:beta",
      kind: "desktop-channel",
      projectId: null,
      projectName: null,
      source: "desktop-release-channel",
      sourceKey: "desktop-channel:beta",
      status: "scheduled",
      title: "Desktop beta channel",
    },
  ],
  summary: {
    appPackageCount: 0,
    blockedCount: 1,
    desktopChannelCount: 1,
    doneCount: 0,
    dueCount: 0,
    nextMilestoneAt: "2026-05-16T13:00:00.000Z",
    postDeployCount: 1,
    reviewGateCount: 0,
    scheduledCount: 1,
    totalCount: 2,
  },
};

const matrix = createExecutiveActionOwnershipMatrix({
  executiveReleaseIntelligence,
  generatedAt,
  releaseCalendar,
  releaseRunbook,
  workspaceId: "workspace-1",
});

assert.equal(matrix.summary.totalCount, 3);
assert.equal(matrix.summary.blockedCount, 1);
assert.equal(matrix.summary.unassignedCount, 2);
assert.equal(matrix.summary.ownerCoveragePercent, 33);
assert.equal(matrix.rows[0]?.id, "executive:launch:promotion-decision");
assert.equal(matrix.rows[0]?.ownerName, "Release Owner");
assert.equal(matrix.rows[0]?.dueWindowLabel, "Due in 1h");
assert.equal(matrix.rows[0]?.evidenceLinks.some((link) => link.kind === "runbook" && link.href.includes("#audit")), true);
assert.equal(matrix.rows.find((row) => row.id === "executive:automation:webhook-anomaly")?.ownerName, "Automation owner");
assert.equal(matrix.rows.find((row) => row.id === "runbook:desktop-channel:beta")?.status, "watch");
assert.match(matrix.summary.nextAction, /Assign owners|Repair post-deploy smoke|Resolve owner/);
assert.match(matrix.csvContent, /owner_name,owner_email,domain,status,due_at,due_window,action,evidence_links/);
assert.match(matrix.csvDataUri, /^data:text\/csv/);

console.log("executive action ownership smoke passed");

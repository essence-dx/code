import { strict as assert } from "node:assert";
import { createPostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { PostDeploySyntheticSmokeReport } from "@/features/deployment/post-deploy-synthetic-smoke";
import { createExecutiveActionOwnershipMatrix } from "@/features/projects/executive-action-ownership";
import type { ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceSignal } from "@/features/projects/executive-release-intelligence";
import { createProjectIncidentHistory } from "@/features/projects/project-incident-history";
import { createReleaseControlRoomTimeline } from "@/features/projects/release-control-room-timeline";
import {
  createReleaseReadinessWebhookHistoryEntry,
  createReleaseReadinessWebhookHistoryReport,
  signReleaseReadinessWebhookPayload,
} from "@/features/projects/release-readiness-webhook-history";
import { createReleaseReadinessWebhookReportFromSources } from "@/features/projects/release-readiness-webhooks";
import { createWorkspaceReleaseRunbookReportFromRecords, type WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

const generatedAt = "2026-05-16T12:00:00.000Z";
const workspaceId = "workspace-1";

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
    score: input.status === "blocked" ? 35 : input.status === "watch" ? 72 : 95,
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

const latestPostDeployReport: PostDeploySyntheticSmokeReport = {
  baseUrl: "https://essence-spline.vercel.app",
  checks: [
    {
      contentType: "text/html",
      durationMs: 210,
      httpStatus: 500,
      issues: ["Viewer route returned 500."],
      key: "public-viewer",
      label: "Public viewer",
      status: "fail",
      url: "https://essence-spline.vercel.app/view/launch",
    },
    {
      contentType: "text/html",
      durationMs: 140,
      httpStatus: 200,
      issues: [],
      key: "embed",
      label: "Embed",
      status: "pass",
      url: "https://essence-spline.vercel.app/embed/launch",
    },
  ],
  durationMs: 350,
  failedCount: 1,
  generatedAt: "2026-05-16T11:50:00.000Z",
  passedCount: 1,
  projectId: "project-1",
  sceneId: "scene-1",
  shareId: "share-1",
  status: "fail",
};
const postDeploySummary = createPostDeploySyntheticDashboardSummary({
  history: [latestPostDeployReport],
  latestReport: latestPostDeployReport,
});

const releaseCalendar: WorkspaceReleaseCalendarReport = {
  generatedAt,
  milestones: [
    {
      actionLabel: "Repair public viewer",
      blockerCount: 1,
      completedAt: null,
      detail: "Public viewer must pass post-deploy smoke before promotion.",
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
  ],
  summary: {
    appPackageCount: 0,
    blockedCount: 1,
    desktopChannelCount: 0,
    doneCount: 0,
    dueCount: 0,
    nextMilestoneAt: "2026-05-16T13:00:00.000Z",
    postDeployCount: 1,
    reviewGateCount: 0,
    scheduledCount: 0,
    totalCount: 1,
  },
};

const releaseRunbook: WorkspaceReleaseRunbookReport = createWorkspaceReleaseRunbookReportFromRecords(
  [
    {
      attachments: [{ createdAt: "2026-05-16T11:45:00.000Z", id: "att-1", label: "Smoke log", url: "/evidence/smoke.json" }],
      auditLogHref: "/projects?workspaceId=workspace-1&auditSource=launch%3Apromotion-decision#audit",
      batchId: "batch-1",
      blockerCount: 1,
      checklistEvidence: ["Public viewer must return 200."],
      comments: [{ authorName: "Release Owner", authorUserId: "user-release", body: "Smoke failure reproduced.", createdAt: "2026-05-16T11:46:00.000Z", id: "comment-1" }],
      completedAt: null,
      detail: "Public viewer failed the latest smoke run.",
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
      transitionHistory: [
        {
          actorName: "Release Owner",
          actorUserId: "user-release",
          at: "2026-05-16T11:47:00.000Z",
          fromOwnerUserId: "user-release",
          fromStatus: "scheduled",
          id: "transition-1",
          note: "Viewer smoke failed; holding promotion.",
          toOwnerUserId: "user-release",
          toStatus: "blocked",
        },
      ],
      workspaceId,
    },
  ],
  undefined,
  generatedAt,
);

const vercelPayload = {
  deployment: { state: "ERROR", target: "production", url: "essence-spline.vercel.app" },
  project: { name: "essence-spline" },
};
const vercelRawBody = JSON.stringify(vercelPayload);
const vercelTimestamp = "2026-05-16T11:51:00.000Z";
const vercelSignature = signReleaseReadinessWebhookPayload({
  provider: "vercel",
  rawBody: vercelRawBody,
  secret: "vercel-secret",
  timestamp: vercelTimestamp,
});
const webhookHistory = createReleaseReadinessWebhookHistoryReport({
  entries: [
    createReleaseReadinessWebhookHistoryEntry({
      eventType: "deployment.error",
      headers: {
        "x-vercel-signature": vercelSignature,
        "x-vercel-timestamp": vercelTimestamp,
      },
      knownReplayKeys: [],
      payload: vercelPayload,
      provider: "vercel",
      rawBody: vercelRawBody,
      receivedAt: "2026-05-16T11:52:00.000Z",
      secrets: { vercel: "vercel-secret" },
      workspaceId,
    }),
  ],
  generatedAt,
  workspaceId,
});

const releaseReadinessWebhooks = createReleaseReadinessWebhookReportFromSources({
  emailDeliveryReport: null,
  generatedAt,
  postDeploySummary,
  releaseDeploymentChecklist: null,
  releaseOperationsDashboard: null,
  workspaceId,
});

const incidentHistory = createProjectIncidentHistory({
  now: new Date(generatedAt),
  postDeployReports: [latestPostDeployReport],
  projects: [
    {
      archivedAt: null,
      id: "project-1",
      name: "Launch scene",
      publishedAt: "2026-05-16T10:00:00.000Z",
      sceneData: { invalid: true },
      shareId: "share-1",
      shareSettings: null,
      updatedAt: "2026-05-16T11:49:00.000Z",
    },
  ],
});

const launchSignal = signal({
  domain: "launch",
  id: "launch:promotion-decision",
  label: "Launch promotion readiness",
  nextAction: "Repair public viewer smoke.",
  ownerHint: "Release owner",
  status: "blocked",
});
const executiveReleaseIntelligence: ExecutiveReleaseIntelligenceReport = {
  criticalPath: [launchSignal],
  csvContent: "",
  csvDataUri: "data:text/csv;charset=utf-8,",
  csvFileName: "executive.csv",
  executiveMemo: "Do not promote while public viewer smoke is blocked.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "executive.json",
  signals: [launchSignal],
  summary: {
    blockedCount: 1,
    costScore: 80,
    domainCoverage: ["launch"],
    evidenceScore: 80,
    executiveScore: 35,
    governanceScore: 80,
    incidentScore: 55,
    launchScore: 35,
    lowestDomain: "launch",
    readyCount: 0,
    riskScore: 55,
    signalCount: 1,
    status: "blocked",
    topAction: "Repair public viewer smoke.",
    watchCount: 0,
  },
};
const executiveActionOwnership = createExecutiveActionOwnershipMatrix({
  executiveReleaseIntelligence,
  generatedAt,
  releaseCalendar,
  releaseRunbook,
  workspaceId,
});

const timeline = createReleaseControlRoomTimeline({
  executiveActionOwnership,
  generatedAt,
  incidentHistory,
  postDeploySummary,
  releaseReadinessWebhookHistory: webhookHistory,
  releaseReadinessWebhooks,
  releaseRunbook,
  workspaceId,
});

assert.equal(timeline.summary.totalCount >= 5, true);
assert.equal(timeline.summary.blockedCount >= 4, true);
assert.equal(timeline.summary.status, "blocked");
assert.equal(timeline.rows[0]?.status, "blocked");
assert.equal(timeline.rows.some((row) => row.kind === "deploy" && row.title.includes("Post-deploy smoke")), true);
assert.equal(timeline.rows.some((row) => row.kind === "webhook" && row.title.includes("Vercel")), true);
assert.equal(timeline.rows.some((row) => row.kind === "incident" && row.projectName === "Launch scene"), true);
assert.equal(timeline.rows.some((row) => row.kind === "runbook" && row.ownerName === "Release Owner"), true);
assert.equal(timeline.rows.some((row) => row.kind === "owner-action" && row.ownerEmail === "release@example.com"), true);
assert.match(timeline.summary.nextAction, /Repair public viewer|Public viewer|promotion/i);
assert.match(timeline.csvContent, /kind,status,occurred_at,title,owner,project,next_action/);
assert.match(timeline.csvDataUri, /^data:text\/csv/);

console.log("release control-room timeline smoke passed");

import { strict as assert } from "node:assert";
import { createGovernanceTimelineReport } from "@/features/projects/governance-timeline";

const generatedAt = "2026-05-16T12:30:00.000Z";

const report = createGovernanceTimelineReport({
  auditRows: [
    {
      actorEmail: "release@example.com",
      actorName: "Release Owner",
      category: "publishing",
      description: "Public link approval was changed before release.",
      id: "audit-1",
      occurredAt: "2026-05-16T10:00:00.000Z",
      projectId: "project-1",
      projectName: "Launch scene",
      status: "danger",
      title: "Publish approval blocked",
    },
    {
      actorEmail: "ops@example.com",
      actorName: "Ops Owner",
      category: "releases",
      description: "Release evidence bundle was exported.",
      id: "audit-2",
      occurredAt: "2026-05-16T11:00:00.000Z",
      projectId: "project-1",
      projectName: "Launch scene",
      status: "success",
      title: "Evidence exported",
    },
  ],
  freeTierResourceMonitor: {
    generatedAt,
    rows: [
      {
        evidence: "Post-deploy smoke has a failed public viewer check.",
        id: "vercel-deployment",
        label: "Vercel deployment",
        nextAction: "Resolve deployment smoke before release.",
        ownerHint: "Web release owner",
        status: "blocked",
        usageLabel: "2 deployment risk signals",
        usagePercent: 50,
      },
    ],
  },
  generatedAt,
  incidentHistory: {
    generatedAt,
    incidents: [
      {
        actionLabel: "Run deploy smoke",
        id: "incident-1",
        kind: "post-deploy-failure",
        message: "Public viewer failed after deployment.",
        occurredAt: "2026-05-16T10:30:00.000Z",
        projectId: "project-1",
        projectName: "Launch scene",
        severity: "critical",
        source: "post-deploy-smoke",
        title: "Post-deploy smoke failed",
      },
    ],
  },
  postmortemReport: {
    generatedAt,
    templates: [
      {
        followUpActions: ["Attach remediation evidence", "Rerun smoke"],
        id: "postmortem-1",
        incident: {
          occurredAt: "2026-05-16T10:45:00.000Z",
          projectId: "project-1",
          projectName: "Launch scene",
          title: "Post-deploy smoke failed",
        },
        ownerHint: "Web release owner",
        readinessScore: 40,
        status: "blocked",
      },
    ],
  },
  releaseDrillHistory: {
    records: [
      {
        blockedCount: 1,
        contentHash: "sha256:test",
        createdAt: "2026-05-16T12:00:00.000Z",
        id: "drill-1",
        missingCount: 0,
        readyCount: 3,
        score: 75,
        totalCount: 4,
        watchCount: 0,
        workspaceName: "Essence Spline",
      },
    ],
  },
  sloDashboard: {
    generatedAt,
    rows: [
      {
        detail: "1 failing public surface.",
        failingCount: 1,
        id: "public-surfaces",
        label: "Public surfaces",
        lastObservedAt: "2026-05-16T11:30:00.000Z",
        nextAction: "Fix public viewer.",
        pendingCount: 0,
        sampleCount: 2,
        status: "breach",
      },
    ],
  },
});

assert.equal(report.summary.totalCount, 7);
assert.equal(report.summary.criticalCount, 6);
assert.equal(report.summary.healthyCount, 1);
assert.equal(report.summary.sourceCounts.audit, 2);
assert.equal(report.summary.sourceCounts.incident, 1);
assert.equal(report.summary.sourceCounts.postmortem, 1);
assert.equal(report.summary.sourceCounts["release-drill"], 1);
assert.equal(report.summary.sourceCounts["resource-guardrail"], 1);
assert.equal(report.summary.sourceCounts.slo, 1);
assert.ok(report.summary.correlatedCount >= 6);
assert.ok((report.events.find((event) => event.id === "incident:incident-1")?.relatedSources.length ?? 0) >= 2);

const readyReport = createGovernanceTimelineReport({
  auditRows: [],
  freeTierResourceMonitor: {
    generatedAt,
    rows: [
      {
        evidence: "No resource guardrail pressure.",
        id: "worker-queue",
        label: "Background worker queue",
        nextAction: "Keep monitoring.",
        ownerHint: "Worker owner",
        status: "ready",
        usageLabel: "0 active jobs",
        usagePercent: 0,
      },
    ],
  },
  generatedAt,
  incidentHistory: {
    generatedAt,
    incidents: [],
  },
  postmortemReport: {
    generatedAt,
    templates: [],
  },
  releaseDrillHistory: null,
  sloDashboard: {
    generatedAt,
    rows: [
      {
        detail: "Public checks are healthy.",
        failingCount: 0,
        id: "public-surfaces",
        label: "Public surfaces",
        lastObservedAt: generatedAt,
        nextAction: "Keep monitoring.",
        pendingCount: 0,
        sampleCount: 2,
        status: "healthy",
      },
    ],
  },
});

assert.equal(readyReport.summary.totalCount, 2);
assert.equal(readyReport.summary.timelineScore, 100);
assert.equal(readyReport.summary.criticalCount, 0);

console.log("governance timeline smoke passed");

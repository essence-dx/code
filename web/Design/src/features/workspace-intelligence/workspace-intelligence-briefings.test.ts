import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createWorkspaceIntelligenceBriefingCenter } from "@/features/workspace-intelligence/workspace-intelligence-briefings";

describe("workspace intelligence briefings", () => {
  test("creates executive summaries, anomaly explanations, recommended actions, and scheduled digest packets", () => {
    const center = createWorkspaceIntelligenceBriefingCenter({
      workspaceName: "Essence Studio",
      publishing: {
        status: "blocked",
        score: 58,
        totals: {
          channels: 4,
          planned: 9,
          published: 2,
          deliverables: 15,
          views: 1200,
          clicks: 90,
          submissions: 0,
        },
        nextActions: ["Website channel: repair domain verification."],
      },
      contentOperations: {
        status: "blocked",
        score: 54,
        totals: {
          campaigns: 2,
          deliverables: 10,
          scheduledItems: 4,
          capacityPlans: 2,
          dependencyHeatmapCells: 5,
          staffingSignals: 3,
          recoveryPlaybooks: 1,
          blockedCampaigns: 1,
          teamMembers: 2,
          publicationGaps: 6,
        },
        nextActions: [
          "Spring launch: schedule 6 content deliverables across the next 3 days.",
        ],
      },
      performance: {
        status: "review",
        score: 72,
        totals: {
          projects: 8,
          documentBudgets: 8,
          slowSurfaceDiagnostics: 3,
          recoveryRecommendations: 2,
          telemetryPackets: 1,
          blockedProjects: 0,
          totalAssetBytes: 24_000_000,
        },
        nextActions: ["Compress oversized project assets before export."],
      },
      releaseGovernance: {
        status: "review",
        score: 68,
        totals: {
          tokenMigrationPlans: 2,
          componentAdoptionGates: 4,
          breakingChangePreviews: 2,
          downstreamImpactPackets: 1,
          affectedProjects: 5,
          publicSurfaces: 2,
          blockedGates: 0,
          reviewGates: 3,
          readyGates: 1,
        },
        nextActions: ["Review token migration plans before stable release."],
      },
      observability: {
        status: "critical",
        score: 52,
        checkedAt: "2026-05-19T09:00:00.000Z",
        totals: {
          incidents: 3,
          critical: 1,
          watch: 2,
        },
        groups: [
          {
            id: "exports",
            title: "Export reliability",
            description: "Failed export jobs.",
            status: "critical",
            score: 42,
            incidents: [
              {
                id: "export-failed-1",
                title: "Failed export: Spring deck",
                detail: "PDF render failed before handoff.",
                status: "critical",
                metric: "PDF",
                href: "/editor/project-spring",
              },
            ],
          },
        ],
      },
      notificationRouting: {
        status: "review",
        score: 74,
        totals: {
          notifications: 7,
          unread: 5,
          subscribedTopics: 4,
          activeImmediateRoutes: 2,
          deferredRoutes: 2,
          failedChannels: 1,
        },
        digestPreview: {
          enabled: true,
          scheduledFor: "2026-05-20T09:00:00.000Z",
          cadence: "daily",
          totalUnread: 5,
          topicCounts: {
            review: 2,
            publishing: 1,
            automation: 1,
            team: 1,
            security: 0,
            general: 0,
          },
          items: [
            {
              id: "notification-review",
              topic: "review",
              title: "Approval due",
              body: "Review the Spring launch deliverable.",
              targetHref: "/designs",
              createdAt: "2026-05-19T08:00:00.000Z",
            },
          ],
        },
        nextActions: ["Reconnect Slack routing before the morning digest."],
      },
      auditLogs: [
        {
          id: "audit-1",
          actorEmail: "ops@example.com",
          action: "content.schedule.failed",
          targetType: "campaign",
          targetId: "campaign-spring",
          summary: "Campaign scheduling failed.",
          metadata: {},
          createdAt: "2026-05-19T08:30:00.000Z",
        },
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.executiveSummaries, 5);
    assert.equal(center.totals.anomalyExplanations, 5);
    assert.equal(center.totals.recommendedActions, 6);
    assert.equal(center.totals.digestPackets, 2);
    assert.equal(center.totals.criticalAnomalies, 3);

    assert.equal(center.executiveSummaries[0]?.area, "observability");
    assert.ok(center.executiveNarrative.includes("Essence Studio"));
    assert.ok(center.executiveNarrative.includes("blocked"));

    const contentAnomaly = center.anomalyExplanations.find(
      (anomaly) => anomaly.area === "content-operations",
    );
    assert.equal(contentAnomaly?.severity, "critical");
    assert.ok(contentAnomaly?.explanation.includes("6 publication gaps"));
    assert.ok(
      contentAnomaly?.evidence.some((item) => item.includes("2 campaigns")),
    );

    assert.equal(center.recommendedActions[0]?.priority, "critical");
    assert.ok(
      center.recommendedActions.some((action) =>
        action.title.includes("Spring launch"),
      ),
    );

    const executivePacket = center.digestPackets.find(
      (packet) => packet.cadence === "daily",
    );
    assert.equal(executivePacket?.scheduledFor, "2026-05-20T09:00:00.000Z");
    assert.ok(executivePacket?.topics.includes("review"));

    const packet = decodePacket(executivePacket?.dataUrl ?? "");
    assert.equal(packet.kind, "essence-studio.workspace-intelligence-briefing");
    assert.equal(packet.workspaceName, "Essence Studio");
    assert.equal(packet.anomalyExplanations.length, 5);
    assert.equal(packet.recommendedActions.length, 6);
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    workspaceName: string;
    anomalyExplanations: unknown[];
    recommendedActions: unknown[];
  };
}

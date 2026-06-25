import { strict as assert } from "node:assert";
import {
  createBoardAssuranceNotificationDeliveryHistoryReport,
  createBoardAssuranceNotificationDeliveryRecord,
  getBoardAssuranceNotificationDeliveryDownload,
  type BoardAssuranceNotificationRetryEvidence,
} from "@/features/projects/board-assurance-notification-history";
import type { BoardAssuranceNotificationRoutingReport } from "@/features/projects/board-assurance-notification-routing";

const generatedAt = "2026-01-15T12:00:00.000Z";

const ownerInAppDedupeKey = "workspace-1:user-owner:board-assurance:replay:incident-1:in-app";
const ownerEmailDedupeKey = "workspace-1:user-owner:board-assurance:replay:incident-1:email";
const adminInAppDedupeKey = "workspace-1:user-admin:board-assurance:evidence:bundle-1:in-app";

function route(overrides: Partial<BoardAssuranceNotificationRoutingReport["routes"][number]>): BoardAssuranceNotificationRoutingReport["routes"][number] {
  return {
    candidateId: "board-assurance:replay:incident-1",
    channel: "in-app",
    dedupeKey: ownerInAppDedupeKey,
    reason: "owner receives release routing",
    recipientEmail: "owner@example.com",
    recipientName: "Owner",
    recipientRole: "owner",
    status: "eligible",
    topic: "release",
    userId: "user-owner",
    ...overrides,
  };
}

function report(routes: BoardAssuranceNotificationRoutingReport["routes"]): BoardAssuranceNotificationRoutingReport {
  const eligibleRoutes = routes.filter((entry) => entry.status === "eligible");

  return {
    csvContent: "notification_id,kind,severity,topic,title,eligible_routes,next_action\n",
    csvDataUri: "data:text/csv;charset=utf-8,notification_id",
    csvFileName: "routing.csv",
    generatedAt,
    notifications: [
      {
        actionLabel: "Route critical board assurance notifications.",
        detail: "Replay blocker needs owner routing.",
        id: "board-assurance:replay:incident-1",
        kind: "replay-blocker",
        severity: "critical",
        sourceId: "incident-1",
        title: "Viewer smoke failed replay blocked",
        topic: "release",
      },
    ],
    routes,
    summary: {
      criticalCount: 1,
      eligibleRouteCount: eligibleRoutes.length,
      emailEligibleCount: eligibleRoutes.filter((entry) => entry.channel === "email").length,
      inAppEligibleCount: eligibleRoutes.filter((entry) => entry.channel === "in-app").length,
      nextAction: "Route critical board assurance notifications before release closure.",
      notificationCount: 1,
      routeCount: routes.length,
      routingScore: Math.round((eligibleRoutes.length / routes.length) * 100),
      status: "critical",
      suppressedByPreferenceCount: routes.filter((entry) => entry.status === "suppressed-by-preference").length,
      suppressedByRoleCount: routes.filter((entry) => entry.status === "suppressed-by-role").length,
      warningCount: 0,
    },
    workspaceId: "workspace-1",
  };
}

const actor = {
  email: "board@example.com",
  name: "Board Secretary",
  userId: "user-board",
};

const firstReport = report([
  route({ channel: "in-app", dedupeKey: ownerInAppDedupeKey }),
  route({ channel: "email", dedupeKey: ownerEmailDedupeKey }),
]);

const firstRecord = createBoardAssuranceNotificationDeliveryRecord({
  acknowledgedRouteDedupeKeys: [ownerInAppDedupeKey],
  actor,
  createdAt: "2026-01-15T12:15:00.000Z",
  id: "routing-history-old",
  report: firstReport,
  workspaceId: "workspace-1",
});

const retryEvidence: BoardAssuranceNotificationRetryEvidence = {
  attemptCount: 2,
  lastAttemptAt: "2026-01-15T12:20:00.000Z",
  lastError: "Brevo temporary reject",
  nextAttemptAt: "2026-01-15T12:30:00.000Z",
  providerMessageId: null,
};

const secondReport = report([
  route({ channel: "in-app", dedupeKey: ownerInAppDedupeKey }),
  route({ channel: "email", dedupeKey: ownerEmailDedupeKey }),
  route({
    candidateId: "board-assurance:evidence:bundle-1",
    channel: "in-app",
    dedupeKey: adminInAppDedupeKey,
    recipientEmail: "admin@example.com",
    recipientName: "Admin",
    recipientRole: "admin",
    userId: "user-admin",
  }),
  route({
    channel: "email",
    dedupeKey: "workspace-1:user-editor:board-assurance:replay:incident-1:email",
    recipientEmail: "editor@example.com",
    recipientName: "Editor",
    recipientRole: "editor",
    status: "suppressed-by-role",
    userId: "user-editor",
  }),
]);

const secondRecord = createBoardAssuranceNotificationDeliveryRecord({
  actor,
  createdAt: "2026-01-15T12:45:00.000Z",
  existingRecords: [firstRecord],
  id: "routing-history-new",
  report: secondReport,
  retryEvidenceByDedupeKey: new Map([[ownerEmailDedupeKey, retryEvidence]]),
  workspaceId: "workspace-1",
});
const history = createBoardAssuranceNotificationDeliveryHistoryReport([firstRecord, secondRecord]);
const jsonDownload = getBoardAssuranceNotificationDeliveryDownload(secondRecord, "json");
const csvDownload = getBoardAssuranceNotificationDeliveryDownload(secondRecord, "csv");

assert.match(secondRecord.contentHash, /^sha256:/);
assert.equal(secondRecord.routeCount, 4);
assert.equal(secondRecord.eligibleRouteCount, 3);
assert.equal(secondRecord.acknowledgedRouteCount, 1);
assert.equal(secondRecord.pendingAcknowledgementCount, 1);
assert.equal(secondRecord.retryNeededCount, 1);
assert.equal(secondRecord.changedRouteCount, 1);
assert.equal(secondRecord.newRouteCount, 2);
assert.equal(secondRecord.removedRouteCount, 0);
assert.equal(secondRecord.routes.find((entry) => entry.route.dedupeKey === ownerInAppDedupeKey)?.acknowledgementState, "acknowledged");
assert.equal(secondRecord.routes.find((entry) => entry.route.dedupeKey === ownerEmailDedupeKey)?.deliveryState, "retry-needed");
assert.equal(secondRecord.routes.find((entry) => entry.route.dedupeKey === adminInAppDedupeKey)?.acknowledgementState, "pending");
assert.equal(history.records[0]?.id, "routing-history-new");
assert.equal(history.summary.totalRecordCount, 2);
assert.equal(history.summary.latestRetryNeededCount, 1);
assert.equal(history.summary.pendingAcknowledgementCount, 1);
assert.equal(history.summary.routeDelta, 2);
assert.match(history.csvContent, /created_at,status,notifications,routes,eligible_routes,pending_acknowledgements,retry_needed,changed_routes,removed_routes,content_hash/);
assert.match(history.csvDataUri, /^data:text\/csv/);
assert.equal(jsonDownload.mimeType, "application/json;charset=utf-8");
assert.equal(csvDownload.mimeType, "text/csv;charset=utf-8");
assert.match(jsonDownload.body, /"pendingAcknowledgementCount": 1/);
assert.match(csvDownload.body, /Brevo temporary reject/);

console.log("board assurance notification history smoke passed");

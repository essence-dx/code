import { strict as assert } from "node:assert";
import {
  canWorkspaceRoleReceiveNotificationTopic,
  createWorkspaceNotificationEmailDeliveryReport,
  createWorkspaceNotificationEmailPlan,
  summarizeWorkspaceNotificationEmailDeliveries,
  type WorkspaceNotificationEmailDeliveryRow,
} from "@/features/workspaces/notification-email-delivery";
import type { ProjectCollaborationInbox } from "@/features/projects/project-collaboration-inbox";
import { summarizeProjectCollaborationInbox } from "@/features/projects/project-collaboration-inbox";
import type { ProjectHealthNotificationCenter } from "@/features/projects/project-health-notifications";
import { summarizeProjectHealthNotifications } from "@/features/projects/project-health-notifications";

const generatedAt = "2026-05-16T16:00:00.000Z";
const inbox: ProjectCollaborationInbox = {
  generatedAt,
  notifications: [
    {
      actionLabel: "Open comment",
      count: 1,
      id: "project-1:mention",
      kind: "mention",
      message: "One open comment mentions you.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "urgent",
      title: "Mentioned in comments",
      updatedAt: generatedAt,
    },
    {
      actionLabel: "Review request",
      count: 1,
      id: "project-1:review-request",
      kind: "review-request",
      message: "Public link is waiting for approval.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "warning",
      title: "Review requested",
      updatedAt: generatedAt,
    },
  ],
  summary: summarizeProjectCollaborationInbox([]),
};
inbox.summary = summarizeProjectCollaborationInbox(inbox.notifications);

const healthCenter: ProjectHealthNotificationCenter = {
  generatedAt,
  notifications: [
    {
      actionLabel: "Prepare release",
      count: 1,
      id: "project-1:release-readiness",
      kind: "release-readiness",
      message: "Desktop release must be approved.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "warning",
      title: "Release readiness blocked",
      updatedAt: generatedAt,
    },
    {
      actionLabel: "Check export readiness",
      count: 1,
      id: "project-1:failed-export",
      kind: "failed-export",
      message: "GLB needs export review.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "critical",
      title: "Export failed",
      updatedAt: generatedAt,
    },
  ],
  summary: summarizeProjectHealthNotifications([]),
};
healthCenter.summary = summarizeProjectHealthNotifications(healthCenter.notifications);

const preferencesByUserId = new Map([
  [
    "owner-1",
    [
      { emailEnabled: true, inAppEnabled: true, topic: "inbox" as const },
      { emailEnabled: true, inAppEnabled: true, topic: "health" as const },
      { emailEnabled: true, inAppEnabled: true, topic: "review" as const },
      { emailEnabled: true, inAppEnabled: true, topic: "release" as const },
    ],
  ],
  [
    "viewer-1",
    [
      { emailEnabled: true, inAppEnabled: true, topic: "inbox" as const },
      { emailEnabled: true, inAppEnabled: true, topic: "release" as const },
    ],
  ],
  ["editor-1", [{ emailEnabled: true, inAppEnabled: true, topic: "health" as const }]],
]);

const plan = createWorkspaceNotificationEmailPlan({
  healthCenter,
  inbox,
  members: [
    { email: "owner@mail.com", name: "Owner", role: "owner", userId: "owner-1" },
    { email: "viewer@mail.com", name: "Viewer", role: "viewer", userId: "viewer-1" },
    { email: "editor@mail.com", name: "Editor", role: "editor", userId: "editor-1" },
  ],
  preferencesByUserId,
  workspaceId: "workspace-1",
});

assert.equal(canWorkspaceRoleReceiveNotificationTopic("viewer", "release"), false);
assert.equal(canWorkspaceRoleReceiveNotificationTopic("editor", "review"), true);
assert.equal(plan.summary.candidateCount, 4);
assert.equal(plan.jobs.length, 6);
assert.equal(plan.jobs.filter((job) => job.recipientRole === "owner").length, 4);
assert.equal(plan.jobs.filter((job) => job.recipientRole === "viewer").length, 1);
assert.equal(plan.jobs.filter((job) => job.recipientRole === "editor").length, 1);
assert.ok(plan.jobs.some((job) => job.dedupeKey === "workspace-1:owner-1:project-health:project-1:release-readiness"));

const jobRows: WorkspaceNotificationEmailDeliveryRow[] = plan.jobs.slice(0, 3).map((job, index) => ({
  attempts: index,
  createdAt: generatedAt,
  id: `job-${index}`,
  lastError: index === 2 ? "Transient provider error" : null,
  nextAttemptAt: index === 2 ? generatedAt : null,
  notificationId: job.notificationId,
  projectId: job.projectId,
  recipientEmail: job.recipientEmail,
  recipientName: job.recipientName,
  recipientRole: job.recipientRole,
  sentAt: index === 0 ? generatedAt : null,
  source: job.source,
  status: index === 0 ? "sent" : index === 2 ? "failed" : "pending",
  subject: job.subject,
  topic: job.topic,
  updatedAt: generatedAt,
}));
const summary = summarizeWorkspaceNotificationEmailDeliveries(jobRows);
const report = createWorkspaceNotificationEmailDeliveryReport({
  attempts: [
    {
      attemptNumber: 1,
      attemptedAt: generatedAt,
      deliveryId: "job-2",
      error: "Transient provider error",
      id: "attempt-1",
      providerMessageId: null,
      status: "failed",
    },
  ],
  jobs: jobRows,
  now: new Date(generatedAt),
});

assert.equal(summary.sentCount, 1);
assert.equal(summary.pendingCount, 1);
assert.equal(summary.failedCount, 1);
assert.equal(report.attempts[0]?.status, "failed");

console.log("workspace notification email delivery smoke passed");

import { strict as assert } from "node:assert";
import { createRoleAccessReviewCampaignReport } from "@/features/projects/role-access-review-campaigns";
import {
  createRoleAccessReviewAttestationRows,
  createRoleAccessReviewHistoryReport,
  createRoleAccessReviewReminderDeliveryRows,
} from "@/features/projects/role-access-review-history";

const campaign = createRoleAccessReviewCampaignReport({
  activeSessionsByUserId: {
    "user-owner": 1,
    "user-viewer": 1,
  },
  folderAccessGrants: [
    {
      folderId: "folder-launch",
      role: "viewer",
      userId: "user-viewer",
    },
    {
      folderId: "folder-ops",
      role: "admin",
      userId: "user-editor",
    },
  ],
  generatedAt: "2026-05-16T20:00:00.000Z",
  members: [
    {
      email: "owner@mail.com",
      id: "member-owner",
      joinedAt: "2026-05-01T00:00:00.000Z",
      name: "Owner User",
      role: "owner",
      userId: "user-owner",
    },
    {
      email: "admin@mail.com",
      id: "member-admin",
      joinedAt: "2026-05-02T00:00:00.000Z",
      name: "Admin User",
      role: "admin",
      userId: "user-admin",
    },
    {
      email: "editor@mail.com",
      id: "member-editor",
      joinedAt: "2026-05-03T00:00:00.000Z",
      name: "Editor User",
      role: "editor",
      userId: "user-editor",
    },
    {
      email: "viewer@mail.com",
      id: "member-viewer",
      joinedAt: "2026-05-04T00:00:00.000Z",
      name: "Viewer User",
      role: "viewer",
      userId: "user-viewer",
    },
  ],
  projectAccessGrants: [
    {
      projectId: "project-launch",
      role: "admin",
      userId: "user-admin",
    },
    {
      projectId: "project-site",
      role: "editor",
      userId: "user-editor",
    },
  ],
  projects: [
    {
      archivedAt: null,
      folderId: "folder-launch",
      id: "project-launch",
      name: "Launch scene",
      updatedAt: "2026-05-10T00:00:00.000Z",
      userId: "user-owner",
    },
    {
      archivedAt: null,
      folderId: "folder-ops",
      id: "project-site",
      name: "Website scene",
      updatedAt: "2026-05-11T00:00:00.000Z",
      userId: "user-editor",
    },
  ],
  workspace: {
    id: "workspace-1",
    name: "Essence workspace",
  },
});

const actor = {
  email: "security@mail.com",
  name: "Security Owner",
  userId: "user-security",
};

const attestations = createRoleAccessReviewAttestationRows({
  actor,
  campaign,
  note: "Owner reviewed current launch access.",
  now: "2026-05-16T21:00:00.000Z",
  statusesByMemberId: {
    "member-owner": "approved",
    "member-editor": "approved",
  },
});
const reminders = createRoleAccessReviewReminderDeliveryRows({
  actor,
  campaign,
  now: "2026-05-16T21:05:00.000Z",
});
const adminReminder = reminders.find((row) => row.recipientEmail === "admin@mail.com");

assert.ok(adminReminder);

const history = createRoleAccessReviewHistoryReport({
  attestations,
  campaign,
  reminders: [
    ...reminders,
    {
      ...adminReminder,
      error: "Brevo recipient rejected",
      id: "failed-reminder",
      providerMessageId: null,
      status: "failed",
    },
  ],
});

assert.match(campaign.campaignId, /^rar_/);
assert.equal(attestations.length, 2);
assert.equal(attestations[0]?.campaignId, campaign.campaignId);
assert.equal(attestations[0]?.scopeHash, campaign.scopeHash);
assert.equal(reminders.length, 2);
assert.ok(reminders.every((row) => row.dedupeKey.includes(campaign.campaignId)));
assert.equal(history.summary.persistedAttestationCount, 2);
assert.equal(history.summary.approvedAttestationCount, 2);
assert.equal(history.summary.pendingAttestationCount, 1);
assert.equal(history.summary.reminderDeliveryCount, 3);
assert.equal(history.summary.failedReminderCount, 1);
assert.equal(history.summary.latestReminderAt, "2026-05-16T21:05:00.000Z");
assert.equal(history.rows.find((row) => row.memberEmail === "admin@mail.com")?.latestReminderStatus, "failed");
assert.equal(history.rows.find((row) => row.memberEmail === "editor@mail.com")?.latestAttestationStatus, "approved");
assert.match(history.csvContent, /member_email,workspace_role,current_status,persisted_attestation,latest_reminder/);
assert.match(history.csvContent, /admin@mail.com,admin,reminder-due,pending,failed/);

console.log("role access review history smoke passed");

import { strict as assert } from "node:assert";
import { createRoleAccessReviewCampaignReport, createRoleAccessReviewCampaignCsv } from "@/features/projects/role-access-review-campaigns";

const generatedAt = "2026-05-16T20:00:00.000Z";

const report = createRoleAccessReviewCampaignReport({
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
  generatedAt,
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
    {
      archivedAt: "2026-05-12T00:00:00.000Z",
      folderId: null,
      id: "project-archived",
      name: "Archived scene",
      updatedAt: "2026-05-12T00:00:00.000Z",
      userId: "user-admin",
    },
  ],
  workspace: {
    id: "workspace-1",
    name: "Essence workspace",
  },
});

assert.equal(report.summary.memberCount, 4);
assert.equal(report.summary.directProjectGrantCount, 2);
assert.equal(report.summary.folderGrantCount, 2);
assert.equal(report.summary.attestationRequiredCount, 3);
assert.equal(report.summary.reminderDueCount, 2);
assert.equal(report.summary.worstStatus, "blocked");
assert.ok(report.summary.campaignScore < 70);
assert.equal(report.rows.find((row) => row.memberEmail === "viewer@mail.com")?.attestationStatus, "approved");
assert.equal(report.rows.find((row) => row.memberEmail === "admin@mail.com")?.attestationStatus, "reminder-due");
assert.equal(report.rows.find((row) => row.memberEmail === "editor@mail.com")?.privilegedGrantCount, 1);
assert.match(report.rows.find((row) => row.memberEmail === "editor@mail.com")?.grantEvidence ?? "", /1 direct project grant/);
assert.match(report.csvContent, /member_email,workspace_role/);
assert.match(report.csvContent, /editor@mail.com,editor/);

const csv = createRoleAccessReviewCampaignCsv(report);

assert.equal(csv, report.csvContent);
assert.equal(report.csvFileName, "workspace-1-role-access-review.csv");

console.log("role access review campaigns smoke passed");

import assert from "node:assert/strict";
import {
  auditLogsToCsv,
  createAuditActivityReview,
  createReportFileName,
  workbookAccessReportToCsv,
} from "@/features/audit/audit-report-export";
import type { AuditLogRow } from "@/features/audit/audit-log-service";

const auditLogs: AuditLogRow[] = [
  {
    id: "audit-1",
    action: "workbook.exported",
    actorEmail: "owner@example.com",
    category: "export",
    createdAt: "2026-05-16T01:00:00.000Z",
    metadata: { format: "xlsx", note: "quoted, value" },
    summary: "Workbook exported.",
    targetUserId: null,
    targetWorkbookId: "workbook-1",
  },
  {
    id: "audit-2",
    action: "workbook.share_link_created",
    actorEmail: "owner@example.com",
    category: "workbook",
    createdAt: "2026-05-16T01:05:00.000Z",
    metadata: { role: "viewer" },
    summary: "Workbook share link created.",
    targetUserId: null,
    targetWorkbookId: "workbook-1",
  },
  {
    id: "audit-3",
    action: "auth.sign_in",
    actorEmail: "reader@example.com",
    category: "auth",
    createdAt: "2026-05-16T01:07:00.000Z",
    metadata: {},
    summary: "User signed in.",
    targetUserId: "user-2",
    targetWorkbookId: null,
  },
];

const auditCsv = auditLogsToCsv(auditLogs);

assert.match(auditCsv, /^created_at,category,action,summary/);
assert.match(auditCsv, /"format=xlsx; note=quoted, value"/);

const review = createAuditActivityReview(auditLogs);

assert.equal(review.total, 3);
assert.equal(review.latestAt, "2026-05-16T01:07:00.000Z");
assert.equal(review.actorCounts[0]?.actorEmail, "owner@example.com");
assert.equal(review.actorCounts[0]?.count, 2);
assert.equal(review.categoryCounts[0]?.count, 1);

const accessCsv = workbookAccessReportToCsv({
  accessRole: "owner",
  ownerEmail: "owner@example.com",
  sharing: {
    collaborators: [
      {
        id: "collab-1",
        createdAt: new Date("2026-05-15T10:00:00.000Z"),
        email: "editor@example.com",
        name: "Editor",
        role: "editor",
        status: "accepted",
        updatedAt: new Date("2026-05-15T11:00:00.000Z"),
      },
    ],
    links: [
      {
        id: "link-1",
        active: true,
        createdAt: new Date("2026-05-15T12:00:00.000Z"),
        expiresAt: null,
        role: "viewer",
        token: "super-secret-token-value",
      },
    ],
  },
  workbookId: "workbook-1",
  workbookName: "Finance Plan",
});

assert.match(accessCsv, /owner@example.com,owner,current user owner/);
assert.match(accessCsv, /editor@example.com,editor,accepted/);
assert.match(accessCsv, /super-se\.\.\./);
assert.doesNotMatch(accessCsv, /super-secret-token-value/);

assert.equal(
  createReportFileName({
    extension: "csv",
    prefix: "Finance Plan Audit",
    timestamp: new Date("2026-05-16T00:00:00.000Z"),
  }),
  "finance-plan-audit-2026-05-16.csv",
);

console.log("Audit report export checks passed.");

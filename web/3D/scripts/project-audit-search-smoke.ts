import { strict as assert } from "node:assert";
import {
  createDefaultProjectAuditSearchFilters,
  createProjectAuditCsv,
  createProjectAuditExportPayload,
  createProjectAuditSearchResult,
  createProjectAuditSearchRows,
  projectAuditExportPresets,
} from "@/features/projects/project-audit-search";
import type { ProjectAuditLog } from "@/features/projects/types";

const launchAuditLog: ProjectAuditLog = {
  events: [
    {
      actorEmail: "lead@example.com",
      actorName: "Launch Lead",
      category: "permissions",
      description: "Launch Lead received admin access.",
      id: "access:1:created",
      occurredAt: "2026-05-16T09:00:00.000Z",
      status: "success",
      title: "Access granted",
    },
    {
      category: "exports",
      description: "GLB needs texture review before handoff.",
      id: "export:glb:warning",
      occurredAt: "2026-05-16T10:00:00.000Z",
      status: "warning",
      title: "Export review needed",
    },
    {
      category: "releases",
      description: "Desktop release was rejected by review gate.",
      id: "release:desktop:blocked",
      occurredAt: "2026-05-16T11:00:00.000Z",
      status: "danger",
      title: "Release blocked",
    },
  ],
  summary: {
    comments: 0,
    exports: 1,
    permissions: 1,
    publishing: 0,
    releases: 1,
    total: 3,
    versions: 0,
  },
};

const websiteAuditLog: ProjectAuditLog = {
  events: [
    {
      actorEmail: "reviewer@example.com",
      actorName: "Reviewer",
      category: "comments",
      description: "Project comment was resolved.",
      id: "comment:1:resolved",
      occurredAt: "2026-05-15T08:30:00.000Z",
      status: "success",
      title: "Comment resolved",
    },
  ],
  summary: {
    comments: 1,
    exports: 0,
    permissions: 0,
    publishing: 0,
    releases: 0,
    total: 1,
    versions: 0,
  },
};

const rows = createProjectAuditSearchRows([
  { auditLog: launchAuditLog, id: "project-1", name: "Launch scene" },
  { auditLog: websiteAuditLog, id: "project-2", name: "Website scene" },
]);

const blockedResult = createProjectAuditSearchResult(
  rows,
  createDefaultProjectAuditSearchFilters({
    statuses: ["danger", "warning"],
  }),
);

assert.equal(rows[0].title, "Release blocked");
assert.equal(blockedResult.summary.total, 2);
assert.equal(blockedResult.summary.projectCount, 1);
assert.equal(blockedResult.summary.statusCounts.danger, 1);
assert.equal(blockedResult.summary.categoryCounts.exports, 1);

const permissionResult = createProjectAuditSearchResult(
  rows,
  createDefaultProjectAuditSearchFilters({
    categories: ["permissions"],
    query: "Launch Lead",
  }),
);

assert.equal(permissionResult.summary.total, 1);
assert.equal(permissionResult.rows[0].actorEmail, "lead@example.com");

const dateResult = createProjectAuditSearchResult(
  rows,
  createDefaultProjectAuditSearchFilters({
    from: "2026-05-16",
    to: "2026-05-16",
  }),
);

assert.equal(dateResult.summary.total, 3);
assert.ok(projectAuditExportPresets.some((preset) => preset.id === "compliance-review-json" && preset.format === "json"));
assert.ok(projectAuditExportPresets.some((preset) => preset.id === "permissions-csv" && preset.filters.categories.includes("permissions")));

const payload = createProjectAuditExportPayload(rows, projectAuditExportPresets[0].filters, new Date("2026-05-16T12:00:00.000Z"));
const csv = createProjectAuditCsv(permissionResult.rows);

assert.equal(payload.schemaVersion, 1);
assert.equal(payload.summary.total, 2);
assert.equal(payload.generatedAt, "2026-05-16T12:00:00.000Z");
assert.ok(csv.includes("projectName,projectId,occurredAt,status,category,title,description"));
assert.ok(csv.includes("Launch scene"));

console.log("project audit search smoke passed");

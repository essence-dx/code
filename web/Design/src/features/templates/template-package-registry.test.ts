import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createTemplatePackageRegistry } from "@/features/templates/template-package-registry";

describe("template package registry", () => {
  test("creates installable packages with semantic versions and rollback coverage", () => {
    const template = createTemplate({
      id: "template-launch",
      name: "Launch Kit",
      marketplaceUseCount: 6,
      marketplaceViewCount: 20,
      updatedAt: "2026-05-16T10:00:00.000Z",
      marketplacePublishedAt: "2026-05-16T10:00:00.000Z",
    });
    const project = createProject({
      id: "project-launch",
      name: "Launch Kit Instagram",
      width: template.width,
      height: template.height,
      approvalStatus: "approved",
    });
    const registry = createTemplatePackageRegistry({
      templates: [template],
      projects: [project],
      projectVersions: [
        createVersion({
          projectId: project.id,
          createdAt: "2026-05-16T10:05:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          targetId: template.id,
          summary: "Launch Kit package reviewed for publish.",
        }),
      ],
    });

    assert.equal(registry.status, "ready");
    assert.equal(registry.totals.installablePackages, 1);
    assert.equal(registry.totals.rollbackReadyPackages, 1);
    assert.equal(registry.totals.dependencyLinks, 1);
    assert.equal(registry.dependencyViews[0]?.status, "ready");
    assert.match(registry.packages[0]?.version ?? "", /^1\.\d+\.\d+$/);
    assert.ok(registry.changelog.length >= 3);
    assert.equal(registry.nextActions.length, 0);
  });

  test("blocks draft packages when dependent projects have no snapshots", () => {
    const registry = createTemplatePackageRegistry({
      templates: [
        createTemplate({
          id: "template-draft",
          name: "Draft social kit",
          approvalStatus: "draft",
          marketplaceStatus: "draft",
          marketplacePublishedAt: null,
        }),
      ],
      projects: [
        createProject({
          id: "project-draft",
          name: "Draft social kit campaign",
          approvalStatus: "changes-requested",
        }),
      ],
      projectVersions: [],
      auditLogs: [],
    });

    assert.equal(registry.status, "blocked");
    assert.equal(registry.totals.installablePackages, 0);
    assert.equal(registry.totals.updateChecks, 1);
    assert.equal(registry.totals.rollbackReadyPackages, 0);
    assert.ok(registry.nextActions.length > 0);
    assert.equal(registry.packages[0]?.checks[0]?.status, "blocked");
    assert.equal(registry.dependencyViews[0]?.status, "blocked");
  });
});

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch kit",
    creatorName: "Essence",
    creatorEmail: "admin@mail.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "social",
    marketplaceSeason: "Evergreen",
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-16T10:00:00.000Z",
    marketplaceUseCount: 3,
    marketplaceViewCount: 12,
    createdAt: "2026-05-15T10:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch kit campaign",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T10:00:00.000Z",
    createdAt: "2026-05-15T10:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Package restore point",
    thumbnail: null,
    createdAt: "2026-05-16T10:05:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "template.marketplace.updated",
    targetType: "template",
    targetId: "template-1",
    summary: "Template package updated.",
    actorEmail: "admin@mail.com",
    metadata: {},
    createdAt: "2026-05-16T10:02:00.000Z",
    ...overrides,
  };
}

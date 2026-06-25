import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createTemplateDesignReleaseChannelsCenter } from "@/features/templates/template-design-release-channels";

describe("template and design release channels", () => {
  test("creates staged channels with deprecation, migration, dependency impact, and rollback packets", () => {
    const stableTemplate = createTemplate({
      id: "template-stable",
      name: "Launch Announcement Kit",
      marketplaceStatus: "published",
      marketplaceCollection: "social",
      marketplacePublishedAt: "2026-05-10T10:00:00.000Z",
      updatedAt: "2026-05-10T10:00:00.000Z",
    });
    const betaTemplate = createTemplate({
      id: "template-beta",
      name: "Launch Announcement Kit Refresh",
      marketplaceStatus: "published",
      marketplaceCollection: "social",
      marketplacePublishedAt: "2026-05-10T10:00:00.000Z",
      updatedAt: "2026-05-18T08:00:00.000Z",
    });
    const archivedTemplate = createTemplate({
      id: "template-legacy",
      name: "Old Launch Announcement Kit",
      marketplaceStatus: "archived",
      marketplaceCollection: "social",
      marketplacePublishedAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-05-01T10:00:00.000Z",
      marketplaceUseCount: 11,
    });
    const stableProject = createProject({
      id: "project-stable",
      name: "Launch Announcement Kit Social",
      sourceProjectId: stableTemplate.id,
      publicShareId: "public-stable",
    });
    const legacyProject = createProject({
      id: "project-legacy",
      name: "Old Launch Announcement Kit Social",
      sourceProjectId: archivedTemplate.id,
    });

    const center = createTemplateDesignReleaseChannelsCenter({
      templates: [stableTemplate, betaTemplate, archivedTemplate],
      projects: [stableProject, legacyProject],
      projectVersions: [
        createVersion({
          id: "version-stable",
          projectId: stableProject.id,
          createdAt: "2026-05-18T07:45:00.000Z",
        }),
        createVersion({
          id: "version-legacy",
          projectId: legacyProject.id,
          createdAt: "2026-05-17T07:45:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          targetId: stableTemplate.id,
          summary: "Launch Announcement Kit reviewed for release.",
        }),
      ],
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "review");
    assert.equal(center.totals.templates, 3);
    assert.equal(center.totals.channels, 3);
    assert.equal(center.totals.deprecationNotices, 1);
    assert.equal(center.totals.migrationSuggestions, 1);
    assert.equal(center.totals.rollbackSafePackets, 3);

    const stableEntry = center.releaseEntries.find(
      (entry) => entry.templateId === stableTemplate.id,
    );
    assert.equal(stableEntry?.channelId, "stable");
    assert.equal(stableEntry?.rolloutPercent, 100);
    assert.equal(stableEntry?.dependencyImpact.affectedProjects, 1);
    assert.equal(stableEntry?.dependencyImpact.restorableProjects, 1);
    assert.equal(stableEntry?.dependencyImpact.publicSurfaces, 1);
    assert.equal(stableEntry?.rollbackPacket.status, "ready");
    assert.ok(
      stableEntry?.rollbackPacket.steps.some((step) =>
        step.toLowerCase().includes("pin"),
      ),
    );

    const betaEntry = center.releaseEntries.find(
      (entry) => entry.templateId === betaTemplate.id,
    );
    assert.equal(betaEntry?.channelId, "beta");
    assert.equal(betaEntry?.rolloutPercent, 35);
    assert.equal(betaEntry?.deprecationNotice, null);

    const legacyNotice = center.deprecationNotices.find(
      (notice) => notice.templateId === archivedTemplate.id,
    );
    assert.equal(legacyNotice?.status, "review");
    assert.match(legacyNotice?.detail ?? "", /migration/i);

    const legacyMigration = center.migrationSuggestions.find(
      (suggestion) => suggestion.fromTemplateId === archivedTemplate.id,
    );
    assert.equal(legacyMigration?.toTemplateId, stableTemplate.id);
    assert.equal(legacyMigration?.status, "ready");
    assert.ok(
      center.rollbackPackets.every((packet) =>
        packet.dataUrl.startsWith("data:application/json"),
      ),
    );
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
    marketplacePublishedAt: "2026-05-10T10:00:00.000Z",
    marketplaceUseCount: 4,
    marketplaceViewCount: 20,
    createdAt: "2026-05-08T10:00:00.000Z",
    updatedAt: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch kit design",
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
    updatedAt: "2026-05-18T08:00:00.000Z",
    createdAt: "2026-05-15T08:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Release snapshot",
    thumbnail: null,
    createdAt: "2026-05-18T08:05:00.000Z",
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
    summary: "Template release updated.",
    actorEmail: "admin@mail.com",
    metadata: {},
    createdAt: "2026-05-18T08:15:00.000Z",
    ...overrides,
  };
}

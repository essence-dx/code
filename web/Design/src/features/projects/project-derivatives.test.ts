import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ProjectSummary } from "@/features/editor/types";
import { buildProjectDerivativeGroups } from "@/features/projects/project-derivatives";

function project(input: Partial<ProjectSummary> & { id: string }): ProjectSummary {
  return {
    id: input.id,
    name: input.name ?? input.id,
    width: input.width ?? 1080,
    height: input.height ?? 1080,
    folderId: null,
    sourceProjectId: input.sourceProjectId ?? null,
    variantProfileId: input.variantProfileId ?? null,
    variantName: input.variantName ?? null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: input.approvalStatus ?? "draft",
    starred: false,
    deletedAt: input.deletedAt ?? null,
    createdAt: input.createdAt ?? "2026-05-15T00:00:00.000Z",
    updatedAt: input.updatedAt ?? "2026-05-15T00:00:00.000Z",
  };
}

describe("project derivative groups", () => {
  test("groups active variants under their source design", () => {
    const groups = buildProjectDerivativeGroups([
      project({
        id: "source",
        name: "Launch master",
        updatedAt: "2026-05-15T10:00:00.000Z",
      }),
      project({
        id: "story",
        sourceProjectId: "source",
        variantProfileId: "story-reel",
        variantName: "Story / reel",
        updatedAt: "2026-05-15T09:00:00.000Z",
      }),
      project({
        id: "square",
        sourceProjectId: "source",
        variantProfileId: "instagram-square",
        variantName: "Instagram square",
        updatedAt: "2026-05-15T11:00:00.000Z",
      }),
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].source?.name, "Launch master");
    assert.deepEqual(groups[0].variants.map((item) => item.project.id), [
      "square",
      "story",
    ]);
    assert.equal(groups[0].needsReviewCount, 1);
  });

  test("keeps orphaned variants visible and ignores trashed variants", () => {
    const groups = buildProjectDerivativeGroups([
      project({
        id: "active",
        sourceProjectId: "missing-source",
        variantName: "Email banner",
      }),
      project({
        id: "trashed",
        sourceProjectId: "missing-source",
        variantName: "Website hero",
        deletedAt: "2026-05-15T10:00:00.000Z",
      }),
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].source, null);
    assert.equal(groups[0].variants.length, 1);
    assert.equal(groups[0].variants[0].project.id, "active");
  });
});

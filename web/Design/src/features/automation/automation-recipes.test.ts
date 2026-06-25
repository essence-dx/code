import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { ProjectSummary } from "@/features/editor/types";
import {
  createAutomationRecipeSummaries,
  normalizeAutomationCadenceDays,
  normalizeAutomationRecipeId,
} from "@/features/automation/automation-recipes";

describe("automation recipes", () => {
  test("creates four reusable recipe summaries", () => {
    const recipes = createAutomationRecipeSummaries({
      projects: [createProject()],
      campaigns: [createCampaign()],
      reviewTasks: [createReviewTask()],
      contentScheduleItems: [],
      serverExportJobs: [],
      now: new Date("2026-05-16T10:00:00.000Z"),
    });

    assert.deepEqual(
      recipes.map((recipe) => recipe.id),
      [
        "scheduled-export",
        "publishing-reminder",
        "review-nudge",
        "campaign-cadence",
      ],
    );
    assert.equal(recipes.every((recipe) => !recipe.disabledReason), true);
  });

  test("disables recipes when required targets are missing", () => {
    const recipes = createAutomationRecipeSummaries({
      projects: [],
      campaigns: [],
      reviewTasks: [],
      contentScheduleItems: [],
      serverExportJobs: [],
      now: new Date("2026-05-16T10:00:00.000Z"),
    });

    assert.equal(
      recipes.find((recipe) => recipe.id === "scheduled-export")?.targets
        .length,
      0,
    );
    assert.ok(
      recipes.find((recipe) => recipe.id === "review-nudge")?.disabledReason,
    );
    assert.ok(
      recipes.find((recipe) => recipe.id === "campaign-cadence")
        ?.disabledReason,
    );
  });

  test("normalizes action inputs", () => {
    assert.equal(normalizeAutomationRecipeId("review-nudge"), "review-nudge");
    assert.equal(normalizeAutomationRecipeId("bad"), null);
    assert.equal(normalizeAutomationCadenceDays("9"), 9);
    assert.equal(normalizeAutomationCadenceDays("200"), 30);
    assert.equal(normalizeAutomationCadenceDays("0"), 1);
  });
});

function createProject(input: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch Post",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "draft",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T10:00:00.000Z",
    createdAt: "2026-05-16T09:00:00.000Z",
    ...input,
  };
}

function createCampaign(
  input: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Launch Campaign",
    brief: "",
    goal: "",
    audience: "",
    status: "active",
    primaryBrandColor: null,
    brandLogoName: null,
    brandFontFamily: null,
    launchAt: "2026-05-20T09:00:00.000Z",
    deliverables: [
      {
        id: "deliverable-1",
        projectId: "project-1",
        projectName: "Launch Post",
        projectThumbnail: null,
        projectWidth: 1080,
        projectHeight: 1080,
        projectSourceProjectId: null,
        projectVariantProfileId: null,
        projectVariantName: null,
        role: "Hero",
        channel: "Instagram",
        status: "planned",
        approvalStatus: "draft",
        createdAt: "2026-05-16T09:00:00.000Z",
        updatedAt: "2026-05-16T10:00:00.000Z",
      },
    ],
    createdAt: "2026-05-16T09:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...input,
  };
}

function createReviewTask(
  input: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "comment-1",
    projectId: "project-1",
    projectName: "Launch Post",
    pageId: "page-1",
    elementId: null,
    authorName: "Reviewer",
    body: "Please review copy.",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Designer",
    taskDueAt: null,
    createdAt: "2026-05-16T09:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...input,
  };
}

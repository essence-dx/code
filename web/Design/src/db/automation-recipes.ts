import { nanoid } from "nanoid";

import { bulkScheduleCampaignDeliverables, listCampaignBoards } from "@/db/campaigns";
import { createContentScheduleItem } from "@/db/content-planner";
import { createUserNotification } from "@/db/notifications";
import { getProject } from "@/db/projects";
import { listProjectCommentTasks } from "@/db/project-comments";
import { createServerExportJob } from "@/db/server-export-jobs";
import {
  normalizeAutomationCadenceDays,
  type AutomationRecipeId,
} from "@/features/automation/automation-recipes";

export type AutomationRecipeApplyResult = {
  recipeId: AutomationRecipeId;
  targetId: string;
  summary: string;
  createdCount: number;
};

export async function applyAutomationRecipe(input: {
  userId: string;
  recipeId: AutomationRecipeId;
  targetId: string;
  startAt: Date;
  cadenceDays?: number;
}): Promise<AutomationRecipeApplyResult | null> {
  if (!input.targetId) return null;

  if (input.recipeId === "scheduled-export") {
    return applyScheduledExportRecipe(input);
  }

  if (input.recipeId === "publishing-reminder") {
    return applyPublishingReminderRecipe(input);
  }

  if (input.recipeId === "review-nudge") {
    return applyReviewNudgeRecipe(input);
  }

  if (input.recipeId === "campaign-cadence") {
    return applyCampaignCadenceRecipe(input);
  }

  return null;
}

async function applyScheduledExportRecipe(input: {
  userId: string;
  recipeId: AutomationRecipeId;
  targetId: string;
}) {
  const project = await getProject({
    userId: input.userId,
    projectId: input.targetId,
  });

  if (!project) return null;

  const fileName = `${slugify(project.name)}-handoff.pdf`;
  const job = await createServerExportJob({
    id: `export-auto-${nanoid(16).toLowerCase()}`,
    userId: input.userId,
    projectId: project.id,
    projectName: project.name,
    format: "pdf",
    formatLabel: "PDF handoff",
    fileName,
    status: "queued",
    progress: 0,
  });

  await createUserNotification({
    userId: input.userId,
    type: "automation_recipe",
    title: "Export recipe queued",
    body: `${project.name} has a queued PDF handoff export request.`,
    targetHref: `/editor/${project.id}`,
  });

  return {
    recipeId: input.recipeId,
    targetId: project.id,
    summary: `Queued PDF handoff export for "${project.name}"`,
    createdCount: job ? 1 : 0,
  } satisfies AutomationRecipeApplyResult;
}

async function applyPublishingReminderRecipe(input: {
  userId: string;
  recipeId: AutomationRecipeId;
  targetId: string;
  startAt: Date;
}) {
  const scheduledAt = normalizeRecipeDate(input.startAt);
  const item = await createContentScheduleItem({
    userId: input.userId,
    projectId: input.targetId,
    channel: "Website",
    scheduledAt,
    caption:
      "Automation reminder: publish this design, verify the live channel, and mark the planner item complete.",
  });

  if (!item) return null;

  await createUserNotification({
    userId: input.userId,
    type: "automation_recipe",
    title: "Publishing reminder scheduled",
    body: `${item.title} is planned for ${new Date(item.scheduledAt).toLocaleString()}.`,
    targetHref: "/designs",
  });

  return {
    recipeId: input.recipeId,
    targetId: input.targetId,
    summary: `Scheduled publishing reminder for "${item.title}"`,
    createdCount: 1,
  } satisfies AutomationRecipeApplyResult;
}

async function applyReviewNudgeRecipe(input: {
  userId: string;
  recipeId: AutomationRecipeId;
  targetId: string;
}) {
  const openTasks = (await listProjectCommentTasks(input.userId)).filter(
    (task) => task.projectId === input.targetId && task.taskStatus !== "done",
  );

  if (!openTasks.length) return null;

  const projectName = openTasks[0]?.projectName ?? "Project";
  await createUserNotification({
    userId: input.userId,
    type: "automation_recipe",
    title: "Review nudge ready",
    body: `${projectName} has ${openTasks.length} open review task${
      openTasks.length === 1 ? "" : "s"
    } to close.`,
    targetHref: "/designs",
  });

  return {
    recipeId: input.recipeId,
    targetId: input.targetId,
    summary: `Sent review nudge for "${projectName}"`,
    createdCount: openTasks.length,
  } satisfies AutomationRecipeApplyResult;
}

async function applyCampaignCadenceRecipe(input: {
  userId: string;
  recipeId: AutomationRecipeId;
  targetId: string;
  startAt: Date;
  cadenceDays?: number;
}) {
  const campaign = (await listCampaignBoards(input.userId)).find(
    (item) => item.id === input.targetId,
  );

  if (!campaign) return null;

  const deliverableIds = campaign.deliverables
    .filter((deliverable) => deliverable.projectId)
    .map((deliverable) => deliverable.id);

  if (!deliverableIds.length) return null;

  const scheduledCount = await bulkScheduleCampaignDeliverables({
    userId: input.userId,
    campaignId: campaign.id,
    deliverableIds,
    startAt: normalizeRecipeDate(input.startAt),
    cadenceDays: normalizeAutomationCadenceDays(input.cadenceDays),
    caption:
      "Automation cadence: prepare, review, and publish this campaign deliverable.",
  });

  if (!scheduledCount) return null;

  await createUserNotification({
    userId: input.userId,
    type: "automation_recipe",
    title: "Campaign cadence created",
    body: `${scheduledCount} deliverable${
      scheduledCount === 1 ? "" : "s"
    } were scheduled for ${campaign.name}.`,
    targetHref: "/designs",
  });

  return {
    recipeId: input.recipeId,
    targetId: campaign.id,
    summary: `Scheduled ${scheduledCount} campaign deliverable${
      scheduledCount === 1 ? "" : "s"
    } for "${campaign.name}"`,
    createdCount: scheduledCount,
  } satisfies AutomationRecipeApplyResult;
}

function normalizeRecipeDate(value: Date) {
  if (!Number.isNaN(value.getTime())) return value;

  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);

  return next;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "design"
  );
}

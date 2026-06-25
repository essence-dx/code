import { and, desc, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  contentScheduleItem,
  project,
  type ContentScheduleItemRow,
} from "@/db/schema";

export const contentPlannerChannels = [
  "Instagram",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "Pinterest",
  "X",
  "Website",
  "Email",
] as const;

export type ContentPlannerStatus = "planned" | "published" | "cancelled";

export type ContentScheduleSummary = {
  id: string;
  projectId: string | null;
  projectName: string | null;
  title: string;
  channel: string;
  caption: string;
  status: ContentPlannerStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeTitle(value: unknown) {
  return String(value ?? "")
    .trim()
    .slice(0, 100);
}

function normalizeCaption(value: unknown) {
  return String(value ?? "")
    .trim()
    .slice(0, 500);
}

function normalizeChannel(value: unknown) {
  const channel = String(value ?? "").trim();

  return contentPlannerChannels.includes(
    channel as (typeof contentPlannerChannels)[number],
  )
    ? channel
    : "Instagram";
}

function normalizeStatus(value: unknown): ContentPlannerStatus {
  if (value === "published" || value === "cancelled") return value;

  return "planned";
}

function toSummary(input: {
  row: ContentScheduleItemRow;
  projectName: string | null;
}): ContentScheduleSummary {
  return {
    id: input.row.id,
    projectId: input.row.projectId,
    projectName: input.projectName,
    title: input.row.title,
    channel: input.row.channel,
    caption: input.row.caption,
    status: normalizeStatus(input.row.status),
    scheduledAt: input.row.scheduledAt.toISOString(),
    createdAt: input.row.createdAt.toISOString(),
    updatedAt: input.row.updatedAt.toISOString(),
  };
}

export async function listContentScheduleItems(userId: string) {
  const rows = await getDb()
    .select({
      item: contentScheduleItem,
      projectName: project.name,
    })
    .from(contentScheduleItem)
    .leftJoin(project, eq(contentScheduleItem.projectId, project.id))
    .where(eq(contentScheduleItem.userId, userId))
    .orderBy(desc(contentScheduleItem.scheduledAt))
    .limit(24);

  return rows.map((row) =>
    toSummary({
      row: row.item,
      projectName: row.projectName,
    }),
  );
}

export async function createContentScheduleItem(input: {
  userId: string;
  projectId: string;
  channel: string;
  scheduledAt: Date;
  caption: string;
}) {
  const [projectRow] = await getDb()
    .select({
      id: project.id,
      name: project.name,
    })
    .from(project)
    .where(
      and(
        eq(project.id, input.projectId),
        eq(project.userId, input.userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  if (!projectRow || Number.isNaN(input.scheduledAt.getTime())) {
    return null;
  }

  const now = new Date();
  const [row] = await getDb()
    .insert(contentScheduleItem)
    .values({
      id: nanoid(),
      userId: input.userId,
      projectId: projectRow.id,
      title: normalizeTitle(projectRow.name) || "Scheduled design",
      channel: normalizeChannel(input.channel),
      caption: normalizeCaption(input.caption),
      scheduledAt: input.scheduledAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toSummary({
    row,
    projectName: projectRow.name,
  });
}

export async function updateContentScheduleStatus(input: {
  userId: string;
  itemId: string;
  status: string;
}) {
  const [row] = await getDb()
    .update(contentScheduleItem)
    .set({
      status: normalizeStatus(input.status),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contentScheduleItem.id, input.itemId),
        eq(contentScheduleItem.userId, input.userId),
      ),
    )
    .returning();

  return row ? toSummary({ row, projectName: null }) : null;
}

export async function rescheduleContentScheduleItem(input: {
  userId: string;
  itemId: string;
  scheduledAt: Date;
}) {
  if (Number.isNaN(input.scheduledAt.getTime())) {
    return null;
  }

  const [row] = await getDb()
    .update(contentScheduleItem)
    .set({
      scheduledAt: input.scheduledAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contentScheduleItem.id, input.itemId),
        eq(contentScheduleItem.userId, input.userId),
      ),
    )
    .returning();

  return row ? toSummary({ row, projectName: null }) : null;
}

export async function deleteContentScheduleItem(input: {
  userId: string;
  itemId: string;
}) {
  await getDb()
    .delete(contentScheduleItem)
    .where(
      and(
        eq(contentScheduleItem.id, input.itemId),
        eq(contentScheduleItem.userId, input.userId),
      ),
    );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createContentScheduleItem,
  deleteContentScheduleItem,
  rescheduleContentScheduleItem,
  updateContentScheduleStatus,
} from "@/db/content-planner";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { sendWorkspaceNotificationHooks } from "@/features/notifications/workspace-notification-hooks";
import { getServerSession } from "@/lib/auth-session";

export async function createContentScheduleAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const scheduledAt = new Date(String(formData.get("scheduledAt") ?? ""));
  const caption = String(formData.get("caption") ?? "");

  if (!projectId || Number.isNaN(scheduledAt.getTime())) {
    return;
  }

  const item = await createContentScheduleItem({
    userId: session.user.id,
    projectId,
    channel,
    scheduledAt,
    caption,
  });
  if (item) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "content.scheduled",
      targetType: "content_schedule_item",
      targetId: item.id,
      summary: `Scheduled "${item.title}" for ${item.channel}`,
      metadata: { projectId, scheduledAt: item.scheduledAt },
    });
    await sendWorkspaceNotificationHooks({
      event: "publishing.changed",
      title: "Content scheduled",
      body: `${item.title} is scheduled for ${item.channel}.`,
      targetHref: "/designs",
      metadata: { itemId: item.id, projectId },
    });
  }

  revalidatePath("/designs");
}

export async function updateContentScheduleStatusAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const itemId = String(formData.get("itemId") ?? "");
  const status = String(formData.get("status") ?? "planned");

  if (!itemId) {
    return;
  }

  await updateContentScheduleStatus({
    userId: session.user.id,
    itemId,
    status,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "content.status.updated",
    targetType: "content_schedule_item",
    targetId: itemId,
    summary: `Updated scheduled content status to ${status}`,
  });
  await sendWorkspaceNotificationHooks({
    event: "publishing.changed",
    title: "Content status updated",
    body: `Scheduled content is now ${status}.`,
    targetHref: "/designs",
    metadata: { itemId, status },
  });

  revalidatePath("/designs");
}

export async function rescheduleContentScheduleAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const itemId = String(formData.get("itemId") ?? "");
  const scheduledAt = new Date(String(formData.get("scheduledAt") ?? ""));

  if (!itemId || Number.isNaN(scheduledAt.getTime())) {
    return;
  }

  const item = await rescheduleContentScheduleItem({
    userId: session.user.id,
    itemId,
    scheduledAt,
  });
  if (item) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "content.rescheduled",
      targetType: "content_schedule_item",
      targetId: itemId,
      summary: `Rescheduled "${item.title}"`,
      metadata: { scheduledAt: item.scheduledAt },
    });
    await sendWorkspaceNotificationHooks({
      event: "publishing.changed",
      title: "Content rescheduled",
      body: `${item.title} moved to ${new Date(
        item.scheduledAt,
      ).toLocaleString()}.`,
      targetHref: "/designs",
      metadata: { itemId },
    });
  }

  revalidatePath("/designs");
}

export async function deleteContentScheduleAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    return;
  }

  await deleteContentScheduleItem({
    userId: session.user.id,
    itemId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "content.deleted",
    targetType: "content_schedule_item",
    targetId: itemId,
    summary: "Removed scheduled content",
  });

  revalidatePath("/designs");
}

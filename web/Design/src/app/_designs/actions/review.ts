"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateCampaignDeliverableApprovalStatus } from "@/db/campaigns";
import { updateDesignTemplateApprovalStatus } from "@/db/design-templates";
import { updateProjectCommentTaskStatus } from "@/db/project-comments";
import { updateProjectApprovalStatus } from "@/db/projects";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { normalizeApprovalStatus } from "@/features/review/approval-status";
import { sendWorkspaceNotificationHooks } from "@/features/notifications/workspace-notification-hooks";
import { normalizeReviewTaskStatus } from "@/features/review/review-tasks";
import { getServerSession } from "@/lib/auth-session";

export async function updateReviewTaskStatusAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const taskStatus = normalizeReviewTaskStatus(formData.get("taskStatus"));

  if (!projectId || !commentId || taskStatus === "none") {
    return;
  }

  await updateProjectCommentTaskStatus({
    userId: session.user.id,
    projectId,
    commentId,
    taskStatus,
  });
  await sendWorkspaceNotificationHooks({
    event: "review.updated",
    title: "Review task updated",
    body: `A review task is now ${taskStatus}.`,
    targetHref: `/editor/${projectId}`,
    metadata: { projectId, commentId, taskStatus },
  });

  revalidatePath("/designs");
}

export async function updateApprovalStatusAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const subject = String(formData.get("subject") ?? "");
  const approvalStatus = normalizeApprovalStatus(formData.get("approvalStatus"));

  if (subject === "project") {
    const projectId = String(formData.get("projectId") ?? "");

    if (!projectId) return;

    await updateProjectApprovalStatus({
      userId: session.user.id,
      projectId,
      approvalStatus,
    });
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "approval.updated",
      targetType: "project",
      targetId: projectId,
      summary: `Updated project approval to ${approvalStatus}`,
    });
    await sendWorkspaceNotificationHooks({
      event: "review.updated",
      title: "Project approval updated",
      body: `Project approval is now ${approvalStatus}.`,
      targetHref: `/editor/${projectId}`,
      metadata: { projectId, approvalStatus },
    });
  }

  if (subject === "template") {
    const templateId = String(formData.get("templateId") ?? "");

    if (!templateId) return;

    await updateDesignTemplateApprovalStatus({
      userId: session.user.id,
      templateId,
      approvalStatus,
    });
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "approval.updated",
      targetType: "template",
      targetId: templateId,
      summary: `Updated template approval to ${approvalStatus}`,
    });
    await sendWorkspaceNotificationHooks({
      event: "review.updated",
      title: "Template approval updated",
      body: `Template approval is now ${approvalStatus}.`,
      targetHref: "/designs",
      metadata: { templateId, approvalStatus },
    });
  }

  if (subject === "campaign-deliverable") {
    const campaignId = String(formData.get("campaignId") ?? "");
    const deliverableId = String(formData.get("deliverableId") ?? "");

    if (!campaignId || !deliverableId) return;

    await updateCampaignDeliverableApprovalStatus({
      userId: session.user.id,
      campaignId,
      deliverableId,
      approvalStatus,
    });
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "approval.updated",
      targetType: "campaign_deliverable",
      targetId: deliverableId,
      summary: `Updated campaign deliverable approval to ${approvalStatus}`,
      metadata: { campaignId },
    });
    await sendWorkspaceNotificationHooks({
      event: "review.updated",
      title: "Campaign deliverable approval updated",
      body: `Campaign deliverable approval is now ${approvalStatus}.`,
      targetHref: "/designs",
      metadata: { campaignId, deliverableId, approvalStatus },
    });
  }

  revalidatePath("/designs");
}

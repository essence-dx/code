"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listBrandColors } from "@/db/brand-colors";
import { listBrandFonts } from "@/db/brand-fonts";
import { listBrandLogos } from "@/db/brand-logos";
import {
  bulkScheduleCampaignDeliverables,
  createCampaignBoard,
  createCampaignDerivativeVariants,
} from "@/db/campaigns";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import {
  normalizeCampaignScheduleCadenceDays,
} from "@/features/campaigns/campaign-bulk-workflows";
import { createCampaignBrandSnapshot } from "@/features/campaigns/campaign-board";
import { sendWorkspaceNotificationHooks } from "@/features/notifications/workspace-notification-hooks";
import { getServerSession } from "@/lib/auth-session";

export async function createCampaignBoardAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const name = String(formData.get("name") ?? "");
  const brief = String(formData.get("brief") ?? "");
  const goal = String(formData.get("goal") ?? "");
  const audience = String(formData.get("audience") ?? "");
  const status = String(formData.get("status") ?? "active");
  const launchAtValue = String(formData.get("launchAt") ?? "");
  const launchAt = launchAtValue ? new Date(launchAtValue) : null;
  const projectIds = formData
    .getAll("projectIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!name.trim()) {
    return;
  }

  const [colors, logos, fonts] = await Promise.all([
    listBrandColors(session.user.id),
    listBrandLogos(session.user.id),
    listBrandFonts(session.user.id),
  ]);

  const campaign = await createCampaignBoard({
    userId: session.user.id,
    name,
    brief,
    goal,
    audience,
    status,
    launchAt,
    projectIds,
    brand: createCampaignBrandSnapshot({
      colors,
      logos,
      fonts,
      requestedColor: String(formData.get("primaryBrandColor") ?? ""),
    }),
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "campaign.created",
    targetType: "campaign",
    targetId: campaign.id,
    summary: `Created campaign "${campaign.name}"`,
    metadata: { deliverables: projectIds.length },
  });

  revalidatePath("/designs");
}

export async function createCampaignDerivativesAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const campaignId = String(formData.get("campaignId") ?? "");
  const sourceProjectId = String(formData.get("sourceProjectId") ?? "");
  const profileIds = formData
    .getAll("profileIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!campaignId || !sourceProjectId || !profileIds.length) {
    return;
  }

  const created = await createCampaignDerivativeVariants({
    userId: session.user.id,
    campaignId,
    sourceProjectId,
    profileIds,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "campaign.variants.created",
    targetType: "campaign",
    targetId: campaignId,
    summary: `Created ${created.length} campaign variant${created.length === 1 ? "" : "s"}`,
    metadata: { sourceProjectId, profileIds },
  });

  revalidatePath("/designs");
}

export async function bulkScheduleCampaignDeliverablesAction(
  formData: FormData,
) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const campaignId = String(formData.get("campaignId") ?? "");
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const caption = String(formData.get("caption") ?? "");
  const cadenceDays = normalizeCampaignScheduleCadenceDays(
    formData.get("cadenceDays"),
  );
  const deliverableIds = formData
    .getAll("deliverableIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (
    !campaignId ||
    !deliverableIds.length ||
    Number.isNaN(startAt.getTime())
  ) {
    return;
  }

  const scheduledCount = await bulkScheduleCampaignDeliverables({
    userId: session.user.id,
    campaignId,
    deliverableIds,
    startAt,
    cadenceDays,
    caption,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "campaign.deliverables.scheduled",
    targetType: "campaign",
    targetId: campaignId,
    summary: `Scheduled ${scheduledCount} campaign deliverable${scheduledCount === 1 ? "" : "s"}`,
    metadata: { deliverableIds, cadenceDays },
  });
  await sendWorkspaceNotificationHooks({
    event: "publishing.changed",
    title: "Campaign deliverables scheduled",
    body: `${scheduledCount} deliverable${
      scheduledCount === 1 ? "" : "s"
    } were scheduled.`,
    targetHref: "/designs",
    metadata: { campaignId, deliverableIds, cadenceDays },
  });

  revalidatePath("/designs");
}

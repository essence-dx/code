"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/db/admin-dashboard";
import { updateDesignTemplateMarketplaceListing } from "@/db/design-templates";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import {
  normalizeTemplateMarketplaceCollection,
  normalizeTemplateMarketplaceReviewNote,
  normalizeTemplateMarketplaceSeason,
  normalizeTemplateMarketplaceStatus,
} from "@/features/templates/template-marketplace";
import { getServerSession } from "@/lib/auth-session";

export async function updateTemplateMarketplaceAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  if (!isAdminEmail(session.user.email)) {
    return;
  }

  const templateId = String(formData.get("templateId") ?? "");
  const status = normalizeTemplateMarketplaceStatus(
    formData.get("marketplaceStatus"),
  );

  if (!templateId) {
    return;
  }

  const template = await updateDesignTemplateMarketplaceListing({
    templateId,
    status,
    collection: normalizeTemplateMarketplaceCollection(
      formData.get("marketplaceCollection"),
    ),
    season: normalizeTemplateMarketplaceSeason(
      formData.get("marketplaceSeason"),
    ),
    reviewNote: normalizeTemplateMarketplaceReviewNote(
      formData.get("marketplaceReviewNote"),
    ),
  });

  if (template) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "template.marketplace.updated",
      targetType: "template",
      targetId: template.id,
      summary: `Updated template marketplace listing to ${template.marketplaceStatus}`,
      metadata: {
        templateId: template.id,
        marketplaceCollection: template.marketplaceCollection,
        marketplaceSeason: template.marketplaceSeason,
        marketplaceStatus: template.marketplaceStatus,
      },
    });
  }

  revalidatePath("/designs");
}

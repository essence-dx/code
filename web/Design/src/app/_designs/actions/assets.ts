"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteDuplicateUserAssets,
  deleteUserAsset,
} from "@/db/assets";
import {
  deleteBrandLogo,
  deleteDuplicateBrandLogos,
} from "@/db/brand-logos";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { getServerSession } from "@/lib/auth-session";

type AssetCleanupScope = "uploads" | "brand" | "all";

export async function deleteAssetAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const scope = parseAssetCleanupScope(formData.get("scope"));
  const assetId = String(formData.get("assetId") ?? "");

  if (!assetId || scope === "all") {
    return;
  }

  const deletedAsset =
    scope === "brand"
      ? await deleteBrandLogo({ userId: session.user.id, logoId: assetId })
      : await deleteUserAsset({ userId: session.user.id, assetId });

  if (deletedAsset) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "asset.deleted",
      targetType: scope === "brand" ? "brand_logo" : "asset",
      targetId: deletedAsset.id,
      summary: `Deleted ${scope === "brand" ? "brand logo" : "asset"} "${deletedAsset.name}"`,
      metadata: {
        scope,
        sizeBytes: deletedAsset.sizeBytes,
        mimeType: deletedAsset.mimeType,
      },
    });
  }

  revalidatePath("/designs");
}

export async function deleteDuplicateAssetsAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const scope = parseAssetCleanupScope(formData.get("scope"));
  const uploadCleanup =
    scope === "uploads" || scope === "all"
      ? await deleteDuplicateUserAssets(session.user.id)
      : { deletedCount: 0, recoveredBytes: 0 };
  const brandCleanup =
    scope === "brand" || scope === "all"
      ? await deleteDuplicateBrandLogos(session.user.id)
      : { deletedCount: 0, recoveredBytes: 0 };
  const deletedCount = uploadCleanup.deletedCount + brandCleanup.deletedCount;
  const recoveredBytes =
    uploadCleanup.recoveredBytes + brandCleanup.recoveredBytes;

  if (deletedCount > 0) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "asset.duplicates_deleted",
      targetType: "asset",
      summary: `Deleted ${deletedCount} duplicate asset${deletedCount === 1 ? "" : "s"}`,
      metadata: {
        scope,
        recoveredBytes,
        uploadDeletedCount: uploadCleanup.deletedCount,
        brandDeletedCount: brandCleanup.deletedCount,
      },
    });
  }

  revalidatePath("/designs");
}

function parseAssetCleanupScope(value: FormDataEntryValue | null): AssetCleanupScope {
  if (value === "brand" || value === "uploads" || value === "all") {
    return value;
  }

  return "uploads";
}

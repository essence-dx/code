"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { applyAutomationRecipe } from "@/db/automation-recipes";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import {
  normalizeAutomationCadenceDays,
  normalizeAutomationRecipeId,
} from "@/features/automation/automation-recipes";
import { getServerSession } from "@/lib/auth-session";
import {
  createWorkspaceReleaseOperationEnforcementDecision,
  recordBlockedReleaseOperation,
} from "@/lib/release-operation-enforcement-server";

export async function applyAutomationRecipeAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const recipeId = normalizeAutomationRecipeId(formData.get("recipeId"));
  const targetId = String(formData.get("targetId") ?? "");
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const rawCadenceDays = formData.get("cadenceDays");
  const cadenceDays =
    rawCadenceDays === null || String(rawCadenceDays).trim() === ""
      ? undefined
      : normalizeAutomationCadenceDays(rawCadenceDays);

  if (!recipeId || !targetId) {
    return;
  }

  if (recipeId === "scheduled-export") {
    const enforcement =
      await createWorkspaceReleaseOperationEnforcementDecision({
        userId: session.user.id,
        operation: {
          id: `scheduled-export-${targetId}`,
          kind: "create-export-job",
          targetType: "project",
          targetId,
          label: "Queue scheduled export",
          requestedByEmail: session.user.email,
        },
      });

    if (!enforcement.canMutate) {
      await recordBlockedReleaseOperation({
        userId: session.user.id,
        decision: enforcement,
      });
      revalidatePath("/designs");

      return;
    }
  }

  const result = await applyAutomationRecipe({
    userId: session.user.id,
    recipeId,
    targetId,
    startAt,
    cadenceDays,
  });

  if (result) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "automation.recipe.applied",
      targetType: "automation_recipe",
      targetId: recipeId,
      summary: result.summary,
      metadata: {
        recipeId,
        targetId: result.targetId,
        createdCount: result.createdCount,
        startAt: Number.isNaN(startAt.getTime()) ? null : startAt.toISOString(),
        cadenceDays: cadenceDays ?? null,
      },
    });
  }

  revalidatePath("/designs");
}

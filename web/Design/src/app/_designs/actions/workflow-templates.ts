"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTeamWorkspaceMembership } from "@/db/team-workspaces";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { getWorkflowTemplateDefinition } from "@/features/automation/workflow-template-marketplace";
import { getServerSession } from "@/lib/auth-session";

export async function installWorkflowTemplateAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const template = getWorkflowTemplateDefinition(
    normalizeToken(formData.get("templateId")),
  );
  const workspaceId = normalizeToken(formData.get("workspaceId"));
  const requestedVersion = normalizeVersion(formData.get("version"));

  if (!template || !workspaceId) return;

  const membership = await getTeamWorkspaceMembership({
    userId: session.user.id,
    workspaceId,
  });

  if (membership !== "owner" && membership !== "admin") return;

  const currentVersion = template.versions
    .slice()
    .sort((left, right) => compareSemver(right.version, left.version))[0];

  if (!currentVersion || requestedVersion !== currentVersion.version) return;

  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "workflow_template.installed",
    targetType: "workflow_template",
    targetId: template.id,
    summary: `Installed ${template.name} workflow template ${currentVersion.version}.`,
    metadata: {
      workflowTemplateId: template.id,
      workflowTemplateVersion: currentVersion.version,
      workflowTemplateName: template.name,
      workspaceId,
      recipeIds: currentVersion.recipeSteps.map((step) => step.recipeId),
      rollbackNotes: currentVersion.recipeSteps.map(
        (step) => step.rollbackNote,
      ),
      requestedFrom: "workflow-template-marketplace",
    },
  });

  revalidatePath("/designs");
}

function normalizeToken(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 120);
}

function normalizeVersion(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .replace(/[^0-9.]/g, "")
    .slice(0, 20);
}

function compareSemver(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);

    if (difference) return difference;
  }

  return 0;
}

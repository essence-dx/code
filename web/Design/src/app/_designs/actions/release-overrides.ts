"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { getServerSession } from "@/lib/auth-session";

const policyDomains = new Set([
  "sharing",
  "publishing",
  "assets",
  "approvals",
  "retention",
]);

const releaseGateIds = new Set([
  "policy-decisions",
  "export-readiness",
  "publish-readiness",
  "override-requests",
  "approval-evidence",
]);

export async function requestReleaseOverrideAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const targetType = normalizeToken(formData.get("targetType"));
  const targetId = normalizeId(formData.get("targetId"));
  const gateId = normalizeToken(formData.get("gateId"));
  const policyDomain = normalizeToken(formData.get("policyDomain"));
  const summary = normalizeSummary(formData.get("summary"));

  if (
    !targetType ||
    !targetId ||
    !releaseGateIds.has(gateId) ||
    !policyDomains.has(policyDomain)
  ) {
    return;
  }

  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "release.override.requested",
    targetType,
    targetId,
    summary:
      summary ||
      `Requested ${policyDomain} release override for ${targetType} ${targetId}`,
    metadata: {
      affectedItemId: targetId,
      gateId,
      policyDomain,
      requestedFrom: "publish-export-release-gates",
    },
  });

  revalidatePath("/designs");
}

function normalizeToken(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 80);
}

function normalizeId(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "")
    .slice(0, 160);
}

function normalizeSummary(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .slice(0, 240);
}

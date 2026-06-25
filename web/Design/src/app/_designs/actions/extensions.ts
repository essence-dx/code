"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { getFirstPartyExtensionManifest } from "@/features/extensions/first-party-extension-runtime";
import { getServerSession } from "@/lib/auth-session";

export async function installFirstPartyExtensionAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const manifest = getFirstPartyExtensionManifest(
    normalizeExtensionId(formData.get("extensionId")),
  );

  if (!manifest) return;

  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "extension.installed",
    targetType: "extension",
    targetId: manifest.id,
    summary: `Installed ${manifest.name} extension.`,
    metadata: {
      extensionId: manifest.id,
      extensionName: manifest.name,
      version: manifest.version,
      permissionScopes: manifest.permissions,
      commandIds: manifest.commands.map((command) => command.id),
      requestedFrom: "first-party-extension-runtime",
    },
  });

  revalidatePath("/designs");
}

export async function removeFirstPartyExtensionAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const manifest = getFirstPartyExtensionManifest(
    normalizeExtensionId(formData.get("extensionId")),
  );

  if (!manifest) return;

  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "extension.removed",
    targetType: "extension",
    targetId: manifest.id,
    summary: `Removed ${manifest.name} extension.`,
    metadata: {
      extensionId: manifest.id,
      extensionName: manifest.name,
      version: manifest.version,
      commandIds: manifest.commands.map((command) => command.id),
      requestedFrom: "first-party-extension-runtime",
    },
  });

  revalidatePath("/designs");
}

function normalizeExtensionId(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 120);
}

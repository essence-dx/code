"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { disableTwoFactor, enableTwoFactor } from "@/db/two-factor";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { auth } from "@/lib/auth";
import { getServerSession } from "@/lib/auth-session";
import {
  clearTwoFactorVerified,
  markTwoFactorVerified,
} from "@/lib/two-factor-session";

export async function sendVerificationEmailAction() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  await auth.api.sendVerificationOTP({
    body: {
      email: session.user.email,
      type: "email-verification",
    },
    headers: await headers(),
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "auth.verification.sent",
    targetType: "user",
    targetId: session.user.id,
    summary: "Sent email verification code",
  });

  redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
}

export async function enableTwoFactorAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const code = String(formData.get("code") ?? "");
  const enabled = await enableTwoFactor({
    userId: session.user.id,
    code,
  });

  if (enabled) {
    await markTwoFactorVerified(session.user.id);
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "auth.two_factor.enabled",
      targetType: "user",
      targetId: session.user.id,
      summary: "Enabled two-factor authentication",
    });
  }

  revalidatePath("/designs");
}

export async function disableTwoFactorAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const code = String(formData.get("code") ?? "");
  const disabled = await disableTwoFactor({
    userId: session.user.id,
    code,
  });

  if (disabled) {
    await clearTwoFactorVerified();
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "auth.two_factor.disabled",
      targetType: "user",
      targetId: session.user.id,
      summary: "Disabled two-factor authentication",
    });
  }

  revalidatePath("/designs");
}

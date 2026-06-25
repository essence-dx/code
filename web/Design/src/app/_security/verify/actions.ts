"use server";

import { redirect } from "next/navigation";

import { verifyTwoFactorCode } from "@/db/two-factor";
import { getServerSession } from "@/lib/auth-session";
import {
  getSafeTwoFactorNextPath,
  markTwoFactorVerified,
} from "@/lib/two-factor-session";

export async function verifyTwoFactorChallengeAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const code = String(formData.get("code") ?? "");
  const next = getSafeTwoFactorNextPath(formData.get("next"));
  const verified = await verifyTwoFactorCode({
    userId: session.user.id,
    code,
  });

  if (!verified) {
    redirect(`/security/verify?next=${encodeURIComponent(next)}&error=1`);
  }

  await markTwoFactorVerified(session.user.id);
  redirect(next);
}

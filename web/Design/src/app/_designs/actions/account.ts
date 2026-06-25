"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteAccount,
  revokeAccountSession,
  updateAccountDisplayName,
} from "@/db/account-settings";
import { getServerSession } from "@/lib/auth-session";
import { clearTwoFactorVerified } from "@/lib/two-factor-session";

export async function updateAccountProfileAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  await updateAccountDisplayName({
    userId: session.user.id,
    name,
  });

  revalidatePath("/designs");
}

export async function revokeSessionAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    return;
  }

  await revokeAccountSession({
    userId: session.user.id,
    sessionId,
  });

  revalidatePath("/designs");
}

export async function deleteAccountAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "DELETE") {
    return;
  }

  await clearTwoFactorVerified();
  await deleteAccount(session.user.id);

  redirect("/");
}

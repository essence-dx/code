"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/forgot-password?error=missing-email");
  }

  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: "/reset-password",
    },
    headers: await headers(),
  });

  redirect("/forgot-password?sent=1");
}

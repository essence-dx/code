"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    redirect("/reset-password?error=missing-token");
  }

  if (newPassword.length < 8 || newPassword !== confirmPassword) {
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=password`,
    );
  }

  try {
    await auth.api.resetPassword({
      body: {
        token,
        newPassword,
      },
    });
  } catch {
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=invalid`,
    );
  }

  redirect("/?reset=1");
}

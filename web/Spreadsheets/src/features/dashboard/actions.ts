// "use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { session, user } from "@/db/schema";
import { logAuditEvent } from "@/features/audit/audit-log-service";
import { isDashboardAdmin } from "@/features/dashboard/dashboard-service";
import { requireFreshVerifiedActionUser } from "@/lib/action-security";

async function requireDashboardAdmin() {
  const currentUser = await requireFreshVerifiedActionUser();

  if (!isDashboardAdmin(currentUser.email)) {
    throw new Error("Only the workspace admin can manage users.");
  }

  return currentUser;
}

export async function setUserEmailVerifiedAction(formData: FormData) {
  const currentUser = await requireDashboardAdmin();

  const userId = String(formData.get("userId") ?? "");
  const emailVerified = String(formData.get("emailVerified") ?? "false") === "true";

  if (!userId || (userId === currentUser.id && !emailVerified)) {
    return;
  }

  await getDb()
    .update(user)
    .set({
      emailVerified,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  await logAuditEvent({
    category: "admin",
    action: "admin.user_email_verification_changed",
    actor: {
      id: currentUser.id,
      email: currentUser.email,
    },
    targetUserId: userId,
    summary: emailVerified
      ? "Admin verified a user email."
      : "Admin marked a user email as unverified.",
    metadata: { emailVerified },
  });
  revalidatePath("/workbooks");
}

export async function revokeUserSessionsAction(formData: FormData) {
  const currentUser = await requireDashboardAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (!userId || userId === currentUser.id) {
    return;
  }

  await getDb().delete(session).where(eq(session.userId, userId));

  await logAuditEvent({
    category: "admin",
    action: "admin.user_sessions_revoked",
    actor: {
      id: currentUser.id,
      email: currentUser.email,
    },
    targetUserId: userId,
    summary: "Admin revoked a user's sessions.",
  });
  revalidatePath("/workbooks");
}


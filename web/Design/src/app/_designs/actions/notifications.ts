"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from "@/db/notifications";
import { getServerSession } from "@/lib/auth-session";

export async function markNotificationReadAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const notificationId = String(formData.get("notificationId") ?? "");

  if (!notificationId) {
    return;
  }

  await markUserNotificationRead({
    userId: session.user.id,
    notificationId,
  });

  revalidatePath("/designs");
}

export async function markAllNotificationsReadAction() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  await markAllUserNotificationsRead(session.user.id);

  revalidatePath("/designs");
}

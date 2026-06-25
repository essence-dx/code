"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { sendTransactionalEmail } from "@/db/auth-emails";
import { getProject } from "@/db/projects";
import { createEmailModelFromProject } from "@/features/email/email-model";
import {
  renderEmailHtml,
  renderEmailText,
} from "@/features/email/email-renderer";
import { getServerSession } from "@/lib/auth-session";
import { getRequestOrigin } from "@/lib/request-origin";

export async function sendTestEmailAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const recipient = String(formData.get("recipient") ?? "")
    .trim()
    .toLowerCase();
  const subject = String(formData.get("subject") ?? "").trim();
  const previewText = String(formData.get("previewText") ?? "").trim();
  const blockPackId = String(formData.get("blockPack") ?? "none");

  if (!projectId || !recipient || !subject) {
    return;
  }

  const project = await getProject({
    userId: session.user.id,
    projectId,
  });

  if (!project) {
    return;
  }

  const model = createEmailModelFromProject({
    project,
    subject,
    previewText,
    blockPackId,
    assetBaseUrl: getRequestOrigin(await headers()),
  });

  await sendTransactionalEmail({
    userId: session.user.id,
    recipient,
    subject: model.subject,
    text: renderEmailText(model),
    html: renderEmailHtml(model),
    purpose: "email-test",
    previewUrl: `/email/${project.id}`,
  });

  revalidatePath("/designs");
}

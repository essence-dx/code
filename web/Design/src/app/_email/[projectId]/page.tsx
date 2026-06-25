import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import { getProject } from "@/db/projects";
import { createEmailModelFromProject } from "@/features/email/email-model";
import { EmailPreview } from "@/features/email/email-preview";
import { renderEmailHtml } from "@/features/email/email-renderer";
import { getServerSession } from "@/lib/auth-session";
import { getRequestOrigin } from "@/lib/request-origin";

type EmailPreviewPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    subject?: string;
    previewText?: string;
    blockPack?: string;
  }>;
};

export default async function EmailPreviewPage({
  params,
  searchParams,
}: EmailPreviewPageProps) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const project = await getProject({
    userId: session.user.id,
    projectId,
  });

  if (!project) {
    notFound();
  }

  const model = createEmailModelFromProject({
    project,
    subject: query.subject,
    previewText: query.previewText,
    blockPackId: query.blockPack,
    assetBaseUrl: getRequestOrigin(await headers()),
  });
  const html = renderEmailHtml(model);

  return <EmailPreview projectId={project.id} model={model} html={html} />;
}

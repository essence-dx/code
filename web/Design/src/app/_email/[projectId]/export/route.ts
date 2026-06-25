import { NextResponse } from "next/server";

import { getProject } from "@/db/projects";
import { createEmailModelFromProject } from "@/features/email/email-model";
import { renderEmailHtml } from "@/features/email/email-renderer";
import { auth } from "@/lib/auth";

type EmailExportContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(request: Request, context: EmailExportContext) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const { searchParams } = new URL(request.url);
  const project = await getProject({
    userId: session.user.id,
    projectId,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const model = createEmailModelFromProject({
    project,
    subject: searchParams.get("subject") ?? undefined,
    previewText: searchParams.get("previewText") ?? undefined,
    blockPackId: searchParams.get("blockPack"),
    assetBaseUrl: new URL(request.url).origin,
  });
  const html = renderEmailHtml(model);

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${formatFileName(
        model.subject,
      )}-email.html"`,
    },
  });
}

function formatFileName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "essence-email"
  );
}

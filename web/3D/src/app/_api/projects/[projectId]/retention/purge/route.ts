import { headers } from "next/headers";
import { z } from "zod";
import {
  getProjectDataRetentionPurgeManifest,
  updateProjectDataRetentionPurgeReview,
} from "@/features/projects/server/project-data-retention-service";
import { auth } from "@/lib/auth";

const updatePurgeReviewSchema = z.object({
  note: z.string().trim().max(200).nullable().optional(),
  status: z.enum(["approved", "changesRequested", "draft", "requested"]),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function fileSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "project"
  );
}

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const result = await getProjectDataRetentionPurgeManifest({
    currentUserId: userId,
    projectId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";

  if (download) {
    return new Response(JSON.stringify(result.manifest, null, 2), {
      headers: {
        "Content-Disposition": `attachment; filename="${fileSlug(result.project.name)}-retention-purge-manifest.json"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  return Response.json({ manifest: result.manifest });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = updatePurgeReviewSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid retention purge review payload" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const result = await updateProjectDataRetentionPurgeReview({
    currentUserId: userId,
    note: payload.data.note,
    projectId,
    status: payload.data.status,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ manifest: result.manifest });
}

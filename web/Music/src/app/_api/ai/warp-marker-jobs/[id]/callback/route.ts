import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiGenerations, aiJobs } from "@/db/schema";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryUpdateAiJob } from "@/lib/ai/jobs";
import { warpMarkerJobCallbackSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const config = getAiRuntimeConfig();

    if (!config.warpMarkerProviderWebhookSecret) {
      return jsonError("Warp marker callback secret is not configured.", 503);
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    const headerSecret = request.headers.get("x-essence-provider-secret");

    if (
      token !== config.warpMarkerProviderWebhookSecret &&
      headerSecret !== config.warpMarkerProviderWebhookSecret
    ) {
      return jsonError("Invalid warp marker callback secret.", 401);
    }

    const { id } = await context.params;
    const input = warpMarkerJobCallbackSchema.parse(await request.json());
    const [job] = await getDb()
      .select({ id: aiJobs.id, kind: aiJobs.kind })
      .from(aiJobs)
      .where(eq(aiJobs.id, id))
      .limit(1);

    if (!job || job.kind !== "warp-marker") {
      return jsonError("Warp marker job not found.", 404);
    }

    const result = {
      bpm: input.bpm,
      markers: input.markers,
      metadata: input.metadata,
      providerJobId: input.providerJobId,
      timeSignature: input.timeSignature,
    };

    await tryUpdateAiJob(id, {
      status: input.status,
      output: {
        ...result,
        markerCount: input.markers.length,
      },
      error: input.error,
    });

    if (input.status === "succeeded") {
      await getDb().insert(aiGenerations).values({
        id: nanoid(),
        jobId: id,
        contentType: "application/json",
        content: JSON.stringify(result),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

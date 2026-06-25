import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getAiStatus, resolveTextModel } from "@/lib/ai/config";
import { lyricPrompt } from "@/lib/ai/prompts";
import { lyricRequestSchema } from "@/lib/ai/schemas";
import {
  disabledCapabilityResponse,
  providerName,
} from "@/lib/ai/route-helpers";
import {
  tryRecordAiJob,
  tryRecordGeneration,
  tryUpdateAiJob,
} from "@/lib/ai/jobs";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const input = lyricRequestSchema.parse(await request.json());
    const status = getAiStatus();

    if (!status.text) {
      return disabledCapabilityResponse(
        "lyrics",
        "text",
        "Writing assistance is not connected yet.",
        input,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "lyrics",
      status: "running",
      provider: providerName(),
      model: status.textModel,
      request: input,
    });

    const { text } = await generateText({
      model: resolveTextModel(),
      prompt: lyricPrompt(input),
      temperature: 0.9,
    });

    if (jobId) {
      await tryRecordGeneration({
        jobId,
        contentType: "text/lyrics",
        content: text,
      });
      await tryUpdateAiJob(jobId, {
        status: "succeeded",
        output: { text },
      });
    }

    return NextResponse.json({ lyrics: text });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

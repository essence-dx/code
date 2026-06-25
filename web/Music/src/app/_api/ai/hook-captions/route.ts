import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getAiStatus, resolveTextModel } from "@/lib/ai/config";
import { hookCaptionPrompt } from "@/lib/ai/prompts";
import { hookCaptionRequestSchema } from "@/lib/ai/schemas";
import {
  disabledCapabilityResponse,
  providerName,
} from "@/lib/ai/route-helpers";
import { tryRecordAiJob, tryRecordGeneration } from "@/lib/ai/jobs";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const input = hookCaptionRequestSchema.parse(await request.json());
    const status = getAiStatus();

    if (!status.text) {
      return disabledCapabilityResponse(
        "hook",
        "text",
        "Writing assistance is not connected yet.",
        input,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "hook",
      status: "running",
      provider: providerName(),
      model: status.textModel,
      request: input,
    });

    const { text } = await generateText({
      model: resolveTextModel(),
      prompt: hookCaptionPrompt(input),
      temperature: 0.85,
    });

    if (jobId) {
      await tryRecordGeneration({
        jobId,
        contentType: "text/captions",
        content: text,
      });
    }

    return NextResponse.json({ captions: text });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

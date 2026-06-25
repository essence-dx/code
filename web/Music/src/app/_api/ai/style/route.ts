import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getAiStatus, resolveTextModel } from "@/lib/ai/config";
import { styleExpansionPrompt } from "@/lib/ai/prompts";
import { styleRequestSchema } from "@/lib/ai/schemas";
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
    const input = styleRequestSchema.parse(await request.json());
    const status = getAiStatus();

    if (!status.text) {
      return disabledCapabilityResponse(
        "style",
        "text",
        "Writing assistance is not connected yet.",
        input,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "style",
      status: "running",
      provider: providerName(),
      model: status.textModel,
      request: input,
    });

    const { text } = await generateText({
      model: resolveTextModel(),
      prompt: styleExpansionPrompt(input),
      temperature: 0.75,
    });

    if (jobId) {
      await tryRecordGeneration({
        jobId,
        contentType: "text/style-prompt",
        content: text,
      });
      await tryUpdateAiJob(jobId, {
        status: "succeeded",
        output: { text },
      });
    }

    return NextResponse.json({ style: text });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

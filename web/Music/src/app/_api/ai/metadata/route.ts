import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { getAiStatus, resolveStructuredTextModel } from "@/lib/ai/config";
import { tryRecordAiJob } from "@/lib/ai/jobs";
import { metadataPrompt } from "@/lib/ai/prompts";
import {
  metadataRequestSchema,
  metadataSuggestionSchema,
} from "@/lib/ai/schemas";
import {
  disabledCapabilityResponse,
  providerName,
} from "@/lib/ai/route-helpers";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const input = metadataRequestSchema.parse(await request.json());
    const status = getAiStatus();

    if (!status.text) {
      return disabledCapabilityResponse(
        "metadata",
        "text",
        "Writing assistance is not connected yet.",
        input,
      );
    }

    const { output } = await generateText({
      model: resolveStructuredTextModel(),
      output: Output.object({ schema: metadataSuggestionSchema }),
      prompt: metadataPrompt(input),
      temperature: 0.65,
    });

    await tryRecordAiJob({
      kind: "metadata",
      status: "succeeded",
      provider: providerName(),
      model: status.structuredTextModel || status.textModel,
      request: input,
      output,
    });

    return NextResponse.json({ metadata: output });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

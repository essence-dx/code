import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { getAiStatus, resolveStructuredTextModel } from "@/lib/ai/config";
import { songBriefPrompt } from "@/lib/ai/prompts";
import { songBriefRequestSchema, songBriefSchema } from "@/lib/ai/schemas";
import {
  disabledCapabilityResponse,
  providerName,
} from "@/lib/ai/route-helpers";
import { tryRecordAiJob } from "@/lib/ai/jobs";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const input = songBriefRequestSchema.parse(await request.json());
    const status = getAiStatus();

    if (!status.text) {
      return disabledCapabilityResponse(
        "brief",
        "text",
        "Writing assistance is not connected yet.",
        input,
      );
    }

    const { output } = await generateText({
      model: resolveStructuredTextModel(),
      output: Output.object({ schema: songBriefSchema }),
      prompt: songBriefPrompt(input),
      temperature: 0.55,
    });

    await tryRecordAiJob({
      kind: "brief",
      status: "succeeded",
      provider: providerName(),
      model: status.structuredTextModel || status.textModel,
      request: input,
      output,
    });

    return NextResponse.json({ brief: output });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

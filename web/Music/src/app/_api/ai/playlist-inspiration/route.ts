import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { getAiStatus, resolveStructuredTextModel } from "@/lib/ai/config";
import { tryRecordAiJob } from "@/lib/ai/jobs";
import { playlistInspirationPrompt } from "@/lib/ai/prompts";
import {
  playlistInspirationRequestSchema,
  playlistInspirationSchema,
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
    const input = playlistInspirationRequestSchema.parse(await request.json());
    const status = getAiStatus();

    if (!status.text) {
      return disabledCapabilityResponse(
        "playlist",
        "text",
        "Writing assistance is not connected yet.",
        input,
      );
    }

    const { output } = await generateText({
      model: resolveStructuredTextModel(),
      output: Output.object({ schema: playlistInspirationSchema }),
      prompt: playlistInspirationPrompt(input),
      temperature: 0.7,
    });

    await tryRecordAiJob({
      kind: "playlist",
      status: "succeeded",
      provider: providerName(),
      model: status.structuredTextModel || status.textModel,
      request: input,
      output,
    });

    return NextResponse.json({ inspiration: output });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

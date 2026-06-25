import { NextResponse } from "next/server";
import { generateImage, generateText } from "ai";
import { getAiStatus, resolveImageModel, resolveTextModel } from "@/lib/ai/config";
import { coverArtPrompt } from "@/lib/ai/prompts";
import { coverArtRequestSchema } from "@/lib/ai/schemas";
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
    const input = coverArtRequestSchema.parse(await request.json());
    const status = getAiStatus();

    if (!status.text) {
      return disabledCapabilityResponse(
        "cover-art",
        "text",
        "Writing assistance is not connected yet.",
        input,
      );
    }

    const { text: prompt } = await generateText({
      model: resolveTextModel(),
      prompt: coverArtPrompt(input),
      temperature: 0.75,
    });

    let imageDataUrl: string | undefined;

    if (input.generateImage) {
      if (!status.image) {
        return disabledCapabilityResponse(
          "cover-art",
          "image",
          "Image generation needs AI_IMAGE_MODEL plus Gateway or OpenAI credentials.",
          input,
        );
      }

      const { image } = await generateImage({
        model: resolveImageModel(),
        prompt,
        size: "1024x1024",
      });
      imageDataUrl = `data:image/png;base64,${image.base64}`;
    }

    const jobId = await tryRecordAiJob({
      kind: "cover-art",
      status: "succeeded",
      provider: providerName(),
      model: input.generateImage ? status.imageModel : status.textModel,
      request: input,
      output: { prompt, hasImage: Boolean(imageDataUrl) },
    });

    if (jobId) {
      await tryRecordGeneration({
        jobId,
        contentType: input.generateImage ? "image/png" : "text/prompt",
        content: imageDataUrl ?? prompt,
      });
    }

    return NextResponse.json({ prompt, imageDataUrl });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

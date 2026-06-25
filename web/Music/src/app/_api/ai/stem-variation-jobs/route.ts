import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { disabledCapabilityResponse } from "@/lib/ai/route-helpers";
import { stemVariationJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxStemVariationSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(
      config.stemVariationProviderUrl &&
        config.stemVariationProviderWebhookSecret,
    ),
    message:
      config.stemVariationProviderUrl &&
      config.stemVariationProviderWebhookSecret
        ? "Stem variations are connected."
        : "Stem variations are waiting for a real provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = stemVariationJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactStemVariationRequest(input);

    if (
      !config.stemVariationProviderUrl ||
      !config.stemVariationProviderWebhookSecret
    ) {
      return disabledCapabilityResponse(
        "stem-variation",
        "stem-variation",
        "Stem variation is waiting on a real provider.",
        safeRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxStemVariationSourceBytes) {
      return jsonError(
        `Stem variation source is larger than ${Math.round(maxStemVariationSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "stem-variation",
      status: "queued",
      provider: "stem-variation-provider",
      model: "external-stem-variation-provider",
      request: safeRequest,
    });
    const callbackUrl = jobId
      ? new URL(
          `/api/ai/stem-variation-jobs/${jobId}/callback`,
          request.url,
        ).toString()
      : "";
    const response = await fetch(config.stemVariationProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "stem-variation",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (jobId) {
        await tryUpdateAiJob(jobId, {
          status: "failed",
          error: errorText || response.statusText,
        });
      }

      return jsonError(
        `Stem variation provider rejected the job: ${errorText || response.statusText}`,
        502,
      );
    }

    const providerJob = await readProviderJson(response);

    if (jobId) {
      await tryUpdateAiJob(jobId, {
        status: "running",
        output: providerJob,
      });
    }

    return NextResponse.json({
      jobId,
      providerJob,
      status: getAiStatus(),
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

function redactStemVariationRequest(
  input: ReturnType<typeof stemVariationJobRequestSchema.parse>,
) {
  return {
    directionPrompt: input.directionPrompt,
    durationMs: input.durationMs,
    notes: input.notes,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    sourceJobId: input.sourceJobId,
    sourceMediaType: input.sourceMediaType,
    sourceSongTitle: input.sourceSongTitle,
    sourceStemId: input.sourceStemId,
    sourceStemTitle: input.sourceStemTitle,
    sourceStyle: input.sourceStyle,
    stemType: input.stemType,
  };
}

async function readProviderJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

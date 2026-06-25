import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { disabledCapabilityResponse } from "@/lib/ai/route-helpers";
import { removeFxJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxRemoveFxSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(
      config.removeFxProviderUrl && config.removeFxProviderWebhookSecret,
    ),
    message:
      config.removeFxProviderUrl && config.removeFxProviderWebhookSecret
        ? "Remove FX cleanup is connected."
        : "Remove FX cleanup is waiting for a real provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = removeFxJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactRemoveFxRequest(input);

    if (input.region && input.region.endMs <= input.region.startMs) {
      return jsonError("Remove FX region end must be after start.", 422);
    }

    if (!config.removeFxProviderUrl || !config.removeFxProviderWebhookSecret) {
      return disabledCapabilityResponse(
        "remove-fx",
        "remove-fx",
        "Remove FX cleanup is waiting on a real provider.",
        safeRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxRemoveFxSourceBytes) {
      return jsonError(
        `Remove FX source is larger than ${Math.round(maxRemoveFxSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "remove-fx",
      status: "queued",
      provider: "remove-fx-provider",
      model: "external-remove-fx-provider",
      request: safeRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/remove-fx-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.removeFxProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "remove-fx",
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
        `Remove FX provider rejected the job: ${errorText || response.statusText}`,
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

function redactRemoveFxRequest(
  input: ReturnType<typeof removeFxJobRequestSchema.parse>,
) {
  return {
    cleanupTargets: input.cleanupTargets,
    durationMs: input.durationMs,
    intensity: input.intensity,
    notes: input.notes,
    region: input.region,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    sourceMediaType: input.sourceMediaType,
    sourceSongId: input.sourceSongId,
    sourceTitle: input.sourceTitle,
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

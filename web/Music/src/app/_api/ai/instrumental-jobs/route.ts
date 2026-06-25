import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  disabledCapabilityResponse,
  withProviderContract,
} from "@/lib/ai/route-helpers";
import { generatedInstrumentalJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxInstrumentalSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(config.audioProviderUrl),
    message: config.audioProviderUrl
      ? "Instrumental backing is connected."
      : "Instrumental backing is waiting for a real music provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = generatedInstrumentalJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactInstrumentalRequest(input);
    const jobRequest = withProviderContract(safeRequest);

    if (input.region && input.region.endMs <= input.region.startMs) {
      return jsonError("Instrumental generation region end must be after start.", 422);
    }

    if (!config.audioProviderUrl) {
      return disabledCapabilityResponse(
        "instrumental",
        "audio",
        "Instrumental backing is waiting on a real music provider.",
        jobRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxInstrumentalSourceBytes) {
      return jsonError(
        `Instrumental source is larger than ${Math.round(maxInstrumentalSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "instrumental",
      status: "queued",
      provider: "music-provider",
      model: "external-instrumental-provider",
      request: jobRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/instrumental-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.audioProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "generated-instrumental",
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
        `Instrumental provider rejected the job: ${errorText || response.statusText}`,
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

function redactInstrumentalRequest(
  input: ReturnType<typeof generatedInstrumentalJobRequestSchema.parse>,
) {
  return {
    directionPrompt: input.directionPrompt,
    durationMs: input.durationMs,
    lyrics: input.lyrics,
    notes: input.notes,
    region: input.region,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    sourceKind: input.sourceKind,
    sourceMediaType: input.sourceMediaType,
    sourceSongId: input.sourceSongId,
    sourceStyle: input.sourceStyle,
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

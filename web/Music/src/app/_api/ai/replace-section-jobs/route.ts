import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  disabledCapabilityResponse,
  withProviderContract,
} from "@/lib/ai/route-helpers";
import { replaceSectionJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxReplaceSectionSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(config.audioProviderUrl),
    message: config.audioProviderUrl
      ? "Section replacement is connected."
      : "Section replacement is waiting for a real music provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = replaceSectionJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactReplaceSectionRequest(input);
    const jobRequest = withProviderContract(safeRequest);

    if (input.region.endMs <= input.region.startMs) {
      return jsonError("Section end must be after section start.", 422);
    }

    if (!config.audioProviderUrl) {
      return disabledCapabilityResponse(
        "replace-section",
        "audio",
        "Section replacement is waiting on a real music provider.",
        jobRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxReplaceSectionSourceBytes) {
      return jsonError(
        `Section replacement source is larger than ${Math.round(maxReplaceSectionSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "replace-section",
      status: "queued",
      provider: "music-provider",
      model: "external-replace-section-provider",
      request: jobRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/replace-section-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.audioProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "replace-section",
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
        `Section replacement provider rejected the job: ${errorText || response.statusText}`,
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

function redactReplaceSectionRequest(
  input: ReturnType<typeof replaceSectionJobRequestSchema.parse>,
) {
  return {
    creativeControls: input.creativeControls,
    directionPrompt: input.directionPrompt,
    durationMs: input.durationMs,
    lyrics: input.lyrics,
    mode: input.mode,
    notes: input.notes,
    region: input.region,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
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

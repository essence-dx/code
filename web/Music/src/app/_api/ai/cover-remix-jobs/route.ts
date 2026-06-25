import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  disabledCapabilityResponse,
  withProviderContract,
} from "@/lib/ai/route-helpers";
import { coverRemixJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxCoverRemixSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(config.audioProviderUrl),
    message: config.audioProviderUrl
      ? "Cover and remix generation is connected."
      : "Cover and remix generation is waiting for a real music provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = coverRemixJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactCoverRemixRequest(input);
    const jobRequest = withProviderContract(safeRequest);

    if (!config.audioProviderUrl) {
      return disabledCapabilityResponse(
        "cover-remix",
        "audio",
        "Cover and remix generation is waiting on a real music provider.",
        jobRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxCoverRemixSourceBytes) {
      return jsonError(
        `Cover/remix source is larger than ${Math.round(maxCoverRemixSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "cover-remix",
      status: "queued",
      provider: "music-provider",
      model: "external-cover-remix-provider",
      request: jobRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/cover-remix-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.audioProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "cover-remix",
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
        `Cover/remix generation rejected the job: ${errorText || response.statusText}`,
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

function redactCoverRemixRequest(
  input: ReturnType<typeof coverRemixJobRequestSchema.parse>,
) {
  return {
    sourceSongId: input.sourceSongId,
    sourceTitle: input.sourceTitle,
    sourceMediaType: input.sourceMediaType,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    creativeControls: input.creativeControls,
    durationMs: input.durationMs,
    lyrics: input.lyrics,
    mode: input.mode,
    notes: input.notes,
    sourceStyle: input.sourceStyle,
    targetStyle: input.targetStyle,
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

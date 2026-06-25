import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  disabledCapabilityResponse,
  withProviderContract,
} from "@/lib/ai/route-helpers";
import { extendSongJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxExtendSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(config.audioProviderUrl),
    message: config.audioProviderUrl
      ? "Song extension is connected."
      : "Song extension is waiting for a real music provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = extendSongJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactExtendRequest(input);
    const jobRequest = withProviderContract(safeRequest);

    if (!config.audioProviderUrl) {
      return disabledCapabilityResponse(
        "extend",
        "audio",
        "Song extension is waiting on a real music provider.",
        jobRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxExtendSourceBytes) {
      return jsonError(
        `Extension source is larger than ${Math.round(maxExtendSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "extend",
      status: "queued",
      provider: "music-provider",
      model: "external-extend-provider",
      request: jobRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/extend-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.audioProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "extend-song",
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
        `Song extension rejected the job: ${errorText || response.statusText}`,
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

function redactExtendRequest(
  input: ReturnType<typeof extendSongJobRequestSchema.parse>,
) {
  return {
    sourceSongId: input.sourceSongId,
    sourceTitle: input.sourceTitle,
    sourceMediaType: input.sourceMediaType,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    continuationPrompt: input.continuationPrompt,
    creativeControls: input.creativeControls,
    durationMs: input.durationMs,
    extendFromMs: input.extendFromMs,
    lyrics: input.lyrics,
    maxExtensionMs: input.maxExtensionMs,
    notes: input.notes,
    sourceStyle: input.sourceStyle,
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

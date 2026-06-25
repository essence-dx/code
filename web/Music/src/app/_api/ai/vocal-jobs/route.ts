import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  disabledCapabilityResponse,
  withProviderContract,
} from "@/lib/ai/route-helpers";
import { generatedVocalsJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxVocalSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(config.voiceProviderUrl),
    message: config.voiceProviderUrl
      ? "Generated vocals are connected."
      : "Generated vocals are waiting for a verified voice provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = generatedVocalsJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactVocalRequest(input);
    const jobRequest = withProviderContract(safeRequest);

    if (!input.voiceProfile.rightsConfirmed) {
      return jsonError("Voice profile rights must be confirmed.", 422);
    }

    if (input.region && input.region.endMs <= input.region.startMs) {
      return jsonError("Vocal generation region end must be after start.", 422);
    }

    if (!config.voiceProviderUrl) {
      return disabledCapabilityResponse(
        "vocals",
        "voice",
        "Generated vocals are waiting on a verified voice provider.",
        jobRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxVocalSourceBytes) {
      return jsonError(
        `Generated-vocals source is larger than ${Math.round(maxVocalSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "vocals",
      status: "queued",
      provider: "voice-provider",
      model: "external-generated-vocals-provider",
      request: jobRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/vocal-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.voiceProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "generated-vocals",
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
        `Generated-vocals provider rejected the job: ${errorText || response.statusText}`,
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

function redactVocalRequest(
  input: ReturnType<typeof generatedVocalsJobRequestSchema.parse>,
) {
  return {
    directionPrompt: input.directionPrompt,
    durationMs: input.durationMs,
    lyrics: input.lyrics,
    notes: input.notes,
    region: input.region,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    sourceMediaType: input.sourceMediaType,
    sourceSongId: input.sourceSongId,
    sourceStyle: input.sourceStyle,
    sourceTitle: input.sourceTitle,
    voiceProfile: input.voiceProfile,
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

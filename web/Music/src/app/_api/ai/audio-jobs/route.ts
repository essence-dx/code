import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { audioJobRequestSchema } from "@/lib/ai/schemas";
import {
  disabledCapabilityResponse,
  providerName,
  withProviderContract,
} from "@/lib/ai/route-helpers";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    configured: getAiStatus().audio,
    message: getAiStatus().audio
      ? "Music generation is connected."
      : "Music generation is not connected yet.",
  });
}

export async function POST(request: Request) {
  try {
    const input = audioJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const jobRequest = withProviderContract(input);

    if (!config.audioProviderUrl) {
      return disabledCapabilityResponse(
        "audio",
        "audio",
        "Music generation is waiting on a real generation service.",
        jobRequest,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "audio",
      status: "queued",
      provider: providerName(),
      model: "external-audio-provider",
      request: jobRequest,
    });

    const response = await fetch(config.audioProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, jobId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (jobId) {
        await tryUpdateAiJob(jobId, {
          status: "failed",
          error: errorText || response.statusText,
        });
      }
      return disabledCapabilityResponse(
        "audio",
        "audio",
        `Music generation rejected the job: ${errorText || response.statusText}`,
        jobRequest,
      );
    }

    const providerJob = (await response.json()) as unknown;

    if (jobId) {
      await tryUpdateAiJob(jobId, {
        status: "running",
        output: providerJob,
      });
    }

    return NextResponse.json({ jobId, providerJob });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

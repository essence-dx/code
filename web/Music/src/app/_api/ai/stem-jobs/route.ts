import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { disabledCapabilityResponse } from "@/lib/ai/route-helpers";
import { stemJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxStemSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(config.stemProviderUrl),
    message: config.stemProviderUrl
      ? "Stem extraction is connected."
      : "Stem extraction is waiting for a real provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = stemJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactStemRequest(input);

    if (!config.stemProviderUrl) {
      return disabledCapabilityResponse(
        "stem",
        "stem",
        "Stem extraction is waiting on a real separation service.",
        safeRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxStemSourceBytes) {
      return jsonError(
        `Stem extraction source is larger than ${Math.round(maxStemSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "stem",
      status: "queued",
      provider: "stem-provider",
      model: "external-stem-provider",
      request: safeRequest,
    });

    const callbackUrl = jobId
      ? new URL(`/api/ai/stem-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.stemProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
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
        `Stem extraction rejected the job: ${errorText || response.statusText}`,
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

function redactStemRequest(input: ReturnType<typeof stemJobRequestSchema.parse>) {
  return {
    sourceSongId: input.sourceSongId,
    sourceTitle: input.sourceTitle,
    sourceMediaType: input.sourceMediaType,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    requestedStems: input.requestedStems,
    notes: input.notes,
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

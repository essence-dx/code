import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { disabledCapabilityResponse } from "@/lib/ai/route-helpers";
import { remasterJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxRemasterSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(config.remasterProviderUrl),
    message: config.remasterProviderUrl
      ? "Remastering is connected."
      : "Remastering is waiting for a real provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = remasterJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactRemasterRequest(input);

    if (!config.remasterProviderUrl) {
      return disabledCapabilityResponse(
        "remaster",
        "remaster",
        "Remastering is waiting on a real mastering service.",
        safeRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxRemasterSourceBytes) {
      return jsonError(
        `Remaster source is larger than ${Math.round(maxRemasterSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "remaster",
      status: "queued",
      provider: "remaster-provider",
      model: "external-remaster-provider",
      request: safeRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/remaster-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.remasterProviderUrl, {
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
        `Remastering rejected the job: ${errorText || response.statusText}`,
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

function redactRemasterRequest(
  input: ReturnType<typeof remasterJobRequestSchema.parse>,
) {
  return {
    sourceSongId: input.sourceSongId,
    sourceTitle: input.sourceTitle,
    sourceMediaType: input.sourceMediaType,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    durationMs: input.durationMs,
    target: input.target,
    notes: input.notes,
    region: input.region,
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

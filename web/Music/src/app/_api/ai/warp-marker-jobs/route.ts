import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { disabledCapabilityResponse } from "@/lib/ai/route-helpers";
import { warpMarkerJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxWarpMarkerSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();
  const configured = Boolean(
    config.warpMarkerProviderUrl && config.warpMarkerProviderWebhookSecret,
  );

  return NextResponse.json({
    configured,
    message: configured
      ? "Warp marker analysis is connected."
      : "Warp marker analysis is waiting for a real provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = warpMarkerJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactWarpMarkerRequest(input);

    if (input.region && input.region.endMs <= input.region.startMs) {
      return jsonError("Warp marker region end must be after start.", 422);
    }

    if (!config.warpMarkerProviderUrl || !config.warpMarkerProviderWebhookSecret) {
      return disabledCapabilityResponse(
        "warp-marker",
        "warp-markers",
        "Warp marker analysis is waiting on a real provider.",
        safeRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxWarpMarkerSourceBytes) {
      return jsonError(
        `Warp marker source is larger than ${Math.round(maxWarpMarkerSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "warp-marker",
      status: "queued",
      provider: "warp-marker-provider",
      model: "external-warp-marker-provider",
      request: safeRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/warp-marker-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.warpMarkerProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "warp-markers",
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
        `Warp marker provider rejected the job: ${errorText || response.statusText}`,
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

function redactWarpMarkerRequest(
  input: ReturnType<typeof warpMarkerJobRequestSchema.parse>,
) {
  return {
    analysisMode: input.analysisMode,
    durationMs: input.durationMs,
    notes: input.notes,
    region: input.region,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    sourceKind: input.sourceKind,
    sourceMediaType: input.sourceMediaType,
    sourceSongId: input.sourceSongId,
    sourceTitle: input.sourceTitle,
    targetGrid: input.targetGrid,
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

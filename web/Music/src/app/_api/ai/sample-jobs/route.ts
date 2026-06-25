import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import {
  disabledCapabilityResponse,
  withProviderContract,
} from "@/lib/ai/route-helpers";
import { sampleJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const config = getAiRuntimeConfig();
  const configured = Boolean(
    config.sampleProviderUrl && config.sampleProviderWebhookSecret,
  );

  return NextResponse.json({
    configured,
    message: configured
      ? "Short sample generation is connected."
      : "Short sample generation is waiting for a real provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = sampleJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const jobRequest = withProviderContract(input);

    if (!config.sampleProviderUrl || !config.sampleProviderWebhookSecret) {
      return disabledCapabilityResponse(
        "sample",
        "sample-generation",
        "Short sample generation is waiting on a real provider.",
        jobRequest,
      );
    }

    if (
      input.sourceContext &&
      input.sourceContext.sourceSongId &&
      (!input.sourceContext.rightsConfirmed || !input.sourceContext.originalWork)
    ) {
      return jsonError(
        "Sample source context requires confirmed rights and original-work status.",
        422,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "sample",
      status: "queued",
      provider: "sample-provider",
      model: "external-sample-provider",
      request: jobRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/sample-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.sampleProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "sample-generation",
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
        `Sample provider rejected the job: ${errorText || response.statusText}`,
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

import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { disabledCapabilityResponse } from "@/lib/ai/route-helpers";
import { modelTrainingJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxTrainingSourceBytes = 150 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(
      config.modelTrainingProviderUrl &&
        config.modelTrainingProviderWebhookSecret,
    ),
    message:
      config.modelTrainingProviderUrl &&
      config.modelTrainingProviderWebhookSecret
        ? "Custom model training is connected."
        : "Custom model training is waiting for a real training provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = modelTrainingJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactTrainingRequest(input);

    if (!input.rightsConfirmed) {
      return jsonError("Custom model training requires rights confirmation.", 422);
    }

    if (
      !config.modelTrainingProviderUrl ||
      !config.modelTrainingProviderWebhookSecret
    ) {
      return disabledCapabilityResponse(
        "model-training",
        "training",
        "Custom model training is waiting on a real training provider.",
        safeRequest,
      );
    }

    const decodedSize = input.sources.reduce(
      (total, source) =>
        total + Buffer.byteLength(source.sourceAudioDataBase64, "base64"),
      0,
    );

    if (decodedSize > maxTrainingSourceBytes) {
      return jsonError(
        `Training sources are larger than ${Math.round(maxTrainingSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "model-training",
      status: "queued",
      provider: "model-training-provider",
      model: "external-custom-model-training-provider",
      request: safeRequest,
    });
    const callbackUrl = jobId
      ? new URL(
          `/api/ai/model-training-jobs/${jobId}/callback`,
          request.url,
        ).toString()
      : "";
    const response = await fetch(config.modelTrainingProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "custom-model-training",
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
        `Training provider rejected the job: ${errorText || response.statusText}`,
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

function redactTrainingRequest(
  input: ReturnType<typeof modelTrainingJobRequestSchema.parse>,
) {
  return {
    constraints: input.constraints,
    modelIntent: input.modelIntent,
    modelName: input.modelName,
    notes: input.notes,
    rightsConfirmed: input.rightsConfirmed,
    sourceCount: input.sources.length,
    sourceTitles: input.sources.map((source) => source.sourceTitle),
    totalSourceByteSize: input.sources.reduce(
      (total, source) =>
        total + Buffer.byteLength(source.sourceAudioDataBase64, "base64"),
      0,
    ),
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

import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { disabledCapabilityResponse } from "@/lib/ai/route-helpers";
import { personaGenerationJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxPersonaSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(
      config.personaProviderUrl && config.personaProviderWebhookSecret,
    ),
    message:
      config.personaProviderUrl && config.personaProviderWebhookSecret
        ? "Persona generation is connected."
        : "Persona generation is waiting for a real persona provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = personaGenerationJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactPersonaRequest(input);

    if (!input.rightsConfirmed) {
      return jsonError("Persona generation requires rights confirmation.", 422);
    }

    if (!config.personaProviderUrl || !config.personaProviderWebhookSecret) {
      return disabledCapabilityResponse(
        "persona",
        "persona",
        "Persona generation is waiting on a real persona provider.",
        safeRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxPersonaSourceBytes) {
      return jsonError(
        `Persona source is larger than ${Math.round(maxPersonaSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "persona",
      status: "queued",
      provider: "persona-provider",
      model: "external-persona-provider",
      request: safeRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/persona-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.personaProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "persona-generation",
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
        `Persona provider rejected the job: ${errorText || response.statusText}`,
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

function redactPersonaRequest(
  input: ReturnType<typeof personaGenerationJobRequestSchema.parse>,
) {
  return {
    analysisPrompt: input.analysisPrompt,
    durationMs: input.durationMs,
    lyrics: input.lyrics,
    notes: input.notes,
    rightsConfirmed: input.rightsConfirmed,
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

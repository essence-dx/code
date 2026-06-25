import { NextResponse } from "next/server";
import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { tryRecordAiJob, tryUpdateAiJob } from "@/lib/ai/jobs";
import { disabledCapabilityResponse } from "@/lib/ai/route-helpers";
import { audioToMidiJobRequestSchema } from "@/lib/ai/schemas";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxMidiSourceBytes = 50 * 1024 * 1024;

export async function GET() {
  const config = getAiRuntimeConfig();

  return NextResponse.json({
    configured: Boolean(config.midiProviderUrl),
    message: config.midiProviderUrl
      ? "Audio-to-MIDI extraction is connected."
      : "Audio-to-MIDI extraction is waiting for a real provider.",
  });
}

export async function POST(request: Request) {
  try {
    const input = audioToMidiJobRequestSchema.parse(await request.json());
    const config = getAiRuntimeConfig();
    const safeRequest = redactMidiRequest(input);

    if (input.region && input.region.endMs <= input.region.startMs) {
      return jsonError("MIDI extraction region end must be after start.", 422);
    }

    if (!config.midiProviderUrl) {
      return disabledCapabilityResponse(
        "midi",
        "midi",
        "Audio-to-MIDI extraction is waiting on a real provider.",
        safeRequest,
      );
    }

    const decodedSize = Buffer.byteLength(input.sourceAudioDataBase64, "base64");

    if (decodedSize > maxMidiSourceBytes) {
      return jsonError(
        `MIDI extraction source is larger than ${Math.round(maxMidiSourceBytes / 1024 / 1024)} MB.`,
        413,
      );
    }

    const jobId = await tryRecordAiJob({
      kind: "midi",
      status: "queued",
      provider: "midi-provider",
      model: "external-audio-to-midi-provider",
      request: safeRequest,
    });
    const callbackUrl = jobId
      ? new URL(`/api/ai/midi-jobs/${jobId}/callback`, request.url).toString()
      : "";
    const response = await fetch(config.midiProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        callbackUrl,
        jobId,
        task: "audio-to-midi",
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
        `Audio-to-MIDI provider rejected the job: ${errorText || response.statusText}`,
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

function redactMidiRequest(
  input: ReturnType<typeof audioToMidiJobRequestSchema.parse>,
) {
  return {
    durationMs: input.durationMs,
    notes: input.notes,
    region: input.region,
    sourceByteSize: Buffer.byteLength(input.sourceAudioDataBase64, "base64"),
    sourceKind: input.sourceKind,
    sourceMediaType: input.sourceMediaType,
    sourceSongId: input.sourceSongId,
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
